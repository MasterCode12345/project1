import { useEffect, useState } from 'react';
import { addressService } from '../../services/addressService.js';

/**
 * Bộ chọn địa chỉ hành chính Việt Nam (2025): Tỉnh/Thành phố → Phường/Xã.
 *
 * Props:
 *  - value: { provinceCode, provinceName, wardCode, wardName }
 *  - onChange: (next) => void   // trả về object value mới
 *  - errors: { province?, ward? }
 *  - disabled: boolean
 */
export default function AddressSelect({ value = {}, onChange, errors = {}, disabled = false }) {
  const [provinces, setProvinces] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  // Lưu kèm mã tỉnh để biết wards đang thuộc tỉnh nào (tránh setState đồng bộ trong effect)
  const [wardsData, setWardsData] = useState({ code: null, list: [] });
  const [loadError, setLoadError] = useState('');

  // Trạng thái suy ra, không cần setState
  const wards = wardsData.code === value.provinceCode ? wardsData.list : [];
  const loadingWards = Boolean(value.provinceCode) && wardsData.code !== value.provinceCode;

  // Tải danh sách tỉnh/thành khi mount
  useEffect(() => {
    let active = true;
    addressService
      .getProvinces()
      .then((data) => {
        if (active) setProvinces(data);
      })
      .catch(() => {
        if (active) setLoadError('Không tải được danh sách tỉnh/thành. Vui lòng thử lại.');
      })
      .finally(() => {
        if (active) setLoadingProvinces(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Tải phường/xã mỗi khi tỉnh thay đổi (kể cả khi khôi phục giá trị có sẵn)
  useEffect(() => {
    const code = value.provinceCode;
    if (!code) return undefined;
    let active = true;
    addressService
      .getWards(code)
      .then((list) => {
        if (active) setWardsData({ code, list });
      })
      .catch(() => {
        if (active) setLoadError('Không tải được danh sách phường/xã. Vui lòng thử lại.');
      });
    return () => {
      active = false;
    };
  }, [value.provinceCode]);

  function handleProvinceChange(e) {
    const code = Number(e.target.value);
    const province = provinces.find((p) => p.code === code);
    // Đổi tỉnh → reset phường/xã
    onChange?.({
      provinceCode: province ? province.code : '',
      provinceName: province ? province.name : '',
      wardCode: '',
      wardName: '',
    });
  }

  function handleWardChange(e) {
    const code = Number(e.target.value);
    const ward = wards.find((w) => w.code === code);
    onChange?.({
      ...value,
      wardCode: ward ? ward.code : '',
      wardName: ward ? ward.name : '',
    });
  }

  return (
    <div className="address-select">
      <label className="shipping-label">
        Tỉnh / Thành phố <span className="required-mark">*</span>
        <select
          name="province"
          value={value.provinceCode || ''}
          onChange={handleProvinceChange}
          disabled={disabled || loadingProvinces}
        >
          <option value="">
            {loadingProvinces ? 'Đang tải...' : '-- Chọn tỉnh / thành phố --'}
          </option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>
        {errors.province && <span className="field-error">{errors.province}</span>}
      </label>

      <label className="shipping-label">
        Phường / Xã <span className="required-mark">*</span>
        <select
          name="ward"
          value={value.wardCode || ''}
          onChange={handleWardChange}
          disabled={disabled || !value.provinceCode || loadingWards}
        >
          <option value="">
            {!value.provinceCode
              ? '-- Chọn tỉnh / thành phố trước --'
              : loadingWards
                ? 'Đang tải...'
                : '-- Chọn phường / xã --'}
          </option>
          {wards.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name}
            </option>
          ))}
        </select>
        {errors.ward && <span className="field-error">{errors.ward}</span>}
      </label>

      {loadError && <span className="field-error">{loadError}</span>}
    </div>
  );
}
