package model

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

const (
	UserStatusActive   = "active"
	UserStatusInactive = "inactive"
	UserStatusPending  = "pending" // đăng ký xong, chờ xác minh email
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
	// Xác minh email
	VerifyToken       string     `json:"-" bson:"verify_token,omitempty"`
	VerifyTokenExpiry *time.Time `json:"-" bson:"verify_token_expiry,omitempty"`
	// Đặt lại mật khẩu
	ResetToken       string     `json:"-" bson:"reset_token,omitempty"`
	ResetTokenExpiry *time.Time `json:"-" bson:"reset_token_expiry,omitempty"`
	// Refresh token (Remember Me)
	RefreshToken       string     `json:"-" bson:"refresh_token,omitempty"`
	RefreshTokenExpiry *time.Time `json:"-" bson:"refresh_token_expiry,omitempty"`
	CreatedAt          time.Time  `json:"created_at" bson:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" bson:"updated_at"`
}

type ForgotPasswordInput struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordInput struct {
	Token       string `json:"token"        binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=100"`
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
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	User         User   `json:"user"`
}

type RefreshTokenInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RegisterResponse trả về sau đăng ký — không có token vì cần xác minh email trước
type RegisterResponse struct {
	Message string `json:"message"`
	Email   string `json:"email"`
}

// Admin tạo tài khoản mới (không trả token, chỉ trả User)
type AdminCreateUserInput struct {
	Email    string `json:"email"     binding:"required,email,max=255"`
	Password string `json:"password"  binding:"required,min=6,max=100"`
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Phone    string `json:"phone"     binding:"omitempty,max=20"`
	Role     string `json:"role"      binding:"omitempty,oneof=admin customer"`
}

// Admin chỉnh sửa thông tin tài khoản
type AdminUpdateUserInput struct {
	FullName string `json:"full_name" binding:"omitempty,min=2,max=150"`
	Phone    string `json:"phone"     binding:"omitempty,max=20"`
	Address  string `json:"address"   binding:"omitempty,max=500"`
}
