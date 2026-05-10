import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { productService } from '../services/productService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const PAGE_SIZE = 15;

const EMPTY_FORM = {
  sku: '',
  name: '',
  description: '',
  price: '',
  image_url: '',
  category_id: '',
  stock_quantity: '0',
};

// --- Skeleton row ---
function RowSkeleton() {
  return (
    <tr className="admin-product-row">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><span className="skeleton-line" style={{ height: 14, width: i === 1 ? '80%' : '60%' }} /></td>
      ))}
    </tr>
  );
}

export default function AdminProductsPage() {
  const navigate = useNavigate();

  // --- Auth guard ---
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  // --- List state ---
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [togglingId, setTogglingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  // --- Form state ---
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formServerError, setFormServerError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // --- Fetch products ---
  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;

    async function fetchProducts() {
      setIsLoading(true);
      setListError('');
      try {
        const res = await productService.getAdminProducts({ page, page_size: PAGE_SIZE, q: query });
        const items = Array.isArray(res.items) ? res.items : [];
        if (isMounted) {
          setProducts(items);
          setTotal(Number(res.total ?? items.length));
        }
      } catch (err) {
        if (isMounted) setListError(err.message || 'Không thể tải sản phẩm.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchProducts();
    return () => { isMounted = false; };
  }, [page, query, reloadKey]);

  // --- Fetch categories for form ---
  useEffect(() => {
    productService.getCategories().then((data) => {
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setCategories(list);
    }).catch(() => {});
  }, []);

  // --- Handlers ---
  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setQuery(searchText.trim());
  }

  async function handleToggleVisibility(product) {
    setTogglingId(product.id);
    try {
      await productService.updateVisibility(product.id, !product.is_visible);
      setProducts((prev) =>
        prev.map((p) => p.id === product.id ? { ...p, is_visible: !p.is_visible } : p)
      );
    } catch (err) {
      alert(err.message || 'Cập nhật thất bại.');
    } finally {
      setTogglingId('');
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(product.id);
    try {
      await productService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err.message || 'Xóa thất bại.');
    } finally {
      setDeletingId('');
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormServerError('');
    setFormSuccess('');
    setEditingId('');
    setView('create');
  }

  function openEdit(product) {
    setForm({
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      price: String(product.price || ''),
      image_url: product.image_url || '',
      category_id: product.category_id || '',
      stock_quantity: String(product.stock_quantity ?? 0),
    });
    setFormErrors({});
    setFormServerError('');
    setFormSuccess('');
    setEditingId(product.id);
    setView('edit');
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (formServerError) setFormServerError('');
  }

  function validateForm() {
    const errs = {};
    if (!form.sku.trim()) errs.sku = 'Vui lòng nhập SKU';
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên sản phẩm';
    if (!form.price || Number(form.price) < 0) errs.price = 'Giá không hợp lệ';
    if (!form.category_id) errs.category_id = 'Vui lòng chọn danh mục';
    return errs;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }

    setIsSaving(true);
    setFormServerError('');
    setFormSuccess('');

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image_url: form.image_url.trim(),
      category_id: form.category_id,
      stock_quantity: Number(form.stock_quantity) || 0,
    };

    try {
      if (view === 'create') {
        await productService.createProduct(payload);
        setFormSuccess('Tạo sản phẩm thành công!');
        setTimeout(() => {
          setView('list');
          setReloadKey((k) => k + 1);
        }, 1200);
      } else {
        // For update, only send changed fields (UpdateProductInput is all optional)
        await productService.updateProduct(editingId, payload);
        setFormSuccess('Cập nhật sản phẩm thành công!');
        setTimeout(() => {
          setView('list');
          setReloadKey((k) => k + 1);
        }, 1200);
      }
    } catch (err) {
      setFormServerError(err.message || 'Lưu thất bại, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  // =================== FORM VIEW ===================
  if (view === 'create' || view === 'edit') {
    return (
      <section className="section page-section">
        <div className="container">
          <div className="admin-form-header">
            <button className="admin-back-btn" type="button" onClick={() => setView('list')}>
              ← Quay lại danh sách
            </button>
            <p className="eyebrow">Admin</p>
            <h1>{view === 'create' ? 'Thêm sản phẩm mới' : 'Chỉnh sửa sản phẩm'}</h1>
          </div>

          <form className="admin-product-form" onSubmit={handleFormSubmit} noValidate>
            {formServerError && <p className="auth-error">{formServerError}</p>}
            {formSuccess && <p className="add-feedback add-feedback--success">{formSuccess}</p>}

            <div className="admin-form-grid">
              {/* Cột trái */}
              <div className="profile-section">
                <h2>Thông tin cơ bản</h2>
                <div className="profile-form">
                  <label>
                    SKU <span className="required-mark">*</span>
                    <input type="text" name="sku" value={form.sku} placeholder="SP001" onChange={handleFormChange} />
                    {formErrors.sku && <span className="field-error">{formErrors.sku}</span>}
                  </label>
                  <label>
                    Tên sản phẩm <span className="required-mark">*</span>
                    <input type="text" name="name" value={form.name} placeholder="iPhone 15 Pro Max 256GB" onChange={handleFormChange} />
                    {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                  </label>
                  <label>
                    Mô tả
                    <textarea name="description" value={form.description} rows={4} placeholder="Mô tả chi tiết sản phẩm..." onChange={handleFormChange} />
                  </label>
                  <label>
                    URL ảnh đại diện
                    <input type="url" name="image_url" value={form.image_url} placeholder="https://..." onChange={handleFormChange} />
                  </label>
                </div>
              </div>

              {/* Cột phải */}
              <div className="profile-section">
                <h2>Giá & Kho hàng</h2>
                <div className="profile-form">
                  <label>
                    Giá (VNĐ) <span className="required-mark">*</span>
                    <input type="number" name="price" value={form.price} placeholder="0" min="0" onChange={handleFormChange} />
                    {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                  </label>
                  <label>
                    Tồn kho
                    <input type="number" name="stock_quantity" value={form.stock_quantity} placeholder="0" min="0" onChange={handleFormChange} />
                  </label>
                  <label>
                    Danh mục <span className="required-mark">*</span>
                    <select name="category_id" value={form.category_id} onChange={handleFormChange}>
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {formErrors.category_id && <span className="field-error">{formErrors.category_id}</span>}
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-form-actions">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Đang lưu…' : view === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setView('list')}>
                Hủy
              </Button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  // =================== LIST VIEW ===================
  return (
    <section className="section page-section">
      <div className="container">
        <div className="section-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Quản lý sản phẩm</h1>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} /> Thêm sản phẩm
          </Button>
        </div>

        {/* Search */}
        <form className="filter-bar" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            value={searchText}
            placeholder="Tìm theo tên, SKU..."
            aria-label="Tìm sản phẩm"
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button type="submit" className="filter-submit">
            <Search size={18} /> Tìm
          </Button>
        </form>

        {/* Error */}
        {!isLoading && listError && (
          <div className="empty-state error-state">
            <h2>Không tải được sản phẩm</h2>
            <p>{listError}</p>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !listError && products.length === 0 && (
          <div className="empty-state">
            <h2>Chưa có sản phẩm</h2>
            <p>Bấm "Thêm sản phẩm" để tạo sản phẩm đầu tiên.</p>
          </div>
        )}

        {/* Table */}
        {(isLoading || products.length > 0) && !listError && (
          <>
            {!isLoading && (
              <div className="result-summary">
                <span>{total} sản phẩm</span>
                <span>Trang {page}/{totalPages}</span>
              </div>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ảnh</th>
                    <th>SKU</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                    <th>Tồn kho</th>
                    <th>Hiển thị</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
                    : products.map((product) => (
                        <tr className="admin-product-row" key={product.id}>
                          <td>
                            <div className="admin-product-thumb">
                              {product.image_url
                                ? <img src={product.image_url} alt={product.name} />
                                : <span>{(product.name || '?').charAt(0)}</span>}
                            </div>
                          </td>
                          <td className="admin-sku">{product.sku}</td>
                          <td className="admin-product-name">{product.name}</td>
                          <td>{product.category_name}</td>
                          <td className="admin-price">{currencyFormatter.format(product.price)}</td>
                          <td className={product.stock_quantity <= 5 ? 'admin-stock--low' : ''}>
                            {product.stock_quantity}
                          </td>
                          <td>
                            <button
                              className="admin-visibility-btn"
                              type="button"
                              title={product.is_visible ? 'Đang hiển thị' : 'Đang ẩn'}
                              disabled={togglingId === product.id}
                              onClick={() => handleToggleVisibility(product)}
                            >
                              {product.is_visible
                                ? <Eye size={18} color="var(--primary-dark)" />
                                : <EyeOff size={18} color="var(--text-muted)" />}
                            </button>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="admin-action-btn admin-action-btn--edit"
                                type="button"
                                title="Chỉnh sửa"
                                onClick={() => openEdit(product)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="admin-action-btn admin-action-btn--delete"
                                type="button"
                                title="Xóa"
                                disabled={deletingId === product.id}
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && (
              <div className="pagination-bar">
                <Button type="button" variant="secondary" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Trang trước
                </Button>
                <Button type="button" variant="secondary" disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Trang sau
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
