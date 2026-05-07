package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
	"project1-be/internal/service"
)

type CategoryHandler struct {
	categories service.CategoryService
}

func NewCategoryHandler(c service.CategoryService) *CategoryHandler {
	return &CategoryHandler{categories: c}
}

func (h *CategoryHandler) PublicList(c *gin.Context) {
	res, err := h.categories.List(c.Request.Context(), true)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *CategoryHandler) AdminList(c *gin.Context) {
	res, err := h.categories.List(c.Request.Context(), false)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *CategoryHandler) AdminCreate(c *gin.Context) {
	var in model.CreateCategoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	cat, err := h.categories.Create(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, cat)
}

func (h *CategoryHandler) AdminUpdate(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.UpdateCategoryInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	cat, err := h.categories.Update(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, cat)
}

func (h *CategoryHandler) AdminDelete(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	if err := h.categories.Delete(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đã xóa danh mục"})
}
