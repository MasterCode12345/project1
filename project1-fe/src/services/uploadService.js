import { apiRequest } from './apiClient';

export const uploadService = {
  /**
   * Upload ảnh lên Cloudinary qua BE.
   * @param {File} file - File ảnh từ input
   * @param {string} folder - Folder trên Cloudinary (default: 'products')
   * @returns {Promise<string>} URL ảnh đã upload
   */
  async uploadImage(file, folder = 'products') {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiRequest(`/admin/upload/image?folder=${folder}`, {
      method: 'POST',
      body: formData,
    });

    if (!res?.url) throw new Error('Upload thất bại: không nhận được URL.');
    return res.url;
  },
};
