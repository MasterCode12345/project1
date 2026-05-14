import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getUserRole } from '../services/apiClient.js';
import { authService } from '../services/authService.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.email.trim()) errs.email = 'Vui lòng nhập email';
    if (!form.password) errs.password = 'Vui lòng nhập mật khẩu';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setServerError('');

    try {
      await authService.login({
        email: form.email.trim(),
        password: form.password,
      });
      const role = getUserRole();
      navigate(role === 'admin' ? '/admin' : (from === '/login' ? '/' : from), { replace: true });
    } catch (err) {
      // Hiển thị thông báo riêng khi chưa xác minh email
      if (err.code === 'EMAIL_NOT_VERIFIED' || err.message?.includes('xác minh')) {
        setServerError('Email chưa được xác minh. Vui lòng kiểm tra hộp thư (kể cả Spam).');
      } else {
        setServerError(err.message || 'Đăng nhập thất bại, vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow">Tài khoản</p>
        <h1>Đăng nhập</h1>

        {serverError && (
          <p className="auth-error">{serverError}</p>
        )}

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={handleChange}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            name="password"
            value={form.password}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            onChange={handleChange}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link
            to="/forgot-password"
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </Button>

        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </form>
    </section>
  );
}
