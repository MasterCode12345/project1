import { Boxes, ShoppingBag, UsersRound, WalletCards } from 'lucide-react';

const stats = [
  { label: 'Doanh thu', value: '0 đ', icon: WalletCards },
  { label: 'Đơn hàng', value: '0', icon: ShoppingBag },
  { label: 'Sản phẩm', value: '0', icon: Boxes },
  { label: 'Người dùng', value: '0', icon: UsersRound },
];

export default function AdminDashboardPage() {
  return (
    <section className="section page-section">
      <div className="container">
        <p className="eyebrow">Admin</p>
        <h1>Bảng điều khiển</h1>
        <p className="page-intro">Khung dashboard cho /api/v1/admin/dashboard và các API admin.</p>
        <div className="admin-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article className="admin-card" key={stat.label}>
                <Icon size={24} />
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
