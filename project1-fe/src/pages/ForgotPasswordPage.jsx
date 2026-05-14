import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate() {
    if (!email.trim()) return 'Vui lòng nhập email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không hợp lệ';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
    } catch {
      // BE luôn trả 200 dù email có tồn tại không — không hiện lỗi
    } finally {
      setIsLoading(false);
      // Luôn hiện màn hình thành công để không leak thông tin
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <section className="auth-page">
        <div className="auth-card verify-pending-card">
          <div className="verify-icon">📧</div>
          <p className="eyebrow">Kiểm tra hộp thư</p>
          <h1 style={{ fontSize: '1.5rem' }}>Email đã được gửi</h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Nếu <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được
            link đặt lại mật khẩu trong vài phút.
          </p>
          <div className="verify-note">
            ⏱ Link có hiệu lực trong <strong>15 phút</strong>.<br />
            Kiểm tra cả thư mục Spam nếu không thấy.
          </div>
          <Button to="/login" variant="secondary">Quay lại đăng nhập</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow">Bảo mật tài khoản</p>
        <h1>Quên mật khẩu?</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: -8 }}>
          Nhập email đăng ký, chúng tôi sẽ gửi link để đặt lại mật khẩu.
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
          />
          {emailError && <span className="field-error">{emailError}</span>}
        </label>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang gửi…' : 'Gửi link đặt lại mật khẩu'}
        </Button>

        <p style={{ textAlign: 'center' }}>
          <Link to="/login">← Quay lại đăng nhập</Link>
        </p>
      </form>
    </section>
  );
}
