package service

import (
	"context"

	"project1-be/internal/repository"
)

// DashboardService cung cấp số liệu tổng quan cho admin dashboard.
type DashboardService interface {
	GetStats(ctx context.Context) (*DashboardStats, error)
}

type DashboardStats struct {
	TotalOrders      int64 `json:"total_orders"`
	OrdersToday      int64 `json:"orders_today"`
	LowStockProducts int64 `json:"low_stock_products"`
}

type dashboardService struct {
	orders   repository.OrderRepository
	products repository.ProductRepository
}

func NewDashboardService(o repository.OrderRepository, p repository.ProductRepository) DashboardService {
	return &dashboardService{orders: o, products: p}
}

func (s *dashboardService) GetStats(ctx context.Context) (*DashboardStats, error) {
	totalOrders, err := s.orders.CountTotal(ctx)
	if err != nil {
		return nil, err
	}
	ordersToday, err := s.orders.CountToday(ctx)
	if err != nil {
		return nil, err
	}
	lowStock, err := s.products.CountLowStock(ctx, 5) // <= 5 = sắp hết
	if err != nil {
		return nil, err
	}
	return &DashboardStats{
		TotalOrders: totalOrders, OrdersToday: ordersToday, LowStockProducts: lowStock,
	}, nil
}
