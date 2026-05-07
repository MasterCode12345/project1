package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/service"
)

type UploadHandler struct {
	uploads service.UploadService
}

func NewUploadHandler(u service.UploadService) *UploadHandler {
	return &UploadHandler{uploads: u}
}

func (h *UploadHandler) UploadImage(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Thiếu file upload", http.StatusBadRequest))
		return
	}
	defer file.Close()

	folder := c.DefaultQuery("folder", "products")

	url, err := h.uploads.UploadImage(c.Request.Context(), file, folder)
	if err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInternal.Code, "Upload ảnh thất bại", http.StatusInternalServerError))
		return
	}

	respond(c, http.StatusOK, gin.H{"url": url})
}
