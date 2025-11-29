import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

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
  const color =
    toast.kind === 'success'
      ? 'bg-green-100 text-green-800 border-green-200'
      : toast.kind === 'error'
      ? 'bg-red-100 text-red-800 border-red-200'
      : toast.kind === 'warning'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-sm ${color}`}>
      <div className="text-sm font-medium">{toast.message}</div>
      <button
        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}>
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
      setToasts(prev => {
        const next = [...prev, {id, kind, message}];
        return next.slice(-3);
      });
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
        <div className="fixed top-4 right-4 w-80 space-y-2 z-50" role="status" aria-live="polite">
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
