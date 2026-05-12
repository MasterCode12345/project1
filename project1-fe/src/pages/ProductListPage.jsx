import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { productService } from '../services/productService.js';

const PAGE_SIZE = 12;

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState('');
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category_id') || '');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // Fetch categories để hiện tên danh mục đang lọc
  useEffect(() => {
    productService.getCategories().then((data) => {
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setCategories(list);
    }).catch(() => {});
  }, []);

  // Đọc category_id từ URL khi params thay đổi
  useEffect(() => {
    const catId = searchParams.get('category_id') || '';
    setCategoryId(catId);
    setPage(1);
  }, [searchParams]);

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
          category_id: categoryId || undefined,
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
  }, [page, query, reloadKey, sort, categoryId]);

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

        {/* Hiển thị filter category đang active */}
        {categoryId && (
          <div className="active-filter-bar">
            <span className="active-filter-label">
              Danh mục: <strong>
                {categories.find((c) => c.id === categoryId)?.name || categoryId}
              </strong>
            </span>
            <button
              type="button"
              className="active-filter-clear"
              onClick={() => {
                setSearchParams({});
                setCategoryId('');
                setPage(1);
              }}
            >
              <X size={14} /> Xóa lọc
            </button>
          </div>
        )}

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
