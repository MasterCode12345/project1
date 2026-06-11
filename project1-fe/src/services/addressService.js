// Dịch vụ lấy đơn vị hành chính Việt Nam (cấu trúc 2025: Tỉnh/Thành phố → Phường/Xã)
// Nguồn: Vietnam Provinces online API — https://provinces.open-api.vn
// Lưu ý: từ 1/7/2025 bỏ cấp Quận/Huyện, chỉ còn 2 cấp: Tỉnh → Phường/Xã.

const ADDRESS_API_BASE =
  import.meta.env.VITE_ADDRESS_API_BASE || 'https://provinces.open-api.vn/api/v2';

// Cache trong bộ nhớ để tránh gọi lại API nhiều lần
let _provincesCache = null;
const _wardsCache = new Map(); // provinceCode -> wards[]

async function fetchJson(path) {
  const res = await fetch(`${ADDRESS_API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Lỗi tải dữ liệu địa chỉ (${res.status})`);
  }
  return res.json();
}

export const addressService = {
  // Danh sách tất cả tỉnh/thành phố
  async getProvinces() {
    if (_provincesCache) return _provincesCache;
    const data = await fetchJson('/p/');
    _provincesCache = data;
    return data;
  },

  // Danh sách phường/xã thuộc một tỉnh (depth=2 trả về kèm wards)
  async getWards(provinceCode) {
    if (!provinceCode) return [];
    const key = String(provinceCode);
    if (_wardsCache.has(key)) return _wardsCache.get(key);
    const province = await fetchJson(`/p/${provinceCode}?depth=2`);
    const wards = province?.wards ?? [];
    _wardsCache.set(key, wards);
    return wards;
  },
};
