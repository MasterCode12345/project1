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

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("[config] thiếu biến môi trường bắt buộc: %s", key)
	}
	return v
}
