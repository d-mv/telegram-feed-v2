import { Typography } from "antd";
import { useEffect, useState, type PropsWithChildren } from "react";
import type { FeedItem } from "../../../types";
import { toRelativeTime } from "../../../domains/feed/infra/telegramFeed";
import { Avatar } from "../Avatar/Avatar";
import { CommentsIcon } from "../CommentsIcon/CommentsIcon";

type Props = {
  noPreview?: boolean;
  isThread?: boolean;
  message: FeedItem;
  className?: string;
  commentsCount?: number;
};

export function Header({
  children,
  message,
  className,
  noPreview,
  isThread,
  commentsCount,
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

  const dynamicTimestamp = toRelativeTime(message.date);
  const timestamp = dynamicTimestamp || message.timestamp;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: isThread ? 4 : 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Avatar isThread={isThread} noPreview={noPreview} message={message} />
        <Typography.Text
          strong
          style={{
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {children}
        </Typography.Text>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {(commentsCount ?? 0) > 0 && (
          <Typography.Text
            type="secondary"
            aria-label="Has comments"
            style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 3 }}
          >
            <CommentsIcon />
            {commentsCount}
          </Typography.Text>
        )}
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, whiteSpace: "nowrap" }}
        >
          {timestamp}
        </Typography.Text>
      </div>
    </div>
  );
}
