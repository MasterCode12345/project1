package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/middleware"
	"project1-be/internal/model"
	"project1-be/internal/service"
)

type OrderHandler struct {
	orders service.OrderService
}

func NewOrderHandler(o service.OrderService) *OrderHandler {
	return &OrderHandler{orders: o}
}

func (h *OrderHandler) Create(c *gin.Context) {
	uid := middleware.GetUserID(c)
	var in model.CreateOrderInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu đơn hàng không hợp lệ", http.StatusBadRequest))
		return
	}
	o, err := h.orders.Create(c.Request.Context(), uid, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, o)
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	uid := middleware.GetUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var statusPtr *string
	if v := c.Query("status"); v != "" {
		statusPtr = &v
	}

	res, err := h.orders.GetMyOrders(c.Request.Context(), uid, page, pageSize, statusPtr)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *OrderHandler) GetOrderDetail(c *gin.Context) {
	uid := middleware.GetUserID(c)
	role := middleware.GetRole(c)
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	o, err := h.orders.GetOrderDetail(c.Request.Context(), uid, id, role)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, o)
}

func (h *OrderHandler) Cancel(c *gin.Context) {
	uid := middleware.GetUserID(c)
	role := middleware.GetRole(c)
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	o, err := h.orders.Cancel(c.Request.Context(), uid, id, role)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, o)
}

func (h *OrderHandler) AdminList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	var statusPtr *string
	if v := c.Query("status"); v != "" {
		statusPtr = &v
	}
	res, err := h.orders.ListAll(c.Request.Context(), page, pageSize, statusPtr)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *OrderHandler) AdminUpdateStatus(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.UpdateOrderStatusInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Trạng thái không hợp lệ", http.StatusBadRequest))
		return
	}
	o, err := h.orders.UpdateStatus(c.Request.Context(), id, in.Status)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, o)
}
