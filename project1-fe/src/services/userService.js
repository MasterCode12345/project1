import { apiRequest, buildQuery } from './apiClient';

export const userService = {
  getMe() {
    return apiRequest('/me');
  },

  updateMe(payload) {
    return apiRequest('/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  changePassword(payload) {
    return apiRequest('/me/password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getAdminUsers(params = {}) {
    return apiRequest(`/admin/users${buildQuery(params)}`);
  },

  adminUpdateStatus(id, status) {
    return apiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
