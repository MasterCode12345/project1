import { Boxes, LayoutDashboard, LogOut, ShoppingBag, Tag, Users } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getAuthToken, getUserRole } from '../../services/apiClient.js';
import { authService } from '../../services/authService.js';

const sidebarItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Sản phẩm', icon: Boxes },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { to: '/admin/categories', label: 'Danh mục', icon: Tag },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  // Guard: chỉ admin mới vào được
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true });
      return;
    }
    if (getUserRole() !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  async function handleLogout() {
    await authService.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">Quản trị</span>
        </div>

        <nav className="admin-sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `admin-sidebar-link${isActive ? ' admin-sidebar-link--active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout ở cuối sidebar */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-sidebar-logout"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
