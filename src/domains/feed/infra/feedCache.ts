import type { FeedItem } from "../../../types";
import { mergeAlbumFeedItems } from "./telegramFeed.shared";

export function toCachedFeedItems(items: FeedItem[]): FeedItem[] {
  return items.map(({ sourceMessage: _sourceMessage, ...rest }) => rest);
}

export function getLatestMessageIdsByChat(items: FeedItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    if (!item.channelKey) {
      return acc;
    }

    const messageId = getFeedItemMessageId(item);
    if (messageId === undefined) {
      return acc;
    }

    const current = acc[item.channelKey];
    if (current === undefined || messageId > current) {
      acc[item.channelKey] = messageId;
    }

    return acc;
  }, {});
}

export function mergeFeedItems(nextItems: FeedItem[], cachedItems: FeedItem[]): FeedItem[] {
  if (nextItems.length === 0) {
    return cachedItems;
  }

  const seen = new Set(nextItems.map((item) => item.id));
  return mergeAlbumFeedItems([
    ...nextItems,
    ...cachedItems.filter((item) => !seen.has(item.id)),
  ]);
}

function getFeedItemMessageId(item: FeedItem): number | undefined {
  const match = item.id.match(/-(\d+)$/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
