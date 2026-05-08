import Button from '../components/common/Button.jsx';

export default function RegisterPage() {
  return (
    <section className="auth-page">
      <form className="auth-card">
        <p className="eyebrow">Tài khoản mới</p>
        <h1>Đăng ký</h1>
        <label>
          Họ tên
          <input type="text" name="full_name" placeholder="Nguyễn Văn A" />
        </label>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Mật khẩu
          <input type="password" name="password" placeholder="Tối thiểu 6 ký tự" />
        </label>
        <Button type="button">Tạo tài khoản</Button>
      </form>
    </section>
  );
}
