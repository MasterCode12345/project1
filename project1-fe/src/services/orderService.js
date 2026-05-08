import { apiRequest, buildQuery } from './apiClient';

export const orderService = {
  createOrder(payload) {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyOrders(params = {}) {
    return apiRequest(`/orders${buildQuery(params)}`);
  },

  getOrderDetail(id) {
    return apiRequest(`/orders/${id}`);
  },

  cancelOrder(id) {
    return apiRequest(`/orders/${id}/cancel`, {
      method: 'POST',
    });
  },

  getAdminOrders(params = {}) {
    return apiRequest(`/admin/orders${buildQuery(params)}`);
  },
};
