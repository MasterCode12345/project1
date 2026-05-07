package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/apperror"
)

func respond(c *gin.Context, status int, data interface{}) {
	c.JSON(status, gin.H{"data": data})
}

func respondError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	if appErr, ok := apperror.IsAppError(err); ok {
		c.JSON(appErr.Status, gin.H{
			"error": gin.H{
				"code":    appErr.Code,
				"message": appErr.Message,
			},
		})
		if appErr.Cause != nil {
			log.Printf("[error] %s | cause: %v", appErr.Code, appErr.Cause)
		}
		return
	}

	log.Printf("[error] unhandled: %v", err)
	c.JSON(http.StatusInternalServerError, gin.H{
		"error": gin.H{
			"code":    apperror.ErrInternal.Code,
			"message": apperror.ErrInternal.Message,
		},
	})
}

func parseObjectIDParam(c *gin.Context, name string) (bson.ObjectID, error) {
	hex := c.Param(name)
	oid, err := bson.ObjectIDFromHex(hex)
	if err != nil {
		return bson.ObjectID{}, apperror.New("INVALID_ID", "ID không hợp lệ", http.StatusBadRequest)
	}
	return oid, nil
}
