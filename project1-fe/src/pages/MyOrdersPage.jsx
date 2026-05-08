export default function MyOrdersPage() {
  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Lịch sử mua hàng</p>
        <h1>Đơn hàng của tôi</h1>
        <div className="empty-state">
          <h2>Chưa có đơn hàng</h2>
          <p>Trang này sẽ gọi orderService.getMyOrders với page, page_size và status.</p>
        </div>
      </div>
    </section>
  );
}
