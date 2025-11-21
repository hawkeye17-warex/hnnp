import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

type ToastKind = 'success' | 'error' | 'warning';

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastId = 0;

const ToastItem = ({toast, onDismiss}: {toast: Toast; onDismiss: (id: number) => void}) => {
  return (
    <div className={`toast toast--${toast.kind}`}>
      <div className="toast__message">{toast.message}</div>
      <button className="toast__close" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        ×
      </button>
    </div>
  );
};

export const ToastProvider = ({children}: {children: React.ReactNode}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string, durationMs = 3500) => {
      const id = ++toastId;
      setToasts(prev => [...prev, {id, kind, message}]);
      if (durationMs > 0) {
        window.setTimeout(() => removeToast(id), durationMs);
      }
    },
    [removeToast],
  );

  const value = useMemo(() => ({showToast}), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-container">
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return ctx;
};

