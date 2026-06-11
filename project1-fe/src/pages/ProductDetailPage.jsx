import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { cartService } from '../services/cartService.js';
import { productService } from '../services/productService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

function DetailSkeleton() {
  return (
    <div className="detail-grid">
      <div className="detail-media skeleton-block" />
      <div className="detail-content detail-skeleton-content">
        <span className="skeleton-line short" />
        <span className="skeleton-line medium skeleton-title" />
        <span className="skeleton-line" />
        <span className="skeleton-line medium" />
        <span className="skeleton-line short skeleton-price" />
        <span className="skeleton-line short" />
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function fetchProduct() {
      setIsLoading(true);
      setError('');
      setQuantity(1);

      try {
        const data = await productService.getProductById(id);
        if (isMounted) {
          setProduct(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải thông tin sản phẩm.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setIsAdding(true);
    try {
      await cartService.addItem(product, quantity);
      setAddFeedback('success');
    } catch {
      setAddFeedback('error');
    } finally {
      setIsAdding(false);
      setTimeout(() => setAddFeedback(''), 2500);
    }
  }

  const outOfStock = product && product.stock_quantity === 0;

  return (
    <section className="section page-section">
      <div className="container">
        {isLoading && <DetailSkeleton />}

        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được sản phẩm</h2>
            <p>{error}</p>
            <Button variant="secondary" to="/products">
              Quay lại danh sách
            </Button>
          </div>
        )}

        {!isLoading && !error && product && (
          <div className="detail-grid">
            {/* Ảnh sản phẩm */}
            <div className={`detail-media${outOfStock ? ' detail-media--soldout' : ''}`}>
              {outOfStock && <span className="soldout-badge soldout-badge--lg">Sold out</span>}
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                <span>{product.name}</span>
              )}
            </div>

            {/* Thông tin sản phẩm */}
            <div className="detail-content">
              <p className="eyebrow">{product.category_name}</p>
              <h1>{product.name}</h1>

              {product.description && (
                <p className="detail-description">{product.description}</p>
              )}

              <strong className="detail-price">
                {currencyFormatter.format(product.price)}
              </strong>

              <p className={`stock-text${outOfStock ? ' stock-text--soldout' : ''}`}>
                {outOfStock ? 'Sold out — Hết hàng' : `Còn ${product.stock_quantity} sản phẩm`}
              </p>

              {/* Chọn số lượng */}
              {!outOfStock && (
                <div className="qty-row">
                  <button
                    className="qty-btn"
                    type="button"
                    aria-label="Giảm số lượng"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="qty-value">{quantity}</span>
                  <button
                    className="qty-btn"
                    type="button"
                    aria-label="Tăng số lượng"
                    disabled={quantity >= product.stock_quantity}
                    onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                  >
                    +
                  </button>
                </div>
              )}

              {/* Hành động */}
              <div className="detail-actions">
                <Button
                  type="button"
                  disabled={isAdding || outOfStock}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={18} />
                  {isAdding ? 'Đang thêm…' : 'Thêm vào giỏ'}
                </Button>
                <Button variant="secondary" to="/cart">
                  Xem giỏ hàng
                </Button>
              </div>

              {/* Phản hồi thêm vào giỏ */}
              {addFeedback === 'success' && (
                <p className="add-feedback add-feedback--success">
                  ✓ Đã thêm {quantity} sản phẩm vào giỏ hàng.
                </p>
              )}
              {addFeedback === 'error' && (
                <p className="add-feedback add-feedback--error">
                  Thêm vào giỏ thất bại, vui lòng thử lại.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
