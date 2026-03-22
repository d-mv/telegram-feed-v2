import type { PropsWithChildren } from "react";
import { Button } from "../../../shared/ui/Button/Button";
import styles from "./MenuHeader.module.css";

type Props = {
  onClose: () => void;
  titleId?: string;
};

export function MenuHeader({ onClose, children, titleId }: PropsWithChildren<Props>) {
  return (
    <header className={styles.container}>
      <h3 id={titleId} className={styles.title}>
        {children}
      </h3>
      <Button
        variant="image"
        type="button"
        onClick={onClose}
        imgSrc="/icons/close_dark.svg"
        imgAlt="Close"
      />
    </header>
  );
}
