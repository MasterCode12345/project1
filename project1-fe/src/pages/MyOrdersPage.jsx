import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { orderService } from '../services/orderService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

// --- Normalize helpers ---
function normalizeOrder(raw = {}) {
  const id =
    typeof raw.id === 'string'
      ? raw.id
      : raw._id?.$oid ?? raw._id ?? '';

  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    ...raw,
    id,
    status: raw.status || 'pending',
    created_at: raw.created_at || raw.createdAt || '',
    total_amount: Number(raw.total_amount ?? raw.total ?? 0),
    items,
  };
}

function normalizeOrderList(response = {}) {
  if (Array.isArray(response)) {
    return { items: response.map(normalizeOrder), total: response.length, page: 1 };
  }
  const items = Array.isArray(response.items) ? response.items : [];
  return {
    items: items.map(normalizeOrder),
    total: Number(response.total ?? items.length),
    page: Number(response.page ?? 1),
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Status config ---
const STATUS_LABEL = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const STATUS_MOD = {
  pending: 'badge--warning',
  confirmed: 'badge--info',
  shipping: 'badge--info',
  delivered: 'badge--success',
  cancelled: 'badge--danger',
};

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
];

const PAGE_SIZE = 10;

// --- Skeleton ---
function OrderCardSkeleton() {
  return (
    <div className="order-card order-card--skeleton">
      <div className="order-card-header">
        <div className="order-card-meta">
          <span className="skeleton-line" style={{ width: 100, height: 13 }} />
          <span className="skeleton-line" style={{ width: 130, height: 13, marginTop: 6 }} />
        </div>
        <span className="skeleton-line" style={{ width: 90, height: 24, borderRadius: 999 }} />
      </div>
      <div style={{ display: 'grid', gap: 8, padding: '14px 0' }}>
        <span className="skeleton-line medium" />
        <span className="skeleton-line short" />
      </div>
      <div className="order-card-footer">
        <span className="skeleton-line" style={{ width: 140, height: 14 }} />
      </div>
    </div>
  );
}

// --- Page ---
export default function MyOrdersPage() {
  const isLoggedIn = Boolean(getAuthToken());

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchOrders() {
      setIsLoading(true);
      setError('');

      try {
        const raw = await orderService.getMyOrders({ page, page_size: PAGE_SIZE, status });
        const result = normalizeOrderList(raw);

        if (isMounted) {
          setOrders(result.items);
          setTotal(result.total);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải danh sách đơn hàng.');
          setOrders([]);
          setTotal(0);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [page, status, reloadKey, isLoggedIn]);

  async function handleCancel(id) {
    setCancellingId(id);
    try {
      await orderService.cancelOrder(id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Hủy đơn thất bại, vui lòng thử lại.');
    } finally {
      setCancellingId('');
    }
  }

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  // --- Not logged in ---
  if (!isLoggedIn) {
    return (
      <section className="section page-section">
        <div className="container">
          <p className="eyebrow">Lịch sử mua hàng</p>
          <h1>Đơn hàng của tôi</h1>
          <div className="empty-state">
            <h2>Bạn chưa đăng nhập</h2>
            <p>Vui lòng đăng nhập để xem lịch sử đơn hàng của bạn.</p>
            <Button to="/login">Đăng nhập ngay</Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Lịch sử mua hàng</p>
        <h1>Đơn hàng của tôi</h1>

        {/* Filter theo trạng thái */}
        <div className="order-filter-bar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`order-filter-tab${status === f.value ? ' order-filter-tab--active' : ''}`}
              onClick={() => handleStatusChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="order-list" aria-label="Đang tải đơn hàng">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được đơn hàng</h2>
            <p>{error}</p>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>
              Thử lại
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="empty-state">
            <h2>Chưa có đơn hàng</h2>
            <p>
              {status
                ? 'Không có đơn hàng nào với trạng thái này.'
                : 'Bạn chưa đặt đơn hàng nào.'}
            </p>
            <Button to="/products">Mua sắm ngay</Button>
          </div>
        )}

        {/* Danh sách đơn hàng */}
        {!isLoading && !error && orders.length > 0 && (
          <>
            <div className="result-summary">
              <span>{total} đơn hàng</span>
              <span>Trang {page}/{totalPages}</span>
            </div>

            <div className="order-list">
              {orders.map((order) => (
                <div className="order-card" key={order.id}>
                  {/* Header: mã đơn + ngày + trạng thái */}
                  <div className="order-card-header">
                    <div className="order-card-meta">
                      <span className="order-id">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="order-date">{formatDate(order.created_at)}</span>
                    </div>
                    <span className={`order-status-badge ${STATUS_MOD[order.status] ?? 'badge--info'}`}>
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>

                  {/* Danh sách sản phẩm trong đơn */}
                  {order.items.length > 0 && (
                    <ul className="order-items-list">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="order-item-row">
                          <span className="order-item-name">
                            {item.product_name || item.name || 'Sản phẩm'}
                          </span>
                          <span className="order-item-qty">x{item.quantity}</span>
                          <span className="order-item-price">
                            {currencyFormatter.format(item.unit_price ?? item.price ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Footer: tổng tiền + hành động */}
                  <div className="order-card-footer">
                    <strong className="order-total">
                      Tổng cộng:{' '}
                      <span>{currencyFormatter.format(order.total_amount)}</span>
                    </strong>
                    {order.status === 'pending' && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={cancellingId === order.id}
                        onClick={() => handleCancel(order.id)}
                      >
                        {cancellingId === order.id ? 'Đang hủy…' : 'Hủy đơn'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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
          </>
        )}
      </div>
    </section>
  );
}
