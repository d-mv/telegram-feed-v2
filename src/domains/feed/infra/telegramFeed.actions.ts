import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";
import {
  getMediaGroupKey,
  getMediaPreview,
  getMessageCommentsCount,
  toRelativeTime,
} from "./telegramFeed.shared";

type SendTarget = Parameters<TelegramClient["sendMessage"]>[0];
type EnsureTelegramConnected = () => Promise<TelegramClient>;

async function resolveInputChat(sourceMessage: Api.Message): Promise<unknown> {
  return sourceMessage.getInputChat
    ? sourceMessage.getInputChat()
    : (sourceMessage as Api.Message & { inputChat?: unknown }).inputChat;
}

export async function sendMessageToFeedItem(
  item: FeedItem,
  text: string,
  ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem | undefined> {
  const trimmed = text.trim();
  if (trimmed === "") {
    return undefined;
  }
  const sourceMessage = item.sourceMessage;
  if (!(sourceMessage instanceof Api.Message)) {
    throw new Error("Cannot send message for this conversation");
  }
  const client = await ensureTelegramConnected();
  const inputChat = await resolveInputChat(sourceMessage);
  const sentMessage = await client.sendMessage((inputChat ?? undefined) as SendTarget, {
    message: trimmed,
  });
  if (!(sentMessage instanceof Api.Message)) {
    return undefined;
  }
  return {
    id: String(sentMessage.id ?? `${item.id}:sent:${Date.now()}`),
    channelKey: item.channelKey,
    type: item.type,
    chatName: item.chatName,
    senderName: "You",
    timestamp: sentMessage.date ? toRelativeTime(sentMessage.date) : "Just now",
    text: sentMessage.message ?? trimmed,
    commentsCount: getMessageCommentsCount(sentMessage),
    media: getMediaPreview(sentMessage),
    mediaGroupKey: getMediaGroupKey(sentMessage),
    reactions: item.type === "dm" ? [] : undefined,
    sourceMessage: sentMessage,
    isFocused: false,
  } as FeedItem;
}
