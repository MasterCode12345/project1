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

type UserRepository interface {
	Create(ctx context.Context, u *model.User) error
	FindByID(ctx context.Context, id bson.ObjectID) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	UpdateProfile(ctx context.Context, id bson.ObjectID, fullName, phone, address string) (*model.User, error)
	UpdatePassword(ctx context.Context, id bson.ObjectID, passwordHash string) error
	List(ctx context.Context, page, pageSize int) ([]model.User, int64, error)
	UpdateStatus(ctx context.Context, id bson.ObjectID, status string) error
}

type userRepository struct {
	col *mongo.Collection
}

func NewUserRepository(db *mongo.Database) UserRepository {
	col := db.Collection("users")
	col.Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	return &userRepository{col: col}
}

func (r *userRepository) Create(ctx context.Context, u *model.User) error {
	now := time.Now()
	u.Email = strings.ToLower(strings.TrimSpace(u.Email))
	u.CreatedAt = now
	u.UpdatedAt = now

	res, err := r.col.InsertOne(ctx, u)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return apperror.ErrEmailExists
		}
		return apperror.Wrap(err, "DB_ERROR", "Lỗi tạo user", 500)
	}
	u.ID = res.InsertedID.(bson.ObjectID)
	return nil
}

func (r *userRepository) FindByID(ctx context.Context, id bson.ObjectID) (*model.User, error) {
	var u model.User
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&u)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn user", 500)
	}
	return &u, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	err := r.col.FindOne(ctx, bson.M{"email": strings.ToLower(strings.TrimSpace(email))}).Decode(&u)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn user", 500)
	}
	return &u, nil
}

func (r *userRepository) UpdateProfile(ctx context.Context, id bson.ObjectID, fullName, phone, address string) (*model.User, error) {
	update := bson.M{
		"$set": bson.M{
			"full_name":  fullName,
			"updated_at": time.Now(),
		},
	}
	setFields := update["$set"].(bson.M)
	if phone != "" {
		setFields["phone"] = phone
	} else {
		update["$unset"] = bson.M{"phone": ""}
	}
	if address != "" {
		setFields["address"] = address
	} else {
		if unset, ok := update["$unset"]; ok {
			unset.(bson.M)["address"] = ""
		} else {
			update["$unset"] = bson.M{"address": ""}
		}
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var u model.User
	err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": id}, update, opts).Decode(&u)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, apperror.ErrUserNotFound
		}
		return nil, apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật profile", 500)
	}
	return &u, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, id bson.ObjectID, passwordHash string) error {
	res, err := r.col.UpdateByID(ctx, id, bson.M{
		"$set": bson.M{"password_hash": passwordHash, "updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi đổi mật khẩu", 500)
	}
	if res.MatchedCount == 0 {
		return apperror.ErrUserNotFound
	}
	return nil
}

func (r *userRepository) List(ctx context.Context, page, pageSize int) ([]model.User, int64, error) {
	total, err := r.col.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi đếm user", 500)
	}

	skip := int64((page - 1) * pageSize)
	opts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(pageSize))

	cursor, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi truy vấn users", 500)
	}
	defer cursor.Close(ctx)

	users := make([]model.User, 0, pageSize)
	if err := cursor.All(ctx, &users); err != nil {
		return nil, 0, apperror.Wrap(err, "DB_ERROR", "Lỗi decode users", 500)
	}
	return users, total, nil
}

func (r *userRepository) UpdateStatus(ctx context.Context, id bson.ObjectID, status string) error {
	res, err := r.col.UpdateByID(ctx, id, bson.M{
		"$set": bson.M{"status": status, "updated_at": time.Now()},
	})
	if err != nil {
		return apperror.Wrap(err, "DB_ERROR", "Lỗi cập nhật trạng thái user", 500)
	}
	if res.MatchedCount == 0 {
		return apperror.ErrUserNotFound
	}
	return nil
}
