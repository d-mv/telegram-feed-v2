import { type PropsWithChildren, useEffect } from "react";
import styles from "./MenuDialog.module.css";
import { MenuHeader } from "./MenuHeader";

type MenuDialogProps = {
  onClose: () => void;
  title: string;
};

export function MenuDialog({ onClose, title, children }: PropsWithChildren<MenuDialogProps>) {
  const titleId = `menu-dialog-title-${title.toLowerCase().replace(/\s+/g, "-")}`;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.backdrop} onClick={onClose} />
      <main className={styles.panel}>
        <MenuHeader onClose={onClose} titleId={titleId}>
          {title}
        </MenuHeader>
        <section className={styles.content}>{children}</section>
      </main>
    </div>
  );
}
