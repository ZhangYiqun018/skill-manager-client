import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import styles from "./ToastProvider.module.css";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${counterRef.current++}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      // Keep at most 3 toasts visible
      return next.length > 3 ? next.slice(-3) : next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <div className={styles.toastContainer} role="status" aria-live="polite">
        {toasts.map((toast) => {
          const toastClass =
            toast.type === "success"
              ? styles.toastSuccess
              : toast.type === "error"
                ? styles.toastError
                : styles.toastInfo;
          return (
            <div
              key={toast.id}
              role="alert"
              onClick={() => removeToast(toast.id)}
              className={`${styles.toast} ${toastClass}`}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
