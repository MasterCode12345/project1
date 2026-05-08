import Button from '../components/common/Button.jsx';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <section className="auth-page">
      <form className="auth-card">
        <p className="eyebrow">Tài khoản</p>
        <h1>Đăng nhập</h1>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Mật khẩu
          <input type="password" name="password" placeholder="Nhập mật khẩu" />
        </label>
        <Button type="button">Đăng nhập</Button>
        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </form>
    </section>
  );
}
