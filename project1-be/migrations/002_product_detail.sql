-- =====================================================================
-- MIGRATION 002: Thêm bảng hỗ trợ product detail
--   - product_images: nhiều ảnh cho 1 sản phẩm
--   - product_attributes: thông số kỹ thuật (key-value)
--   - product_highlights: tính năng nổi bật
-- =====================================================================

-- =====================================================================
-- 1. PRODUCT_IMAGES — gallery ảnh sản phẩm
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_images (
    id         BIGSERIAL    PRIMARY KEY,
    product_id BIGINT       NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- =====================================================================
-- 2. PRODUCT_ATTRIBUTES — thông số kỹ thuật
--    Ví dụ: "Kích thước màn hình" = "6.9 inches"
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_attributes (
    id         BIGSERIAL    PRIMARY KEY,
    product_id BIGINT       NOT NULL,
    attr_name  VARCHAR(150) NOT NULL,
    attr_value TEXT         NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_product_attributes_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_product_attributes_product_id ON product_attributes(product_id);

-- =====================================================================
-- 3. PRODUCT_HIGHLIGHTS — tính năng nổi bật
--    Ví dụ: "Chip A19 Pro mạnh mẽ, GPU 6 lõi"
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_highlights (
    id         BIGSERIAL    PRIMARY KEY,
    product_id BIGINT       NOT NULL,
    content    TEXT         NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_product_highlights_product
        FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_product_highlights_product_id ON product_highlights(product_id);
