import { useAtomValue } from "jotai/react";
import { toastsAtom } from "../../../atoms/toasts.atom";
import styles from "./ToastViewport.module.css";

export function ToastViewport() {
  const toasts = useAtomValue(toastsAtom);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast} role="status">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
