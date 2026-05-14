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

type UserHandler struct {
	users service.UserService
}

func NewUserHandler(u service.UserService) *UserHandler {
	return &UserHandler{users: u}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	uid := middleware.GetUserID(c)
	u, err := h.users.GetProfile(c.Request.Context(), uid)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, u)
}

func (h *UserHandler) UpdateMe(c *gin.Context) {
	uid := middleware.GetUserID(c)
	var in model.UpdateProfileInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu cập nhật không hợp lệ", http.StatusBadRequest))
		return
	}
	u, err := h.users.UpdateProfile(c.Request.Context(), uid, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, u)
}

func (h *UserHandler) ChangePassword(c *gin.Context) {
	uid := middleware.GetUserID(c)
	var in model.ChangePasswordInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	if err := h.users.ChangePassword(c.Request.Context(), uid, in); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Đổi mật khẩu thành công"})
}

func (h *UserHandler) AdminList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	res, err := h.users.List(c.Request.Context(), page, pageSize)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, res)
}

func (h *UserHandler) AdminCreate(c *gin.Context) {
	var in model.AdminCreateUserInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	u, err := h.users.AdminCreate(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusCreated, u)
}

func (h *UserHandler) AdminUpdateUser(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in model.AdminUpdateUserInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Dữ liệu không hợp lệ", http.StatusBadRequest))
		return
	}
	u, err := h.users.AdminUpdateUser(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, u)
}

func (h *UserHandler) AdminUpdateStatus(c *gin.Context) {
	id, err := parseObjectIDParam(c, "id")
	if err != nil {
		respondError(c, err)
		return
	}
	var in struct {
		Status string `json:"status" binding:"required,oneof=active inactive"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		respondError(c, apperror.Wrap(err, apperror.ErrInvalidInput.Code, "Trạng thái không hợp lệ", http.StatusBadRequest))
		return
	}
	if err := h.users.UpdateStatus(c.Request.Context(), id, in.Status); err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, gin.H{"message": "Cập nhật trạng thái thành công"})
}
