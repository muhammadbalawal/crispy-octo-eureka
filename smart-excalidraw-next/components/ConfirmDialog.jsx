'use client';

import Modal from './ui/Modal';
import Button from './ui/Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) {
  const typeStyles = {
    warning: { message: 'text-yellow-700', variant: 'primary' },
    danger: { message: 'text-red-700', variant: 'danger' },
    info: { message: 'text-blue-700', variant: 'primary' }
  };

  const styles = typeStyles[type] || typeStyles.warning;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <p className={`text-sm ${styles.message} mb-6`}>{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant={styles.variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
