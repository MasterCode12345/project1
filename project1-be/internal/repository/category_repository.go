package repository

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
)

type CategoryRepository interface {
	Create(ctx context.Context, c *model.Category) error
	FindByID(ctx context.Context, id bson.ObjectID) (*model.Category, error)
	List(ctx context.Context, onlyVisible bool) ([]model.Category, error)
	Update(ctx context.Context, id bson.ObjectID, in *model.UpdateCategoryInput) (*model.Category, error)
	Delete(ctx context.Context, id bson.ObjectID) error
	CountProducts(ctx context.Context, id bson.ObjectID) (int64, error)
}

type categoryRepository struct {
	col     *mongo.Collection
	prodCol *mongo.Collection
}

func NewCategoryRepository(db *mongo.Database) CategoryRepository {
	col := db.Collection("categories")
	col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return &categoryRepository{col: col, prodCol: db.Collection("products")}
}

func (r *categoryRepository) Create(ctx context.Context, c *model.Category) error {
	now := time.Now()
	c.IsVisible = true
	c.CreatedAt = now
	c.UpdatedAt = now

	res, err := r.col.InsertOne(ctx, c)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return apperror.ErrCategoryNameTaken
		}
		return apperror.Wrap(err, "DB_ERROR", "Lỗi tạo danh mục", 500)
	}
	c.ID = res.InsertedID.(bson.ObjectID)
	return nil
}

func (r *categoryRepository) FindByID(ctx context.Context, id bson.ObjectID) (*model.Category, error) {
	var c model.Category
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&c)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrCategoryNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn danh mục", 500)
	}
	return &c, nil
}

func (r *categoryRepository) List(ctx context.Context, onlyVisible bool) ([]model.Category, error) {
	filter := bson.M{}
	if onlyVisible {
		filter["is_visible"] = true
	}

	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn danh mục", 500)
	}
	defer cursor.Close(ctx)

	categories := make([]model.Category, 0)
	if err := cursor.All(ctx, &categories); err != nil {
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi decode danh mục", 500)
	}
	return categories, nil
}

func (r *categoryRepository) Update(ctx context.Context, id bson.ObjectID, in *model.UpdateCategoryInput) (*model.Category, error) {
	set := bson.M{"updated_at": time.Now()}
	if in.Name != nil {
		set["name"] = *in.Name
	}
	if in.Description != nil {
		if *in.Description != "" {
			set["description"] = *in.Description
		}
	}
	if in.IsVisible != nil {
		set["is_visible"] = *in.IsVisible
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var c model.Category
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": set}, opts).Decode(&c)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrCategoryNotFound
		}
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperror.ErrCategoryNameTaken
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật danh mục", 500)
	}
	return &c, nil
}

func (r *categoryRepository) Delete(ctx context.Context, id bson.ObjectID) error {
	count, err := r.prodCol.CountDocuments(ctx, bson.M{"category_id": id})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi đếm sản phẩm", 500)
	}
	if count > 0 {
		return apperror.ErrCategoryHasProducts
	}

	res, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi xóa danh mục", 500)
	}
	if res.DeletedCount == 0 {
		return apperror.ErrCategoryNotFound
	}
	return nil
}

func (r *categoryRepository) CountProducts(ctx context.Context, id bson.ObjectID) (int64, error) {
	n, err := r.prodCol.CountDocuments(ctx, bson.M{"category_id": id})
	if err != nil {
		return 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm sản phẩm", 500)
	}
	return n, nil
}
