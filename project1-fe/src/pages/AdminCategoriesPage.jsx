import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { categoryService } from '../services/categoryService.js';

const EMPTY_FORM = { name: '', description: '' };

function RowSkeleton() {
  return (
    <tr className="admin-product-row">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i}>
          <span className="skeleton-line" style={{ height: 14, width: i === 0 ? '50%' : '70%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminCategoriesPage() {
  const navigate = useNavigate();

  // --- Auth guard ---
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  // --- List state ---
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
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

  // --- Fetch categories ---
  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;

    async function fetchCategories() {
      setIsLoading(true);
      setListError('');
      try {
        const data = await categoryService.getAdminCategories();
        if (isMounted) setCategories(data);
      } catch (err) {
        if (isMounted) setListError(err.message || 'Không thể tải danh mục.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchCategories();
    return () => { isMounted = false; };
  }, []);

  // --- List handlers ---
  async function handleToggleVisibility(cat) {
    setTogglingId(cat.id);
    try {
      const updated = await categoryService.updateCategory(cat.id, {
        is_visible: !cat.is_visible,
      });
      setCategories((prev) =>
        prev.map((c) => c.id === cat.id ? { ...c, is_visible: updated.is_visible } : c)
      );
    } catch (err) {
      alert(err.message || 'Cập nhật thất bại.');
    } finally {
      setTogglingId('');
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Xóa danh mục "${cat.name}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(cat.id);
    try {
      await categoryService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert(err.message || 'Xóa thất bại.');
    } finally {
      setDeletingId('');
    }
  }

  // --- Form handlers ---
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormServerError('');
    setFormSuccess('');
    setEditingId('');
    setView('create');
  }

  function openEdit(cat) {
    setForm({ name: cat.name, description: cat.description || '' });
    setFormErrors({});
    setFormServerError('');
    setFormSuccess('');
    setEditingId(cat.id);
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
    if (!form.name.trim()) errs.name = 'Vui lòng nhập tên danh mục';
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
      name: form.name.trim(),
      description: form.description.trim(),
    };

    try {
      if (view === 'create') {
        const created = await categoryService.createCategory(payload);
        setCategories((prev) => [...prev, created]);
        setFormSuccess('Tạo danh mục thành công!');
      } else {
        const updated = await categoryService.updateCategory(editingId, payload);
        setCategories((prev) =>
          prev.map((c) => c.id === editingId ? updated : c)
        );
        setFormSuccess('Cập nhật danh mục thành công!');
      }
      setTimeout(() => setView('list'), 1200);
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
            <h1>{view === 'create' ? 'Thêm danh mục mới' : 'Chỉnh sửa danh mục'}</h1>
          </div>

          <form
            className="profile-section"
            style={{ maxWidth: 560 }}
            onSubmit={handleFormSubmit}
            noValidate
          >
            {formServerError && <p className="auth-error">{formServerError}</p>}
            {formSuccess && <p className="add-feedback add-feedback--success">{formSuccess}</p>}

            <div className="profile-form">
              <label>
                Tên danh mục <span className="required-mark">*</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  placeholder="Laptop, Điện thoại..."
                  onChange={handleFormChange}
                />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </label>

              <label>
                Mô tả
                <textarea
                  name="description"
                  value={form.description}
                  rows={4}
                  placeholder="Mô tả ngắn về danh mục..."
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <div className="admin-form-actions" style={{ marginTop: 20 }}>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Đang lưu…' : view === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}
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
            <h1>Quản lý danh mục</h1>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} /> Thêm danh mục
          </Button>
        </div>

        {/* Error */}
        {!isLoading && listError && (
          <div className="empty-state error-state">
            <h2>Không tải được danh mục</h2>
            <p>{listError}</p>
            <Button type="button" onClick={() => window.location.reload()}>Thử lại</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !listError && categories.length === 0 && (
          <div className="empty-state">
            <h2>Chưa có danh mục</h2>
            <p>Bấm "Thêm danh mục" để tạo danh mục đầu tiên.</p>
          </div>
        )}

        {/* Table */}
        {(isLoading || categories.length > 0) && !listError && (
          <>
            {!isLoading && (
              <div className="result-summary">
                <span>{categories.length} danh mục</span>
              </div>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên danh mục</th>
                    <th>Mô tả</th>
                    <th>Hiển thị</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                    : categories.map((cat) => (
                        <tr className="admin-product-row" key={cat.id}>
                          <td className="category-name-cell">{cat.name}</td>
                          <td className="category-desc-cell">
                            {cat.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td>
                            <button
                              className="admin-visibility-btn"
                              type="button"
                              title={cat.is_visible ? 'Đang hiển thị' : 'Đang ẩn'}
                              disabled={togglingId === cat.id}
                              onClick={() => handleToggleVisibility(cat)}
                            >
                              {cat.is_visible
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
                                onClick={() => openEdit(cat)}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                className="admin-action-btn admin-action-btn--delete"
                                type="button"
                                title="Xóa"
                                disabled={deletingId === cat.id}
                                onClick={() => handleDelete(cat)}
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
          </>
        )}
      </div>
    </section>
  );
}
