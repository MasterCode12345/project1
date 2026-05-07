package repository

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
)

type ProductRepository interface {
	Create(ctx context.Context, p *model.Product) error
	FindByID(ctx context.Context, id bson.ObjectID) (*model.Product, error)
	List(ctx context.Context, f *model.ProductFilter) ([]model.Product, int64, error)
	Update(ctx context.Context, id bson.ObjectID, in *model.UpdateProductInput) (*model.Product, error)
	UpdateVisibility(ctx context.Context, id bson.ObjectID, isVisible bool) error
	Delete(ctx context.Context, id bson.ObjectID) error

	DecrementStock(ctx context.Context, productID bson.ObjectID, quantity int) error
	IncrementStock(ctx context.Context, productID bson.ObjectID, quantity int) error
	CountLowStock(ctx context.Context, threshold int) (int64, error)

	AddImage(ctx context.Context, productID bson.ObjectID, in model.CreateProductImageInput) (*model.ProductImage, error)
	DeleteImage(ctx context.Context, productID, imageID bson.ObjectID) error
	AddAttribute(ctx context.Context, productID bson.ObjectID, in model.CreateProductAttributeInput) (*model.ProductAttribute, error)
	DeleteAttribute(ctx context.Context, productID, attrID bson.ObjectID) error
	AddHighlight(ctx context.Context, productID bson.ObjectID, in model.CreateProductHighlightInput) (*model.ProductHighlight, error)
	DeleteHighlight(ctx context.Context, productID, highlightID bson.ObjectID) error
}

type productRepository struct {
	col    *mongo.Collection
	catCol *mongo.Collection
}

func NewProductRepository(db *mongo.Database) ProductRepository {
	col := db.Collection("products")
	col.Indexes().CreateMany(context.Background(), []mongo.IndexModel{
		{Keys: bson.D{{Key: "sku", Value: 1}}, Options: options.Index().SetUnique(true)},
		{Keys: bson.D{{Key: "category_id", Value: 1}}},
		{Keys: bson.D{{Key: "is_visible", Value: 1}}},
		{Keys: bson.D{{Key: "name", Value: "text"}}},
	})
	return &productRepository{col: col, catCol: db.Collection("categories")}
}

func (r *productRepository) Create(ctx context.Context, p *model.Product) error {
	var cat model.Category
	err := r.catCol.FindOne(ctx, bson.M{"_id": p.CategoryID}).Decode(&cat)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return apperror.ErrCategoryNotFound
		}
		return apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn danh mục", 500)
	}
	p.CategoryName = cat.Name

	now := time.Now()
	p.IsVisible = true
	p.CreatedAt = now
	p.UpdatedAt = now
	if p.Images == nil {
		p.Images = []model.ProductImage{}
	}
	if p.Attributes == nil {
		p.Attributes = []model.ProductAttribute{}
	}
	if p.Highlights == nil {
		p.Highlights = []model.ProductHighlight{}
	}

	res, err := r.col.InsertOne(ctx, p)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return apperror.ErrSKUExists
		}
		return apperror.Wrap(err, "DB_ERROR", "Lỗi tạo sản phẩm", 500)
	}
	p.ID = res.InsertedID.(bson.ObjectID)
	return nil
}

func (r *productRepository) FindByID(ctx context.Context, id bson.ObjectID) (*model.Product, error) {
	var p model.Product
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&p)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrProductNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn sản phẩm", 500)
	}
	return &p, nil
}

func (r *productRepository) List(ctx context.Context, f *model.ProductFilter) ([]model.Product, int64, error) {
	filter := bson.M{}

	if f.OnlyVisible {
		filter["is_visible"] = true
	}
	if f.CategoryID != nil {
		filter["category_id"] = *f.CategoryID
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		filter["name"] = bson.M{"$regex": q, "$options": "i"}
	}

	priceFilter := bson.M{}
	if f.MinPrice != nil {
		priceFilter["$gte"] = *f.MinPrice
	}
	if f.MaxPrice != nil {
		priceFilter["$lte"] = *f.MaxPrice
	}
	if len(priceFilter) > 0 {
		filter["price"] = priceFilter
	}

	total, err := r.col.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm sản phẩm", 500)
	}

	sort := bson.D{{Key: "created_at", Value: -1}}
	switch f.Sort {
	case "price_asc":
		sort = bson.D{{Key: "price", Value: 1}}
	case "price_desc":
		sort = bson.D{{Key: "price", Value: -1}}
	case "newest":
		sort = bson.D{{Key: "created_at", Value: -1}}
	case "name_asc":
		sort = bson.D{{Key: "name", Value: 1}}
	}

	skip := int64((f.Page - 1) * f.PageSize)
	opts := options.Find().SetSort(sort).SetSkip(skip).SetLimit(int64(f.PageSize))

	cursor, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn sản phẩm", 500)
	}
	defer cursor.Close(ctx)

	products := make([]model.Product, 0, f.PageSize)
	if err := cursor.All(ctx, &products); err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi decode sản phẩm", 500)
	}
	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, id bson.ObjectID, in *model.UpdateProductInput) (*model.Product, error) {
	set := bson.M{"updated_at": time.Now()}
	if in.SKU != nil {
		set["sku"] = *in.SKU
	}
	if in.Name != nil {
		set["name"] = *in.Name
	}
	if in.Description != nil {
		set["description"] = *in.Description
	}
	if in.Price != nil {
		set["price"] = *in.Price
	}
	if in.ImageURL != nil {
		set["image_url"] = *in.ImageURL
	}
	if in.CategoryID != nil {
		catID, err := bson.ObjectIDFromHex(*in.CategoryID)
		if err != nil {
			return nil, apperror.ErrCategoryNotFound
		}
		var cat model.Category
		err = r.catCol.FindOne(ctx, bson.M{"_id": catID}).Decode(&cat)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				return nil, apperror.ErrCategoryNotFound
			}
			return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn danh mục", 500)
		}
		set["category_id"] = catID
		set["category_name"] = cat.Name
	}
	if in.StockQuantity != nil {
		set["stock_quantity"] = *in.StockQuantity
	}
	if in.IsVisible != nil {
		set["is_visible"] = *in.IsVisible
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var p model.Product
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, bson.M{"$set": set}, opts).Decode(&p)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrProductNotFound
		}
		if mongo.IsDuplicateKeyError(err) {
			return nil, apperror.ErrSKUExists
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật sản phẩm", 500)
	}
	return &p, nil
}

