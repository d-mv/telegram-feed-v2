import { useContext } from "react";
import { getAvatarColor, getAvatarInitials } from "../../../shared/ui/Avatar/avatar";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import { AppContext } from "../../app/AppContext";
import type { FeedItem } from "../model/mockFeed";
import styles from "./FeedCard.module.css";

type FeedCardProps = {
  item: FeedItem;
  onFocus: (item: FeedItem) => void;
};

export function FeedCard({ item, onFocus }: FeedCardProps) {
  const { avatarVisibility } = useContext(AppContext);
  const isAvatarVisible = avatarVisibility?.feed ?? true;
  const avatarName = item.type === "dm" ? item.senderName : item.chatName;
  const avatarInitials = getAvatarInitials(avatarName);
  const avatarColor = getAvatarColor(avatarName);

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
        {isAvatarVisible && (
          <div className={styles.avatarWrap}>
            <div
              className={styles.avatar}
              style={{ background: avatarColor }}
              aria-label={`Avatar for ${avatarName}`}
              title={avatarName}
            >
              {avatarInitials}
            </div>
          </div>
        )}
        <Header timestamp={item.timestamp} className={styles.header}>
          {item.type === "dm" ? item.senderName : item.chatName}
        </Header>
        <Text className={styles.text}>{item.text}</Text>
        <Media item={item} />
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
