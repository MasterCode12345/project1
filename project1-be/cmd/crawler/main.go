package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	"project1-be/internal/model"
)

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

var categoryPages = map[string]string{
	"mobile":            "Điện thoại",
	"laptop":            "Laptop",
	"tablet":            "Máy tính bảng",
	"thiet-bi-am-thanh": "Âm thanh",
	"phu-kien":          "Phụ kiện",
}

func main() {
	_ = godotenv.Load()

	mongoURI := os.Getenv("MONGO_URI")
	mongoDB := os.Getenv("MONGO_DB")
	if mongoURI == "" || mongoDB == "" {
		log.Fatal("Cần set MONGO_URI và MONGO_DB trong .env")
	}

	ctx := context.Background()
	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Kết nối MongoDB lỗi: %v", err)
	}
	defer client.Disconnect(ctx)

	db := client.Database(mongoDB)

	targets := []string{"mobile"}
	maxProducts := 50
	if len(os.Args) > 1 {
		targets = []string{os.Args[1]}
	}
	if len(os.Args) > 2 {
		if n, err := strconv.Atoi(os.Args[2]); err == nil {
			maxProducts = n
		}
	}

	fmt.Println("=== CellphoneS Crawler ===")
	fmt.Printf("Danh mục có sẵn: %v\n", categoryPages)
	fmt.Printf("Cách dùng: go run ./cmd/crawler [category] [max_products]\n")
	fmt.Printf("Ví dụ:     go run ./cmd/crawler mobile 100\n\n")

	for _, slug := range targets {
		catName, ok := categoryPages[slug]
		if !ok {
			log.Printf("Danh mục '%s' không tồn tại, bỏ qua", slug)
			continue
		}

		cat := findOrCreateCategory(ctx, db.Collection("categories"), catName)
		log.Printf("[%s] category_id=%s", catName, cat.ID.Hex())

		listingURL := fmt.Sprintf("https://cellphones.com.vn/%s.html", slug)
		productURLs := extractProductURLs(listingURL)
		log.Printf("[%s] Tìm được %d product URLs", catName, len(productURLs))

		if len(productURLs) > maxProducts {
			productURLs = productURLs[:maxProducts]
		}

		crawlProducts(ctx, db.Collection("products"), productURLs, cat)
	}

	fmt.Println("\n=== Hoàn tất crawl! ===")
}

func findOrCreateCategory(ctx context.Context, col *mongo.Collection, name string) *model.Category {
	var cat model.Category
	err := col.FindOne(ctx, bson.M{"name": name}).Decode(&cat)
	if err == nil {
		return &cat
	}

	now := time.Now()
	cat = model.Category{
		Name:      name,
		IsVisible: true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	res, err := col.InsertOne(ctx, cat)
	if err != nil {
		log.Fatalf("Tạo category lỗi: %v", err)
	}
	cat.ID = res.InsertedID.(bson.ObjectID)
	return &cat
}

// ========== Step 1: Extract product URLs from listing page ==========

func extractProductURLs(listingURL string) []string {
	doc, err := fetchDoc(listingURL)
	if err != nil {
		log.Printf("Lỗi fetch listing %s: %v", listingURL, err)
		return nil
	}

	seen := map[string]bool{}
	var urls []string

	doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		if !isProductURL(href) {
			return
		}
		if seen[href] {
			return
		}
		seen[href] = true
		urls = append(urls, href)
	})

	return urls
}

func isProductURL(href string) bool {
	if !strings.HasPrefix(href, "https://cellphones.com.vn/") {
		return false
	}
	path := strings.TrimPrefix(href, "https://cellphones.com.vn/")
	if !strings.HasSuffix(path, ".html") {
		return false
	}
	if strings.Contains(path, "/") {
		return false
	}
	skipPrefixes := []string{
		"mobile", "laptop", "tablet", "phu-kien", "thiet-bi-am-thanh",
		"do-choi-cong-nghe", "may-tinh-de-ban", "man-hinh", "may-in",
		"tivi", "dien-may", "hang-cu", "sforum", "tin-tuc", "khuyen-mai",
	}
	for _, p := range skipPrefixes {
		if path == p+".html" {
			return false
		}
	}
	return true
}

// ========== Step 2: Crawl each product detail page ==========

type jsonLDProduct struct {
	Name        string `json:"name"`
	Image       string `json:"image"`
	SKU         string `json:"sku"`
	Description string `json:"description"`
	Offers      struct {
		Price         string `json:"price"`
		PriceCurrency string `json:"priceCurrency"`
	} `json:"offers"`
	AdditionalProperty []struct {
		Name  string `json:"name"`
		Value string `json:"value"`
	} `json:"additionalProperty"`
}

