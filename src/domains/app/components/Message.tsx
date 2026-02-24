import type { PropsWithChildren } from "react";
import styles from "./Message.module.css";

export function Message({ children }: PropsWithChildren) {
  return <div className={styles.container}>{children}</div>;
}
