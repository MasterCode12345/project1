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

  logout() {
    setAuthToken(null);
  },
};
