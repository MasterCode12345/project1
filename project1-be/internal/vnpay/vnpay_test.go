package vnpay

import (
	"encoding/hex"
	"net/url"
	"strings"
	"testing"
	"time"

	"project1-be/internal/config"
	"project1-be/internal/model"
)

func testConfig() *config.Config {
	return &config.Config{
		VNPayTmnCode:    "DEMOV210",
		VNPayHashSecret: "test-secret",
		VNPayPayURL:     "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
		VNPayAPIURL:     "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
		VNPayReturnURL:  "https://domainmerchant.vn/ReturnUrl",
	}
}

func TestBuildSignatureDataMatchesVNPayEncoding(t *testing.T) {
	params := map[string]string{
		"vnp_Version":    "2.1.0",
		"vnp_Command":    "pay",
		"vnp_TmnCode":    "DEMOV210",
		"vnp_Amount":     "1806000",
		"vnp_CurrCode":   "VND",
		"vnp_IpAddr":     "127.0.0.1",
		"vnp_Locale":     "vn",
		"vnp_OrderInfo":  "Thanh toan don hang :5",
		"vnp_OrderType":  "other",
		"vnp_ReturnUrl":  "https://domainmerchant.vn/ReturnUrl",
		"vnp_TxnRef":     "5",
		"vnp_CreateDate": "20210801153333",
	}

	got := buildSignatureData(params)
	want := strings.Join([]string{
		"vnp_Amount=1806000",
		"vnp_Command=pay",
		"vnp_CreateDate=20210801153333",
		"vnp_CurrCode=VND",
		"vnp_IpAddr=127.0.0.1",
		"vnp_Locale=vn",
		"vnp_OrderInfo=Thanh+toan+don+hang+%3A5",
		"vnp_OrderType=other",
		"vnp_ReturnUrl=https%3A%2F%2Fdomainmerchant.vn%2FReturnUrl",
		"vnp_TmnCode=DEMOV210",
		"vnp_TxnRef=5",
		"vnp_Version=2.1.0",
	}, "&")

	if got != want {
		t.Fatalf("hash data mismatch\nwant: %s\n got: %s", want, got)
	}
	if strings.HasSuffix(got, "&") {
		t.Fatalf("hash data must not have a trailing &: %s", got)
	}
}

func TestHMACSHA512ReturnsLowercaseHexHash(t *testing.T) {
	hash := hmacSHA512("test-secret", "vnp_Amount=1000000&vnp_Command=pay")
	if len(hash) != 128 {
		t.Fatalf("expected SHA512 hex length 128, got %d", len(hash))
	}
	if _, err := hex.DecodeString(hash); err != nil {
		t.Fatalf("hash is not valid hex: %v", err)
	}
	if strings.ToLower(hash) != hash {
		t.Fatalf("hash must be lowercase hex: %s", hash)
	}
}

func TestVerifyReturnIgnoresSecureHashFields(t *testing.T) {
	secret := "test-secret"
	values := url.Values{
		"vnp_TmnCode":           {"DEMOV210"},
		"vnp_Amount":            {"1000000"},
		"vnp_BankCode":          {"NCB"},
		"vnp_OrderInfo":         {"Thanh toan don hang ORD001"},
		"vnp_ResponseCode":      {"00"},
		"vnp_TransactionNo":     {"14226112"},
		"vnp_TransactionStatus": {"00"},
		"vnp_TxnRef":            {"ORD001"},
	}

	params := map[string]string{}
	for k, vs := range values {
		params[k] = vs[0]
	}
	values.Set("vnp_SecureHash", hmacSHA512(secret, buildSignatureData(params)))
	values.Set("vnp_SecureHashType", "HmacSHA512")

	data, valid := VerifyReturn(values, secret, false)
	if !valid {
		t.Fatal("expected callback signature to be valid")
	}
	if data.TxnRef != "ORD001" || data.ResponseCode != "00" || data.TransactionStatus != "00" {
		t.Fatalf("unexpected return data: %+v", data)
	}
	amount, err := data.AmountInt64()
	if err != nil {
		t.Fatalf("amount should parse: %v", err)
	}
	if amount != 1000000 {
		t.Fatalf("unexpected amount: %d", amount)
	}
}

