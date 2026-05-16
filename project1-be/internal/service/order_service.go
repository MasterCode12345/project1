package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/apperror"
	"project1-be/internal/middleware"
	"project1-be/internal/model"
	"project1-be/internal/repository"
)


type OrderService interface {
	Create(ctx context.Context, userID bson.ObjectID, in model.CreateOrderInput) (*model.Order, error)
	GetMyOrders(ctx context.Context, userID bson.ObjectID, page, pageSize int, status *string) (*model.PageResult[model.Order], error)
	GetOrderDetail(ctx context.Context, userID, orderID bson.ObjectID, role string) (*model.Order, error)
	Cancel(ctx context.Context, userID, orderID bson.ObjectID, role string) (*model.Order, error)

	ListAll(ctx context.Context, page, pageSize int, status *string) (*model.PageResult[model.Order], error)
	UpdateStatus(ctx context.Context, orderID bson.ObjectID, status string) (*model.Order, error)
}

type orderService struct {
	orders   repository.OrderRepository
	products repository.ProductRepository
	users    repository.UserRepository
	email    EmailService
}

func NewOrderService(
	orders repository.OrderRepository,
	products repository.ProductRepository,
	users repository.UserRepository,
	email EmailService,
) OrderService {
	return &orderService{orders: orders, products: products, users: users, email: email}
}

func (s *orderService) Create(ctx context.Context, userID bson.ObjectID, in model.CreateOrderInput) (*model.Order, error) {
	if len(in.Items) == 0 {
		return nil, apperror.New("EMPTY_ORDER", "Đơn hàng phải có ít nhất 1 sản phẩm", 422)
	}

	var total float64
	orderItems := make([]model.OrderItem, 0, len(in.Items))

	// decremented theo dõi các sản phẩm đã trừ stock để rollback nếu có lỗi giữa chừng
	type stockEntry struct {
		id  bson.ObjectID
		qty int
	}
	decremented := make([]stockEntry, 0, len(in.Items))

	for _, it := range in.Items {
		productID, err := bson.ObjectIDFromHex(it.ProductID)
		if err != nil {
			// Rollback stock đã trừ trước đó
			for _, d := range decremented {
				_ = s.products.IncrementStock(ctx, d.id, d.qty)
			}
			return nil, apperror.ErrProductNotFound
		}

		p, err := s.products.FindByID(ctx, productID)
		if err != nil {
			for _, d := range decremented {
				_ = s.products.IncrementStock(ctx, d.id, d.qty)
			}
			return nil, err
		}
		if !p.IsVisible {
			for _, d := range decremented {
				_ = s.products.IncrementStock(ctx, d.id, d.qty)
			}
			return nil, apperror.New("PRODUCT_HIDDEN",
				fmt.Sprintf("Sản phẩm \"%s\" hiện không bán", p.Name), 422)
		}

		// DecrementStock dùng $inc có điều kiện — atomic, tránh overselling
		if err := s.products.DecrementStock(ctx, productID, it.Quantity); err != nil {
			// Rollback các item đã trừ thành công trước đó
			for _, d := range decremented {
				_ = s.products.IncrementStock(ctx, d.id, d.qty)
			}
			return nil, err
		}
		decremented = append(decremented, stockEntry{id: productID, qty: it.Quantity})

		subtotal := float64(it.Quantity) * p.Price
		total += subtotal
		orderItems = append(orderItems, model.OrderItem{
			ProductID:   productID,
			ProductName: p.Name,
			Quantity:    it.Quantity,
			UnitPrice:   p.Price,
			Subtotal:    subtotal,
		})
	}

	note := strings.TrimSpace(in.ShippingNote)
	var notePtr *string
	if note != "" {
		notePtr = &note
	}

	order := &model.Order{
		OrderCode:       generateOrderCode(),
		UserID:          userID,
		ShippingName:    strings.TrimSpace(in.ShippingName),
		ShippingPhone:   strings.TrimSpace(in.ShippingPhone),
		ShippingAddress: strings.TrimSpace(in.ShippingAddress),
		ShippingNote:    notePtr,
		TotalAmount:   total,
		Status:        model.OrderStatusPending,
		PaymentMethod: func() string {
			if in.PaymentMethod != "" {
				return in.PaymentMethod
			}
			return model.PaymentMethodCOD
		}(),
		PaymentStatus: model.PaymentStatusUnpaid,
		Items:           orderItems,
	}
	if err := s.orders.Create(ctx, order); err != nil {
		// Rollback toàn bộ stock nếu tạo đơn thất bại
		for _, d := range decremented {
			_ = s.products.IncrementStock(ctx, d.id, d.qty)
		}
		return nil, err
	}

	// Gửi email xác nhận đơn hàng (non-blocking)
	go func(o *model.Order, uid bson.ObjectID) {
		u, err := s.users.FindByID(context.Background(), uid)
		if err != nil {
			return
		}
		items := make([]OrderItemEmailData, len(o.Items))
		for i, it := range o.Items {
			items[i] = OrderItemEmailData{
				ProductName: it.ProductName,
				Quantity:    it.Quantity,
				UnitPrice:   it.UnitPrice,
				Subtotal:    it.Subtotal,
			}
		}
		_ = s.email.SendOrderConfirmationEmail(u.Email, u.FullName, &OrderEmailData{
			OrderCode:       o.OrderCode,
			ShippingName:    o.ShippingName,
			ShippingPhone:   o.ShippingPhone,
			ShippingAddress: o.ShippingAddress,
			Items:           items,
			TotalAmount:     o.TotalAmount,
			PaymentMethod:   o.PaymentMethod,
		})
	}(order, userID)

	return order, nil
}

