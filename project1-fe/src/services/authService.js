import { apiRequest, setAuthToken } from './apiClient';

export const authService = {
  async login(payload) {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(result.token);
    return result;
  },

  async register(payload) {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(result.token);
    return result;
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

  // Xác minh email — BE trả về { token, user } để tự đăng nhập sau khi verify
  async verifyEmail(token) {
    const result = await apiRequest(`/auth/verify-email/${token}`);
    setAuthToken(result.token);
    return result;
  },

  async logout() {
    try {
      // Gọi BE để xác nhận logout (token hợp lệ trước khi xóa)
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Dù BE có lỗi vẫn xóa token phía client
    } finally {
      setAuthToken(null);
    }
  },
};
