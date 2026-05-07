package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"project1-be/internal/apperror"
	"project1-be/internal/middleware"
	"project1-be/internal/model"
	"project1-be/internal/repository"
)

type AuthService interface {
	Register(ctx context.Context, in model.RegisterInput) (*model.AuthResponse, error)
	Login(ctx context.Context, in model.LoginInput) (*model.AuthResponse, error)
}

type authService struct {
	users           repository.UserRepository
	jwtSecret       string
	jwtExpiresHours int
}

func NewAuthService(users repository.UserRepository, jwtSecret string, jwtExpiresHours int) AuthService {
	return &authService{users: users, jwtSecret: jwtSecret, jwtExpiresHours: jwtExpiresHours}
}

func (s *authService) Register(ctx context.Context, in model.RegisterInput) (*model.AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperror.Wrap(err, "HASH_ERROR", "Không thể hash password", 500)
	}

	var phonePtr *string
	if p := strings.TrimSpace(in.Phone); p != "" {
		phonePtr = &p
	}

	u := &model.User{
		Email:        in.Email,
		PasswordHash: string(hash),
		FullName:     strings.TrimSpace(in.FullName),
		Phone:        phonePtr,
		Role:         middleware.RoleCustomer,
		Status:       "active",
	}
	if err := s.users.Create(ctx, u); err != nil {
		return nil, err
	}

	token, err := s.generateToken(u)
	if err != nil {
		return nil, err
	}
	return &model.AuthResponse{Token: token, User: *u}, nil
}

func (s *authService) Login(ctx context.Context, in model.LoginInput) (*model.AuthResponse, error) {
	u, err := s.users.FindByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, apperror.ErrUserNotFound) {
			return nil, apperror.ErrInvalidCredentials
		}
		return nil, err
	}
	if u.Status != "active" {
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
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", apperror.Wrap(err, "TOKEN_ERROR", "Không thể sign token", 500)
	}
	return signed, nil
}
