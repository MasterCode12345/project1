import { AlertTriangle, Boxes, ShoppingBag, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { apiRequest, getAuthToken } from '../services/apiClient.js';

// Gọi trực tiếp endpoint admin/dashboard
function getAdminStats() {
  return apiRequest('/admin/dashboard');
}

const STAT_CONFIG = [
  {
    key: 'total_orders',
    label: 'Tổng đơn hàng',
    icon: ShoppingBag,
    format: (v) => v.toLocaleString('vi-VN'),
  },
  {
    key: 'orders_today',
    label: 'Đơn hàng hôm nay',
    icon: TrendingUp,
    format: (v) => v.toLocaleString('vi-VN'),
  },
  {
    key: 'low_stock_products',
    label: 'Sản phẩm sắp hết',
    icon: Boxes,
    format: (v) => v.toLocaleString('vi-VN'),
    warn: true,
  },
];

function AdminCardSkeleton() {
  return (
    <article className="admin-card admin-card--skeleton">
      <span className="skeleton-line short" style={{ height: 24, width: 24, borderRadius: 8 }} />
      <span className="skeleton-line medium" style={{ height: 14 }} />
      <span className="skeleton-line short" style={{ height: 32 }} />
    </article>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true });
      return;
    }

    let isMounted = true;

    async function fetchStats() {
      setIsLoading(true);
      setError('');

      try {
        const data = await getAdminStats();
        if (isMounted) setStats(data);
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 403 || err.code === 'FORBIDDEN') {
          setIsUnauthorized(true);
        } else {
          setError(err.message || 'Không thể tải dữ liệu dashboard.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchStats();
    return () => { isMounted = false; };
  }, [navigate]);

  // --- Không có quyền ---
  if (isUnauthorized) {
    return (
      <section className="section page-section">
        <div className="container">
          <p className="eyebrow">Admin</p>
          <h1>Bảng điều khiển</h1>
          <div className="empty-state error-state">
            <AlertTriangle size={36} style={{ margin: '0 auto 12px', color: 'var(--danger)' }} />
            <h2>Không có quyền truy cập</h2>
            <p>Trang này chỉ dành cho quản trị viên.</p>
            <Button to="/" variant="secondary">Về trang chủ</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Admin</p>
        <h1>Bảng điều khiển</h1>

        {/* Error */}
        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được dữ liệu</h2>
            <p>{error}</p>
            <Button type="button" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Quick links */}
        <div className="admin-quick-links">
          <Link className="admin-quick-link" to="/admin/orders">Quản lý đơn hàng →</Link>
          <Link className="admin-quick-link" to="/admin/products">Quản lý sản phẩm →</Link>
          <Link className="admin-quick-link" to="/admin/users">Quản lý người dùng →</Link>
        </div>

        {/* Stat cards */}
        {!error && (
          <div className="admin-grid">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <AdminCardSkeleton key={i} />)
              : STAT_CONFIG.map(({ key, label, icon: Icon, format, warn }) => (
                  <article
                    className={`admin-card${warn && stats[key] > 0 ? ' admin-card--warn' : ''}`}
                    key={key}
                  >
                    <Icon size={24} />
                    <span>{label}</span>
                    <strong>{stats ? format(stats[key] ?? 0) : '—'}</strong>
                  </article>
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
