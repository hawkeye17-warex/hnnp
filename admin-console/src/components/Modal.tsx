import React from 'react';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const Modal = ({open, onClose, title, children}: ModalProps) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
        onClick={e => {
          e.stopPropagation();
        }}>
        <div className="modal__header">
          <h3>{title}</h3>
          <button className="secondary" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
