import { CommentsIcon } from "../../../shared/ui/CommentsIcon/CommentsIcon";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import { UnreadIcon } from "../../../shared/ui/UnreadIcon/UnreadIcon";
import type { FeedItem } from "../../../types";
import styles from "./FeedCard.module.css";

type FeedCardProps = {
  item: FeedItem;
  onFocus: (item: FeedItem) => void;
  onMarkRead?: (item: FeedItem) => void;
};

export function FeedCard({ item, onFocus, onMarkRead }: FeedCardProps) {
  const hasComments = (item.commentsCount ?? 0) > 0;
  const isUnread = item.isRead !== true;

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
        <Media item={item} onVideoPlay={() => onMarkRead?.(item)} />
        {(hasComments || isUnread) && (
          <div className={styles["meta-column"]}>
            {isUnread && <UnreadIcon />}
            {hasComments && <CommentsIcon />}
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
