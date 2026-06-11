import { useEffect, useState } from 'react';
import { productService } from '../services/productService.js';

// Cache dùng chung giữa các lần render / các trang để tránh fetch lại
const cache = new Map(); // id -> { image_url, exists }

export function normalizeProductId(pid) {
  if (!pid) return '';
  if (typeof pid === 'string') return pid;
  if (typeof pid === 'object') return pid.$oid || pid.hex || String(pid);
  return String(pid);
}

/**
 * Nhận vào danh sách item đơn hàng (có product_id), trả về map:
 *   { [productId]: { image_url, exists } }
 * Ảnh được fetch theo product_id và cache lại.
 */
export function useProductImages(items) {
  const [map, setMap] = useState({});

  // Key ổn định để effect chỉ chạy lại khi tập product_id đổi
  const idKey = Array.from(
    new Set((items || []).map((i) => normalizeProductId(i.product_id)).filter(Boolean)),
  )
    .sort()
    .join(',');

  useEffect(() => {
    const ids = idKey ? idKey.split(',') : [];
    if (ids.length === 0) return;

    let isMounted = true;

    (async () => {
      const result = {};
      await Promise.all(
        ids.map(async (id) => {
          if (cache.has(id)) {
            result[id] = cache.get(id);
            return;
          }
          try {
            const p = await productService.getProductById(id);
            const entry = { image_url: p.image_url || '', exists: true };
            cache.set(id, entry);
            result[id] = entry;
          } catch {
            const entry = { image_url: '', exists: false };
            cache.set(id, entry);
            result[id] = entry;
          }
        }),
      );
      if (isMounted) setMap((prev) => ({ ...prev, ...result }));
    })();

    return () => {
      isMounted = false;
    };
  }, [idKey]);

  return map;
}
