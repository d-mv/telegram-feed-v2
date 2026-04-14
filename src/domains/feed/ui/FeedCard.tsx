import { Card, Flex, theme, Typography } from "antd";
import type { CSSProperties } from "react";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import type { FeedItem } from "../../../types";
import { ForwardedBadge } from "./ForwardedBadge";
import { getForwardedMessageMeta } from "./getForwardedMessageMeta";

type FeedCardProps = {
  item: FeedItem;
  onFocus: (item: FeedItem) => void;
  groupedItems?: FeedItem[];
};

function getImageGridColumns(count: number): number {
  if (count <= 2) return count;
  if (count <= 4) return count;
  if (count <= 6) return 3;
  return 4;
}

function getGalleryItems(item: FeedItem, groupedItems?: FeedItem[]): FeedItem[] {
  if (groupedItems && groupedItems.length > 1) {
    return groupedItems.flatMap((groupedItem) => {
      if (!groupedItem.mediaItems || groupedItem.mediaItems.length <= 1) return [groupedItem];
      return groupedItem.mediaItems.map((media, index) => ({
        ...groupedItem,
        id: `${groupedItem.id}:media:${index}`,
        media,
        mediaItems: undefined,
      }));
    });
  }
  if (!item.mediaItems || item.mediaItems.length <= 1) return [];
  return item.mediaItems.map((media, index) => ({
    ...item,
    id: `${item.id}:media:${index}`,
    media,
    mediaItems: undefined,
  }));
}

export function FeedCard({ item, onFocus, groupedItems }: FeedCardProps) {
  const { token } = theme.useToken();
  const forwardedMeta = getForwardedMessageMeta(item.sourceMessage);
  const galleryItems = getGalleryItems(item, groupedItems);
  const hasGroupedMedia = galleryItems.length > 1;
  const hasGroupedImages = hasGroupedMedia && galleryItems.every((mediaItem) => mediaItem.media?.meta.type === "image");
  const imageGridColumns = hasGroupedImages ? getImageGridColumns(galleryItems.length) : undefined;
  const effectiveCommentsCount = hasGroupedMedia
    ? Math.max(...galleryItems.map((mediaItem) => mediaItem.commentsCount ?? 0))
    : (item.commentsCount ?? 0);

  return (
    <Card
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
      styles={{ body: { padding: "12px 16px" } }}
      style={{
        cursor: "pointer",
        borderLeft: forwardedMeta ? `3px solid ${token.colorPrimary}` : undefined,
        marginBottom: 8,
      }}
      hoverable
    >
      <Header noPreview message={item} commentsCount={effectiveCommentsCount || undefined}>
        {item.type === "dm" ? item.senderName : item.chatName}
      </Header>
      <ForwardedBadge sourceMessage={item.sourceMessage} />
      <Text sourceMessage={item.sourceMessage}>{item.text}</Text>
      {hasGroupedMedia ? (
        <div
          data-media-group-layout={hasGroupedImages ? "image-grid" : "stack"}
          style={
            hasGroupedImages
              ? ({
                  display: "grid",
                  gridTemplateColumns: `repeat(${imageGridColumns}, 1fr)`,
                  gap: 4,
                  marginTop: 8,
                  "--media-group-columns": String(imageGridColumns),
                } as CSSProperties)
              : { display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }
          }
        >
          {galleryItems.map((mediaItem) => (
            <div
              key={mediaItem.id}
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
        <div style={{ marginTop: item.media ? 8 : 0 }}>
          <Media item={item} />
        </div>
      )}
      {item.type === "dm" && item.reactions.length > 0 && (
        <Flex gap={6} style={{ marginTop: 8 }} wrap="wrap">
          {item.reactions.map((reaction) => (
            <Typography.Text key={reaction.emoji} style={{ fontSize: 13 }}>
              {reaction.emoji} {reaction.count}
            </Typography.Text>
          ))}
        </Flex>
      )}
    </Card>
  );
}
