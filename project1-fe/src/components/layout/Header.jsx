import { LogOut, Menu, Search, ShoppingCart, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../services/apiClient.js';
import { authService } from '../../services/authService.js';
import { getCartCount } from '../../services/cartService.js';

export default function Header() {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(getCartCount);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAuthToken()));
  const [role, setRole] = useState(getUserRole);

  // Cập nhật badge khi cart thay đổi
  useEffect(() => {
    function onCartUpdate() {
      setCartCount(getCartCount());
    }
    window.addEventListener('cart-updated', onCartUpdate);
    return () => window.removeEventListener('cart-updated', onCartUpdate);
  }, []);

  // Cập nhật auth state khi login/logout (cùng tab hoặc tab khác)
  useEffect(() => {
    function onAuthUpdate() {
      setIsLoggedIn(Boolean(getAuthToken()));
      setRole(getUserRole());
      setCartCount(getCartCount());
    }
    window.addEventListener('auth-updated', onAuthUpdate); // same-tab
    window.addEventListener('storage', onAuthUpdate);      // cross-tab
    return () => {
      window.removeEventListener('auth-updated', onAuthUpdate);
      window.removeEventListener('storage', onAuthUpdate);
    };
  }, []);

  async function handleLogout() {
    await authService.logout(); // gọi POST /auth/logout → BE xác nhận → xóa token
    setIsLoggedIn(false);
    setRole(null);
    setCartCount(0);
    window.dispatchEvent(new Event('cart-updated'));
    navigate('/');
  }

  // Nav items theo role
  const navItems = [
    { to: '/', label: 'Trang chủ' },
    { to: '/products', label: 'Sản phẩm' },
    ...(isLoggedIn ? [{ to: '/orders', label: 'Đơn hàng' }] : []),
    ...(role === 'admin' ? [{ to: '/admin', label: 'Quản trị' }] : []),
  ];

  return (
    <header className="site-header">
      <div className="container header-inner">
        <NavLink className="brand" to="/" aria-label="UniMarket">
          <span className="brand-mark">U</span>
          <span>UniMarket</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Tìm kiếm">
            <Search size={20} />
          </button>

          {/* Cart với badge */}
          <NavLink className="icon-button cart-btn" to="/cart" aria-label="Giỏ hàng">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </NavLink>

          {/* Profile hoặc Login */}
          {isLoggedIn ? (
            <>
              <NavLink className="icon-button" to="/profile" aria-label="Tài khoản">
                <UserRound size={20} />
              </NavLink>
              <button
                className="icon-button"
                type="button"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                onClick={handleLogout}
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <NavLink className="icon-button" to="/login" aria-label="Đăng nhập" title="Đăng nhập">
              <UserRound size={20} />
            </NavLink>
          )}

          <button className="icon-button mobile-menu" type="button" aria-label="Mở menu">
            <Menu size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
