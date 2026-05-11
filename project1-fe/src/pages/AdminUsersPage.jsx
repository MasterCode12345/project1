import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { userService } from '../services/userService.js';

const PAGE_SIZE = 20;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizeUser(raw = {}) {
  const id = typeof raw.id === 'string' ? raw.id
    : raw._id?.$oid ?? raw._id ?? '';
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

function normalizeUserList(response = {}) {
  if (Array.isArray(response)) {
    return { items: response.map(normalizeUser), total: response.length, page: 1 };
  }
  const items = Array.isArray(response.items) ? response.items : [];
  return {
    items: items.map(normalizeUser),
    total: Number(response.total ?? items.length),
    page: Number(response.page ?? 1),
  };
}

// --- Skeleton row ---
function RowSkeleton() {
  return (
    <tr className="admin-product-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i}>
          <span className="skeleton-line" style={{ height: 14, width: i === 1 ? '70%' : '55%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminUsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [togglingId, setTogglingId] = useState('');
  const [toggleError, setToggleError] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // --- Auth guard ---
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  // --- Fetch users ---
  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;

    async function fetchUsers() {
      setIsLoading(true);
      setError('');
      try {
        const raw = await userService.getAdminUsers({ page, page_size: PAGE_SIZE });
        const result = normalizeUserList(raw);
        if (isMounted) {
          setUsers(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải danh sách người dùng.');
          setUsers([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchUsers();
    return () => { isMounted = false; };
  }, [page, reloadKey]);

  async function handleToggleStatus(user) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    setTogglingId(user.id);
    setToggleError('');
    try {
      await userService.adminUpdateStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u)
      );
    } catch (err) {
      setToggleError(err.message || 'Cập nhật trạng thái thất bại.');
    } finally {
      setTogglingId('');
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Admin</p>
        <h1>Quản lý người dùng</h1>

        {/* Toggle error */}
        {toggleError && (
          <p className="add-feedback add-feedback--error" style={{ marginBottom: 12 }}>
            {toggleError}
          </p>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được người dùng</h2>
            <p>{error}</p>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && users.length === 0 && (
          <div className="empty-state">
            <h2>Chưa có người dùng</h2>
            <p>Chưa có tài khoản nào được đăng ký.</p>
          </div>
        )}

        {/* Table */}
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
                          {/* Avatar + tên */}
                          <td>
                            <div className="user-name-cell">
                              <div className="user-avatar">
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="user-fullname">{user.full_name}</span>
                            </div>
                          </td>

                          <td className="admin-sku">{user.email}</td>

                          <td>{user.phone}</td>

                          {/* Role badge */}
                          <td>
                            <span className={`user-role-badge ${user.role === 'admin' ? 'user-role-badge--admin' : 'user-role-badge--customer'}`}>
                              {user.role === 'admin' ? 'Admin' : 'Khách hàng'}
                            </span>
                          </td>

                          {/* Status badge */}
                          <td>
                            <span className={`user-status-badge ${user.status === 'active' ? 'user-status-badge--active' : 'user-status-badge--inactive'}`}>
                              {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </td>

                          <td className="admin-sku">{formatDate(user.created_at)}</td>

                          {/* Toggle action */}
                          <td>
                            <button
                              className={`user-toggle-btn ${user.status === 'active' ? 'user-toggle-btn--lock' : 'user-toggle-btn--unlock'}`}
                              type="button"
                              disabled={togglingId === user.id || user.role === 'admin'}
                              title={
                                user.role === 'admin'
                                  ? 'Không thể khóa tài khoản admin'
                                  : user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
                              }
                              onClick={() => handleToggleStatus(user)}
                            >
                              {togglingId === user.id
                                ? '...'
                                : user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && (
              <div className="pagination-bar">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Trang trước
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
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
