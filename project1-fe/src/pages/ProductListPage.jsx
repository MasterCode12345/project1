import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { productService } from '../services/productService.js';

const PAGE_SIZE = 12;

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      setIsLoading(true);
      setError('');

      try {
        const result = await productService.getProducts({
          page,
          page_size: PAGE_SIZE,
          q: query,
          sort,
        });

        if (!isMounted) {
          return;
        }

        setProducts(result.items);
        setTotal(result.total);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(err.message || 'Không thể tải danh sách sản phẩm.');
        setProducts([]);
        setTotal(0);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [page, query, reloadKey, sort]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchText.trim());
  }

  function handleSortChange(event) {
    setPage(1);
    setSort(event.target.value);
  }

  function retryFetch() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return (
    <section className="section page-section">
      <div className="container">
        <SectionHeader
          eyebrow="Catalog"
          title="Tất cả sản phẩm"
          description="Danh sách sản phẩm được lấy từ API public của backend."
        />

        <form className="filter-bar" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchText}
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
            onChange={(event) => setSearchText(event.target.value)}
          />
          <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={handleSortChange}>
            <option value="">Sắp xếp mặc định</option>
            <option value="newest">Mới nhất</option>
            <option value="name_asc">Tên A-Z</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <Button type="submit" className="filter-submit">
            <Search size={18} />
            Tìm
          </Button>
        </form>

        {isLoading && (
          <div className="product-grid" aria-label="Đang tải sản phẩm">
            {Array.from({ length: 8 }).map((_, index) => (
              <article className="product-card product-card-skeleton" key={index}>
                <div className="product-image skeleton-block" />
                <div className="product-content">
                  <span className="skeleton-line short" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line medium" />
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được sản phẩm</h2>
            <p>{error}</p>
            <Button type="button" onClick={retryFetch}>
              Thử lại
            </Button>
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="empty-state">
            <h2>Không có sản phẩm phù hợp</h2>
            <p>Hãy thử đổi từ khóa tìm kiếm hoặc bộ sắp xếp.</p>
          </div>
        )}

        {!isLoading && !error && products.length > 0 && (
          <>
            <div className="result-summary">
              <span>{total} sản phẩm</span>
              <span>
                Trang {page}/{totalPages}
              </span>
            </div>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="pagination-bar">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                Trang trước
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              >
                Trang sau
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
