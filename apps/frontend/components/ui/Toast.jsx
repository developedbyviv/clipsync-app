'use client';

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, variant = 'info', duration = 3000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ message, variant = 'info', onDismiss }) {
  const accentClass = {
    success: 'border-l-olive-500',
    error:   'border-l-red-500',
    info:    'border-l-stone-400',
  }[variant] ?? 'border-l-stone-400';

  const iconPath = {
    success: 'M5 13l4 4L19 7',
    error:   'M6 18L18 6M6 6l12 12',
    info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }[variant];

  const iconColor = {
    success: 'text-olive-500',
    error:   'text-red-500',
    info:    'text-stone-400',
  }[variant];

  return (
    <div
      role="alert"
      onClick={onDismiss}
      className={`
        flex items-center gap-3 cursor-pointer
        bg-white dark:bg-stone-800
        border border-stone-200 dark:border-stone-700
        border-l-4 ${accentClass}
        rounded-xl px-4 py-3
        min-w-[240px] max-w-[360px]
        shadow-sm
        animate-in slide-in-from-right-2 fade-in duration-200
      `}
    >
      <svg
        aria-hidden="true"
        className={`w-4 h-4 flex-shrink-0 ${iconColor}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
      </svg>
      <p className="text-sm text-stone-700 dark:text-stone-200 flex-1">{message}</p>
      <button aria-label="Dismiss notification" className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 ml-1">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx.addToast;
}
