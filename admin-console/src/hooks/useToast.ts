import {useToastContext} from '../context/ToastContext';

export const useToast = () => {
  const {showToast} = useToastContext();
  return {
    success: (message: string, durationMs?: number) => showToast('success', message, durationMs),
    error: (message: string, durationMs?: number) => showToast('error', message, durationMs),
    warning: (message: string, durationMs?: number) => showToast('warning', message, durationMs),
    info: (message: string, durationMs?: number) => showToast('info', message, durationMs),
  };
};
