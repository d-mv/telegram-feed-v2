import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import type { FeedItem } from "../../../types";
import styles from "./FeedCard.module.css";

type FeedCardProps = {
  item: FeedItem;
  onFocus: (item: FeedItem) => void;
};

function CommentsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.commentsIcon}
    >
      <path d="M2.25 12.76c0 1.6.72 3.13 1.98 4.22l-.52 3.49 3.24-1.86c1 .38 2.09.58 3.2.58 4.59 0 8.25-3.21 8.25-7.23 0-4.01-3.66-7.22-8.25-7.22s-8.25 3.21-8.25 7.22Z" />
      <path d="M7.5 10.5h7.5" />
      <path d="M7.5 13.5h4.5" />
    </svg>
  );
}

export function FeedCard({ item, onFocus }: FeedCardProps) {
  const hasComments = (item.commentsCount ?? 0) > 0;

  return (
    <article
      className={styles.feedCard}
      role="button"
      onClick={() => onFocus(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFocus(item);
        }
      }}
    >
      <div className={styles.feedCardBody}>
        <Header noPreview message={item}>
          {item.type === "dm" ? item.senderName : item.chatName}
        </Header>
        <Text className={styles.text}>{item.text}</Text>
        <Media item={item} />
        {hasComments && (
          <div className={styles.metaRow}>
            <span className={styles.commentsIndicator} aria-label="Has comments">
              <CommentsIcon />
            </span>
          </div>
        )}
        {item.type === "dm" && (
          <div className={styles.feedCardReactions}>
            {item.reactions.map((reaction) => (
              <span key={reaction.emoji} className={styles.feedCardReaction}>
                {reaction.emoji} {reaction.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
