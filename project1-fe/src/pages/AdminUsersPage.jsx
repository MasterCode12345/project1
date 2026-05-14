import { Pencil, Plus, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { userService } from '../services/userService.js';

const PAGE_SIZE = 20;

const EMPTY_CREATE_FORM = { full_name: '', email: '', password: '', phone: '', role: 'customer' };
const EMPTY_EDIT_FORM   = { full_name: '', phone: '', address: '' };

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function normalizeUser(raw = {}) {
  const id = typeof raw.id === 'string' ? raw.id : raw._id?.$oid ?? raw._id ?? '';
  return {
    ...raw,
    id,
    full_name: raw.full_name || 'Chưa đặt tên',
    email: raw.email || '',
    phone: raw.phone || '—',
    role: raw.role || 'customer',
    status: raw.status || 'active',
    created_at: raw.created_at || '',
  };
}

function normalizeList(response = {}) {
  if (Array.isArray(response)) return { items: response.map(normalizeUser), total: response.length, page: 1 };
  const items = Array.isArray(response.items) ? response.items : [];
  return { items: items.map(normalizeUser), total: Number(response.total ?? items.length), page: Number(response.page ?? 1) };
}

function RowSkeleton() {
  return (
    <tr className="admin-product-row">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i}><span className="skeleton-line" style={{ height: 14, width: i === 0 ? '70%' : '55%' }} /></td>
      ))}
    </tr>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();

  // --- List state ---
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [togglingId, setTogglingId] = useState('');

  // --- Form state ---
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [editForm, setEditForm]     = useState(EMPTY_EDIT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formServerError, setFormServerError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => { if (!getAuthToken()) navigate('/login', { replace: true }); }, [navigate]);

  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;
    async function fetchUsers() {
      setIsLoading(true); setError('');
      try {
        const raw = await userService.getAdminUsers({ page, page_size: PAGE_SIZE });
        const result = normalizeList(raw);
        if (isMounted) { setUsers(result.items); setTotal(result.total); }
      } catch (err) {
        if (isMounted) { setError(err.message || 'Không thể tải danh sách.'); setUsers([]); }
      } finally { if (isMounted) setIsLoading(false); }
    }
    fetchUsers();
    return () => { isMounted = false; };
  }, [page, reloadKey]);

  // --- Toggle status ---
  async function handleToggleStatus(user) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setTogglingId(user.id);
    try {
      await userService.adminUpdateStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert(err.message || 'Cập nhật thất bại.');
    } finally { setTogglingId(''); }
  }

  // --- Open forms ---
  function openCreate() {
    setCreateForm(EMPTY_CREATE_FORM);
    setFormErrors({}); setFormServerError(''); setFormSuccess('');
    setView('create');
  }

  function openEdit(user) {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || '', phone: user.phone === '—' ? '' : (user.phone || ''), address: user.address || '' });
    setFormErrors({}); setFormServerError(''); setFormSuccess('');
    setView('edit');
  }

  // --- Form handlers ---
  function handleCreateChange(e) {
    const { name, value } = e.target;
    setCreateForm((p) => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: '' }));
    if (formServerError) setFormServerError('');
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
    if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: '' }));
    if (formServerError) setFormServerError('');
  }

  function validateCreate() {
    const errs = {};
    if (!createForm.full_name.trim() || createForm.full_name.trim().length < 2) errs.full_name = 'Họ tên tối thiểu 2 ký tự';
    if (!createForm.email.trim()) errs.email = 'Vui lòng nhập email';
    if (!createForm.password || createForm.password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    return errs;
  }

  function validateEdit() {
    const errs = {};
    if (editForm.full_name && editForm.full_name.trim().length < 2) errs.full_name = 'Họ tên tối thiểu 2 ký tự';
    return errs;
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const errs = validateCreate();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setIsSaving(true); setFormServerError(''); setFormSuccess('');
    try {
      const created = normalizeUser(await userService.adminCreateUser({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim(),
        role: createForm.role,
      }));
      setUsers((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setFormSuccess('Tạo tài khoản thành công!');
      setTimeout(() => setView('list'), 1200);
    } catch (err) {
      setFormServerError(err.message || 'Tạo tài khoản thất bại.');
    } finally { setIsSaving(false); }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setIsSaving(true); setFormServerError(''); setFormSuccess('');
    try {
      const updated = normalizeUser(await userService.adminUpdateUser(editingUser.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
      }));
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? updated : u));
      setFormSuccess('Cập nhật thành công!');
      setTimeout(() => setView('list'), 1200);
    } catch (err) {
      setFormServerError(err.message || 'Cập nhật thất bại.');
    } finally { setIsSaving(false); }
  }

  // =================== CREATE FORM ===================
  if (view === 'create') {
    return (
      <section className="section page-section">
        <div className="container">
          <button className="admin-back-btn" type="button" onClick={() => setView('list')}>← Quay lại danh sách</button>
          <p className="eyebrow">Admin</p>
          <h1>Tạo tài khoản mới</h1>

          <form className="profile-section" style={{ maxWidth: 520 }} onSubmit={handleCreateSubmit} noValidate>
            {formServerError && <p className="auth-error">{formServerError}</p>}
            {formSuccess && <p className="add-feedback add-feedback--success">{formSuccess}</p>}

            <div className="profile-form">
              <label>Họ và tên <span className="required-mark">*</span>
                <input type="text" name="full_name" value={createForm.full_name} placeholder="Nguyễn Văn A" onChange={handleCreateChange} />
                {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
              </label>
              <label>Email <span className="required-mark">*</span>
                <input type="email" name="email" value={createForm.email} placeholder="user@example.com" onChange={handleCreateChange} />
                {formErrors.email && <span className="field-error">{formErrors.email}</span>}
              </label>
              <label>Mật khẩu <span className="required-mark">*</span>
                <input type="password" name="password" value={createForm.password} placeholder="Tối thiểu 6 ký tự" onChange={handleCreateChange} />
                {formErrors.password && <span className="field-error">{formErrors.password}</span>}
              </label>
              <label>Số điện thoại
                <input type="tel" name="phone" value={createForm.phone} placeholder="0901234567" onChange={handleCreateChange} />
              </label>
              <label>Vai trò
                <select name="role" value={createForm.role} onChange={handleCreateChange}>
                  <option value="customer">Khách hàng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </label>
            </div>

            <div className="admin-form-actions" style={{ marginTop: 20 }}>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Đang tạo…' : 'Tạo tài khoản'}</Button>
              <Button type="button" variant="secondary" onClick={() => setView('list')}>Hủy</Button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  // =================== EDIT FORM ===================
  if (view === 'edit' && editingUser) {
    return (
      <section className="section page-section">
        <div className="container">
          <button className="admin-back-btn" type="button" onClick={() => setView('list')}>← Quay lại danh sách</button>
          <p className="eyebrow">Admin</p>
          <h1>Chỉnh sửa tài khoản</h1>

          <div className="admin-form-grid">
            {/* Info card */}
            <div className="profile-info-card" style={{ alignSelf: 'start' }}>
              <div className="user-name-cell" style={{ marginBottom: 12 }}>
                <div className="user-avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                  {editingUser.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: 'block' }}>{editingUser.full_name}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{editingUser.email}</span>
                </div>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Vai trò</span>
                <span className={`user-role-badge ${editingUser.role === 'admin' ? 'user-role-badge--admin' : 'user-role-badge--customer'}`}>
                  {editingUser.role === 'admin' ? 'Admin' : 'Khách hàng'}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Trạng thái</span>
                <span className={`user-status-badge ${editingUser.status === 'active' ? 'user-status-badge--active' : 'user-status-badge--inactive'}`}>
                  {editingUser.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Ngày tạo</span>
                <span className="profile-info-value">{formatDate(editingUser.created_at)}</span>
              </div>
            </div>

            {/* Edit form */}
            <form className="profile-section" onSubmit={handleEditSubmit} noValidate>
              {formServerError && <p className="auth-error">{formServerError}</p>}
              {formSuccess && <p className="add-feedback add-feedback--success">{formSuccess}</p>}

              <div className="profile-form">
                <label>Họ và tên
                  <input type="text" name="full_name" value={editForm.full_name} placeholder="Nguyễn Văn A" onChange={handleEditChange} />
                  {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
                </label>
                <label>Số điện thoại
                  <input type="tel" name="phone" value={editForm.phone} placeholder="0901234567" onChange={handleEditChange} />
                </label>
                <label>Địa chỉ
                  <textarea name="address" value={editForm.address} rows={3} placeholder="Địa chỉ..." onChange={handleEditChange} />
                </label>
              </div>

              <div className="admin-form-actions" style={{ marginTop: 20 }}>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>
                <Button type="button" variant="secondary" onClick={() => setView('list')}>Hủy</Button>
              </div>
            </form>
          </div>
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
            <h1>Quản lý người dùng</h1>
          </div>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} /> Thêm tài khoản
          </Button>
        </div>

        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được người dùng</h2>
            <p>{error}</p>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</Button>
          </div>
        )}

        {!isLoading && !error && users.length === 0 && (
          <div className="empty-state">
            <UserRound size={36} style={{ margin: '0 auto 12px' }} />
            <h2>Chưa có người dùng</h2>
          </div>
        )}

        {(isLoading || users.length > 0) && !error && (
          <>
            {!isLoading && (
              <div className="result-summary">
                <span>{total} người dùng</span>
                <span>Trang {page}/{totalPages}</span>
              </div>
            )}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)
                    : users.map((user) => (
                        <tr className="admin-product-row" key={user.id}>
                          <td>
                            <div className="user-name-cell">
                              <div className="user-avatar">{user.full_name.charAt(0).toUpperCase()}</div>
                              <span className="user-fullname">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="admin-sku">{user.email}</td>
                          <td>{user.phone}</td>
                          <td>
                            <span className={`user-role-badge ${user.role === 'admin' ? 'user-role-badge--admin' : 'user-role-badge--customer'}`}>
                              {user.role === 'admin' ? 'Admin' : 'Khách hàng'}
                            </span>
                          </td>
                          <td>
                            <span className={`user-status-badge ${user.status === 'active' ? 'user-status-badge--active' : 'user-status-badge--inactive'}`}>
                              {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </td>
                          <td className="admin-sku">{formatDate(user.created_at)}</td>
                          <td>
                            <div className="admin-row-actions">
                              <button className="admin-action-btn admin-action-btn--edit" type="button" title="Chỉnh sửa" onClick={() => openEdit(user)}>
                                <Pencil size={15} />
                              </button>
                              <button
                                className={`user-toggle-btn ${user.status === 'active' ? 'user-toggle-btn--lock' : 'user-toggle-btn--unlock'}`}
                                type="button"
                                disabled={togglingId === user.id || user.role === 'admin'}
                                title={user.role === 'admin' ? 'Không thể khóa admin' : user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                                onClick={() => handleToggleStatus(user)}
                              >
                                {togglingId === user.id ? '...' : user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {!isLoading && totalPages > 1 && (
              <div className="pagination-bar">
                <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trang trước</Button>
                <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Trang sau</Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
