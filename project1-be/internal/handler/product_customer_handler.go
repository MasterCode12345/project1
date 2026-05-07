package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/service"
)

type ProductCustomerHandler struct {
	products service.ProductService
}

func NewProductCustomerHandler(p service.ProductService) *ProductCustomerHandler {
	return &ProductCustomerHandler{products: p}
}

func (h *ProductCustomerHandler) List(c *gin.Context) {
	f := buildProductFilter(c)
	f.OnlyVisible = true
	res, err := h.products.List(c.Request.Context(), f)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *ProductCustomerHandler) GetByID(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	p, err := h.products.GetByID(c.Request.Context(), id, true)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, p)
}
