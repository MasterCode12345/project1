import {
  apiRequest,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
} from './apiClient';

export const authService = {
  // rememberMe=true → refresh token disimpan di localStorage (tồn tại qua các lần mở trình duyệt)
  // rememberMe=false → sessionStorage (mất khi đóng tab)
  async login(payload, rememberMe = false) {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(result.token);
    if (result.refresh_token) {
      setRefreshToken(result.refresh_token, rememberMe);
    }
    return result;
  },

  async register(payload) {
    // BE trả về { message, email } — không có token (cần xác minh email trước)
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token, newPassword) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  // Xác minh email → BE trả về { token, refresh_token, user } → tự đăng nhập
  async verifyEmail(token) {
    const result = await apiRequest(`/auth/verify-email/${token}`);
    setAuthToken(result.token);
    if (result.refresh_token) {
      // Sau khi verify email: mặc định remember = true
      setRefreshToken(result.refresh_token, true);
    }
    return result;
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      // Gửi refresh token lên BE để thu hồi (revoke)
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken || '' }),
      });
    } catch {
      // Dù BE có lỗi vẫn xóa token phía client
    } finally {
      setAuthToken(null);
      setRefreshToken(null); // xóa ở cả localStorage lẫn sessionStorage
    }
  },
};
