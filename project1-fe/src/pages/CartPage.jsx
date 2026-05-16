import { ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { cartService } from '../services/cartService.js';
import { orderService } from '../services/orderService.js';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

function CartSkeleton() {
  return (
    <div className="cart-skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="cart-item-skeleton" key={i}>
          <div className="skeleton-block cart-thumb-skeleton" />
          <div className="cart-skeleton-info">
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Form thông tin giao hàng
  const [shipping, setShipping] = useState({
    shipping_name: '',
    shipping_phone: '',
    shipping_address: '',
    shipping_note: '',
  });
  const [shippingErrors, setShippingErrors] = useState({});

  // Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const isLoggedIn = Boolean(getAuthToken());
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  useEffect(() => {
    cartService.getCart().then((data) => {
      setItems(data);
      setIsLoading(false);
    });
  }, []);

  async function handleUpdateQuantity(productId, newQty) {
    const updated = await cartService.updateQuantity(productId, newQty);
    setItems(updated);
  }

  async function handleRemove(productId) {
    const updated = await cartService.removeItem(productId);
    setItems(updated);
  }

  function handleShippingChange(e) {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
    if (shippingErrors[name]) {
      setShippingErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validateShipping() {
    const errors = {};
    if (!shipping.shipping_name.trim() || shipping.shipping_name.trim().length < 2) {
      errors.shipping_name = 'Họ tên tối thiểu 2 ký tự';
    }
    if (!shipping.shipping_phone.trim() || shipping.shipping_phone.trim().length < 8) {
      errors.shipping_phone = 'Số điện thoại tối thiểu 8 ký tự';
    }
    if (!shipping.shipping_address.trim() || shipping.shipping_address.trim().length < 5) {
      errors.shipping_address = 'Địa chỉ tối thiểu 5 ký tự';
    }
    return errors;
  }

  async function handleCheckout() {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    const errors = validateShipping();
    if (Object.keys(errors).length > 0) {
      setShippingErrors(errors);
      return;
    }

    setIsCheckingOut(true);
    setOrderError('');

    try {
      await orderService.createOrder({
        shipping_name: shipping.shipping_name.trim(),
        shipping_phone: shipping.shipping_phone.trim(),
        shipping_address: shipping.shipping_address.trim(),
        shipping_note: shipping.shipping_note.trim(),
        payment_method: paymentMethod,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      });
      await cartService.clearCart();
      setItems([]);
      setOrderSuccess(true);
    } catch (err) {
      setOrderError(err.message || 'Đặt hàng thất bại, vui lòng thử lại.');
    } finally {
      setIsCheckingOut(false);
    }
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <section className="section page-section">
        <div className="container">
          <p className="eyebrow">Checkout</p>
          <h1>Giỏ hàng</h1>
          <CartSkeleton />
        </div>
      </section>
    );
  }

  // --- Đặt hàng thành công ---
  if (orderSuccess) {
    return (
      <section className="section page-section">
        <div className="container">
          <div className="empty-state order-success-state">
            <h2>Đặt hàng thành công!</h2>
            <p>Cảm ơn bạn đã mua hàng. Đơn hàng đang được xử lý.</p>
            <div className="detail-actions">
              <Button to="/orders">Xem đơn hàng</Button>
              <Button variant="secondary" to="/products">Tiếp tục mua sắm</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Checkout</p>
        <h1>Giỏ hàng</h1>

        {/* Giỏ trống */}
        {items.length === 0 && (
          <div className="empty-state">
            <h2>Giỏ hàng trống</h2>
            <p>Bạn chưa thêm sản phẩm nào vào giỏ hàng.</p>
            <Button to="/products">Khám phá sản phẩm</Button>
          </div>
        )}

        {/* Có sản phẩm */}
        {items.length > 0 && (
          <div className="split-page cart-layout">
            {/* Cột trái: sản phẩm + form giao hàng */}
            <div>
              {/* Danh sách sản phẩm */}
              <div className="cart-list">
                {items.map((item) => (
                  <div className="cart-item" key={item.product_id}>
                    <div className="cart-item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} />
                      ) : (
                        <span>{item.product_name.charAt(0)}</span>
                      )}
                    </div>

                    <div className="cart-item-info">
                      <p className="cart-item-name">{item.product_name}</p>
                      <strong className="cart-item-price">
                        {currencyFormatter.format(item.unit_price)}
                      </strong>
                      <span className="cart-item-line-total">
                        Thành tiền: {currencyFormatter.format(item.unit_price * item.quantity)}
                      </span>
                    </div>

                    <div className="cart-item-controls">
                      <div className="qty-row">
                        <button
                          className="qty-btn"
                          type="button"
                          aria-label="Giảm số lượng"
                          disabled={item.quantity <= 1}
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="qty-value">{item.quantity}</span>
                        <button
                          className="qty-btn"
                          type="button"
                          aria-label="Tăng số lượng"
                          onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-remove-btn"
                        type="button"
                        aria-label="Xóa sản phẩm"
                        onClick={() => handleRemove(item.product_id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form thông tin giao hàng */}
              <div className="shipping-form">
                <h2>Thông tin giao hàng</h2>

                <label className="shipping-label">
                  Họ và tên người nhận <span className="required-mark">*</span>
                  <input
                    type="text"
                    name="shipping_name"
                    value={shipping.shipping_name}
                    placeholder="Nguyễn Văn A"
                    onChange={handleShippingChange}
                  />
                  {shippingErrors.shipping_name && (
                    <span className="field-error">{shippingErrors.shipping_name}</span>
                  )}
                </label>

                <label className="shipping-label">
                  Số điện thoại <span className="required-mark">*</span>
                  <input
                    type="tel"
                    name="shipping_phone"
                    value={shipping.shipping_phone}
                    placeholder="0901234567"
                    onChange={handleShippingChange}
                  />
                  {shippingErrors.shipping_phone && (
                    <span className="field-error">{shippingErrors.shipping_phone}</span>
                  )}
                </label>

                <label className="shipping-label">
                  Địa chỉ nhận hàng <span className="required-mark">*</span>
                  <input
                    type="text"
                    name="shipping_address"
                    value={shipping.shipping_address}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    onChange={handleShippingChange}
                  />
                  {shippingErrors.shipping_address && (
                    <span className="field-error">{shippingErrors.shipping_address}</span>
                  )}
                </label>

                <label className="shipping-label">
                  Ghi chú đơn hàng
                  <textarea
                    name="shipping_note"
                    value={shipping.shipping_note}
                    rows={3}
                    placeholder="Giao giờ hành chính, gọi trước khi giao..."
                    onChange={handleShippingChange}
                  />
                </label>

                {/* Phương thức thanh toán */}
                <div className="payment-method-section">
                  <p className="payment-method-label">Phương thức thanh toán</p>
                  <div className="payment-method-list">
                    <label className={`payment-method-option${paymentMethod === 'cod' ? ' payment-method-option--active' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                      />
                      <span className="payment-method-icon">🚚</span>
                      <div>
                        <strong>Thanh toán khi nhận hàng (COD)</strong>
                        <span>Kiểm tra hàng trước khi thanh toán</span>
                      </div>
                    </label>
                    {/* Các phương thức khác sẽ thêm vào đây */}
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: tóm tắt đơn hàng */}
            <aside className="summary-panel">
              <h2>Tóm tắt đơn hàng</h2>

              <div className="summary-row">
                <span>Tạm tính ({totalQty} sản phẩm)</span>
                <strong>{currencyFormatter.format(subtotal)}</strong>
              </div>

              <div className="summary-row summary-row--total">
                <span>Tổng cộng</span>
                <strong className="summary-total-price">
                  {currencyFormatter.format(subtotal)}
                </strong>
              </div>

              {orderError && (
                <p className="add-feedback add-feedback--error">{orderError}</p>
              )}

              <Button
                type="button"
                disabled={isCheckingOut}
                onClick={handleCheckout}
              >
                <ShoppingCart size={18} />
                {isCheckingOut
                  ? 'Đang xử lý…'
                  : isLoggedIn
                    ? 'Đặt hàng'
                    : 'Đăng nhập để đặt hàng'}
              </Button>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
