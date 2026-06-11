import { Check, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';
import { cartService } from '../../services/cartService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export default function ProductCard({ product }) {
  const soldOut = product.stock_quantity <= 0;
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAddToCart() {
    if (soldOut || isAdding) return;
    setIsAdding(true);
    try {
      await cartService.addItem(product, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch {
      // bỏ qua lỗi giỏ hàng (lưu local)
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <article className={`product-card${soldOut ? ' product-card--soldout' : ''}`}>
      <Link className="product-image" to={`/products/${product.id}`}>
        {soldOut && <span className="soldout-badge">Sold out</span>}
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} />
        ) : (
          <span>{product.category_name || 'Sản phẩm'}</span>
        )}
      </Link>
      <div className="product-content">
        <div className="product-info">
          <p className="product-category">{product.category_name || 'Danh mục'}</p>
          <Link className="product-title" to={`/products/${product.id}`}>
            {product.name}
          </Link>
        </div>
        <div className="product-meta">
          <strong>{currencyFormatter.format(product.price)}</strong>
          {soldOut ? (
            <span className="stock-soldout">Sold out</span>
          ) : (
            <span>Còn {product.stock_quantity}</span>
          )}
        </div>
        <div className="product-card-actions">
          <Button
            type="button"
            className="product-card-cart-btn"
            disabled={soldOut || isAdding}
            onClick={handleAddToCart}
          >
            {added ? <Check size={18} /> : <ShoppingCart size={18} />}
            {soldOut ? 'Hết hàng' : added ? 'Đã thêm' : isAdding ? 'Đang thêm…' : 'Thêm vào giỏ'}
          </Button>
          <Button variant="secondary" to={`/products/${product.id}`}>
            Chi tiết
          </Button>
        </div>
      </div>
    </article>
  );
}
