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
	res, err := h.auth.Register(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, res)
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
