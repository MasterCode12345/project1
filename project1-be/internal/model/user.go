package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type User struct {
	ID           bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Email        string        `json:"email" bson:"email"`
	PasswordHash string        `json:"-" bson:"password_hash"`
	FullName     string        `json:"full_name" bson:"full_name"`
	Phone        *string       `json:"phone,omitempty" bson:"phone,omitempty"`
	Address      *string       `json:"address,omitempty" bson:"address,omitempty"`
	Role         string        `json:"role" bson:"role"`
	Status       string        `json:"status" bson:"status"`
	CreatedAt    time.Time     `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at" bson:"updated_at"`
}

type RegisterInput struct {
	Email    string `json:"email"    binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=6,max=100"`
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Phone    string `json:"phone"     binding:"omitempty,max=20"`
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileInput struct {
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Phone    string `json:"phone"     binding:"omitempty,max=20"`
	Address  string `json:"address"   binding:"omitempty,max=500"`
}

type ChangePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=100"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
