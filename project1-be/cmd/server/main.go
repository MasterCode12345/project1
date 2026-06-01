package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"project1-be/internal/config"
	"project1-be/internal/database"
	"project1-be/internal/handler"
	"project1-be/internal/repository"
	"project1-be/internal/router"
	"project1-be/internal/service"
)

func main() {
	cfg := config.Load()
	log.Printf("[boot] env=%s port=%s db=%s", cfg.AppEnv, cfg.AppPort, cfg.MongoDBName)

	db, err := database.NewMongoDB(cfg)
	if err != nil {
		log.Fatalf("[boot] kết nối MongoDB lỗi: %v", err)
	}
	log.Println("[boot] đã kết nối MongoDB")

	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	productRepo := repository.NewProductRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	emailSvc := service.NewEmailService(cfg)
	authSvc := service.NewAuthService(userRepo, emailSvc, cfg.JWTSecret, cfg.JWTExpiresHours)
	userSvc := service.NewUserService(userRepo)
	categorySvc := service.NewCategoryService(categoryRepo)
	productSvc := service.NewProductService(productRepo)
	orderSvc := service.NewOrderService(orderRepo, productRepo, userRepo, emailSvc)
	dashboardSvc := service.NewDashboardService(orderRepo, productRepo)

	uploadSvc, err := service.NewUploadService(cfg)
	if err != nil {
		log.Fatalf("[boot] khởi tạo upload service lỗi: %v", err)
	}

	handlers := &router.Handlers{
		Auth:            handler.NewAuthHandler(authSvc),
		User:            handler.NewUserHandler(userSvc),
		Category:        handler.NewCategoryHandler(categorySvc),
		ProductCustomer: handler.NewProductCustomerHandler(productSvc),
		ProductAdmin:    handler.NewProductAdminHandler(productSvc),
		Order:           handler.NewOrderHandler(orderSvc, cfg),
		Dashboard:       handler.NewDashboardHandler(dashboardSvc),
		Upload:          handler.NewUploadHandler(uploadSvc),
	}

	engine := router.New(cfg, handlers)

	srv := &http.Server{
		Addr:              ":" + cfg.AppPort,
		Handler:           engine,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("[boot] server đang lắng nghe tại http://localhost:%s", cfg.AppPort)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[boot] listen lỗi: %v", err)
		}
	}()

	// Cleanup job: xóa tài khoản pending quá hạn mỗi 5 phút
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			n, err := userRepo.DeleteExpiredPending(ctx)
			cancel()
			if err != nil {
				log.Printf("[cleanup] lỗi xóa tài khoản hết hạn: %v", err)
			} else if n > 0 {
				log.Printf("[cleanup] đã xóa %d tài khoản pending hết hạn", n)
			}
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("[shutdown] đang dừng server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("[shutdown] lỗi: %v", err)
	}
	log.Println("[shutdown] xong")
}
