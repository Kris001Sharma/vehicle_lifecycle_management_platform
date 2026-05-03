import { useState, useEffect } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type ToastListener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners: Set<ToastListener> = new Set();
let toastIdCounter = 0;

const notifyListeners = () => {
  listeners.forEach(listener => listener([...toasts]));
};

export const showToast = (message: string, variant: ToastVariant = 'info') => {
  const id = `toast-${++toastIdCounter}`;
  toasts = [...toasts, { id, message, variant }].slice(-3); // Max 3
  notifyListeners();

  setTimeout(() => {
    dismissToast(id);
  }, 4000);
};

export const dismissToast = (id: string) => {
  toasts = toasts.filter(t => t.id !== id);
  notifyListeners();
};

export const useToast = () => {
  return { showToast, dismissToast };
};

export const useToastState = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return currentToasts;
};
