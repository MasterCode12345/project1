package service

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"
	"golang.org/x/crypto/bcrypt"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
	"project1-be/internal/repository"
)

type UserService interface {
	GetProfile(ctx context.Context, userID bson.ObjectID) (*model.User, error)
	UpdateProfile(ctx context.Context, userID bson.ObjectID, in model.UpdateProfileInput) (*model.User, error)
	ChangePassword(ctx context.Context, userID bson.ObjectID, in model.ChangePasswordInput) error

	List(ctx context.Context, page, pageSize int) (*model.PageResult[model.User], error)
	UpdateStatus(ctx context.Context, userID bson.ObjectID, status string) error
}

type userService struct {
	users repository.UserRepository
}

func NewUserService(users repository.UserRepository) UserService {
	return &userService{users: users}
}

func (s *userService) GetProfile(ctx context.Context, userID bson.ObjectID) (*model.User, error) {
	return s.users.FindByID(ctx, userID)
}

func (s *userService) UpdateProfile(ctx context.Context, userID bson.ObjectID, in model.UpdateProfileInput) (*model.User, error) {
	return s.users.UpdateProfile(ctx, userID,
		strings.TrimSpace(in.FullName),
		strings.TrimSpace(in.Phone),
		strings.TrimSpace(in.Address),
	)
}

func (s *userService) ChangePassword(ctx context.Context, userID bson.ObjectID, in model.ChangePasswordInput) error {
	u, err := s.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(in.OldPassword)); err != nil {
		return apperror.New("WRONG_OLD_PASSWORD", "Mật khẩu cũ không đúng", 400)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperror.Wrap(err, "HASH_ERROR", "Lỗi hash password", 500)
	}
	return s.users.UpdatePassword(ctx, userID, string(hash))
}

func (s *userService) List(ctx context.Context, page, pageSize int) (*model.PageResult[model.User], error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)

	users, total, err := s.users.List(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &model.PageResult[model.User]{
		Items: users, Total: total, Page: page, PageSize: pageSize,
	}, nil
}

func (s *userService) UpdateStatus(ctx context.Context, userID bson.ObjectID, status string) error {
	if status != "active" && status != "inactive" {
		return apperror.New("INVALID_STATUS", "Trạng thái không hợp lệ", 400)
	}
	return s.users.UpdateStatus(ctx, userID, status)
}

func normalizePage(p int) int {
	if p < 1 {
		return 1
	}
	return p
}

func normalizePageSize(n int) int {
	if n <= 0 {
		return 20
	}
	if n > 100 {
		return 100
	}
	return n
}
