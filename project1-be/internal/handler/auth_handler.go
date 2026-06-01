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

// POST /api/v1/auth/refresh
// Public endpoint: nhận refresh token, trả về access token mới + refresh token mới (rotation)
func (h *AuthHandler) Refresh(c *gin.Context) {
	var in model.RefreshTokenInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Refresh token không hợp lệ", http.StatusBadRequest))
		return
	}
	res, err := h.auth.RefreshToken(c.Request.Context(), in.RefreshToken)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

// POST /api/v1/auth/logout
// Thu hồi refresh token (nếu có) và xác nhận đăng xuất thành công.
// Client luôn tự xóa token dù BE có lỗi hay không.
func (h *AuthHandler) Logout(c *gin.Context) {
	var in struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&in) // optional — không fail nếu body trống
	if in.RefreshToken != "" {
		_ = h.auth.RevokeRefreshToken(c.Request.Context(), in.RefreshToken)
	}
	respond(c, http.StatusOK, gin.H{"message": "Đăng xuất thành công"})
}
