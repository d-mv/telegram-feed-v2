import clsx from "clsx";
import { useEffect, useState, type PropsWithChildren } from "react";
import type { FeedItem } from "../../../types";
import { toRelativeTime } from "../../../domains/feed/infra/telegramFeed";
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
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 30_000);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const sourceDate = (message.sourceMessage as { date?: unknown } | undefined)?.date;
  const timestamp =
    typeof sourceDate === "number" ? toRelativeTime(sourceDate) : message.timestamp;

  return (
    <div className={clsx(styles.container, isThread && styles.threadContainer, className)}>
      <div className={clsx(styles.left, isThread && styles.threadLeft)}>
        <Avatar isThread={isThread} noPreview={noPreview} message={message} />
        <h2 className={clsx(styles.header, isThread && styles.threadHeader)}>{children}</h2>
      </div>
      <span className={clsx(styles.timestamp, isThread && styles.threadTimestamp)}>{timestamp}</span>
    </div>
  );
}
