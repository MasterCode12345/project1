package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"project1-be/internal/model"
)

func main() {
	_ = godotenv.Load()

	mongoURI := os.Getenv("MONGO_URI")
	mongoDB := os.Getenv("MONGO_DB")
	if mongoURI == "" || mongoDB == "" {
		log.Fatal("Cần set MONGO_URI và MONGO_DB trong .env")
	}

	ctx := context.Background()
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Kết nối MongoDB lỗi: %v", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database(mongoDB)

	fmt.Println("=== Seed Data ===")

	users := seedUsers(ctx, db.Collection("users"))
	fmt.Printf("Đã tạo %d users\n", len(users))

	orders := seedOrders(ctx, db, users)
	fmt.Printf("Đã tạo %d orders\n", len(orders))

	fmt.Println("=== Hoàn tất seed! ===")
}

func hashPassword(pw string) string {
	h, _ := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(h)
}

func ptr(s string) *string { return &s }

func seedUsers(ctx context.Context, col *mongo.Collection) []model.User {
	col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	now := time.Now()
	password := hashPassword("123456")

	users := []model.User{
		{
			Email:        "admin@cellphones.vn",
			PasswordHash: password,
			FullName:     "Admin CellphoneS",
			Phone:        ptr("0901000000"),
			Address:      ptr("123 Nguyễn Huệ, Q1, TP.HCM"),
			Role:         "admin",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "nghiamaster09042005@gmail.com",
			PasswordHash: password,
			FullName:     "Admin CellphoneS",
			Phone:        ptr("0901000000"),
			Address:      ptr("123 Nguyễn Huệ, Q1, TP.HCM"),
			Role:         "admin",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "nguyenvana@gmail.com",
			PasswordHash: password,
			FullName:     "Nguyễn Văn A",
			Phone:        ptr("0912345678"),
			Address:      ptr("456 Lê Lợi, Q1, TP.HCM"),
			Role:         "customer",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "tranthib@gmail.com",
			PasswordHash: password,
			FullName:     "Trần Thị B",
			Phone:        ptr("0987654321"),
			Address:      ptr("789 Trần Hưng Đạo, Q5, TP.HCM"),
			Role:         "customer",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "levanc@gmail.com",
			PasswordHash: password,
			FullName:     "Lê Văn C",
			Phone:        ptr("0933111222"),
			Address:      ptr("12 Nguyễn Trãi, Q. Thanh Xuân, Hà Nội"),
			Role:         "customer",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "phamthid@gmail.com",
			PasswordHash: password,
			FullName:     "Phạm Thị D",
			Phone:        ptr("0944222333"),
			Address:      ptr("56 Hai Bà Trưng, Q. Hải Châu, Đà Nẵng"),
			Role:         "customer",
			Status:       "active",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		{
			Email:        "hoangvane@gmail.com",
			PasswordHash: password,
			FullName:     "Hoàng Văn E",
			Phone:        ptr("0955333444"),
			Address:      ptr("90 Lê Duẩn, Q. Đống Đa, Hà Nội"),
			Role:         "customer",
			Status:       "inactive",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
	}

	result := make([]model.User, 0, len(users))
	for _, u := range users {
		existing := model.User{}
		err := col.FindOne(ctx, bson.M{"email": u.Email}).Decode(&existing)
		if err == nil {
			log.Printf("  [skip] %s đã tồn tại", u.Email)
			result = append(result, existing)
			continue
		}

		res, err := col.InsertOne(ctx, u)
		if err != nil {
			log.Printf("  [!] Lỗi tạo user %s: %v", u.Email, err)
			continue
		}
		u.ID = res.InsertedID.(bson.ObjectID)
		result = append(result, u)
		log.Printf("  [+] %s (%s) — role=%s", u.FullName, u.Email, u.Role)
	}

	return result
}

func seedOrders(ctx context.Context, db *mongo.Database, users []model.User) []model.Order {
	orderCol := db.Collection("orders")
	prodCol := db.Collection("products")

	orderCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "order_code", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "user_id", Value: 1}}},
		{Keys: bson.D{{Key: "status", Value: 1}}},
	})

	products := loadProducts(ctx, prodCol, 20)
	if len(products) == 0 {
		log.Println("  [!] Chưa có sản phẩm nào, bỏ qua seed orders. Chạy crawler trước!")
		return nil
	}

	customers := filterCustomers(users)
	if len(customers) == 0 {
		log.Println("  [!] Không có customer nào")
		return nil
	}

	var orders []model.Order

	statuses := []string{
		model.OrderStatusPending,
		model.OrderStatusConfirmed,
		model.OrderStatusShipping,
		model.OrderStatusDelivered,
		model.OrderStatusCancelled,
	}

	for i := 0; i < 15; i++ {
		customer := customers[rand.Intn(len(customers))]
		status := statuses[rand.Intn(len(statuses))]
		numItems := 1 + rand.Intn(3)

		items, total := randomOrderItems(products, numItems)

		now := time.Now()
		createdAt := now.Add(-time.Duration(rand.Intn(30*24)) * time.Hour)

		note := randomNote()
		var notePtr *string
		if note != "" {
			notePtr = &note
		}

		order := model.Order{
			OrderCode:       fmt.Sprintf("ORD-%s-%06d", createdAt.Format("20060102"), rand.Intn(999999)),
			UserID:          customer.ID,
			ShippingName:    customer.FullName,
			ShippingPhone:   deref(customer.Phone),
			ShippingAddress: deref(customer.Address),
			ShippingNote:    notePtr,
			TotalAmount:     total,
			Status:          status,
			PaymentMethod:   model.PaymentMethodCOD,
			PaymentStatus:   model.PaymentStatusUnpaid,
			Items:           items,
			CreatedAt:       createdAt,
			UpdatedAt:       createdAt,
		}

		if status == model.OrderStatusDelivered {
			paidAt := createdAt.Add(time.Duration(1+rand.Intn(5)) * 24 * time.Hour)
			order.PaidAt = &paidAt
			order.PaymentStatus = model.PaymentStatusPaid
		}
		if status == model.OrderStatusCancelled {
			cancelledAt := createdAt.Add(time.Duration(rand.Intn(3)) * time.Hour)
			order.CancelledAt = &cancelledAt
		}

		res, err := orderCol.InsertOne(ctx, order)
		if err != nil {
			log.Printf("  [!] Lỗi tạo order: %v", err)
			continue
		}
		order.ID = res.InsertedID.(bson.ObjectID)
		orders = append(orders, order)
		log.Printf("  [+] %s — %s — %d items — %.0fđ — %s",
			order.OrderCode, customer.FullName, len(items), total, status)
	}

	return orders
}

