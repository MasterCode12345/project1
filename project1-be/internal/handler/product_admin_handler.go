package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
	"project1-be/internal/service"
)

type ProductAdminHandler struct {
	products service.ProductService
}

func NewProductAdminHandler(p service.ProductService) *ProductAdminHandler {
	return &ProductAdminHandler{products: p}
}

func (h *ProductAdminHandler) List(c *gin.Context) {
	f := buildProductFilter(c)
	f.OnlyVisible = false
	res, err := h.products.List(c.Request.Context(), f)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *ProductAdminHandler) GetByID(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	p, err := h.products.GetByID(c.Request.Context(), id, false)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, p)
}

func (h *ProductAdminHandler) Create(c *gin.Context) {
	var in model.CreateProductInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	p, err := h.products.Create(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, p)
}

func (h *ProductAdminHandler) Update(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.UpdateProductInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	p, err := h.products.Update(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, p)
}

func (h *ProductAdminHandler) UpdateVisibility(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in struct {
		IsVisible bool `json:"is_visible"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	if err := h.products.UpdateVisibility(c.Request.Context(), id, in.IsVisible); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Cập nhật visibility thành công"})
}

func (h *ProductAdminHandler) Delete(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	if err := h.products.Delete(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đã xóa sản phẩm"})
}

func (h *ProductAdminHandler) AddImage(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.CreateProductImageInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	img, err := h.products.AddImage(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, img)
}

func (h *ProductAdminHandler) DeleteImage(c *gin.Context) {
	productID, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	imageID, err := parseObjectIDParam(c, "imageId")
	if err != nil {
		respondError(c, err)
		return
	}
	if err := h.products.DeleteImage(c.Request.Context(), productID, imageID); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đã xóa ảnh"})
}

func (h *ProductAdminHandler) AddAttribute(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.CreateProductAttributeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	attr, err := h.products.AddAttribute(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, attr)
}

func (h *ProductAdminHandler) DeleteAttribute(c *gin.Context) {
	productID, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	attrID, err := parseObjectIDParam(c, "attrId")
	if err != nil {
		respondError(c, err)
		return
	}
	if err := h.products.DeleteAttribute(c.Request.Context(), productID, attrID); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đã xóa thông số"})
}

func (h *ProductAdminHandler) AddHighlight(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.CreateProductHighlightInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	hl, err := h.products.AddHighlight(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, hl)
}

func (h *ProductAdminHandler) DeleteHighlight(c *gin.Context) {
	productID, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	highlightID, err := parseObjectIDParam(c, "highlightId")
	if err != nil {
		respondError(c, err)
		return
	}
	if err := h.products.DeleteHighlight(c.Request.Context(), productID, highlightID); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đã xóa highlight"})
}
