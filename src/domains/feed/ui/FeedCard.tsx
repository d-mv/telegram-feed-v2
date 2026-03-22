import type { CSSProperties } from "react";
import { CommentsIcon } from "../../../shared/ui/CommentsIcon/CommentsIcon";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import type { FeedItem } from "../../../types";
import { ForwardedBadge } from "./ForwardedBadge";
import { getForwardedMessageMeta } from "./getForwardedMessageMeta";
import styles from "./FeedCard.module.css";

type FeedCardProps = {
  item: FeedItem;
  onFocus: (item: FeedItem) => void;
  groupedItems?: FeedItem[];
};

function getImageGridColumns(count: number): number {
  if (count <= 2) {
    return count;
  }
  if (count <= 4) {
    return count;
  }
  if (count <= 6) {
    return 3;
  }
  return 4;
}

function getGalleryItems(item: FeedItem, groupedItems?: FeedItem[]): FeedItem[] {
  if (groupedItems && groupedItems.length > 1) {
    return groupedItems.flatMap((groupedItem) => {
      if (!groupedItem.mediaItems || groupedItem.mediaItems.length <= 1) {
        return [groupedItem];
      }
      return groupedItem.mediaItems.map((media, index) => ({
        ...groupedItem,
        id: `${groupedItem.id}:media:${index}`,
        media,
        mediaItems: undefined,
      }));
    });
  }
  if (!item.mediaItems || item.mediaItems.length <= 1) {
    return [];
  }
  return item.mediaItems.map((media, index) => ({
    ...item,
    id: `${item.id}:media:${index}`,
    media,
    mediaItems: undefined,
  }));
}

export function FeedCard({ item, onFocus, groupedItems }: FeedCardProps) {
  const forwardedMeta = getForwardedMessageMeta(item.sourceMessage);
  const galleryItems = getGalleryItems(item, groupedItems);
  const hasGroupedMedia = galleryItems.length > 1;
  const hasGroupedImages =
    hasGroupedMedia && galleryItems.every((mediaItem) => mediaItem.media?.meta.type === "image");
  const imageGridColumns = hasGroupedImages ? getImageGridColumns(galleryItems.length) : undefined;
  const hasComments = hasGroupedMedia
    ? galleryItems.some((mediaItem) => (mediaItem.commentsCount ?? 0) > 0)
    : (item.commentsCount ?? 0) > 0;

  return (
    <article
      className={`${styles.feedCard} ${forwardedMeta ? styles.feedCardForwarded : ""}`}
      role="button"
      tabIndex={0}
      data-feed-item-id={item.id}
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
        <ForwardedBadge sourceMessage={item.sourceMessage} />
        <Text className={styles.text}>{item.text}</Text>
        {hasGroupedMedia ? (
          <div
            className={hasGroupedImages ? styles.mediaGrid : styles.mediaStack}
            data-media-group-layout={hasGroupedImages ? "image-grid" : "stack"}
            style={
              hasGroupedImages
                ? ({ "--media-group-columns": String(imageGridColumns) } as CSSProperties)
                : undefined
            }
          >
            {galleryItems.map((mediaItem) => (
              <div
                key={mediaItem.id}
                className={hasGroupedImages ? styles.mediaGridTile : undefined}
                data-media-group-tile="true"
              >
                <Media
                  item={mediaItem}
                  aspectRatioOverride={hasGroupedImages ? "1 / 1" : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          <Media item={item} />
        )}
        {hasComments && (
          <div className={styles["meta-column"]}>
            {hasComments && (
              <span aria-label="Has comments">
                <CommentsIcon />
              </span>
            )}
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
