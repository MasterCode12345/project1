import { ArrowRight, ChevronLeft, ChevronRight, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { productService } from '../services/productService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const benefits = [
  {
    icon: PackageCheck,
    title: 'Sản phẩm chính hãng',
    text: 'Laptop, điện thoại, phụ kiện được chọn lọc kỹ — phù hợp nhu cầu học tập và làm việc.',
  },
  {
    icon: Truck,
    title: 'Giao hàng nhanh',
    text: 'Giao hàng nội khu trong ngày, đổi trả minh bạch trong 30 ngày.',
  },
  {
    icon: ShieldCheck,
    title: 'Thanh toán an toàn',
    text: 'Bảo mật tài khoản với JWT, phân quyền rõ ràng giữa khách hàng và quản trị viên.',
  },
];

function ProductCardSkeleton() {
  return (
    <article className="product-card product-card-skeleton">
      <div className="product-image skeleton-block" />
      <div className="product-content">
        <span className="skeleton-line short" />
        <span className="skeleton-line" />
        <span className="skeleton-line medium" />
      </div>
    </article>
  );
}

// ── Carousel ────────────────────────────────
function ProductCarousel({ products, isLoading }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState('next'); // 'next' | 'prev'
  const total = products.length;

  // Auto-advance mỗi 5 giây
  useEffect(() => {
    if (total < 2) return;
    const timer = setInterval(() => {
      setDir('next');
      setIndex((i) => (i + 1) % total);
    }, 5000);
    return () => clearInterval(timer);
  }, [total]);

  function prev() {
    setDir('prev');
    setIndex((i) => (i - 1 + total) % total);
  }

  function next() {
    setDir('next');
    setIndex((i) => (i + 1) % total);
  }

  if (isLoading) {
    return (
      <div className="home-carousel-skeleton">
        <div className="home-carousel-slide-skeleton">
          <div className="skeleton-block home-carousel-img-skeleton" />
          <div className="home-carousel-info-skeleton">
            <span className="skeleton-line short" style={{ height: 13 }} />
            <span className="skeleton-line medium" style={{ height: 28, marginTop: 8 }} />
            <span className="skeleton-line" style={{ height: 14, marginTop: 12 }} />
            <span className="skeleton-line short" style={{ height: 36, marginTop: 20, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  const product = products[index];

  return (
    <div className="home-carousel">
      {/* Slide — key thay đổi mỗi lần để trigger animation */}
      <div className="home-carousel-slide" key={`${product.id}-${index}`} data-dir={dir}>
        {/* Ảnh */}
        <Link className="home-carousel-media" to={`/products/${product.id}`}>
          {product.image_url
            ? <img src={product.image_url} alt={product.name} />
            : <span className="home-carousel-placeholder">{product.name.charAt(0)}</span>}
        </Link>

        {/* Thông tin */}
        <div className="home-carousel-info">
          <p className="eyebrow">{product.category_name}</p>
          <h2 className="home-carousel-name">{product.name}</h2>
          <strong className="home-carousel-price">
            {currencyFormatter.format(product.price)}
          </strong>
          <p className="home-carousel-stock">Còn {product.stock_quantity} sản phẩm</p>
          <div className="home-carousel-actions">
            <Button to={`/products/${product.id}`}>
              Xem chi tiết <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button className="home-carousel-btn home-carousel-btn--prev" type="button" onClick={prev} aria-label="Trước">
            <ChevronLeft size={22} />
          </button>
          <button className="home-carousel-btn home-carousel-btn--next" type="button" onClick={next} aria-label="Tiếp">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="home-carousel-dots">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`home-carousel-dot${i === index ? ' home-carousel-dot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────
export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [carouselProducts, setCarouselProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalProducts, setTotalProducts] = useState(null);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [isLoadingCarousel, setIsLoadingCarousel] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [productRes, catRes, carouselRes] = await Promise.all([
          productService.getProducts({ page: 1, page_size: 4, sort: 'newest' }),
          productService.getCategories(),
          productService.getProducts({ page: 1, page_size: 8, sort: 'newest' }),
        ]);

        if (isMounted) {
          setFeaturedProducts(productRes.items);
          setTotalProducts(productRes.total);
          setCarouselProducts(carouselRes.items);
          const catList = Array.isArray(catRes) ? catRes : (catRes?.items ?? []);
          setCategories(catList.slice(0, 6));
        }
      } catch {
        // trang chủ không hiện lỗi
      } finally {
        if (isMounted) {
          setIsLoadingFeatured(false);
          setIsLoadingCarousel(false);
        }
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, []);

  return (
    <>
      {/* ── HERO ─────────────────────────────── */}
      <section className="hero-section">
        <div className="container home-hero-inner">
          <p className="eyebrow">UniMarket — Cửa hàng đại học</p>
          <h1 className="home-hero-title">
            Tất cả những gì bạn cần <br />
            <span className="home-hero-accent">cho học kỳ mới.</span>
          </h1>
          <p className="home-hero-sub">
            Laptop, điện thoại, phụ kiện công nghệ chính hãng —<br />
            giao hàng tận tay trong khuôn viên trường.
          </p>
          <div className="home-hero-actions">
            <Button to="/products">
              Mua sắm ngay <ArrowRight size={18} />
            </Button>
            <Button to="/register" variant="ghost">
              Tạo tài khoản
            </Button>
          </div>

          {/* Stats bar */}
          <div className="home-stats-bar">
            <div className="home-stat-item">
              <strong>{totalProducts !== null ? `${totalProducts}+` : '—'}</strong>
              <span>Sản phẩm</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat-item">
              <strong>{categories.length > 0 ? `${categories.length}` : '—'}</strong>
              <span>Danh mục</span>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat-item">
              <strong>100%</strong>
              <span>Chính hãng</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAROUSEL ─────────────────────────── */}
      <section className="section">
        <div className="container">
          <SectionHeader
            eyebrow="Nổi bật hôm nay"
            title="Sản phẩm đang hot"
          />
          <ProductCarousel products={carouselProducts} isLoading={isLoadingCarousel} />
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────── */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeader
              eyebrow="Danh mục"
              title="Khám phá theo nhu cầu"
              action={<Button to="/products" variant="secondary">Xem tất cả</Button>}
            />
            <div className="home-category-grid">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  className="home-category-card"
                  to={`/products?category_id=${cat.id}`}
                >
                  <span className="home-category-name">{cat.name}</span>
                  <ArrowRight size={16} className="home-category-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ────────────────── */}
      <section className="section">
        <div className="container">
          <SectionHeader
            eyebrow="Mới nhất"
            title="Vừa cập nhật"
            description="Những sản phẩm mới nhất từ kho hàng."
            action={<Button to="/products" variant="secondary">Xem tất cả</Button>}
          />
          <div className="product-grid">
            {isLoadingFeatured
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ─────────────────────────── */}
      <section className="section home-benefits-section">
        <div className="container">
          <SectionHeader
            eyebrow="Tại sao chọn UniMarket"
            title="Mua sắm thông minh hơn"
          />
          <div className="benefit-grid">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article className="benefit-card" key={benefit.title}>
                  <Icon size={28} />
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────── */}
      <section className="home-cta-section">
        <div className="container home-cta-inner">
          <h2 className="home-cta-title">Sẵn sàng cho học kỳ mới?</h2>
          <p>Đăng ký ngay để nhận thông báo sản phẩm mới và ưu đãi dành riêng cho sinh viên.</p>
          <div className="home-hero-actions" style={{ marginTop: 24 }}>
            <Button to="/register">
              Tạo tài khoản miễn phí <ArrowRight size={18} />
            </Button>
            <Button to="/products" variant="secondary">
              Xem sản phẩm
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
