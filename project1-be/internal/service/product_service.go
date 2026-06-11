package service

import (
	"context"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
	"project1-be/internal/repository"
)

type ProductService interface {
	List(ctx context.Context, f model.ProductFilter) (*model.PageResult[model.Product], error)
	GetByID(ctx context.Context, id bson.ObjectID, onlyVisible bool) (*model.Product, error)

	Create(ctx context.Context, in model.CreateProductInput) (*model.Product, error)
	Update(ctx context.Context, id bson.ObjectID, in model.UpdateProductInput) (*model.Product, error)
	UpdateVisibility(ctx context.Context, id bson.ObjectID, isVisible bool) error
	Delete(ctx context.Context, id bson.ObjectID) error

	AddImage(ctx context.Context, productID bson.ObjectID, in model.CreateProductImageInput) (*model.ProductImage, error)
	DeleteImage(ctx context.Context, productID, imageID bson.ObjectID) error
	AddAttribute(ctx context.Context, productID bson.ObjectID, in model.CreateProductAttributeInput) (*model.ProductAttribute, error)
	DeleteAttribute(ctx context.Context, productID, attrID bson.ObjectID) error
	AddHighlight(ctx context.Context, productID bson.ObjectID, in model.CreateProductHighlightInput) (*model.ProductHighlight, error)
	DeleteHighlight(ctx context.Context, productID, highlightID bson.ObjectID) error
}

type productService struct {
	products repository.ProductRepository
}

func NewProductService(p repository.ProductRepository) ProductService {
	return &productService{products: p}
}

func (s *productService) List(ctx context.Context, f model.ProductFilter) (*model.PageResult[model.Product], error) {
	f.Page = normalizePage(f.Page)
	f.PageSize = normalizePageSize(f.PageSize)
	f.Query = strings.TrimSpace(f.Query)

	items, total, err := s.products.List(ctx, &f)
	if err != nil {
		return nil, err
	}
	return &model.PageResult[model.Product]{
		Items: items, Total: total, Page: f.Page, PageSize: f.PageSize,
	}, nil
}

func (s *productService) GetByID(ctx context.Context, id bson.ObjectID, onlyVisible bool) (*model.Product, error) {
	p, err := s.products.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if onlyVisible && !p.IsVisible {
		return nil, apperror.ErrProductNotFound
	}
	return p, nil
}

func (s *productService) Create(ctx context.Context, in model.CreateProductInput) (*model.Product, error) {
	catID, err := bson.ObjectIDFromHex(in.CategoryID)
	if err != nil {
		return nil, apperror.ErrCategoryNotFound
	}

	desc := strings.TrimSpace(in.Description)
	img := strings.TrimSpace(in.ImageURL)

	p := &model.Product{
		SKU:           strings.TrimSpace(in.SKU),
		Name:          strings.TrimSpace(in.Name),
		Brand:         strings.TrimSpace(in.Brand),
		Price:         in.Price,
		CategoryID:    catID,
		StockQuantity: in.StockQuantity,
	}
	if desc != "" {
		p.Description = &desc
	}
	if img != "" {
		p.ImageURL = &img
	}

	if err := s.products.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *productService) Update(ctx context.Context, id bson.ObjectID, in model.UpdateProductInput) (*model.Product, error) {
	if in.SKU != nil {
		trimmed := strings.TrimSpace(*in.SKU)
		in.SKU = &trimmed
	}
	if in.Name != nil {
		trimmed := strings.TrimSpace(*in.Name)
		in.Name = &trimmed
	}
	return s.products.Update(ctx, id, &in)
}

func (s *productService) UpdateVisibility(ctx context.Context, id bson.ObjectID, isVisible bool) error {
	return s.products.UpdateVisibility(ctx, id, isVisible)
}

func (s *productService) Delete(ctx context.Context, id bson.ObjectID) error {
	return s.products.Delete(ctx, id)
}

func (s *productService) AddImage(ctx context.Context, productID bson.ObjectID, in model.CreateProductImageInput) (*model.ProductImage, error) {
	return s.products.AddImage(ctx, productID, in)
}

func (s *productService) DeleteImage(ctx context.Context, productID, imageID bson.ObjectID) error {
	return s.products.DeleteImage(ctx, productID, imageID)
}

func (s *productService) AddAttribute(ctx context.Context, productID bson.ObjectID, in model.CreateProductAttributeInput) (*model.ProductAttribute, error) {
	return s.products.AddAttribute(ctx, productID, in)
}

func (s *productService) DeleteAttribute(ctx context.Context, productID, attrID bson.ObjectID) error {
	return s.products.DeleteAttribute(ctx, productID, attrID)
}

func (s *productService) AddHighlight(ctx context.Context, productID bson.ObjectID, in model.CreateProductHighlightInput) (*model.ProductHighlight, error) {
	return s.products.AddHighlight(ctx, productID, in)
}

func (s *productService) DeleteHighlight(ctx context.Context, productID, highlightID bson.ObjectID) error {
	return s.products.DeleteHighlight(ctx, productID, highlightID)
}
