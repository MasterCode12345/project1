package service

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/model"
	"project1-be/internal/repository"
)

type CategoryService interface {
	List(ctx context.Context, onlyVisible bool) ([]model.Category, error)
	Create(ctx context.Context, in model.CreateCategoryInput) (*model.Category, error)
	Update(ctx context.Context, id bson.ObjectID, in model.UpdateCategoryInput) (*model.Category, error)
	Delete(ctx context.Context, id bson.ObjectID) error
}

type categoryService struct {
	categories repository.CategoryRepository
}

func NewCategoryService(c repository.CategoryRepository) CategoryService {
	return &categoryService{categories: c}
}

func (s *categoryService) List(ctx context.Context, onlyVisible bool) ([]model.Category, error) {
	return s.categories.List(ctx, onlyVisible)
}

func (s *categoryService) Create(ctx context.Context, in model.CreateCategoryInput) (*model.Category, error) {
	desc := strings.TrimSpace(in.Description)
	c := &model.Category{
		Name: strings.TrimSpace(in.Name),
	}
	if desc != "" {
		c.Description = &desc
	}
	if err := s.categories.Create(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *categoryService) Update(ctx context.Context, id bson.ObjectID, in model.UpdateCategoryInput) (*model.Category, error) {
	if in.Name != nil {
		trimmed := strings.TrimSpace(*in.Name)
		in.Name = &trimmed
	}
	if in.Description != nil {
		trimmed := strings.TrimSpace(*in.Description)
		in.Description = &trimmed
	}
	return s.categories.Update(ctx, id, &in)
}

func (s *categoryService) Delete(ctx context.Context, id bson.ObjectID) error {
	return s.categories.Delete(ctx, id)
}
