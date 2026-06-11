import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SectionHeader from '../components/common/SectionHeader.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { productService } from '../services/productService.js';

const PAGE_SIZE = 12;

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('');
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category_id') || '');
  const [categories, setCategories] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Giá trị nhập (draft) — chỉ áp dụng khi bấm "Áp dụng"
  const [searchText, setSearchText] = useState('');
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');
  const [brandDraft, setBrandDraft] = useState('');

  // Giá trị đã áp dụng (dùng để fetch)
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [brand, setBrand] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const hasActiveFilters = Boolean(categoryId || minPrice || maxPrice || brand || query);

  // Fetch danh mục + danh sách hãng cho filter
  useEffect(() => {
    productService.getCategories().then((data) => {
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setCategories(list);
    }).catch(() => {});
    productService.getBrands().then(setBrandOptions).catch(() => {});
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
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          brand: brand || undefined,
        });

        if (!isMounted) return;

        setProducts(result.items);
        setTotal(result.total);
      } catch (err) {
        if (!isMounted) return;

        setError(err.message || 'Không thể tải danh sách sản phẩm.');
        setProducts([]);
        setTotal(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProducts();
    return () => { isMounted = false; };
  }, [page, query, reloadKey, sort, categoryId, minPrice, maxPrice, brand]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchText.trim());
    setMinPrice(minDraft);
    setMaxPrice(maxDraft);
    setBrand(brandDraft.trim());
  }

  function handleSortChange(event) {
    setPage(1);
    setSort(event.target.value);
  }

  function handleCategoryChange(event) {
    const value = event.target.value;
    if (value) setSearchParams({ category_id: value });
    else setSearchParams({});
    setPage(1);
  }

  function clearAllFilters() {
    setSearchText('');
    setMinDraft('');
    setMaxDraft('');
    setBrandDraft('');
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
    setBrand('');
    setSort('');
    setSearchParams({});
    setPage(1);
  }

  function retryFetch() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  const activeCategoryName = categories.find((c) => c.id === categoryId)?.name;

  return (
    <section className="section page-section">
      <div className="container">
        <SectionHeader eyebrow="Catalog" title="Tất cả sản phẩm" />

        <form className="filter-bar" onSubmit={applyFilters}>
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

        {/* Nút mở bộ lọc nâng cao */}
        <div className="advanced-filter-toggle">
          <button
            type="button"
            className={`advanced-toggle-btn${showAdvanced ? ' advanced-toggle-btn--open' : ''}`}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Bộ lọc nâng cao
          </button>
          {hasActiveFilters && (
            <button type="button" className="active-filter-clear" onClick={clearAllFilters}>
              <X size={14} /> Xóa tất cả bộ lọc
            </button>
          )}
        </div>

        {/* Panel bộ lọc nâng cao */}
        {showAdvanced && (
          <form className="advanced-filter-panel" onSubmit={applyFilters}>
            <div className="advanced-filter-grid">
              <label>
                Loại sản phẩm
                <select value={categoryId} onChange={handleCategoryChange}>
                  <option value="">Tất cả danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Hãng
                <input
                  type="text"
                  list="brand-options"
                  value={brandDraft}
                  placeholder="Tất cả hãng"
                  onChange={(e) => setBrandDraft(e.target.value)}
                />
                <datalist id="brand-options">
                  {brandOptions.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>

              <label>
                Giá từ (VNĐ)
                <input
                  type="number"
                  min="0"
                  value={minDraft}
                  placeholder="0"
                  onChange={(e) => setMinDraft(e.target.value)}
                />
              </label>

              <label>
                Giá đến (VNĐ)
                <input
                  type="number"
                  min="0"
                  value={maxDraft}
                  placeholder="Không giới hạn"
                  onChange={(e) => setMaxDraft(e.target.value)}
                />
              </label>
            </div>

            <div className="advanced-filter-actions">
              <Button type="submit">Áp dụng bộ lọc</Button>
              <Button type="button" variant="secondary" onClick={clearAllFilters}>
                Đặt lại
              </Button>
            </div>
          </form>
        )}

        {/* Chip hiển thị các filter đang áp dụng */}
        {hasActiveFilters && (
          <div className="active-filter-bar">
            {activeCategoryName && (
              <span className="active-filter-label">
                Danh mục: <strong>{activeCategoryName}</strong>
              </span>
            )}
            {brand && (
              <span className="active-filter-label">
                Hãng: <strong>{brand}</strong>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="active-filter-label">
                Giá: <strong>
                  {minPrice ? Number(minPrice).toLocaleString('vi-VN') : '0'}
                  {' – '}
                  {maxPrice ? Number(maxPrice).toLocaleString('vi-VN') : '∞'} đ
                </strong>
              </span>
            )}
            {query && (
              <span className="active-filter-label">
                Từ khóa: <strong>{query}</strong>
              </span>
            )}
            <button type="button" className="active-filter-clear" onClick={clearAllFilters}>
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
            <p>Hãy thử đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
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
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>
    </section>
  );
}
