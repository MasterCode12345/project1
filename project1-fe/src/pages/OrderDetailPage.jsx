import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { orderService } from '../services/orderService.js';
import { normalizeProductId, useProductImages } from '../utils/useProductImages.js';

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

const PAYMENT_LABEL = {
  cod: 'Thanh toán khi nhận hàng (COD)',
};

const PAYMENT_STATUS_LABEL = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
};

function normalizeOrder(raw = {}) {
  const id = typeof raw.id === 'string' ? raw.id : raw._id?.$oid ?? raw._id ?? '';
  return {
    ...raw,
    id,
    status: raw.status || 'pending',
    created_at: raw.created_at || '',
    total_amount: Number(raw.total_amount ?? 0),
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

// --- Skeleton ---
function DetailSkeleton() {
  return (
    <div className="split-page">
      <div style={{ display: 'grid', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="order-card">
            <div style={{ padding: '18px 22px', display: 'grid', gap: 10 }}>
              <span className="skeleton-line medium" />
              <span className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
      <div className="summary-panel" style={{ display: 'grid', gap: 12 }}>
        <span className="skeleton-line medium" />
        <span className="skeleton-line short" />
        <span className="skeleton-line" />
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const productImages = useProductImages(order?.items || []);

  // Auth guard
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!getAuthToken()) return;
    let isMounted = true;

    async function fetchOrder() {
      setIsLoading(true);
      setError('');
      try {
        const raw = await orderService.getOrderDetail(id);
        if (isMounted) setOrder(normalizeOrder(raw));
      } catch (err) {
        if (isMounted) setError(err.message || 'Không thể tải chi tiết đơn hàng.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchOrder();
    return () => { isMounted = false; };
  }, [id]);

  async function handleCancel() {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    setIsCancelling(true);
    setCancelError('');
    try {
      const updated = normalizeOrder(await orderService.cancelOrder(id));
      setOrder(updated);
    } catch (err) {
      setCancelError(err.message || 'Hủy đơn thất bại.');
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        {/* Back link */}
        <button className="admin-back-btn" type="button" onClick={() => navigate('/orders')}>
          ← Quay lại đơn hàng của tôi
        </button>
        <p className="eyebrow">Đơn hàng</p>
        <h1>Chi tiết đơn hàng</h1>

        {/* Loading */}
        {isLoading && <DetailSkeleton />}

        {/* Error */}
        {!isLoading && error && (
          <div className="empty-state error-state">
            <h2>Không tải được đơn hàng</h2>
            <p>{error}</p>
            <Button variant="secondary" to="/orders">Quay lại</Button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && order && (
          <div className="split-page">
            {/* Cột trái: thông tin + items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Header card */}
              <div className="order-card">
                <div className="order-card-header">
                  <div className="order-card-meta">
                    <span className="order-id">
                      #{order.order_code || order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className="order-date">{formatDate(order.created_at)}</span>
                  </div>
                  <span className={`order-status-badge ${STATUS_MOD[order.status] ?? 'badge--info'}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>

                {/* Items */}
                {order.items.length > 0 && (
                  <ul className="order-items-list">
                    {order.items.map((item, idx) => {
                      const pid = normalizeProductId(item.product_id);
                      const img = productImages[pid]?.image_url;
                      const name = item.product_name || 'Sản phẩm';
                      return (
                        <li key={idx} className="order-item-row order-item-row--detail">
                          <Link
                            className="order-item-thumb"
                            to={pid ? `/products/${pid}` : '#'}
                            aria-label={name}
                          >
                            {img ? <img src={img} alt={name} /> : <span>{name.charAt(0)}</span>}
                          </Link>
                          {pid ? (
                            <Link className="order-item-name order-item-name--link" to={`/products/${pid}`}>
                              {name}
                            </Link>
                          ) : (
                            <span className="order-item-name">{name}</span>
                          )}
                          <span className="order-item-qty">x{item.quantity}</span>
                          <span className="order-item-price">
                            {currencyFormatter.format(item.unit_price ?? 0)}
                          </span>
                          <span className="order-item-subtotal">
                            {currencyFormatter.format(item.subtotal ?? item.unit_price * item.quantity ?? 0)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Total footer */}
                <div className="order-card-footer">
                  <strong className="order-total order-total--large">
                    Tổng cộng:{' '}
                    <span>{currencyFormatter.format(order.total_amount)}</span>
                  </strong>

                  {order.status === 'pending' && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isCancelling}
                      onClick={handleCancel}
                    >
                      {isCancelling ? 'Đang hủy…' : 'Hủy đơn'}
                    </Button>
                  )}
                </div>

                {cancelError && (
                  <p className="add-feedback add-feedback--error" style={{ margin: '0 22px 14px' }}>
                    {cancelError}
                  </p>
                )}
              </div>
            </div>

            {/* Cột phải: shipping + payment */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Thông tin giao hàng */}
              <div className="summary-panel">
                <h2>Thông tin giao hàng</h2>
                <div className="order-detail-info-grid">
                  <div className="order-detail-info-row">
                    <span>Người nhận</span>
                    <strong>{order.shipping_name}</strong>
                  </div>
                  <div className="order-detail-info-row">
                    <span>Số điện thoại</span>
                    <strong>{order.shipping_phone}</strong>
                  </div>
                  <div className="order-detail-info-row">
                    <span>Địa chỉ</span>
                    <strong>{order.shipping_address}</strong>
                  </div>
                  {order.shipping_note && (
                    <div className="order-detail-info-row">
                      <span>Ghi chú</span>
                      <strong>{order.shipping_note}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Thanh toán */}
              <div className="summary-panel">
                <h2>Thanh toán</h2>
                <div className="order-detail-info-grid">
                  <div className="order-detail-info-row">
                    <span>Phương thức</span>
                    <strong>{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</strong>
                  </div>
                  <div className="order-detail-info-row">
                    <span>Trạng thái</span>
                    <strong className={order.payment_status === 'paid' ? 'text-success' : ''}>
                      {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
                    </strong>
                  </div>
                  {order.paid_at && (
                    <div className="order-detail-info-row">
                      <span>Thanh toán lúc</span>
                      <strong>{formatDate(order.paid_at)}</strong>
                    </div>
                  )}
                  {order.cancelled_at && (
                    <div className="order-detail-info-row">
                      <span>Hủy lúc</span>
                      <strong>{formatDate(order.cancelled_at)}</strong>
                    </div>
                  )}
                </div>

                <div className="summary-row summary-row--total" style={{ marginTop: 16 }}>
                  <span>Tổng cộng</span>
                  <strong className="summary-total-price">
                    {currencyFormatter.format(order.total_amount)}
                  </strong>
                </div>
              </div>

            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
