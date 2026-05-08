import Button from '../components/common/Button.jsx';

export default function ProfilePage() {
  return (
    <section className="section page-section">
      <div className="container form-page">
        <div>
          <p className="eyebrow">Cá nhân</p>
          <h1>Hồ sơ của tôi</h1>
          <p>Form này sẽ nối với userService.getMe() và userService.updateMe().</p>
        </div>
        <form className="profile-form">
          <label>
            Họ tên
            <input type="text" placeholder="Tên người dùng" />
          </label>
          <label>
            Số điện thoại
            <input type="tel" placeholder="090..." />
          </label>
          <label>
            Địa chỉ
            <textarea rows="4" placeholder="Địa chỉ nhận hàng" />
          </label>
          <Button type="button">Lưu thay đổi</Button>
        </form>
      </div>
    </section>
  );
}
