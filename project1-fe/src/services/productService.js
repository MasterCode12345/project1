import { apiRequest, buildQuery } from './apiClient';

function normalizeId(id) {
  if (!id) {
    return '';
  }

  if (typeof id === 'string') {
    return id;
  }

  if (typeof id === 'object') {
    return id.$oid || id.hex || String(id);
  }

  return String(id);
}

function normalizeProduct(product = {}) {
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImage = product.image_url || images[0]?.image_url || '';

  return {
    ...product,
    id: normalizeId(product.id || product._id),
    category_id: normalizeId(product.category_id),
    name: product.name || 'Sản phẩm chưa đặt tên',
    category_name: product.category_name || 'Danh mục',
    price: Number(product.price || 0),
    image_url: primaryImage,
    stock_quantity: Number(product.stock_quantity || 0),
  };
}

function normalizeProductList(response = {}) {
  const items = Array.isArray(response.items) ? response.items : [];

  return {
    items: items.map(normalizeProduct),
    total: Number(response.total || items.length),
    page: Number(response.page || 1),
    pageSize: Number(response.page_size || response.pageSize || items.length),
  };
}

export const productService = {
  async getProducts(params = {}) {
    const response = await apiRequest(`/products${buildQuery(params)}`);
    return normalizeProductList(response);
  },

  async getProductById(id) {
    const response = await apiRequest(`/products/${id}`);
    return normalizeProduct(response);
  },

  getCategories() {
    return apiRequest('/categories');
  },

  getAdminProducts(params = {}) {
    return apiRequest(`/admin/products${buildQuery(params)}`);
  },

  createProduct(payload) {
    return apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProduct(id, payload) {
    return apiRequest(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
