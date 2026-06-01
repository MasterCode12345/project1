import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import MainLayout from '../components/layout/MainLayout.jsx';
import AdminCategoriesPage from '../pages/AdminCategoriesPage.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import AdminOrdersPage from '../pages/AdminOrdersPage.jsx';
import AdminProductsPage from '../pages/AdminProductsPage.jsx';
import AdminUsersPage from '../pages/AdminUsersPage.jsx';
import CartPage from '../pages/CartPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MyOrdersPage from '../pages/MyOrdersPage.jsx';
import OrderDetailPage from '../pages/OrderDetailPage.jsx';
import ProductDetailPage from '../pages/ProductDetailPage.jsx';
import ProductListPage from '../pages/ProductListPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from '../pages/ResetPasswordPage.jsx';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import VNPayReturnPage from '../pages/VNPayReturnPage.jsx';
import { getAuthToken } from '../services/apiClient.js';

// Guard: yêu cầu đăng nhập
function RequireAuth({ children }) {
  const location = useLocation();
  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public */}
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="payment/vnpay/return" element={<VNPayReturnPage />} />

        {/* Protected — cần đăng nhập */}
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth><MyOrdersPage /></RequireAuth>} />
        <Route path="orders/:id" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
      </Route>

      {/* Admin — có sidebar riêng, guard trong AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/categories" element={<AdminCategoriesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
