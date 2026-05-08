import { ArrowRight, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { featuredProducts } from './mockProducts.js';

const benefits = [
  { icon: PackageCheck, title: 'Sản phẩm chọn lọc', text: 'Tập trung vào nhu cầu học tập, làm việc và sinh hoạt trong trường.' },
  { icon: Truck, title: 'Giao nhanh nội khu', text: 'Chuẩn bị cho luồng giao hàng đơn giản khi backend checkout hoàn thiện.' },
  { icon: ShieldCheck, title: 'Tài khoản bảo mật', text: 'Sẵn sàng dùng JWT và phân quyền admin từ backend hiện tại.' },
];

export default function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Modern University E-Commerce</p>
            <h1>UniMarket</h1>
            <p>
              Cửa hàng e-commerce tối giản cho môi trường đại học, ưu tiên trải nghiệm mua sắm rõ ràng,
              nhanh và dễ mở rộng theo API backend Go hiện có.
            </p>
            <div className="hero-actions">
              <Button to="/products">
                Khám phá sản phẩm
                <ArrowRight size={18} />
              </Button>
              <Button to="/login" variant="ghost">
                Đăng nhập
              </Button>
            </div>
          </div>
          <div className="hero-panel" aria-label="Tổng quan cửa hàng">
            <div className="hero-stat">
              <span>128+</span>
              <p>Sản phẩm học tập</p>
            </div>
            <div className="hero-product-preview">
              <span>Featured</span>
              <strong>Bộ starter kit học kỳ mới</strong>
              <p>Notebook, bút gel, tai nghe học online và bình nước.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="benefit-card" key={benefit.title}>
                <Icon size={24} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeader
            eyebrow="Gợi ý hôm nay"
            title="Sản phẩm nổi bật"
            description="Dữ liệu mock tạm thời, component đã sẵn sàng nhận response từ /api/v1/products."
            action={<Button to="/products" variant="secondary">Xem tất cả</Button>}
          />
          <div className="product-grid">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