func crawlProducts(ctx context.Context, col *mongo.Collection, urls []string, cat *model.Category) {
	for i, url := range urls {
		product := crawlProductDetail(url, cat)
		if product == nil {
			continue
		}

		result, err := col.UpdateOne(ctx,
			bson.M{"sku": product.SKU},
			bson.M{"$setOnInsert": product},
			options.UpdateOne().SetUpsert(true),
		)
		if err != nil {
			log.Printf("  [!] Lỗi insert %s: %v", product.Name, err)
			continue
		}

		status := "mới"
		if result.UpsertedCount == 0 {
			status = "đã có"
		}
		log.Printf("  [%d/%d] [%s] %s — %.0fđ", i+1, len(urls), status, product.Name, product.Price)

		sleepRandom()
	}
}

func crawlProductDetail(url string, cat *model.Category) *model.Product {
	doc, err := fetchDoc(url)
	if err != nil {
		log.Printf("  [!] Lỗi fetch %s: %v", url, err)
		return nil
	}

	var ld *jsonLDProduct
	doc.Find(`script[type="application/ld+json"]`).Each(func(_ int, s *goquery.Selection) {
		text := s.Text()
		if !strings.Contains(text, `"@type":"Product"`) {
			return
		}
		var p jsonLDProduct
		if err := json.Unmarshal([]byte(text), &p); err == nil {
			ld = &p
		}
	})

	if ld == nil {
		log.Printf("  [!] Không tìm thấy JSON-LD Product: %s", url)
		return nil
	}

	price, _ := strconv.ParseFloat(ld.Offers.Price, 64)
	if price <= 0 {
		price = 0
	}

	sku := ld.SKU
	if sku == "" {
		slug := strings.TrimPrefix(url, "https://cellphones.com.vn/")
		sku = strings.TrimSuffix(slug, ".html")
	}

	now := time.Now()
	imageURL := enlargeImageURL(ld.Image)

	prod := &model.Product{
		SKU:           sku,
		Name:          strings.TrimSpace(ld.Name),
		Price:         price,
		ImageURL:      &imageURL,
		CategoryID:    cat.ID,
		CategoryName:  cat.Name,
		StockQuantity: 100,
		IsVisible:     true,
		Images:        []model.ProductImage{},
		Attributes:    []model.ProductAttribute{},
		Highlights:    []model.ProductHighlight{},
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if ld.Description != "" {
		desc := strings.TrimSpace(ld.Description)
		if len(desc) > 5000 {
			desc = desc[:5000]
		}
		prod.Description = &desc
	}

	// Gallery images from SSR HTML
	galleryImages := extractGalleryImages(doc)
	for i, imgURL := range galleryImages {
		prod.Images = append(prod.Images, model.ProductImage{
			ID:        bson.NewObjectID(),
			ImageURL:  imgURL,
			SortOrder: i,
		})
	}

	// Specs from JSON-LD
	for i, prop := range ld.AdditionalProperty {
		if prop.Name == "" || prop.Value == "" {
			continue
		}
		prod.Attributes = append(prod.Attributes, model.ProductAttribute{
			ID:        bson.NewObjectID(),
			AttrName:  prop.Name,
			AttrValue: prop.Value,
			SortOrder: i,
		})
	}

	// Highlights from SSR HTML
	highlights := extractHighlights(doc)
	for i, hl := range highlights {
		prod.Highlights = append(prod.Highlights, model.ProductHighlight{
			ID:        bson.NewObjectID(),
			Content:   hl,
			SortOrder: i,
		})
	}

	return prod
}

// ========== HTML extraction helpers ==========

func extractGalleryImages(doc *goquery.Document) []string {
	seen := map[string]bool{}
	var images []string

	doc.Find("img[src]").Each(func(_ int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if !strings.Contains(src, "cdn2.cellphones.com.vn") {
			return
		}
		if !strings.Contains(src, "/media/catalog/product/") {
			return
		}
		src = enlargeImageURL(src)
		if seen[src] {
			return
		}
		seen[src] = true
		images = append(images, src)
	})

	return images
}

func extractHighlights(doc *goquery.Document) []string {
	var highlights []string

	doc.Find("li, .highlight-item, .feature-item").Each(func(_ int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if len(text) < 10 || len(text) > 500 {
			return
		}
		if strings.Contains(strings.ToLower(text), "mua ngay") ||
			strings.Contains(strings.ToLower(text), "xem thêm") ||
			strings.Contains(strings.ToLower(text), "đăng ký") {
			return
		}
		highlights = append(highlights, text)
	})

	if len(highlights) > 10 {
		highlights = highlights[:10]
	}
	return highlights
}

func enlargeImageURL(url string) string {
	url = strings.ReplaceAll(url, "/200x/", "/x/")
	url = strings.ReplaceAll(url, "/358x/", "/x/")
	url = strings.ReplaceAll(url, "/200x,webp/", "/x/")
	return url
}

// ========== HTTP helpers ==========

func fetchDoc(url string) (*goquery.Document, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml")
	req.Header.Set("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	return goquery.NewDocumentFromReader(resp.Body)
}

func sleepRandom() {
	ms := 800 + rand.Intn(2000)
	time.Sleep(time.Duration(ms) * time.Millisecond)
}
