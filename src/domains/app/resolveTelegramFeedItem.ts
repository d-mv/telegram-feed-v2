import { Api } from "telegram";
import type { FeedItem } from "../../types";
import type { EnsureTelegramConnected } from "../auth/model/authTypes";
import {
  getEntityLabel,
  getMediaGroupKey,
  getMediaPreview,
  getMessageCommentsCount,
  toRelativeTime,
} from "../feed/infra/telegramFeed";

function parseTelegramMessageId(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getEntityId(entity: unknown): string | null {
  if (!entity || typeof entity !== "object" || !("id" in entity)) {
    return null;
  }
  const id = entity.id;
  if (typeof id === "string") {
    return id;
  }
  if (typeof id === "number" || typeof id === "bigint") {
    return String(id);
  }
  if (id && typeof id === "object" && "toString" in id && typeof id.toString === "function") {
    return id.toString();
  }
  return null;
}

function isUserEntity(entity: unknown): boolean {
  return Boolean(
    entity &&
      typeof entity === "object" &&
      "className" in entity &&
      entity.className === "User",
  );
}

export function parseTelegramRoute(url: string): { url: string } | "unsupported" {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "tg:") {
      if (parsed.hostname !== "resolve") {
        return "unsupported";
      }
      const domain = parsed.searchParams.get("domain");
      if (!domain) {
        return "unsupported";
      }
      const post = parseTelegramMessageId(parsed.searchParams.get("post"));
      return { url: post ? `https://t.me/${domain}/${post}` : `https://t.me/${domain}` };
    }

    if (parsed.hostname !== "t.me" && parsed.hostname !== "telegram.me") {
      return "unsupported";
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return "unsupported";
    }
    if (segments[0] === "c" || segments[0] === "joinchat" || segments[0].startsWith("+")) {
      return "unsupported";
    }

    const post = parseTelegramMessageId(segments[1] ?? null);
    return { url: post ? `https://t.me/${segments[0]}/${post}` : `https://t.me/${segments[0]}` };
  } catch {
    return "unsupported";
  }
}

export async function resolveTelegramFeedItem(
  entityRef: string | unknown,
  ensureTelegramConnected: EnsureTelegramConnected,
  messageId?: number,
): Promise<FeedItem> {
  const client = (await ensureTelegramConnected()) as {
    getEntity: (entity: string) => Promise<unknown>;
    getMessages: (entity: unknown, options: { ids?: number[]; limit?: number }) => Promise<unknown[]>;
  };

  let targetRef = entityRef;
  let targetMessageId = messageId;

  if (typeof entityRef === "string") {
    const route = parseTelegramRoute(entityRef);
    if (route !== "unsupported") {
      const parsed = new URL(route.url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      targetRef = segments[0] ?? entityRef;
      targetMessageId = targetMessageId ?? parseTelegramMessageId(segments[1] ?? null);
    }
  }

  const entity = typeof targetRef === "string" ? await client.getEntity(targetRef) : targetRef;
  const messages = await client.getMessages(entity, targetMessageId ? { ids: [targetMessageId] } : { limit: 1 });
  const message = messages.find((entry): entry is Api.Message => entry instanceof Api.Message);
  if (!message) {
    throw new Error("Unsupported link");
  }

  const userEntity = isUserEntity(entity);
  const chatId = getEntityId(entity);
  if (!chatId) {
    throw new Error("Unsupported link");
  }

  const chatName = getEntityLabel(entity, userEntity ? "User" : "Group");
  const senderName = userEntity
    ? chatName
    : getEntityLabel(message.getSender ? await message.getSender() : undefined, chatName);
  const type = userEntity ? "dm" : "group";
  const itemId = `${type}-${chatId}-${message.id ?? message.date}`;
  const baseItem = {
    id: itemId,
    channelKey: `${type}:${chatId}`,
    type,
    chatName,
    senderName,
    timestamp: message.date ? toRelativeTime(message.date) : "Just now",
    text: message.message ?? "",
    commentsCount: getMessageCommentsCount(message),
    media: getMediaPreview(message),
    mediaGroupKey: getMediaGroupKey(message),
    sourceMessage: message,
    isFocused: false,
  };

  if (type === "dm") {
    return {
      ...baseItem,
      type: "dm",
      reactions: [],
    };
  }

  return {
    ...baseItem,
    type: "group",
  };
}
