package repository

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
)

type OrderRepository interface {
	Create(ctx context.Context, o *model.Order) error
	FindByID(ctx context.Context, id bson.ObjectID) (*model.Order, error)
	List(ctx context.Context, f *model.OrderFilter) ([]model.Order, int64, error)
	UpdateStatus(ctx context.Context, id bson.ObjectID, status string, paymentStatus *string, paidAt, cancelledAt *time.Time) error
	// UpdateStatusConditional chỉ cập nhật nếu status hiện tại khớp với fromStatus.
	// Trả về (matched=true) nếu update thành công, (matched=false) nếu status đã thay đổi.
	UpdateStatusConditional(ctx context.Context, id bson.ObjectID, fromStatus, toStatus string, paymentStatus *string, paidAt, cancelledAt *time.Time) (bool, error)
	CountToday(ctx context.Context) (int64, error)
	CountTotal(ctx context.Context) (int64, error)
}

type orderRepository struct {
	col *mongo.Collection
}

func NewOrderRepository(db *mongo.Database) OrderRepository {
	col := db.Collection("orders")
	col.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "order_code", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
		{Keys: bson.D{{Key: "created_at", Value: -1}}},
	})
	return &orderRepository{col: col}
}

func (r *orderRepository) Create(ctx context.Context, o *model.Order) error {
	now := time.Now()
	o.CreatedAt = now
	o.UpdatedAt = now

	for i := range o.Items {
		o.Items[i].ID = bson.NewObjectID()
	}

	res, err := r.col.InsertOne(ctx, o)
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi tạo đơn hàng", 500)
	}
	o.ID = res.InsertedID.(bson.ObjectID)
	return nil
}

func (r *orderRepository) FindByID(ctx context.Context, id bson.ObjectID) (*model.Order, error) {
	var o model.Order
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&o)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrOrderNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn đơn hàng", 500)
	}
	return &o, nil
}

func (r *orderRepository) List(ctx context.Context, f *model.OrderFilter) ([]model.Order, int64, error) {
	filter := bson.M{}
	if f.UserID != nil {
		filter["user_id"] = *f.UserID
	}
	if f.Status != nil {
		filter["status"] = *f.Status
	}

	total, err := r.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm đơn hàng", 500)
	}

	skip := int64((f.Page - 1) * f.PageSize)
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(f.PageSize))

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn đơn hàng", 500)
	}
	defer cursor.Close(ctx)

	orders := make([]model.Order, 0, f.PageSize)
	if err := cursor.All(ctx, &orders); err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi decode đơn hàng", 500)
	}
	return orders, total, nil
}

func (r *orderRepository) UpdateStatus(ctx context.Context, id bson.ObjectID, status string, paymentStatus *string, paidAt, cancelledAt *time.Time) error {
	set := bson.M{
		"status":     status,
		"updated_at": time.Now(),
	}
	if paymentStatus != nil {
		set["payment_status"] = *paymentStatus
	}
	if paidAt != nil {
		set["paid_at"] = *paidAt
	}
	if cancelledAt != nil {
		set["cancelled_at"] = *cancelledAt
	}

	res, err := r.col.UpdateByID(ctx, id, bson.M{"$set": set})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật trạng thái", 500)
	}
	if res.MatchedCount == 0 {
		return apperror.ErrOrderNotFound
	}
	return nil
}

// UpdateStatusConditional — atomic check-and-set, tránh race condition khi nhiều request
// cùng update status của cùng 1 đơn hàng.
func (r *orderRepository) UpdateStatusConditional(
	ctx context.Context,
	id bson.ObjectID,
	fromStatus, toStatus string,
	paymentStatus *string,
	paidAt, cancelledAt *time.Time,
) (bool, error) {
	set := bson.M{
		"status":     toStatus,
		"updated_at": time.Now(),
	}
	if paymentStatus != nil {
		set["payment_status"] = *paymentStatus
	}
	if paidAt != nil {
		set["paid_at"] = *paidAt
	}
	if cancelledAt != nil {
		set["cancelled_at"] = *cancelledAt
	}

	// Filter bao gồm cả status hiện tại → chỉ match nếu chưa bị update bởi goroutine khác
	filter := bson.M{"_id": id, "status": fromStatus}
	res, err := r.col.UpdateOne(ctx, filter, bson.M{"$set": set})
	if err != nil {
		return false, apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật trạng thái", 500)
	}
	return res.MatchedCount > 0, nil
}

func (r *orderRepository) CountToday(ctx context.Context) (int64, error) {
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	n, err := r.col.CountDocuments(ctx, bson.M{
		"created_at": bson.M{"$gte": startOfDay},
	})
	if err != nil {
		return 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm đơn hôm nay", 500)
	}
	return n, nil
}

func (r *orderRepository) CountTotal(ctx context.Context) (int64, error) {
	n, err := r.col.CountDocuments(ctx, bson.M{})
	if err != nil {
		return 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm tổng đơn", 500)
	}
	return n, nil
}
