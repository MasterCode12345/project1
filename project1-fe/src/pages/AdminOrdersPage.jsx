import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { orderService } from '../services/orderService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

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

// --- Status config (khớp đúng với BE) ---
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

// Payment
const PAYMENT_METHOD_LABEL = {
  cod: 'COD',
  bank_transfer: 'Chuyển khoản',
  momo: 'MoMo',
};

const PAYMENT_STATUS_LABEL = {
  unpaid: 'Chưa TT',
  paid: 'Đã TT',
};

const PAYMENT_STATUS_MOD = {
  unpaid: 'badge--warning',
  paid: 'badge--success',
};

// Các trạng thái có thể chuyển sang (theo flow hợp lệ)
const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const PAGE_SIZE = 15;

function normalizeOrder(raw = {}) {
  const id = typeof raw.id === 'string' ? raw.id : raw._id?.$oid ?? raw._id ?? '';
  return {
    ...raw,
    id,
    status: raw.status || 'pending',
    created_at: raw.created_at || raw.createdAt || '',
    total_amount: Number(raw.total_amount ?? 0),
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

function normalizeList(response = {}) {
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

// --- Skeleton ---
function OrderRowSkeleton() {
  return (
    <div className="order-card order-card--skeleton">
      <div className="order-card-header">
        <div className="order-card-meta">
          <span className="skeleton-line" style={{ width: 100, height: 13 }} />
          <span className="skeleton-line" style={{ width: 130, height: 13, marginTop: 6 }} />
        </div>
        <span className="skeleton-line" style={{ width: 90, height: 24, borderRadius: 999 }} />
      </div>
      <div style={{ padding: '12px 22px', display: 'grid', gap: 8 }}>
        <span className="skeleton-line medium" />
        <span className="skeleton-line short" />
      </div>
      <div className="order-card-footer">
        <span className="skeleton-line" style={{ width: 140, height: 14 }} />
        <span className="skeleton-line" style={{ width: 180, height: 38, borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Trạng thái update inline từng đơn
  const [pendingStatus, setPendingStatus] = useState({}); // { [id]: selectedStatus }
  const [updatingId, setUpdatingId] = useState('');
  const [updateError, setUpdateError] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // --- Auth guard ---
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  // --- Fetch orders ---
  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;

    async function fetchOrders() {
      setIsLoading(true);
      setError('');
      try {
        const raw = await orderService.getAdminOrders({
          page,
          page_size: PAGE_SIZE,
          status: statusFilter,
        });
        const result = normalizeList(raw);
        if (isMounted) {
          setOrders(result.items);
          setTotal(result.total);
          // Khởi tạo pending status cho từng đơn
          const init = {};
          result.items.forEach((o) => { init[o.id] = o.status; });
          setPendingStatus(init);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải danh sách đơn hàng.');
          setOrders([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchOrders();
    return () => { isMounted = false; };
  }, [page, statusFilter, reloadKey]);

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSelectChange(orderId, value) {
    setPendingStatus((prev) => ({ ...prev, [orderId]: value }));
    setUpdateError('');
  }

  async function handleUpdateStatus(order) {
    const newStatus = pendingStatus[order.id];
    if (!newStatus || newStatus === order.status) return;

    setUpdatingId(order.id);
    setUpdateError('');
    try {
      const updated = normalizeOrder(await orderService.adminUpdateStatus(order.id, newStatus));
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setPendingStatus((prev) => ({ ...prev, [order.id]: updated.status }));
    } catch (err) {
      setUpdateError(err.message || 'Cập nhật thất bại.');
    } finally {
      setUpdatingId('');
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Admin</p>
        <h1>Quản lý đơn hàng</h1>

        {/* Filter tabs */}
        <div className="order-filter-bar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`order-filter-tab${statusFilter === f.value ? ' order-filter-tab--active' : ''}`}
              onClick={() => handleStatusFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="order-list">
            {Array.from({ length: 4 }).map((_, i) => <OrderRowSkeleton key={i} />)}
          </div>
        )}

        {/* Error fetch */}
        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được đơn hàng</h2>
            <p>{error}</p>
            <Button type="button" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="empty-state">
            <h2>Không có đơn hàng</h2>
            <p>{statusFilter ? 'Không có đơn nào với trạng thái này.' : 'Chưa có đơn hàng nào.'}</p>
          </div>
        )}

        {/* Update error toast */}
        {updateError && (
          <p className="add-feedback add-feedback--error" style={{ marginBottom: 12 }}>
            {updateError}
          </p>
        )}

        {/* Order list */}
        {!isLoading && !error && orders.length > 0 && (
          <>
            <div className="result-summary">
              <span>{total} đơn hàng</span>
              <span>Trang {page}/{totalPages}</span>
            </div>

            <div className="order-list">
              {orders.map((order) => {
                const nextOptions = NEXT_STATUSES[order.status] ?? [];
                const canUpdate = nextOptions.length > 0;
                const selected = pendingStatus[order.id] ?? order.status;
                const isUpdating = updatingId === order.id;

                return (
                  <div className="order-card" key={order.id}>
                    {/* Header */}
                    <div className="order-card-header">
                      <div className="order-card-meta">
                        <span className="order-id">
                          {order.order_code
                            ? `#${order.order_code}`
                            : `#${order.id.slice(-8).toUpperCase()}`}
                        </span>
                        <span className="order-date">{formatDate(order.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`order-status-badge ${STATUS_MOD[order.status] ?? 'badge--info'}`}>
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                        {/* Payment status badge */}
                        <span className={`order-status-badge ${PAYMENT_STATUS_MOD[order.payment_status] ?? 'badge--warning'}`}>
                          {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
                        </span>
                        {/* Payment method */}
                        <span className="payment-method-tag">
                          {PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method}
                        </span>
                      </div>
                    </div>

                    {/* Thông tin giao hàng */}
                    <div className="order-shipping-info">
                      <span>{order.shipping_name}</span>
                      <span className="order-shipping-sep">·</span>
                      <span>{order.shipping_phone}</span>
                      <span className="order-shipping-sep">·</span>
                      <span className="order-shipping-address">{order.shipping_address}</span>
                    </div>

                    {/* Items */}
                    {order.items.length > 0 && (
                      <ul className="order-items-list">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="order-item-row">
                            <span className="order-item-name">
                              {item.product_name || item.name || 'Sản phẩm'}
                            </span>
                            <span className="order-item-qty">x{item.quantity}</span>
                            <span className="order-item-price">
                              {currencyFormatter.format(item.unit_price ?? 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Footer: tổng + cập nhật status */}
                    <div className="order-card-footer">
                      <strong className="order-total">
                        Tổng: <span>{currencyFormatter.format(order.total_amount)}</span>
                      </strong>

                      {canUpdate && (
                        <div className="admin-status-update">
                          <select
                            className="admin-status-select"
                            value={selected}
                            disabled={isUpdating}
                            onChange={(e) => handleSelectChange(order.id, e.target.value)}
                          >
                            <option value={order.status}>
                              {STATUS_LABEL[order.status]}
                            </option>
                            {nextOptions.map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            disabled={isUpdating || selected === order.status}
                            onClick={() => handleUpdateStatus(order)}
                          >
                            {isUpdating ? 'Đang lưu…' : 'Cập nhật'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
