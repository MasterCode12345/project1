// Package vnpay cung cấp tiện ích tích hợp cổng thanh toán VNPay v2.1.0.
package vnpay

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math"
	"net"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"project1-be/internal/config"
	"project1-be/internal/model"
)

const (
	version    = "2.1.0"
	commandPay = "pay"
	currCode   = "VND"
	localeVN   = "vn"
	orderType  = "other"
)

var vietnamLocation = time.FixedZone("Asia/Ho_Chi_Minh", 7*60*60)

type ReturnData struct {
	TmnCode           string
	TxnRef            string
	Amount            string
	ResponseCode      string
	TransactionStatus string
}

func (r ReturnData) AmountInt64() (int64, error) {
	return strconv.ParseInt(r.Amount, 10, 64)
}

// ValidateConfig kiểm tra phần cấu hình bắt buộc trước khi tạo URL thanh toán.
func ValidateConfig(cfg *config.Config) error {
	if cfg == nil {
		return errors.New("VNPay config is nil")
	}

	tmnCode := strings.TrimSpace(cfg.VNPayTmnCode)
	hashSecret := strings.TrimSpace(cfg.VNPayHashSecret)
	payURL := strings.TrimSpace(cfg.VNPayPayURL)
	apiURL := strings.TrimSpace(cfg.VNPayAPIURL)
	returnURL := strings.TrimSpace(cfg.VNPayReturnURL)

	if tmnCode == "" {
		return errors.New("VNPAY_TMN_CODE is required")
	}
	if len(tmnCode) != 8 {
		return fmt.Errorf("VNPAY_TMN_CODE must be 8 characters, got %d", len(tmnCode))
	}
	if hashSecret == "" {
		return errors.New("VNPAY_HASH_SECRET is required")
	}
	if err := validateHTTPURL("VNPAY_PAY_URL", payURL); err != nil {
		return err
	}
	if err := validateHTTPURL("VNPAY_RETURN_URL", returnURL); err != nil {
		return err
	}
	if apiURL != "" {
		if err := validateHTTPURL("VNPAY_API_URL", apiURL); err != nil {
			return err
		}
		if isSandboxURL(payURL) != isSandboxURL(apiURL) {
			return errors.New("VNPAY_PAY_URL and VNPAY_API_URL must use the same sandbox/production environment")
		}
	}

	return nil
}

func validateHTTPURL(name, raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return fmt.Errorf("%s must be a valid absolute URL", name)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("%s must use http or https", name)
	}
	return nil
}

func isSandboxURL(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(parsed.Host), "sandbox")
}

// hmacSHA512 tính HMAC-SHA512, trả về hex viết thường.
func hmacSHA512(key, data string) string {
	h := hmac.New(sha512.New, []byte(key))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

// sortedNonEmptyKeys trả về keys đã sort, bỏ qua giá trị rỗng.
func sortedNonEmptyKeys(params map[string]string) []string {
	keys := make([]string, 0, len(params))
	for k, v := range params {
		if v != "" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)
	return keys
}

// buildSignatureData tạo chuỗi để ký theo đúng chuẩn VNPay 2.1.0:
// sắp xếp key theo alpha, key=value (value được percent-encode), nối bằng &.
func buildSignatureData(params map[string]string) string {
	keys := sortedNonEmptyKeys(params)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+url.QueryEscape(params[k]))
	}
	return strings.Join(parts, "&")
}

func orderedParamsForLog(params map[string]string) string {
	keys := sortedNonEmptyKeys(params)
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, k+"="+params[k])
	}
	return strings.Join(parts, "&")
}

func sanitizeIP(ipAddr string) string {
	ipAddr = strings.TrimSpace(ipAddr)
	if ipAddr == "" || ipAddr == "::1" {
		return "127.0.0.1"
	}
	if strings.Contains(ipAddr, ",") {
		ipAddr = strings.TrimSpace(strings.Split(ipAddr, ",")[0])
	}
	if host, _, err := net.SplitHostPort(ipAddr); err == nil {
		ipAddr = host
	}
	if ipAddr == "::1" {
		return "127.0.0.1"
	}
	parsed := net.ParseIP(ipAddr)
	if parsed == nil {
		return "127.0.0.1"
	}
	if parsed.To4() == nil {
		return "127.0.0.1"
	}
	return ipAddr
}

