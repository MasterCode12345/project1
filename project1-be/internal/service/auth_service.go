package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"project1-be/internal/apperror"
	"project1-be/internal/middleware"
	"project1-be/internal/model"
	"project1-be/internal/repository"
)

const (
	verifyTokenTTL = 30 * time.Minute
	resetTokenTTL  = 15 * time.Minute
)

type AuthService interface {
	Register(ctx context.Context, appURL string, in model.RegisterInput) (*model.RegisterResponse, error)
	Login(ctx context.Context, in model.LoginInput) (*model.AuthResponse, error)
	VerifyEmail(ctx context.Context, token string) (*model.AuthResponse, error)
	ForgotPassword(ctx context.Context, appURL string, in model.ForgotPasswordInput) error
	ResetPassword(ctx context.Context, in model.ResetPasswordInput) error
}

type authService struct {
	users           repository.UserRepository
	email           EmailService
	jwtSecret       string
	jwtExpiresHours int
}

func NewAuthService(users repository.UserRepository, email EmailService, jwtSecret string, jwtExpiresHours int) AuthService {
	return &authService{users: users, email: email, jwtSecret: jwtSecret, jwtExpiresHours: jwtExpiresHours}
}

// Register tạo tài khoản ở trạng thái pending và gửi email xác minh
func (s *authService) Register(ctx context.Context, appURL string, in model.RegisterInput) (*model.RegisterResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.Wrap(err, "HASH_ERROR", "Không thể hash password", 500)
	}

	// Tạo verify token ngẫu nhiên 32 bytes
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, apperror.Wrap(err, "TOKEN_GEN_ERROR", "Không thể tạo token", 500)
	}
	verifyToken := hex.EncodeToString(tokenBytes)
	expiry := time.Now().Add(verifyTokenTTL)

	var phonePtr *string
	if p := strings.TrimSpace(in.Phone); p != "" {
		phonePtr = &p
	}

	u := &model.User{
		Email:             in.Email,
		PasswordHash:      string(hash),
		FullName:          strings.TrimSpace(in.FullName),
		Phone:             phonePtr,
		Role:              middleware.RoleCustomer,
		Status:            model.UserStatusPending, // chưa xác minh
		VerifyToken:       verifyToken,
		VerifyTokenExpiry: &expiry,
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}

	// Gửi email xác minh (không blocking — lỗi email không fail register)
	verifyURL := fmt.Sprintf("%s/verify-email/%s", appURL, verifyToken)
	go func() {
		if err := s.email.SendVerificationEmail(u.Email, u.FullName, verifyURL); err != nil {
			// Log nhưng không return error — user đã được tạo
			_ = err
		}
	}()

	return &model.RegisterResponse{
		Message: "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.",
		Email:   u.Email,
	}, nil
}

// Login — chặn tài khoản pending/inactive với thông báo phù hợp
func (s *authService) Login(ctx context.Context, in model.LoginInput) (*model.AuthResponse, error) {
	u, err := s.users.FindByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return nil, apperror.ErrInvalidCredentials
		}
		return nil, err
	}

	// Phân biệt pending (chưa xác minh) vs inactive (bị khóa)
	switch u.Status {
	case model.UserStatusPending:
		return nil, apperror.ErrEmailNotVerified
	case model.UserStatusInactive:
		return nil, apperror.New("USER_INACTIVE", "Tài khoản đã bị khóa", 403)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.Password)); err != nil {
		return nil, apperror.ErrInvalidCredentials
	}

	token, err := s.generateToken(u)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: token, User: *u}, nil
}

// VerifyEmail xác minh token, kích hoạt tài khoản và trả về JWT để tự đăng nhập
func (s *authService) VerifyEmail(ctx context.Context, token string) (*model.AuthResponse, error) {
	u, err := s.users.FindByVerifyToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if err := s.users.SetVerified(ctx, u.ID); err != nil {
		return nil, err
	}
	u.Status = model.UserStatusActive

	jwtToken, err := s.generateToken(u)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: jwtToken, User: *u}, nil
}

// ForgotPassword tạo reset token và gửi email — không tiết lộ email có tồn tại không
func (s *authService) ForgotPassword(ctx context.Context, appURL string, in model.ForgotPasswordInput) error {
	u, err := s.users.FindByEmail(ctx, in.Email)
	if err != nil {
		// Luôn trả về thành công để không leak thông tin email
		return nil
	}
	if u.Status != model.UserStatusActive {
		return nil
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return apperror.Wrap(err, "TOKEN_GEN_ERROR", "Không thể tạo token", 500)
	}
	resetToken := hex.EncodeToString(tokenBytes)
	expiry := time.Now().Add(resetTokenTTL)

	if err := s.users.SetResetToken(ctx, u.ID, resetToken, expiry); err != nil {
		return err
	}

	resetURL := fmt.Sprintf("%s/reset-password/%s", appURL, resetToken)
	go func() {
		_ = s.email.SendResetPasswordEmail(u.Email, u.FullName, resetURL)
	}()
	return nil
}

// ResetPassword xác thực token và cập nhật mật khẩu mới
func (s *authService) ResetPassword(ctx context.Context, in model.ResetPasswordInput) error {
	u, err := s.users.FindByResetToken(ctx, in.Token)
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.Wrap(err, "HASH_ERROR", "Không thể hash password", 500)
	}

	return s.users.ResetPassword(ctx, u.ID, string(hash))
}

func (s *authService) generateToken(u *model.User) (string, error) {
	now := time.Now()
	claims := middleware.Claims{
		UserID: u.ID.Hex(),
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.jwtExpiresHours) * time.Hour)),
			Subject:   u.Email,
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := t.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", apperror.Wrap(err, "TOKEN_ERROR", "Không thể sign token", 500)
	}
	return signed, nil
}