func (r *productRepository) UpdateVisibility(ctx context.Context, id bson.ObjectID, isVisible bool) error {
	res, err := r.col.UpdateByID(ctx, id, bson.M{
		"$set": bson.M{"is_visible": isVisible, "updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật visibility", 500)
	}
	if res.MatchedCount == 0 {
		return apperror.ErrProductNotFound
	}
	return nil
}

func (r *productRepository) Delete(ctx context.Context, id bson.ObjectID) error {
	res, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi xóa sản phẩm", 500)
	}
	if res.DeletedCount == 0 {
		return apperror.ErrProductNotFound
	}
	return nil
}

func (r *productRepository) DecrementStock(ctx context.Context, productID bson.ObjectID, quantity int) error {
	res, err := r.col.UpdateOne(ctx,
		bson.M{
			"_id":            productID,
			"is_visible":     true,
			"stock_quantity": bson.M{"$gte": quantity},
		},
		bson.M{
			"$inc": bson.M{"stock_quantity": -quantity},
			"$set": bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi trừ tồn kho", 500)
	}
	if res.MatchedCount == 0 {
		p, err := r.FindByID(ctx, productID)
		if err != nil {
			return err
		}
		if !p.IsVisible {
			return apperror.ErrProductHidden
		}
		return apperror.ErrOutOfStock
	}
	return nil
}

func (r *productRepository) IncrementStock(ctx context.Context, productID bson.ObjectID, quantity int) error {
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$inc": bson.M{"stock_quantity": quantity},
		"$set": bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi hoàn tồn kho", 500)
	}
	if res.MatchedCount == 0 {
		return apperror.ErrProductNotFound
	}
	return nil
}

func (r *productRepository) CountLowStock(ctx context.Context, threshold int) (int64, error) {
	n, err := r.col.CountDocuments(ctx, bson.M{
		"stock_quantity": bson.M{"$lte": threshold},
		"is_visible":     true,
	})
	if err != nil {
		return 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm low-stock", 500)
	}
	return n, nil
}

func (r *productRepository) AddImage(ctx context.Context, productID bson.ObjectID, in model.CreateProductImageInput) (*model.ProductImage, error) {
	img := model.ProductImage{
		ID:        bson.NewObjectID(),
		ImageURL:  in.ImageURL,
		SortOrder: in.SortOrder,
	}
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$push": bson.M{"images": img},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi thêm ảnh", 500)
	}
	if res.MatchedCount == 0 {
		return nil, apperror.ErrProductNotFound
	}
	return &img, nil
}

func (r *productRepository) DeleteImage(ctx context.Context, productID, imageID bson.ObjectID) error {
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$pull": bson.M{"images": bson.M{"_id": imageID}},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi xóa ảnh", 500)
	}
	if res.ModifiedCount == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *productRepository) AddAttribute(ctx context.Context, productID bson.ObjectID, in model.CreateProductAttributeInput) (*model.ProductAttribute, error) {
	attr := model.ProductAttribute{
		ID:        bson.NewObjectID(),
		AttrName:  in.AttrName,
		AttrValue: in.AttrValue,
		SortOrder: in.SortOrder,
	}
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$push": bson.M{"attributes": attr},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi thêm thông số", 500)
	}
	if res.MatchedCount == 0 {
		return nil, apperror.ErrProductNotFound
	}
	return &attr, nil
}

func (r *productRepository) DeleteAttribute(ctx context.Context, productID, attrID bson.ObjectID) error {
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$pull": bson.M{"attributes": bson.M{"_id": attrID}},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi xóa thông số", 500)
	}
	if res.ModifiedCount == 0 {
		return apperror.ErrNotFound
	}
	return nil
}

func (r *productRepository) AddHighlight(ctx context.Context, productID bson.ObjectID, in model.CreateProductHighlightInput) (*model.ProductHighlight, error) {
	hl := model.ProductHighlight{
		ID:        bson.NewObjectID(),
		Content:   in.Content,
		SortOrder: in.SortOrder,
	}
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$push": bson.M{"highlights": hl},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi thêm highlight", 500)
	}
	if res.MatchedCount == 0 {
		return nil, apperror.ErrProductNotFound
	}
	return &hl, nil
}

func (r *productRepository) DeleteHighlight(ctx context.Context, productID, highlightID bson.ObjectID) error {
	res, err := r.col.UpdateByID(ctx, productID, bson.M{
		"$pull": bson.M{"highlights": bson.M{"_id": highlightID}},
		"$set":  bson.M{"updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi xóa highlight", 500)
	}
	if res.ModifiedCount == 0 {
		return apperror.ErrNotFound
	}
	return nil
}
