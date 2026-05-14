package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/apperror"
	"project1-be/internal/model"
	"project1-be/internal/service"
)

type AuthHandler struct {
	auth service.AuthService
}

func NewAuthHandler(a service.AuthService) *AuthHandler {
	return &AuthHandler{auth: a}
}

// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var in model.RegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu đăng ký không hợp lệ", http.StatusBadRequest))
		return
	}
	// Lấy APP_URL từ query hoặc dùng config mặc định
	appURL := c.GetHeader("Origin")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	res, err := h.auth.Register(c.Request.Context(), appURL, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, res)
}

// GET /api/v1/auth/verify-email/:token
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		respondError(c, apperror.ErrVerifyTokenInvalid)
		return
	}
	res, err := h.auth.VerifyEmail(c.Request.Context(), token)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var in model.LoginInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu đăng nhập không hợp lệ", http.StatusBadRequest))
		return
	}
	res, err := h.auth.Login(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

// POST /api/v1/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var in model.ForgotPasswordInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Email không hợp lệ", http.StatusBadRequest))
		return
	}
	appURL := c.GetHeader("Origin")
	if appURL == "" {
		appURL = "http://localhost:5173"
	}
	// Luôn trả 200 dù email có tồn tại hay không (tránh email enumeration)
	_ = h.auth.ForgotPassword(c.Request.Context(), appURL, in)
	respond(c, http.StatusOK, gin.H{"message": "Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút."})
}

// POST /api/v1/auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var in model.ResetPasswordInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	if err := h.auth.ResetPassword(c.Request.Context(), in); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."})
}

// POST /api/v1/auth/logout
// JWT không có server-side session nên chỉ xác nhận token hợp lệ và trả 200.
// Client tự xóa token sau khi nhận response này.
func (h *AuthHandler) Logout(c *gin.Context) {
	respond(c, http.StatusOK, gin.H{"message": "Đăng xuất thành công"})
}