func loadProducts(ctx context.Context, col *mongo.Collection, limit int) []model.Product {
	cursor, err := col.Find(ctx, bson.M{"is_visible": true},
		options.Find().SetLimit(int64(limit)))
	if err != nil {
		return nil
	}
	defer cursor.Close(ctx)

	var products []model.Product
	cursor.All(ctx, &products)
	return products
}

func filterCustomers(users []model.User) []model.User {
	var customers []model.User
	for _, u := range users {
		if u.Role == "customer" && u.Status == "active" {
			customers = append(customers, u)
		}
	}
	return customers
}

func randomOrderItems(products []model.Product, count int) ([]model.OrderItem, float64) {
	used := map[int]bool{}
	var items []model.OrderItem
	var total float64

	for len(items) < count && len(items) < len(products) {
		idx := rand.Intn(len(products))
		if used[idx] {
			continue
		}
		used[idx] = true

		p := products[idx]
		qty := 1 + rand.Intn(3)
		subtotal := float64(qty) * p.Price

		items = append(items, model.OrderItem{
			ID:          bson.NewObjectID(),
			ProductID:   p.ID,
			ProductName: p.Name,
			Quantity:    qty,
			UnitPrice:   p.Price,
			Subtotal:    subtotal,
		})
		total += subtotal
	}

	return items, total
}

func randomNote() string {
	notes := []string{
		"",
		"",
		"Giao giờ hành chính",
		"Gọi trước khi giao",
		"Để ở bảo vệ nếu không có người nhận",
		"Giao sau 17h",
	}
	return notes[rand.Intn(len(notes))]
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
