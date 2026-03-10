import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";
import {
  getEntityLabel,
  getMediaGroupKey,
  getMediaPreview,
  getMessageCommentsCount,
  mergeAlbumFeedItems,
  toRelativeTime,
} from "./telegramFeed.shared";

type FetchFeedOptions = {
  perChat: number;
  maxAgeDays: number;
};

type TelegramDialog = {
  entity?: unknown;
  name?: string;
  title?: string;
  isUser?: boolean;
  id?: { toString(): string } | string | number;
};

type MessagesTarget = Parameters<TelegramClient["getMessages"]>[0];
type EnsureTelegramConnected = () => Promise<TelegramClient>;

const DEFAULT_OPTIONS: FetchFeedOptions = {
  perChat: 10,
  maxAgeDays: 7,
};

function toFeedItem(dialog: TelegramDialog, message: Api.Message, senderName: string): FeedItem {
  const chatName = dialog.name || dialog.title || (dialog.isUser ? "User" : "Group");
  const chatId = dialog.id?.toString() ?? "chat";
  const channelKey = `${dialog.isUser ? "dm" : "group"}:${chatId}`;
  const idSuffix = message.id ?? message.date;

  if (dialog.isUser) {
    return {
      id: `dm-${chatId}-${idSuffix}`,
      channelKey,
      type: "dm",
      chatName,
      senderName: chatName,
      timestamp: toRelativeTime(message.date),
      text: message.message ?? "",
      commentsCount: getMessageCommentsCount(message),
      media: getMediaPreview(message),
      mediaGroupKey: getMediaGroupKey(message),
      reactions: [],
      sourceMessage: message,
      isFocused: false,
    };
  }

  return {
    id: `group-${chatId}-${idSuffix}`,
    channelKey,
    type: "group",
    chatName,
    senderName,
    timestamp: toRelativeTime(message.date),
    text: message.message ?? "",
    commentsCount: getMessageCommentsCount(message),
    media: getMediaPreview(message),
    mediaGroupKey: getMediaGroupKey(message),
    sourceMessage: message,
    isFocused: false,
  };
}

export async function fetchRecentFeed(
  options: Partial<FetchFeedOptions> = {},
  ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem[]> {
  const { perChat, maxAgeDays } = { ...DEFAULT_OPTIONS, ...options };
  const client = await ensureTelegramConnected();
  const me = await client.getMe();
  const dialogs = await client.getDialogs({});
  const cutoff = Date.now() / 1000 - maxAgeDays * 24 * 60 * 60;
  const dialogItems = await Promise.all(
    dialogs.map(async (dialog) => {
      if (!dialog.entity) {
        return [];
      }

      const messages = await client.getMessages(dialog.entity as MessagesTarget, { limit: perChat });
      return Promise.all(
        messages.map(async (message) => {
          if (!(message instanceof Api.Message)) {
            return null;
          }
          if (message.out) {
            return null;
          }
          if (me && message.fromId && "userId" in message.fromId) {
            if (message.fromId.userId?.toString() === me.id?.toString()) {
              return null;
            }
          }
          if (!message.date || message.date < cutoff) {
            return null;
          }

          const chatName = dialog.name || dialog.title || (dialog.isUser ? "User" : "Group");
          const senderName = dialog.isUser
            ? chatName
            : getEntityLabel(message.getSender ? await message.getSender() : undefined, chatName);

          return {
            item: toFeedItem(dialog, message, senderName),
            sortDate: message.date,
          };
        }),
      );
    }),
  );

  const sortedItems = dialogItems
    .flat()
    .filter((item): item is { item: FeedItem; sortDate: number } => item !== null)
    .sort((a, b) => b.sortDate - a.sortDate)
    .map(({ item }) => item);
  return mergeAlbumFeedItems(sortedItems);
}
