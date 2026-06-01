package service

import (
	"strings"
	"testing"

	"project1-be/internal/model"
)

func TestBuildOrderConfirmationHTMLUsesPaymentMethodLabel(t *testing.T) {
	order := &OrderEmailData{
		OrderCode:       "ORD001",
		ShippingName:    "Nguyen Van A",
		ShippingPhone:   "0901234567",
		ShippingAddress: "Ha Noi",
		TotalAmount:     100000,
		PaymentMethod:   model.PaymentMethodVNPay,
		Items: []OrderItemEmailData{
			{
				ProductName: "Laptop",
				Quantity:    1,
				UnitPrice:   100000,
				Subtotal:    100000,
			},
		},
	}

	html := buildOrderConfirmationHTML("Nguyen Van A", order)
	if !strings.Contains(html, "Thanh toán qua VNPay") {
		t.Fatal("expected VNPay payment label in order confirmation email")
	}
	if strings.Contains(html, "Thanh toán khi nhận hàng (COD)") {
		t.Fatal("VNPay email must not show COD payment label")
	}
}
