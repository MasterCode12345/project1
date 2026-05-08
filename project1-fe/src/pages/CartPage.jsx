import Button from '../components/common/Button.jsx';

export default function CartPage() {
  return (
    <section className="section page-section">
      <div className="container split-page">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Giỏ hàng</h1>
          <p>Khung giỏ hàng đã chuẩn bị. Backend hiện chưa có route cart nên cartService đang dùng localStorage tạm.</p>
        </div>
        <aside className="summary-panel">
          <h2>Tóm tắt đơn hàng</h2>
          <div className="summary-row">
            <span>Tạm tính</span>
            <strong>0 đ</strong>
          </div>
          <Button to="/login">Đăng nhập để đặt hàng</Button>
        </aside>
      </div>
    </section>
  );
}
