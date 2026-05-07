// Package apperror định nghĩa typed error dùng xuyên suốt domain.
// Handler dùng errors.Is/As để map sang HTTP status — không so sánh string.
package apperror

import (
	"errors"
	"fmt"
	"net/http"
)

// AppError là error có gắn HTTP status + mã code.
type AppError struct {
	Code    string // mã ngắn cho FE switch (vd "OUT_OF_STOCK")
	Message string // thông điệp tiếng Việt cho FE hiển thị
	Status  int    // HTTP status để handler trả về
	Cause   error  // error gốc (optional)
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error { return e.Cause }

// New tạo AppError mới với cause = nil.
func New(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status}
}

// Wrap bọc error gốc thành AppError.
func Wrap(cause error, code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status, Cause: cause}
}

// IsAppError check & cast về *AppError.
func IsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

// =====================================================================
// Sentinel errors — dùng errors.Is() để check
// =====================================================================
var (
	// 400 - Bad Request
	ErrInvalidInput = New("INVALID_INPUT", "Dữ liệu đầu vào không hợp lệ", http.StatusBadRequest)

	// 401 - Unauthorized
	ErrUnauthorized       = New("UNAUTHORIZED", "Bạn chưa đăng nhập", http.StatusUnauthorized)
	ErrInvalidCredentials = New("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", http.StatusUnauthorized)
	ErrTokenInvalid       = New("TOKEN_INVALID", "Token không hợp lệ hoặc đã hết hạn", http.StatusUnauthorized)

	// 403 - Forbidden
	ErrForbidden = New("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này", http.StatusForbidden)

	// 404 - Not Found
	ErrNotFound         = New("NOT_FOUND", "Không tìm thấy", http.StatusNotFound)
	ErrUserNotFound     = New("USER_NOT_FOUND", "Không tìm thấy người dùng", http.StatusNotFound)
	ErrProductNotFound  = New("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm", http.StatusNotFound)
	ErrCategoryNotFound = New("CATEGORY_NOT_FOUND", "Không tìm thấy danh mục", http.StatusNotFound)
	ErrCartItemNotFound = New("CART_ITEM_NOT_FOUND", "Không tìm thấy sản phẩm trong giỏ hàng", http.StatusNotFound)
	ErrOrderNotFound    = New("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng", http.StatusNotFound)

	// 409 - Conflict
	ErrEmailExists         = New("EMAIL_EXISTS", "Email đã được sử dụng", http.StatusConflict)
	ErrSKUExists           = New("SKU_EXISTS", "Mã sản phẩm đã tồn tại", http.StatusConflict)
	ErrCategoryNameTaken   = New("CATEGORY_NAME_TAKEN", "Tên danh mục đã tồn tại", http.StatusConflict)
	ErrCategoryHasProducts = New("CATEGORY_HAS_PRODUCTS", "Không thể xóa danh mục đang có sản phẩm", http.StatusConflict)

	// 422 - Business rule
	ErrOutOfStock        = New("OUT_OF_STOCK", "Sản phẩm đã hết hàng hoặc không đủ số lượng", http.StatusUnprocessableEntity)
	ErrEmptyCart         = New("EMPTY_CART", "Giỏ hàng trống — không thể tạo đơn", http.StatusUnprocessableEntity)
	ErrCannotCancelOrder = New("CANNOT_CANCEL_ORDER", "Đơn hàng đã được xử lý — không thể hủy", http.StatusUnprocessableEntity)
	ErrProductHidden     = New("PRODUCT_HIDDEN", "Sản phẩm hiện không bán", http.StatusUnprocessableEntity)

	// 500 - Internal
	ErrInternal = New("INTERNAL", "Có lỗi xảy ra phía server", http.StatusInternalServerError)
)
