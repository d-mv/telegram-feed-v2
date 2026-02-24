import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "default" | "primary" | "ghost" | "image";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  imgSrc?: string;
  imgAlt?: string;
};

export function Button({ variant = "default", className, imgSrc, imgAlt, ...props }: ButtonProps) {
  const classNames = [styles.button];

  if (variant === "primary") {
    classNames.push(styles.primary);
  }

  if (variant === "ghost") {
    classNames.push(styles.ghost);
  }

  if (variant === "image") {
    classNames.push(styles.image);
  }

  if (className) {
    classNames.push(className);
  }

  if (variant === "image") {
    return (
      <button type="button" {...props} className={classNames.join(" ")}>
        <img src={imgSrc} alt={imgAlt} />
      </button>
    );
  }

  return <button {...props} className={classNames.join(" ")} />;
}
