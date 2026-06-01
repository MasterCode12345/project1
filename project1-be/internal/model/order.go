package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	OrderStatusPending   = "pending"
	OrderStatusConfirmed = "confirmed"
	OrderStatusShipping  = "shipping"
	OrderStatusDelivered = "delivered"
	OrderStatusCancelled = "cancelled"
)

const (
	PaymentMethodCOD          = "cod"
	PaymentMethodBankTransfer = "bank_transfer" // dự phòng mở rộng
	PaymentMethodMomo         = "momo"          // dự phòng mở rộng
	PaymentMethodVNPay        = "vnpay"

	PaymentStatusUnpaid = "unpaid"
	PaymentStatusPaid   = "paid"
)

type OrderItem struct {
	ID          bson.ObjectID `json:"id" bson:"_id,omitempty"`
	ProductID   bson.ObjectID `json:"product_id" bson:"product_id"`
	ProductName string        `json:"product_name" bson:"product_name"`
	Quantity    int           `json:"quantity" bson:"quantity"`
	UnitPrice   float64       `json:"unit_price" bson:"unit_price"`
	Subtotal    float64       `json:"subtotal" bson:"subtotal"`
}

type Order struct {
	ID              bson.ObjectID `json:"id" bson:"_id,omitempty"`
	OrderCode       string        `json:"order_code" bson:"order_code"`
	UserID          bson.ObjectID `json:"user_id" bson:"user_id"`
	ShippingName    string        `json:"shipping_name" bson:"shipping_name"`
	ShippingPhone   string        `json:"shipping_phone" bson:"shipping_phone"`
	ShippingAddress string        `json:"shipping_address" bson:"shipping_address"`
	ShippingNote    *string       `json:"shipping_note,omitempty" bson:"shipping_note,omitempty"`
	TotalAmount     float64       `json:"total_amount" bson:"total_amount"`
	Status          string        `json:"status" bson:"status"`
	PaymentMethod   string        `json:"payment_method" bson:"payment_method"`
	PaymentStatus   string        `json:"payment_status" bson:"payment_status"`
	PaidAt          *time.Time    `json:"paid_at,omitempty" bson:"paid_at,omitempty"`
	CancelledAt     *time.Time    `json:"cancelled_at,omitempty" bson:"cancelled_at,omitempty"`
	Items           []OrderItem   `json:"items,omitempty" bson:"items,omitempty"`
	CreatedAt       time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" bson:"updated_at"`
}

type CreateOrderItemInput struct {
	ProductID string `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity"   binding:"required,gt=0,lte=999"`
}

type CreateOrderInput struct {
	ShippingName    string                 `json:"shipping_name"    binding:"required,min=2,max=150"`
	ShippingPhone   string                 `json:"shipping_phone"   binding:"required,min=8,max=20"`
	ShippingAddress string                 `json:"shipping_address" binding:"required,min=5,max=2000"`
	ShippingNote    string                 `json:"shipping_note"    binding:"omitempty,max=500"`
	PaymentMethod   string                 `json:"payment_method"   binding:"omitempty,oneof=cod bank_transfer momo vnpay"`
	Items           []CreateOrderItemInput `json:"items"            binding:"required,min=1,dive"`
}

type UpdateOrderStatusInput struct {
	Status string `json:"status" binding:"required,oneof=pending confirmed shipping delivered cancelled"`
}

type OrderFilter struct {
	UserID   *bson.ObjectID
	Status   *string
	Page     int
	PageSize int
}
