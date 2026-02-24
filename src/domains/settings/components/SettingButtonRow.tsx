import { Button, type ButtonVariant } from "../../../shared/ui/Button/Button";
import styles from "./SettingButtonRow.module.css";

type Props = {
  title: string;
  subtitle?: string;
  buttonText: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
};

export function SettingButtonRow({
  title,
  subtitle,
  buttonText,
  onClick,
  disabled,
  variant = "primary",
}: Props) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>{title}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <Button
        type="button"
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={styles.button}
      >
        {buttonText}
      </Button>
    </div>
  );
}
