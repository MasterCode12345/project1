import { useEffect, useState } from 'react';
import Button from '../components/common/Button.jsx';
import { apiRequest } from '../services/apiClient.js';

export default function VNPayReturnPage() {
  const [status, setStatus] = useState('loading'); // loading | success | failed | error
  const [orderCode, setOrderCode] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Lấy toàn bộ query params từ URL hiện tại
    const queryString = window.location.search;

    apiRequest(`/payment/vnpay/return${queryString}`)
      .then((res) => {
        setOrderCode(res.order_code || '');
        setOrderId(res.order_id || '');
        setMessage(res.message || '');
        setStatus(res.success ? 'success' : 'failed');
      })
      .catch((err) => {
        setMessage(err.message || 'Có lỗi xảy ra khi xác thực kết quả thanh toán.');
        setStatus('error');
      });
  }, []);

  if (status === 'loading') {
    return (
      <section className="section page-section">
        <div className="container">
          <div className="vnpay-return-state">
            <div className="vnpay-spinner" />
            <h2>Đang xác thực kết quả thanh toán…</h2>
            <p>Vui lòng không đóng trang này.</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'success') {
    return (
      <section className="section page-section">
        <div className="container">
          <div className="vnpay-return-state vnpay-return-state--success">
            <div className="vnpay-icon vnpay-icon--success">✓</div>
            <h2>Thanh toán thành công!</h2>
            <p>
              Đơn hàng <strong>{orderCode}</strong> đã được xác nhận và thanh toán qua VNPay.
            </p>
            <div className="detail-actions">
              {orderId ? (
                <Button to={`/orders/${orderId}`}>Xem đơn hàng</Button>
              ) : (
                <Button to="/orders">Xem đơn hàng</Button>
              )}
              <Button variant="secondary" to="/products">Tiếp tục mua sắm</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // failed or error
  return (
    <section className="section page-section">
      <div className="container">
        <div className="vnpay-return-state vnpay-return-state--failed">
          <div className="vnpay-icon vnpay-icon--failed">✕</div>
          <h2>Thanh toán không thành công</h2>
          <p>{message || 'Giao dịch đã bị hủy hoặc thất bại. Đơn hàng vẫn được lưu — bạn có thể thanh toán lại sau.'}</p>
          <div className="detail-actions">
            <Button to="/orders">Xem đơn hàng của tôi</Button>
            <Button variant="secondary" to="/">Về trang chủ</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
