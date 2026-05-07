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
}

func NewOrderService(
	orders repository.OrderRepository,
	products repository.ProductRepository,
) OrderService {
	return &orderService{orders: orders, products: products}
}

func (s *orderService) Create(ctx context.Context, userID bson.ObjectID, in model.CreateOrderInput) (*model.Order, error) {
	if len(in.Items) == 0 {
		return nil, apperror.New("EMPTY_ORDER", "Đơn hàng phải có ít nhất 1 sản phẩm", 422)
	}

	var total float64
	orderItems := make([]model.OrderItem, 0, len(in.Items))

	for _, it := range in.Items {
		productID, err := bson.ObjectIDFromHex(it.ProductID)
		if err != nil {
			return nil, apperror.ErrProductNotFound
		}

		p, err := s.products.FindByID(ctx, productID)
		if err != nil {
			return nil, err
		}
		if !p.IsVisible {
			return nil, apperror.New("PRODUCT_HIDDEN",
				fmt.Sprintf("Sản phẩm \"%s\" hiện không bán", p.Name), 422)
		}

		if err := s.products.DecrementStock(ctx, productID, it.Quantity); err != nil {
			return nil, err
		}

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
		TotalAmount:     total,
		Status:          model.OrderStatusPending,
		PaymentMethod:   model.PaymentMethodCOD,
		PaymentStatus:   model.PaymentStatusUnpaid,
		Items:           orderItems,
	}
	if err := s.orders.Create(ctx, order); err != nil {
		return nil, err
	}

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

	for _, it := range o.Items {
		if err := s.products.IncrementStock(ctx, it.ProductID, it.Quantity); err != nil {
			if !errors.Is(err, apperror.ErrProductNotFound) {
				return nil, err
			}
		}
	}

	now := time.Now()
	if err := s.orders.UpdateStatus(ctx, o.ID, model.OrderStatusCancelled, nil, nil, &now); err != nil {
		return nil, err
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

	var paidAt, cancelledAt *time.Time
	var paymentStatus *string
	now := time.Now()
	switch status {
	case model.OrderStatusDelivered:
		paidAt = &now
		ps := model.PaymentStatusPaid
		paymentStatus = &ps
	case model.OrderStatusCancelled:
		return s.Cancel(ctx, bson.ObjectID{}, orderID, middleware.RoleAdmin)
	}

	if err := s.orders.UpdateStatus(ctx, orderID, status, paymentStatus, paidAt, cancelledAt); err != nil {
		return nil, err
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
