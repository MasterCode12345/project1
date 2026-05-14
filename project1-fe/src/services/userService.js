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

  adminCreateUser(payload) {
    return apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  adminUpdateUser(id, payload) {
    return apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  adminUpdateStatus(id, status) {
    return apiRequest(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