func buildPaymentParams(cfg *config.Config, order *model.Order, ipAddr string, now time.Time) (map[string]string, error) {
	if err := ValidateConfig(cfg); err != nil {
		return nil, err
	}
	if order == nil {
		return nil, errors.New("order is nil")
	}

	orderCode := strings.TrimSpace(order.OrderCode)
	if orderCode == "" {
		return nil, errors.New("order code is required")
	}

	amountVND := int64(math.Round(order.TotalAmount))
	if amountVND <= 0 {
		return nil, errors.New("order total amount must be greater than zero")
	}

	now = now.In(vietnamLocation)
	createDate := now.Format("20060102150405")
	expireDate := now.Add(15 * time.Minute).Format("20060102150405")

	return map[string]string{
		"vnp_Version":    version,
		"vnp_Command":    commandPay,
		"vnp_TmnCode":    strings.TrimSpace(cfg.VNPayTmnCode),
		"vnp_Amount":     strconv.FormatInt(amountVND*100, 10),
		"vnp_CurrCode":   currCode,
		"vnp_TxnRef":     orderCode,
		"vnp_OrderInfo":  "Thanh toan don hang " + orderCode,
		"vnp_OrderType":  orderType,
		"vnp_Locale":     localeVN,
		"vnp_ReturnUrl":  strings.TrimSpace(cfg.VNPayReturnURL),
		"vnp_IpAddr":     sanitizeIP(ipAddr),
		"vnp_CreateDate": createDate,
		"vnp_ExpireDate": expireDate,
	}, nil
}

// CreatePaymentURL tạo URL thanh toán VNPay.
func CreatePaymentURL(cfg *config.Config, order *model.Order, ipAddr string) (string, error) {
	params, err := buildPaymentParams(cfg, order, ipAddr, time.Now())
	if err != nil {
		return "", err
	}

	hashSecret := strings.TrimSpace(cfg.VNPayHashSecret)
	signData := buildSignatureData(params)
	secureHash := hmacSHA512(hashSecret, signData)

	if cfg.VNPayDebug {
		log.Printf("[VNPay] CreatePaymentURL TxnRef=%s Amount=%s CreateDate=%s ExpireDate=%s",
			params["vnp_TxnRef"], params["vnp_Amount"], params["vnp_CreateDate"], params["vnp_ExpireDate"])
		log.Printf("[VNPay] CreatePaymentURL Params   : %s", orderedParamsForLog(params))
		log.Printf("[VNPay] CreatePaymentURL HashData : %s", signData)
		log.Printf("[VNPay] CreatePaymentURL Hash     : %s", secureHash)
	}

	separator := "?"
	payURL := strings.TrimSpace(cfg.VNPayPayURL)
	if strings.Contains(payURL, "?") {
		separator = "&"
	}
	return payURL + separator + signData + "&vnp_SecureHash=" + secureHash, nil
}

// VerifyReturn xác thực chữ ký VNPay trả về trên return URL.
// Params đã được Go HTTP framework URL-decode nên cần re-encode theo cùng chuẩn ký.
func VerifyReturn(queryValues url.Values, hashSecret string, debug bool) (ReturnData, bool) {
	data := ReturnData{
		TmnCode:           queryValues.Get("vnp_TmnCode"),
		TxnRef:            queryValues.Get("vnp_TxnRef"),
		Amount:            queryValues.Get("vnp_Amount"),
		ResponseCode:      queryValues.Get("vnp_ResponseCode"),
		TransactionStatus: queryValues.Get("vnp_TransactionStatus"),
	}

	providedHash := strings.TrimSpace(queryValues.Get("vnp_SecureHash"))
	if providedHash == "" {
		return data, false
	}

	params := make(map[string]string)
	for k, vs := range queryValues {
		if k == "vnp_SecureHash" || k == "vnp_SecureHashType" {
			continue
		}
		if len(vs) > 0 && vs[0] != "" {
			params[k] = vs[0]
		}
	}

	signData := buildSignatureData(params)
	expectedHash := hmacSHA512(strings.TrimSpace(hashSecret), signData)
	valid := strings.EqualFold(expectedHash, providedHash)

	if debug {
		log.Printf("[VNPay] VerifyReturn TxnRef=%s ResponseCode=%s TransactionStatus=%s",
			data.TxnRef, data.ResponseCode, data.TransactionStatus)
		log.Printf("[VNPay] VerifyReturn Params   : %s", orderedParamsForLog(params))
		log.Printf("[VNPay] VerifyReturn HashData : %s", signData)
		log.Printf("[VNPay] VerifyReturn Expected : %s", expectedHash)
		log.Printf("[VNPay] VerifyReturn Provided : %s", providedHash)
		log.Printf("[VNPay] VerifyReturn Valid    : %v", valid)
	}

	return data, valid
}
