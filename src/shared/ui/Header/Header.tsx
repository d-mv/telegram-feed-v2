import clsx from "clsx";
import type { PropsWithChildren } from "react";
import type { FeedItem } from "../../../types";
import { Avatar } from "../Avatar/Avatar";
import styles from "./Header.module.css";

type Props = {
  noPreview?: boolean;
  message: FeedItem;
  className?: string;
};

export function Header({ children, message, className, noPreview }: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles.container, className)}>
      <div className={styles.left}>
        <Avatar noPreview={noPreview} message={message} />
        <h2 className={styles.header}>{children}</h2>
      </div>
      <span className={styles.timestamp}>{message.timestamp}</span>
    </div>
  );
}
