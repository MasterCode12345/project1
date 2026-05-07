package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/apperror"
)

const (
	CtxUserID = "ctx_user_id"
	CtxRole   = "ctx_role"
)

const (
	RoleAdmin    = "admin"
	RoleCustomer = "customer"
)

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func RequireAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			abortWithError(c, apperror.ErrUnauthorized)
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortWithError(c, apperror.ErrUnauthorized)
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			abortWithError(c, apperror.ErrTokenInvalid)
			return
		}

		oid, err := bson.ObjectIDFromHex(claims.UserID)
		if err != nil {
			abortWithError(c, apperror.ErrTokenInvalid)
			return
		}

		c.Set(CtxUserID, oid)
		c.Set(CtxRole, claims.Role)
		c.Next()
	}
}

func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get(CtxRole)
		if !exists || role != RoleAdmin {
			abortWithError(c, apperror.ErrForbidden)
			return
		}
		c.Next()
	}
}

func GetUserID(c *gin.Context) bson.ObjectID {
	v, ok := c.Get(CtxUserID)
	if !ok {
		return bson.ObjectID{}
	}
	if id, ok := v.(bson.ObjectID); ok {
		return id
	}
	return bson.ObjectID{}
}

func GetRole(c *gin.Context) string {
	v, ok := c.Get(CtxRole)
	if !ok {
		return ""
	}
	if r, ok := v.(string); ok {
		return r
	}
	return ""
}

func abortWithError(c *gin.Context, e *apperror.AppError) {
	c.AbortWithStatusJSON(e.Status, gin.H{
		"error": gin.H{
			"code":    e.Code,
			"message": e.Message,
		},
	})
}
