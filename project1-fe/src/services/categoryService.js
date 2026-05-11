import { apiRequest } from './apiClient';

function normalizeCategory(raw = {}) {
  const id = typeof raw.id === 'string' ? raw.id
    : raw._id?.$oid ?? raw._id ?? '';
  return {
    ...raw,
    id,
    name: raw.name || '',
    description: raw.description || '',
    is_visible: raw.is_visible !== false,
  };
}

export const categoryService = {
  // Public (đã dùng trong productService — giữ lại ở đây để admin dùng)
  getCategories() {
    return apiRequest('/categories');
  },

  // Admin
  async getAdminCategories() {
    const res = await apiRequest('/admin/categories');
    const list = Array.isArray(res) ? res : (res?.items ?? []);
    return list.map(normalizeCategory);
  },

  async createCategory(payload) {
    const res = await apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeCategory(res);
  },

  async updateCategory(id, payload) {
    const res = await apiRequest(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return normalizeCategory(res);
  },

  deleteCategory(id) {
    return apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
  },
};
