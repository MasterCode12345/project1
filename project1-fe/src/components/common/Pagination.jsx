import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Tính dãy số trang hiển thị: max 7 items, dùng null làm dấu ...
 * Ví dụ page=5, total=10 → [1, null, 4, 5, 6, null, 10]
 */
function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];

  if (current <= 4) {
    // Đầu: 1 2 3 4 5 ... total
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push(null);
    pages.push(total);
  } else if (current >= total - 3) {
    // Cuối: 1 ... (total-4) ... total
    pages.push(1);
    pages.push(null);
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    // Giữa: 1 ... (cur-1) cur (cur+1) ... total
    pages.push(1);
    pages.push(null);
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push(null);
    pages.push(total);
  }

  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const range = getPageRange(page, totalPages);

  return (
    <div className="pagination-numbered">
      {/* Prev */}
      <button
        className="page-btn page-btn--nav"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Numbers */}
      {range.map((p, i) =>
        p === null ? (
          <span key={`dot-${i}`} className="page-dots">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`page-btn${p === page ? ' page-btn--active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        className="page-btn page-btn--nav"
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
