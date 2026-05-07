package service

import (
	"context"
	"fmt"
	"mime/multipart"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"

	"project1-be/internal/config"
)

type UploadService interface {
	UploadImage(ctx context.Context, file multipart.File, folder string) (string, error)
}

type uploadService struct {
	cld *cloudinary.Cloudinary
}

func NewUploadService(cfg *config.Config) (UploadService, error) {
	cld, err := cloudinary.NewFromParams(
		cfg.CloudinaryCloudName,
		cfg.CloudinaryAPIKey,
		cfg.CloudinaryAPISecret,
	)
	if err != nil {
		return nil, fmt.Errorf("khởi tạo cloudinary lỗi: %w", err)
	}
	return &uploadService{cld: cld}, nil
}

func (s *uploadService) UploadImage(ctx context.Context, file multipart.File, folder string) (string, error) {
	res, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
		Folder: folder,
	})
	if err != nil {
		return "", fmt.Errorf("upload cloudinary lỗi: %w", err)
	}
	return res.SecureURL, nil
}
