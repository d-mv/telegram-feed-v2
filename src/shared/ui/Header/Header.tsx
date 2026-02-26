import clsx from "clsx";
import type { PropsWithChildren } from "react";
import type { FeedItem } from "../../../types";
import { Avatar } from "../Avatar/Avatar";
import styles from "./Header.module.css";

type Props = {
  noPreview?: boolean;
  isThread?: boolean;
  message: FeedItem;
  className?: string;
};

export function Header({
  children,
  message,
  className,
  noPreview,
  isThread,
}: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles.container, className)}>
      <div className={styles.left}>
        <Avatar isThread={isThread} noPreview={noPreview} message={message} />
        <h2 className={styles.header}>{children}</h2>
      </div>
      <span className={styles.timestamp}>{message.timestamp}</span>
    </div>
  );
}
