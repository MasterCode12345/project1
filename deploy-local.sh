#!/bin/bash
# ================================================================
# deploy-local.sh — Build FE và nhúng vào BE để dùng 1 cổng duy nhất
#
# Cách dùng:
#   ./deploy-local.sh https://abc123.ngrok-free.app
#
# Sau khi chạy xong, khởi động BE:
#   cd project1-be && go run ./cmd/server/main.go
# Rồi public bằng ngrok:
#   ngrok http 8080
# ================================================================

set -e  # dừng ngay nếu có lỗi

NGROK_URL=$1

# ── Kiểm tra tham số ────────────────────────────────────────────
if [ -z "$NGROK_URL" ]; then
  echo ""
  echo "❌  Thiếu URL ngrok!"
  echo "    Cách dùng: ./deploy-local.sh https://abc123.ngrok-free.app"
  echo ""
  exit 1
fi

# Bỏ dấu / ở cuối URL nếu có
NGROK_URL="${NGROK_URL%/}"

echo ""
echo "🚀  Bắt đầu deploy với URL: $NGROK_URL"
echo "================================================"

# ── Bước 1: Cập nhật config FE ──────────────────────────────────
echo ""
echo "📝  [1/4] Cập nhật VITE_API_BASE_URL cho FE..."

cat > project1-fe/.env.production << EOF
VITE_API_BASE_URL=$NGROK_URL
EOF

echo "    ✓ project1-fe/.env.production đã cập nhật"

# ── Bước 2: Cập nhật config BE ──────────────────────────────────
echo ""
echo "📝  [2/4] Cập nhật config BE (.env)..."

BE_ENV="project1-be/.env"

# Hàm helper: thêm dòng nếu chưa có, cập nhật nếu đã có
update_env() {
  local key=$1
  local value=$2
  if grep -q "^${key}=" "$BE_ENV"; then
    # macOS và Linux đều dùng được cách này
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$BE_ENV" && rm -f "${BE_ENV}.bak"
  else
    echo "${key}=${value}" >> "$BE_ENV"
  fi
}

update_env "CORS_ALLOWED_ORIGIN" "$NGROK_URL"
update_env "APP_URL"              "$NGROK_URL"
update_env "VNPAY_RETURN_URL"     "$NGROK_URL/payment/vnpay/return"

echo "    ✓ CORS_ALLOWED_ORIGIN = $NGROK_URL"
echo "    ✓ APP_URL             = $NGROK_URL"
echo "    ✓ VNPAY_RETURN_URL    = $NGROK_URL/payment/vnpay/return"

# ── Bước 3: Build FE ────────────────────────────────────────────
echo ""
echo "📦  [3/4] Build FE (npm run build)..."
echo "    Có thể mất 30-60 giây..."

cd project1-fe
npm run build
cd ..

echo "    ✓ Build thành công → project1-fe/dist/"

# ── Bước 4: Copy dist vào BE ────────────────────────────────────
echo ""
echo "📁  [4/4] Copy dist/ vào project1-be/..."

rm -rf project1-be/dist
cp -r project1-fe/dist project1-be/dist

echo "    ✓ project1-be/dist/ đã sẵn sàng"

# ── Xong ────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "✅  Deploy hoàn tất!"
echo ""
echo "Bước tiếp theo:"
echo ""
echo "  1. Mở terminal 1 — khởi động BE:"
echo "     cd ~/Graduation1/project1-be"
echo "     go run ./cmd/server/main.go"
echo ""
echo "  2. Mở terminal 2 — public bằng ngrok:"
echo "     ngrok http 8080"
echo ""
echo "  3. Truy cập: $NGROK_URL"
echo ""
