import { Button } from "../../../shared/ui/Button/Button";
import styles from "./Header.module.css";

type Props = {
  onClose: () => void;
};

export function Header({ onClose }: Props) {
  return (
    <header className={styles.container}>
      <h2 className={styles.title}>Settings</h2>
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
