# project1-be — Backend Web E-commerce

Đồ án 1 — Web E-commerce. Backend Go + Gin + PostgreSQL.

## Cấu trúc dự án

```
project1-be/
├── cmd/server/main.go            # entry point: load config, wire dependencies, chạy HTTP server
├── internal/
│   ├── apperror/                 # typed errors (ErrNotFound, ErrOutOfStock...)
│   ├── config/                   # đọc env, struct Config
│   ├── database/                 # mở Postgres pool, define DBTX interface
│   ├── middleware/               # JWT auth, CORS, RequireAdmin
│   ├── model/                    # struct User/Category/Product/Cart/Order + DTO
│   ├── repository/               # CRUD layer (raw SQL)
│   ├── service/                  # business logic layer
│   ├── handler/                  # HTTP layer (Gin handlers)
│   └── router/                   # đăng ký routes
├── .env.example                  # template biến môi trường
├── .gitignore
├── go.mod
└── README.md
```

## Cài đặt & chạy

### 1. Cài dependencies
```bash
go mod tidy
```

### 2. Tạo file `.env`
```bash
cp .env.example .env
# rồi mở .env, sửa DB_USER, DB_PASSWORD theo Postgres của bạn
```

### 3. Đảm bảo Postgres đã chạy với database `project1_web`
Đã làm ở DataGrip (chạy `schema.sql` + `seed.sql`).

### 4. Chạy server
```bash
go run ./cmd/server
```

Server lắng nghe tại `http://localhost:8080`. Test:
```bash
curl http://localhost:8080/health
# {"status":"ok","service":"project1-be"}
```

## API Contract — tóm tắt

Mọi response thành công có dạng `{"data": ...}`.
Mọi response lỗi có dạng `{"error": {"code": "...", "message": "..."}}`.

### Public
| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/register` | Đăng ký |
| POST | `/api/v1/auth/login` | Đăng nhập, trả JWT |
| GET | `/api/v1/categories` | Danh sách danh mục đang hiện |
| GET | `/api/v1/products` | List sản phẩm (page, page_size, category_id, q, min_price, max_price, sort) |
| GET | `/api/v1/products/:id` | Chi tiết sản phẩm |

### Authenticated (Bearer token)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/me` | Profile |
| PUT | `/api/v1/me` | Cập nhật profile |
| PUT | `/api/v1/me/password` | Đổi mật khẩu |
| GET | `/api/v1/cart` | Giỏ hàng của tôi |
| POST | `/api/v1/cart/items` | Thêm sản phẩm vào giỏ |
| PATCH | `/api/v1/cart/items/:id` | Cập nhật số lượng |
| DELETE | `/api/v1/cart/items/:id` | Xóa khỏi giỏ |
| POST | `/api/v1/orders` | Đặt hàng từ giỏ (transaction: trừ stock + tạo order + clear giỏ) |
| GET | `/api/v1/orders` | Đơn hàng của tôi |
| GET | `/api/v1/orders/:id` | Chi tiết đơn hàng |
| POST | `/api/v1/orders/:id/cancel` | Hủy đơn (chỉ khi status=pending) |

### Admin (Bearer token + role=admin)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | Số liệu tổng quan |
| GET | `/api/v1/admin/categories` | List (cả ẩn) |
| POST | `/api/v1/admin/categories` | Tạo |
| PUT | `/api/v1/admin/categories/:id` | Cập nhật |
| DELETE | `/api/v1/admin/categories/:id` | Xóa (block nếu có sản phẩm) |
| GET | `/api/v1/admin/products` | List (cả ẩn) |
| GET | `/api/v1/admin/products/:id` | Chi tiết |
| POST | `/api/v1/admin/products` | Tạo |
| PUT | `/api/v1/admin/products/:id` | Cập nhật (partial) |
| PATCH | `/api/v1/admin/products/:id/visibility` | Ẩn/hiện |
| DELETE | `/api/v1/admin/products/:id` | Xóa (block nếu đã có order) |
| GET | `/api/v1/admin/orders` | Mọi đơn |
| PATCH | `/api/v1/admin/orders/:id/status` | Cập nhật trạng thái (state machine) |
| GET | `/api/v1/admin/users` | List user |
| PATCH | `/api/v1/admin/users/:id/status` | Khóa/mở khóa user |

## Tạo tài khoản admin đầu tiên

Server không có endpoint `register` cho admin (an toàn). Sau khi register 1 customer xong, mở DataGrip:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Test nhanh bằng curl

```bash
# Đăng ký
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@a.vn","password":"123456","full_name":"Test User"}'

# Đăng nhập (lấy token)
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@a.vn","password":"123456"}' | jq -r '.data.token')

# Xem profile
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/me

# Xem sản phẩm
curl http://localhost:8080/api/v1/products?page=1&page_size=5
```

## Architecture overview

```
HTTP request
   ↓
[Gin Router] → [middleware: CORS, RequireAuth, RequireAdmin]
   ↓
[Handler]   ← parse request, validate
   ↓
[Service]   ← business logic, transaction, stock check
   ↓
[Repository] ← raw SQL queries
   ↓
PostgreSQL
```

- **Mỗi tầng chỉ phụ thuộc vào tầng dưới qua interface** — dễ mock test, dễ swap impl.
- **AppError typed** xuyên suốt — handler dùng `respondError()` để map sang HTTP status tự động.
- **Transaction** chỉ dùng khi cần (đặt đơn, hủy đơn) — repo nhận `database.DBTX` interface nên dùng được cả `*sql.DB` và `*sql.Tx`.
- **JWT** stateless — không cần Redis hay session store.
