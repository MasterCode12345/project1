import { Menu, Search, ShoppingCart, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/products', label: 'Sản phẩm' },
  { to: '/orders', label: 'Đơn hàng' },
  { to: '/admin', label: 'Quản trị' },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <NavLink className="brand" to="/" aria-label="UniMarket">
          <span className="brand-mark">U</span>
          <span>UniMarket</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <Search size={20} />
          </button>
          <NavLink className="icon-button" to="/cart" aria-label="Giỏ hàng">
            <ShoppingCart size={20} />
          </NavLink>
          <NavLink className="icon-button" to="/profile" aria-label="Tài khoản">
            <UserRound size={20} />
          </NavLink>
          <button className="icon-button mobile-menu" type="button" aria-label="Mở menu">
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
