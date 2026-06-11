import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({
  open,
  title = 'Xác nhận',
  message = '',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  // Đóng bằng phím Esc + khóa scroll nền khi mở
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title">{title}</h2>
        {message && <p className="modal-message">{message}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isBusy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            disabled={isBusy}
            onClick={onConfirm}
          >
            {isBusy ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
