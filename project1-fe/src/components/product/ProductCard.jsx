import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../common/Button.jsx';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export default function ProductCard({ product }) {
  return (
    <article className="product-card">
      <Link className="product-image" to={`/products/${product.id}`}>
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
          <span>Còn {product.stock_quantity}</span>
        </div>
        <Button variant="secondary" to={`/products/${product.id}`}>
          <ShoppingCart size={18} />
          Xem chi tiết
        </Button>
      </div>
    </article>
  );
}
