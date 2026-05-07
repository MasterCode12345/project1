package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type ProductImage struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	ImageURL  string        `json:"image_url" bson:"image_url"`
	SortOrder int           `json:"sort_order" bson:"sort_order"`
}

type ProductAttribute struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	AttrName  string        `json:"attr_name" bson:"attr_name"`
	AttrValue string        `json:"attr_value" bson:"attr_value"`
	SortOrder int           `json:"sort_order" bson:"sort_order"`
}

type ProductHighlight struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Content   string        `json:"content" bson:"content"`
	SortOrder int           `json:"sort_order" bson:"sort_order"`
}

type Product struct {
	ID            bson.ObjectID      `json:"id" bson:"_id,omitempty"`
	SKU           string             `json:"sku" bson:"sku"`
	Name          string             `json:"name" bson:"name"`
	Description   *string            `json:"description,omitempty" bson:"description,omitempty"`
	Price         float64            `json:"price" bson:"price"`
	ImageURL      *string            `json:"image_url,omitempty" bson:"image_url,omitempty"`
	CategoryID    bson.ObjectID      `json:"category_id" bson:"category_id"`
	CategoryName  string             `json:"category_name,omitempty" bson:"category_name,omitempty"`
	StockQuantity int                `json:"stock_quantity" bson:"stock_quantity"`
	IsVisible     bool               `json:"is_visible" bson:"is_visible"`
	Images        []ProductImage     `json:"images" bson:"images,omitempty"`
	Attributes    []ProductAttribute `json:"attributes" bson:"attributes,omitempty"`
	Highlights    []ProductHighlight `json:"highlights" bson:"highlights,omitempty"`
	CreatedAt     time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at" bson:"updated_at"`
}

type CreateProductInput struct {
	SKU           string  `json:"sku"            binding:"required,min=1,max=50"`
	Name          string  `json:"name"           binding:"required,min=1,max=255"`
	Description   string  `json:"description"    binding:"omitempty,max=5000"`
	Price         float64 `json:"price"          binding:"required,gte=0"`
	ImageURL      string  `json:"image_url"      binding:"omitempty,max=500"`
	CategoryID    string  `json:"category_id"    binding:"required"`
	StockQuantity int     `json:"stock_quantity" binding:"gte=0"`
}

type UpdateProductInput struct {
	SKU           *string  `json:"sku"            binding:"omitempty,min=1,max=50"`
	Name          *string  `json:"name"           binding:"omitempty,min=1,max=255"`
	Description   *string  `json:"description"    binding:"omitempty,max=5000"`
	Price         *float64 `json:"price"          binding:"omitempty,gte=0"`
	ImageURL      *string  `json:"image_url"      binding:"omitempty,max=500"`
	CategoryID    *string  `json:"category_id"`
	StockQuantity *int     `json:"stock_quantity" binding:"omitempty,gte=0"`
	IsVisible     *bool    `json:"is_visible"`
}

type CreateProductImageInput struct {
	ImageURL  string `json:"image_url"  binding:"required,max=500"`
	SortOrder int    `json:"sort_order" binding:"gte=0"`
}

type CreateProductAttributeInput struct {
	AttrName  string `json:"attr_name"  binding:"required,min=1,max=150"`
	AttrValue string `json:"attr_value" binding:"required,min=1"`
	SortOrder int    `json:"sort_order" binding:"gte=0"`
}

type CreateProductHighlightInput struct {
	Content   string `json:"content"    binding:"required,min=1"`
	SortOrder int    `json:"sort_order" binding:"gte=0"`
}

type ProductFilter struct {
	CategoryID  *bson.ObjectID
	Query       string
	MinPrice    *float64
	MaxPrice    *float64
	Sort        string
	Page        int
	PageSize    int
	OnlyVisible bool
}

type PageResult[T any] struct {
	Items    []T   `json:"items"`
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"page_size"`
}
