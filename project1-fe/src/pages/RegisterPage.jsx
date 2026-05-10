import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
  });
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
    if (!form.full_name.trim() || form.full_name.trim().length < 2) {
      errs.full_name = 'Họ tên tối thiểu 2 ký tự';
    }
    if (!form.email.trim()) {
      errs.email = 'Vui lòng nhập email';
    }
    if (!form.password || form.password.length < 6) {
      errs.password = 'Mật khẩu tối thiểu 6 ký tự';
    }
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
      await authService.register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow">Tài khoản mới</p>
        <h1>Đăng ký</h1>

        {serverError && (
          <p className="auth-error">{serverError}</p>
        )}

        <label>
          Họ và tên
          <input
            type="text"
            name="full_name"
            value={form.full_name}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            onChange={handleChange}
          />
          {errors.full_name && <span className="field-error">{errors.full_name}</span>}
        </label>

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
            placeholder="Tối thiểu 6 ký tự"
            autoComplete="new-password"
            onChange={handleChange}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <label>
          Số điện thoại
          <span className="auth-optional">(tuỳ chọn)</span>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            placeholder="0901234567"
            autoComplete="tel"
            onChange={handleChange}
          />
        </label>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>

        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}
