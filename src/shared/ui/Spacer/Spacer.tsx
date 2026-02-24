import clsx from "clsx";
import type { HTMLAttributes } from "react";
import styles from "./Spacer.module.css";

type Props = {
  direction?: "vertical" | "horizontal";
};

export function Spacer({
  className,
  direction = "vertical",
  ...props
}: HTMLAttributes<HTMLDivElement> & Props) {
  return (
    <div
      className={clsx(
        styles.container,
        direction === "vertical" ? styles.vertical : styles.horizontal,
        className,
      )}
      {...props}
    />
  );
}
