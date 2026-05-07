package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Category struct {
	ID          bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Name        string        `json:"name" bson:"name"`
	Description *string       `json:"description,omitempty" bson:"description,omitempty"`
	IsVisible   bool          `json:"is_visible" bson:"is_visible"`
	CreatedAt   time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at" bson:"updated_at"`
}

type CreateCategoryInput struct {
	Name        string `json:"name"        binding:"required,min=1,max=150"`
	Description string `json:"description" binding:"omitempty,max=2000"`
}

type UpdateCategoryInput struct {
	Name        *string `json:"name"        binding:"omitempty,min=1,max=150"`
	Description *string `json:"description" binding:"omitempty,max=2000"`
	IsVisible   *bool   `json:"is_visible"`
}
