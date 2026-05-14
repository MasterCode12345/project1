import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    if (serverError) setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.newPassword || form.newPassword.length < 6)
      errs.newPassword = 'Mật khẩu tối thiểu 6 ký tự';
    if (form.newPassword !== form.confirmPassword)
      errs.confirmPassword = 'Mật khẩu xác nhận không khớp';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsLoading(true);
    setServerError('');
    try {
      await authService.resetPassword(token, form.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      setServerError(err.message || 'Liên kết không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <section className="auth-page">
        <div className="auth-card verify-pending-card">
          <div className="verify-icon">✅</div>
          <p className="eyebrow">Thành công!</p>
          <h1 style={{ fontSize: '1.5rem' }}>Mật khẩu đã được cập nhật</h1>
          <p style={{ textAlign: 'center' }}>Đang chuyển về trang đăng nhập...</p>
          <Button to="/login">Đăng nhập ngay</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow">Bảo mật tài khoản</p>
        <h1>Đặt lại mật khẩu</h1>

        {serverError && (
          <div className="auth-error">
            {serverError}
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
              Vui lòng <a href="/forgot-password" style={{ color: 'var(--danger)', fontWeight: 700 }}>
                yêu cầu link mới
              </a>.
            </p>
          </div>
        )}

        <label>
          Mật khẩu mới
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            onChange={handleChange}
          />
          {errors.newPassword && <span className="field-error">{errors.newPassword}</span>}
        </label>

        <label>
          Xác nhận mật khẩu
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            onChange={handleChange}
          />
          {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
        </label>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
        </Button>
      </form>
    </section>
  );
}
