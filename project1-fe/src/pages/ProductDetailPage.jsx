import { useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { featuredProducts } from './mockProducts.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = featuredProducts.find((item) => item.id === id) || featuredProducts[0];

  return (
    <section className="section page-section">
      <div className="container detail-grid">
        <div className="detail-media">
          {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>{product.name}</span>}
        </div>
        <div className="detail-content">
          <p className="eyebrow">{product.category_name}</p>
          <h1>{product.name}</h1>
          <p className="detail-description">
            Trang chi tiết đang dùng mock data. Sau này lấy dữ liệu qua productService.getProductById(id).
          </p>
          <strong className="detail-price">{currencyFormatter.format(product.price)}</strong>
          <p className="stock-text">Còn {product.stock_quantity} sản phẩm</p>
          <div className="detail-actions">
            <Button>Thêm vào giỏ</Button>
            <Button variant="secondary" to="/cart">Xem giỏ hàng</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