func (s *orderService) GetMyOrders(ctx context.Context, userID bson.ObjectID, page, pageSize int, status *string) (*model.PageResult[model.Order], error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)

	orders, total, err := s.orders.List(ctx, &model.OrderFilter{
		UserID: &userID, Status: status, Page: page, PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}
	return &model.PageResult[model.Order]{
		Items: orders, Total: total, Page: page, PageSize: pageSize,
	}, nil
}

func (s *orderService) GetOrderDetail(ctx context.Context, userID, orderID bson.ObjectID, role string) (*model.Order, error) {
	o, err := s.orders.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if role != middleware.RoleAdmin && o.UserID != userID {
		return nil, apperror.ErrForbidden
	}
	return o, nil
}

func (s *orderService) Cancel(ctx context.Context, userID, orderID bson.ObjectID, role string) (*model.Order, error) {
	o, err := s.orders.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if role != middleware.RoleAdmin && o.UserID != userID {
		return nil, apperror.ErrForbidden
	}

	if role != middleware.RoleAdmin {
		if o.Status != model.OrderStatusPending {
			return nil, apperror.ErrCannotCancelOrder
		}
	} else {
		if o.Status == model.OrderStatusDelivered || o.Status == model.OrderStatusCancelled {
			return nil, apperror.ErrCannotCancelOrder
		}
	}

	// Atomic check-and-set: chỉ update nếu status vẫn là fromStatus
	// Tránh race condition: 2 request cancel cùng lúc chỉ 1 cái thành công
	now := time.Now()
	matched, err := s.orders.UpdateStatusConditional(ctx, o.ID, o.Status, model.OrderStatusCancelled, nil, nil, &now)
	if err != nil {
		return nil, err
	}
	if !matched {
		// Goroutine khác đã update status trước — refresh và trả lỗi
		return nil, apperror.ErrCannotCancelOrder
	}

	// Chỉ restore stock SAU KHI status đã được update thành công
	for _, it := range o.Items {
		if err := s.products.IncrementStock(ctx, it.ProductID, it.Quantity); err != nil {
			if !errors.Is(err, apperror.ErrProductNotFound) {
				return nil, err
			}
		}
	}

	o.Status = model.OrderStatusCancelled
	o.CancelledAt = &now
	return o, nil
}

func (s *orderService) ListAll(ctx context.Context, page, pageSize int, status *string) (*model.PageResult[model.Order], error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)
	orders, total, err := s.orders.List(ctx, &model.OrderFilter{
		Status: status, Page: page, PageSize: pageSize,
	})
	if err != nil {
		return nil, err
	}
	return &model.PageResult[model.Order]{
		Items: orders, Total: total, Page: page, PageSize: pageSize,
	}, nil
}

func (s *orderService) UpdateStatus(ctx context.Context, orderID bson.ObjectID, status string) (*model.Order, error) {
	o, err := s.orders.FindByID(ctx, orderID)
	if err != nil {
		return nil, err
	}

	if !validTransition(o.Status, status) {
		return nil, apperror.New("INVALID_STATUS_TRANSITION",
			fmt.Sprintf("Không thể chuyển từ '%s' sang '%s'", o.Status, status), 422)
	}

	// Hủy đơn → dùng Cancel để đảm bảo stock được restore
	if status == model.OrderStatusCancelled {
		return s.Cancel(ctx, bson.ObjectID{}, orderID, middleware.RoleAdmin)
	}

	var paidAt, cancelledAt *time.Time
	var paymentStatus *string
	now := time.Now()
	if status == model.OrderStatusDelivered {
		paidAt = &now
		ps := model.PaymentStatusPaid
		paymentStatus = &ps
	}

	// Atomic conditional update: chỉ update nếu status vẫn là o.Status
	// Tránh race condition khi 2 admin cùng update 1 đơn
	matched, err := s.orders.UpdateStatusConditional(ctx, orderID, o.Status, status, paymentStatus, paidAt, cancelledAt)
	if err != nil {
		return nil, err
	}
	if !matched {
		return nil, apperror.New("STATUS_CONFLICT",
			"Trạng thái đơn hàng đã thay đổi, vui lòng tải lại trang", 409)
	}

	return s.orders.FindByID(ctx, orderID)
}

func validTransition(from, to string) bool {
	allowed := map[string][]string{
		model.OrderStatusPending:   {model.OrderStatusConfirmed, model.OrderStatusCancelled},
		model.OrderStatusConfirmed: {model.OrderStatusShipping, model.OrderStatusCancelled},
		model.OrderStatusShipping:  {model.OrderStatusDelivered, model.OrderStatusCancelled},
		model.OrderStatusDelivered: {},
		model.OrderStatusCancelled: {},
	}
	for _, s := range allowed[from] {
		if s == to {
			return true
		}
	}
	return false
}

func generateOrderCode() string {
	now := time.Now()
	return fmt.Sprintf("ORD-%s-%06d", now.Format("20060102"), now.UnixNano()%1000000)
}
