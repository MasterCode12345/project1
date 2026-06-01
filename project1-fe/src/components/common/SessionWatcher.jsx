import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Lắng nghe event 'session-expired' (phát từ apiClient.forceLogout) và đưa
// người dùng về trang đăng nhập kèm thông báo phiên đã hết hạn.
export default function SessionWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    function onSessionExpired() {
      navigate('/login', {
        replace: true,
        state: { sessionExpired: true, from: window.location.pathname },
      });
    }
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [navigate]);

  return null;
}
