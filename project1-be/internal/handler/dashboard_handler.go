package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"project1-be/internal/service"
)

type DashboardHandler struct {
	dashboard service.DashboardService
}

func NewDashboardHandler(d service.DashboardService) *DashboardHandler {
	return &DashboardHandler{dashboard: d}
}

// GET /api/v1/admin/dashboard
func (h *DashboardHandler) AdminStats(c *gin.Context) {
	stats, err := h.dashboard.GetStats(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	respond(c, http.StatusOK, stats)
}
