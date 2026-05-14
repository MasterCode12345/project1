import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import { authService } from '../services/authService.js';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Liên kết không hợp lệ.'); return; }

    authService.verifyEmail(token)
      .then(() => {
        setStatus('success');
        // Tự redirect về trang chủ sau 3 giây
        setTimeout(() => navigate('/', { replace: true }), 3000);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.');
      });
  }, [token, navigate]);

  return (
    <section className="auth-page">
      <div className="auth-card verify-pending-card">
        {status === 'loading' && (
          <>
            <div className="verify-icon verify-spin">⏳</div>
            <h1 style={{ fontSize: '1.5rem' }}>Đang xác minh...</h1>
            <p>Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="verify-icon">✅</div>
            <p className="eyebrow">Thành công!</p>
            <h1 style={{ fontSize: '1.5rem' }}>Email đã được xác minh</h1>
            <p>Tài khoản của bạn đã kích hoạt. Đang chuyển về trang chủ...</p>
            <Button to="/">Về trang chủ ngay</Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="verify-icon">❌</div>
            <p className="eyebrow">Xác minh thất bại</p>
            <h1 style={{ fontSize: '1.5rem' }}>Liên kết không hợp lệ</h1>
            <p className="auth-error" style={{ textAlign: 'center' }}>{errorMsg}</p>
            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              Liên kết hết hạn sau 30 phút. Hãy đăng ký lại để nhận email mới.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button to="/register">Đăng ký lại</Button>
              <Button to="/login" variant="secondary">Đăng nhập</Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
