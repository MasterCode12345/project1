package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"

	"project1-be/internal/model"
)

func buildProductFilter(c *gin.Context) model.ProductFilter {
	f := model.ProductFilter{
		Query: c.Query("q"),
		Sort:  c.Query("sort"),
	}
	f.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	f.PageSize, _ = strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if v := c.Query("category_id"); v != "" {
		if oid, err := bson.ObjectIDFromHex(v); err == nil {
			f.CategoryID = &oid
		}
	}
	if v := c.Query("min_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil && p >= 0 {
			f.MinPrice = &p
		}
	}
	if v := c.Query("max_price"); v != "" {
		if p, err := strconv.ParseFloat(v, 64); err == nil && p >= 0 {
			f.MaxPrice = &p
		}
	}
	return f
}
