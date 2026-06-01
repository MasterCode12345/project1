package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv  string
	AppPort string

	MongoURI    string
	MongoDBName string

	JWTSecret       string
	JWTExpiresHours int

	CORSAllowedOrigin string

	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string

	// SMTP — gửi email xác minh tài khoản
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string
	AppURL       string // URL FE, dùng để build link xác minh

	// VNPay
	VNPayTmnCode    string
	VNPayHashSecret string
	VNPayPayURL     string
	VNPayAPIURL     string
	VNPayReturnURL  string // URL FE nhận kết quả từ VNPay
	VNPayDebug      bool
}

func Load() *Config {
	if _, err := os.Stat(".env"); err == nil {
		if err := godotenv.Load(); err != nil {
			log.Printf("[config] .env tồn tại nhưng load lỗi: %v", err)
		}
	}

	cfg := &Config{
		AppEnv:  getEnv("APP_ENV", "development"),
		AppPort: getEnv("APP_PORT", "8080"),

		MongoURI:    mustEnv("MONGO_URI"),
		MongoDBName: mustEnv("MONGO_DB"),

		JWTSecret:       mustEnv("JWT_SECRET"),
		JWTExpiresHours: getEnvInt("JWT_EXPIRES_HOURS", 24),

		CORSAllowedOrigin: getEnv("CORS_ALLOWED_ORIGIN", "http://localhost:5173"),

		CloudinaryCloudName: mustEnv("CLOUDINARY_CLOUD_NAME"),
		CloudinaryAPIKey:    mustEnv("CLOUDINARY_API_KEY"),
		CloudinaryAPISecret: mustEnv("CLOUDINARY_API_SECRET"),

		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     getEnv("SMTP_PORT", "587"),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", "no-reply@unimarket.vn"),
		AppURL:       getEnv("APP_URL", "http://localhost:5173"),

		VNPayTmnCode:    getEnv("VNPAY_TMN_CODE", ""),
		VNPayHashSecret: getEnv("VNPAY_HASH_SECRET", ""),
		VNPayPayURL:     getEnv("VNPAY_PAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"),
		VNPayAPIURL:     getEnv("VNPAY_API_URL", "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"),
		VNPayReturnURL:  getEnv("VNPAY_RETURN_URL", "http://localhost:5173/payment/vnpay/return"),
		VNPayDebug:      getEnvBool("VNPAY_DEBUG", false),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("[config] thiếu biến môi trường bắt buộc: %s", key)
	}
	return v
}
