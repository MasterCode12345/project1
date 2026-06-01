package router

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"project1-be/internal/config"
	"project1-be/internal/handler"
	"project1-be/internal/middleware"
)

type Handlers struct {
	Auth            *handler.AuthHandler
	User            *handler.UserHandler
	Category        *handler.CategoryHandler
	ProductCustomer *handler.ProductCustomerHandler
	ProductAdmin    *handler.ProductAdminHandler
	Order           *handler.OrderHandler
	Dashboard       *handler.DashboardHandler
	Upload          *handler.UploadHandler
}

func New(cfg *config.Config, h *Handlers) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSAllowedOrigin))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "project1-be"})
	})

	v1 := r.Group("/api/v1")

	{
		v1.POST("/auth/register", h.Auth.Register)
		v1.POST("/auth/login", h.Auth.Login)
		v1.GET("/auth/verify-email/:token", h.Auth.VerifyEmail)
		v1.POST("/auth/forgot-password", h.Auth.ForgotPassword)
		v1.POST("/auth/reset-password", h.Auth.ResetPassword)
		v1.POST("/auth/refresh", h.Auth.Refresh) // public — cấp access token mới bằng refresh token

		v1.GET("/categories", h.Category.PublicList)

		v1.GET("/products", h.ProductCustomer.List)
		v1.GET("/products/:id", h.ProductCustomer.GetByID)

		// VNPay return — public (không cần auth, VNPay redirect trình duyệt về đây)
		v1.GET("/payment/vnpay/return", h.Order.VNPayReturn)
	}

	auth := v1.Group("")
	auth.Use(middleware.RequireAuth(cfg.JWTSecret))
	{
		auth.POST("/auth/logout", h.Auth.Logout)

		auth.GET("/me", h.User.GetMe)
		auth.PUT("/me", h.User.UpdateMe)
		auth.PUT("/me/password", h.User.ChangePassword)

		auth.POST("/orders", h.Order.Create)
		auth.GET("/orders", h.Order.GetMyOrders)
		auth.GET("/orders/:id", h.Order.GetOrderDetail)
		auth.POST("/orders/:id/cancel", h.Order.Cancel)
	}

	admin := v1.Group("/admin")
	admin.Use(middleware.RequireAuth(cfg.JWTSecret), middleware.RequireAdmin())
	{
		admin.GET("/dashboard", h.Dashboard.AdminStats)

		admin.POST("/upload/image", h.Upload.UploadImage)

		admin.GET("/categories", h.Category.AdminList)
		admin.POST("/categories", h.Category.AdminCreate)
		admin.PUT("/categories/:id", h.Category.AdminUpdate)
		admin.DELETE("/categories/:id", h.Category.AdminDelete)

		admin.GET("/products", h.ProductAdmin.List)
		admin.GET("/products/:id", h.ProductAdmin.GetByID)
		admin.POST("/products", h.ProductAdmin.Create)
		admin.PUT("/products/:id", h.ProductAdmin.Update)
		admin.PATCH("/products/:id/visibility", h.ProductAdmin.UpdateVisibility)
		admin.DELETE("/products/:id", h.ProductAdmin.Delete)

		admin.POST("/products/:id/images", h.ProductAdmin.AddImage)
		admin.DELETE("/products/:id/images/:imageId", h.ProductAdmin.DeleteImage)
		admin.POST("/products/:id/attributes", h.ProductAdmin.AddAttribute)
		admin.DELETE("/products/:id/attributes/:attrId", h.ProductAdmin.DeleteAttribute)
		admin.POST("/products/:id/highlights", h.ProductAdmin.AddHighlight)
		admin.DELETE("/products/:id/highlights/:highlightId", h.ProductAdmin.DeleteHighlight)

		admin.GET("/orders", h.Order.AdminList)
		admin.PATCH("/orders/:id/status", h.Order.AdminUpdateStatus)

		admin.GET("/users", h.User.AdminList)
		admin.POST("/users", h.User.AdminCreate)
		admin.PUT("/users/:id", h.User.AdminUpdateUser)
		admin.PATCH("/users/:id/status", h.User.AdminUpdateStatus)
	}

	// ── Serve FE static files ────────────────────────────────────────────────
	// Nếu thư mục ./dist tồn tại (sau `npm run build`), Go server phục vụ
	// file tĩnh của FE — không cần Vite dev server nữa.
	distDir := "./dist"
	if _, err := os.Stat(distDir); err == nil {
		// Serve toàn bộ thư mục assets (JS/CSS bundle do Vite tạo ra)
		r.Static("/assets", distDir+"/assets")

		// Fallback: mọi request không khớp route nào ở trên
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Route /api/* không tồn tại → JSON 404, không trả HTML
			if strings.HasPrefix(path, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{
					"error": gin.H{"code": "NOT_FOUND", "message": "Route không tồn tại"},
				})
				return
			}

			// Các file tĩnh khác trong dist/ (favicon, robots.txt, ảnh...)
			// Nếu file tồn tại → trả file, không thì trả index.html cho React Router
			filePath := distDir + path
			if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
				c.File(filePath)
				return
			}

			// SPA fallback — React Router sẽ render đúng trang
			c.File(distDir + "/index.html")
		})
	}

	return r
}
