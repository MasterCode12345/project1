package handler

import (
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/config"
	"project1-be/internal/middleware"
	"project1-be/internal/model"
	"project1-be/internal/service"
	"project1-be/internal/vnpay"
)

type OrderHandler struct {
	orders service.OrderService
	cfg    *config.Config
}

func NewOrderHandler(o service.OrderService, cfg *config.Config) *OrderHandler {
	return &OrderHandler{orders: o, cfg: cfg}
}

// createOrderResponse nhúng Order và bổ sung payment_url tùy chọn cho VNPay
type createOrderResponse struct {
	model.Order
	PaymentURL string `json:"payment_url,omitempty"`
}

func (h *OrderHandler) Create(c *gin.Context) {
	uid := middleware.GetUserID(c)
	var in model.CreateOrderInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu đơn hàng không hợp lệ", http.StatusBadRequest))
		return
	}
	if h.cfg.VNPayDebug {
		log.Printf("[VNPay] CreateOrder request payment_method=%q items=%d", in.PaymentMethod, len(in.Items))
	}
	if in.PaymentMethod == model.PaymentMethodVNPay {
		if err := vnpay.ValidateConfig(h.cfg); err != nil {
			respondError(c, apperror.Wrap(err, "VNPAY_CONFIG_INVALID", "VNPay chưa được cấu hình đúng", http.StatusServiceUnavailable))
			return
		}
	}
	o, err := h.orders.Create(c.Request.Context(), uid, in)
	if err != nil {
		respondError(c, err)
		return
	}
	if h.cfg.VNPayDebug {
		log.Printf("[VNPay] CreateOrder saved order_code=%s payment_method=%q", o.OrderCode, o.PaymentMethod)
	}

	resp := createOrderResponse{Order: *o}

	// Nếu thanh toán VNPay và config đã được cấu hình → build payment URL
	if o.PaymentMethod == model.PaymentMethodVNPay && h.cfg.VNPayTmnCode != "" {
		ipAddr := c.ClientIP()
		paymentURL, err := vnpay.CreatePaymentURL(h.cfg, o, ipAddr)
		if err != nil {
			respondError(c, apperror.Wrap(err, "VNPAY_PAYMENT_URL_ERROR", "Không thể tạo URL thanh toán VNPay", http.StatusBadGateway))
			return
		}
		resp.PaymentURL = paymentURL
	}

	respond(c, http.StatusCreated, resp)
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

// VNPayReturn — GET /api/v1/payment/vnpay/return
// Được FE gọi sau khi VNPay chuyển hướng người dùng về với kết quả thanh toán.
// Xác thực chữ ký, cập nhật đơn hàng nếu thành công.
func (h *OrderHandler) VNPayReturn(c *gin.Context) {
	if err := vnpay.ValidateConfig(h.cfg); err != nil {
		respondError(c, apperror.Wrap(err, "VNPAY_CONFIG_INVALID", "VNPay chưa được cấu hình đúng", http.StatusServiceUnavailable))
		return
	}

	queryValues := c.Request.URL.Query()
	returnData, valid := vnpay.VerifyReturn(queryValues, h.cfg.VNPayHashSecret, h.cfg.VNPayDebug)

	if !valid {
		respond(c, http.StatusOK, gin.H{
			"success":    false,
			"order_code": returnData.TxnRef,
			"message":    "Chữ ký không hợp lệ. Giao dịch có thể đã bị giả mạo.",
		})
		return
	}

	if !strings.EqualFold(returnData.TmnCode, strings.TrimSpace(h.cfg.VNPayTmnCode)) {
		respond(c, http.StatusOK, gin.H{
			"success":    false,
			"order_code": returnData.TxnRef,
			"message":    "Thông tin merchant VNPay không khớp.",
		})
		return
	}

	paidAmount, err := returnData.AmountInt64()
	if err != nil {
		respond(c, http.StatusOK, gin.H{
			"success":    false,
			"order_code": returnData.TxnRef,
			"message":    "Số tiền VNPay trả về không hợp lệ.",
		})
		return
	}

	// responseCode/transactionStatus "00" = thành công, các mã khác = thất bại/hủy
	if returnData.ResponseCode != "00" || returnData.TransactionStatus != "00" {
		respond(c, http.StatusOK, gin.H{
			"success":            false,
			"order_code":         returnData.TxnRef,
			"response_code":      returnData.ResponseCode,
			"transaction_status": returnData.TransactionStatus,
			"message":            "Thanh toán thất bại hoặc bị hủy. Vui lòng thử lại.",
		})
		return
	}

	// Cập nhật đơn hàng: payment_status=paid, status=confirmed
	o, err := h.orders.ConfirmVNPayPayment(c.Request.Context(), returnData.TxnRef, paidAmount)
	if err != nil {
		respondError(c, err)
		return
	}

	respond(c, http.StatusOK, gin.H{
		"success":    true,
		"order_code": o.OrderCode,
		"order_id":   o.ID.Hex(),
		"message":    "Thanh toán thành công!",
	})
}
