import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { getAuthToken } from '../services/apiClient.js';
import { userService } from '../services/userService.js';

// --- Skeleton ---
function ProfileSkeleton() {
  return (
    <div className="profile-form">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gap: 8 }}>
          <span className="skeleton-line short" style={{ height: 13 }} />
          <span className="skeleton-line" style={{ height: 46, borderRadius: 10 }} />
        </div>
      ))}
      <span className="skeleton-line short" style={{ height: 46, borderRadius: 10 }} />
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();

  // --- Auth guard ---
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true });
  }, [navigate]);

  // --- User info ---
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [loadError, setLoadError] = useState('');

  // --- Profile form ---
  const [profile, setProfile] = useState({ full_name: '', phone: '', address: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileServerError, setProfileServerError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Password form ---
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordServerError, setPasswordServerError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- Load user ---
  useEffect(() => {
    if (!getAuthToken()) return;

    let isMounted = true;

    async function fetchMe() {
      setIsLoadingUser(true);
      setLoadError('');
      try {
        const data = await userService.getMe();
        if (isMounted) {
          setUser(data);
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
          });
        }
      } catch (err) {
        if (isMounted) setLoadError(err.message || 'Không thể tải thông tin tài khoản.');
      } finally {
        if (isMounted) setIsLoadingUser(false);
      }
    }

    fetchMe();
    return () => { isMounted = false; };
  }, []);

  // --- Profile handlers ---
  function handleProfileChange(e) {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) setProfileErrors((prev) => ({ ...prev, [name]: '' }));
    if (profileServerError) setProfileServerError('');
    if (profileSuccess) setProfileSuccess('');
  }

  function validateProfile() {
    const errs = {};
    if (!profile.full_name.trim() || profile.full_name.trim().length < 2) {
      errs.full_name = 'Họ tên tối thiểu 2 ký tự';
    }
    return errs;
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    const errs = validateProfile();
    if (Object.keys(errs).length > 0) { setProfileErrors(errs); return; }

    setIsSavingProfile(true);
    setProfileServerError('');
    setProfileSuccess('');

    try {
      const updated = await userService.updateMe({
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      });
      setUser(updated);
      setProfileSuccess('Cập nhật thông tin thành công!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileServerError(err.message || 'Cập nhật thất bại, vui lòng thử lại.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  // --- Password handlers ---
  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((prev) => ({ ...prev, [name]: '' }));
    if (passwordServerError) setPasswordServerError('');
    if (passwordSuccess) setPasswordSuccess('');
  }

  function validatePassword() {
    const errs = {};
    if (!passwords.old_password) errs.old_password = 'Vui lòng nhập mật khẩu hiện tại';
    if (!passwords.new_password || passwords.new_password.length < 6) {
      errs.new_password = 'Mật khẩu mới tối thiểu 6 ký tự';
    }
    return errs;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const errs = validatePassword();
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }

    setIsSavingPassword(true);
    setPasswordServerError('');
    setPasswordSuccess('');

    try {
      await userService.changePassword({
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      });
      setPasswords({ old_password: '', new_password: '' });
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordServerError(err.message || 'Đổi mật khẩu thất bại, vui lòng thử lại.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <section className="section page-section">
      <div className="container form-page">

        {/* Cột trái: thông tin tài khoản */}
        <div>
          <p className="eyebrow">Cá nhân</p>
          <h1>Hồ sơ của tôi</h1>

          {isLoadingUser && (
            <div className="profile-info-card">
              <span className="skeleton-line medium" style={{ height: 13 }} />
              <span className="skeleton-line short" style={{ height: 13, marginTop: 8 }} />
            </div>
          )}

          {!isLoadingUser && loadError && (
            <p className="auth-error">{loadError}</p>
          )}

          {!isLoadingUser && user && (
            <div className="profile-info-card">
              <div className="profile-info-row">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Vai trò</span>
                <span className="profile-info-value profile-role-badge">
                  {user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                </span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Trạng thái</span>
                <span className={`profile-info-value ${user.status === 'active' ? 'profile-status--active' : 'profile-status--inactive'}`}>
                  {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: các form */}
        <div className="profile-forms-col">

          {/* Form cập nhật thông tin */}
          <div className="profile-section">
            <h2>Thông tin cá nhân</h2>

            {isLoadingUser ? (
              <ProfileSkeleton />
            ) : (
              <form className="profile-form" onSubmit={handleSaveProfile} noValidate>
                {profileServerError && (
                  <p className="auth-error">{profileServerError}</p>
                )}
                {profileSuccess && (
                  <p className="add-feedback add-feedback--success">{profileSuccess}</p>
                )}

                <label>
                  Họ và tên
                  <input
                    type="text"
                    name="full_name"
                    value={profile.full_name}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    onChange={handleProfileChange}
                  />
                  {profileErrors.full_name && (
                    <span className="field-error">{profileErrors.full_name}</span>
                  )}
                </label>

                <label>
                  Số điện thoại
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone}
                    placeholder="0901234567"
                    autoComplete="tel"
                    onChange={handleProfileChange}
                  />
                </label>

                <label>
                  Địa chỉ nhận hàng
                  <textarea
                    name="address"
                    value={profile.address}
                    rows={3}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    onChange={handleProfileChange}
                  />
                </label>

                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
                </Button>
              </form>
            )}
          </div>

          {/* Form đổi mật khẩu */}
          <div className="profile-section">
            <h2>Đổi mật khẩu</h2>
            <form className="profile-form" onSubmit={handleChangePassword} noValidate>
              {passwordServerError && (
                <p className="auth-error">{passwordServerError}</p>
              )}
              {passwordSuccess && (
                <p className="add-feedback add-feedback--success">{passwordSuccess}</p>
              )}

              <label>
                Mật khẩu hiện tại
                <input
                  type="password"
                  name="old_password"
                  value={passwords.old_password}
                  placeholder="Nhập mật khẩu hiện tại"
                  autoComplete="current-password"
                  onChange={handlePasswordChange}
                />
                {passwordErrors.old_password && (
                  <span className="field-error">{passwordErrors.old_password}</span>
                )}
              </label>

              <label>
                Mật khẩu mới
                <input
                  type="password"
                  name="new_password"
                  value={passwords.new_password}
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                  onChange={handlePasswordChange}
                />
                {passwordErrors.new_password && (
                  <span className="field-error">{passwordErrors.new_password}</span>
                )}
              </label>

              <Button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? 'Đang đổi…' : 'Đổi mật khẩu'}
              </Button>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
}