func TestBuildPaymentParams(t *testing.T) {
	cfg := testConfig()
	order := &model.Order{
		OrderCode:   "ORD001",
		TotalAmount: 10000,
	}
	now := time.Date(2026, 5, 23, 15, 31, 30, 0, time.UTC)

	params, err := buildPaymentParams(cfg, order, "::1", now)
	if err != nil {
		t.Fatalf("buildPaymentParams returned error: %v", err)
	}

	if params["vnp_Amount"] != "1000000" {
		t.Fatalf("amount must be multiplied by 100, got %s", params["vnp_Amount"])
	}
	if params["vnp_IpAddr"] != "127.0.0.1" {
		t.Fatalf("loopback IPv6 should be normalized, got %s", params["vnp_IpAddr"])
	}
	if params["vnp_SecureHashType"] != "" {
		t.Fatal("vnp_SecureHashType must not be sent for VNPay 2.1.0")
	}
}

func TestBuildPaymentParamsNormalizesPublicIPv6(t *testing.T) {
	cfg := testConfig()
	order := &model.Order{
		OrderCode:   "ORD001",
		TotalAmount: 10000,
	}

	params, err := buildPaymentParams(cfg, order, "2401:d800:f12:e0f4:242f:94f1:d32f:25e", time.Now())
	if err != nil {
		t.Fatalf("buildPaymentParams returned error: %v", err)
	}

	if params["vnp_IpAddr"] != "127.0.0.1" {
		t.Fatalf("public IPv6 should use IPv4 fallback for VNPay sandbox, got %s", params["vnp_IpAddr"])
	}
}

func TestCreatePaymentURLSignsExactQueryParams(t *testing.T) {
	cfg := testConfig()
	order := &model.Order{
		OrderCode:   "ORD001",
		TotalAmount: 10000,
	}

	paymentURL, err := CreatePaymentURL(cfg, order, "127.0.0.1")
	if err != nil {
		t.Fatalf("CreatePaymentURL returned error: %v", err)
	}

	parsed, err := url.Parse(paymentURL)
	if err != nil {
		t.Fatalf("payment URL should parse: %v", err)
	}
	values := parsed.Query()
	if values.Get("vnp_SecureHashType") != "" {
		t.Fatal("vnp_SecureHashType must not be sent for VNPay 2.1.0")
	}

	providedHash := values.Get("vnp_SecureHash")
	if providedHash == "" {
		t.Fatal("payment URL must include vnp_SecureHash")
	}
	values.Del("vnp_SecureHash")

	params := map[string]string{}
	for k, vs := range values {
		params[k] = vs[0]
	}
	expectedHash := hmacSHA512(cfg.VNPayHashSecret, buildSignatureData(params))
	if providedHash != expectedHash {
		t.Fatalf("payment URL hash mismatch\nwant: %s\n got: %s", expectedHash, providedHash)
	}
}

func TestValidateConfig(t *testing.T) {
	tests := []struct {
		name    string
		mutate  func(*config.Config)
		wantErr bool
	}{
		{
			name:    "valid",
			mutate:  func(*config.Config) {},
			wantErr: false,
		},
		{
			name: "missing secret",
			mutate: func(cfg *config.Config) {
				cfg.VNPayHashSecret = ""
			},
			wantErr: true,
		},
		{
			name: "invalid tmn code length",
			mutate: func(cfg *config.Config) {
				cfg.VNPayTmnCode = "SHORT"
			},
			wantErr: true,
		},
		{
			name: "invalid pay url",
			mutate: func(cfg *config.Config) {
				cfg.VNPayPayURL = "sandbox.vnpayment.vn/payment"
			},
			wantErr: true,
		},
		{
			name: "mixed sandbox and production urls",
			mutate: func(cfg *config.Config) {
				cfg.VNPayAPIURL = "https://pay.vnpay.vn/merchant_webapi/api/transaction"
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := testConfig()
			tt.mutate(cfg)
			err := ValidateConfig(cfg)
			if tt.wantErr && err == nil {
				t.Fatal("expected error")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
