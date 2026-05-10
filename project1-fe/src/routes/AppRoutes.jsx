import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import AdminOrdersPage from '../pages/AdminOrdersPage.jsx';
import AdminProductsPage from '../pages/AdminProductsPage.jsx';
import CartPage from '../pages/CartPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MyOrdersPage from '../pages/MyOrdersPage.jsx';
import ProductDetailPage from '../pages/ProductDetailPage.jsx';
import ProductListPage from '../pages/ProductListPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="orders" element={<MyOrdersPage />} />
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="admin/orders" element={<AdminOrdersPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
