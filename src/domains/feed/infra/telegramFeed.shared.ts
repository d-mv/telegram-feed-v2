import { Api } from "telegram";
import type { FeedItem } from "../../../types";

export function toRelativeTime(unixSeconds: number): string {
  if (typeof unixSeconds !== "number" || Number.isNaN(unixSeconds)) {
    return "";
  }
  const now = Date.now() / 1000;
  const diff = Math.max(0, Math.floor(now - unixSeconds));
  if (diff < 60) {
    return "Just now";
  }
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} min ago`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hr ago`;
  }
  const days = Math.floor(diff / 86400);
  return `${days} d ago`;
}

export function getMessageCommentsCount(message: Api.Message): number {
  const replies = message.replies;
  if (!replies || typeof replies !== "object" || !("replies" in replies)) {
    return 0;
  }
  const raw = replies.replies;
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }
  return 0;
}

export function getEntityLabel(entity: unknown, fallback: string): string {
  if (!entity || typeof entity !== "object") {
    return fallback;
  }
  if ("title" in entity && typeof entity.title === "string" && entity.title.trim() !== "") {
    return entity.title;
  }
  if ("firstName" in entity && typeof entity.firstName === "string") {
    const lastName =
      "lastName" in entity && typeof entity.lastName === "string" ? entity.lastName : "";
    return `${entity.firstName} ${lastName}`.trim();
  }
  if ("username" in entity && typeof entity.username === "string" && entity.username.trim() !== "") {
    return entity.username;
  }
  return fallback;
}

export function getMediaGroupKey(message: Api.Message): string | undefined {
  const groupedId = (message as Api.Message & { groupedId?: unknown }).groupedId;
  if (typeof groupedId === "bigint" || typeof groupedId === "number" || typeof groupedId === "string") {
    return String(groupedId);
  }
  return undefined;
}

export function getReplyToId(message: Api.Message): number | undefined {
  const replyTo = message.replyTo;
  if (replyTo && typeof replyTo === "object" && "replyToMsgId" in replyTo) {
    return (replyTo as { replyToMsgId: number }).replyToMsgId;
  }
  return undefined;
}

function canMergeAlbumItem(item: FeedItem): boolean {
  return Boolean(item.mediaGroupKey) && Boolean(item.media) && item.media?.meta.type === "image";
}

export function mergeAlbumFeedItems(items: FeedItem[]): FeedItem[] {
  const merged: FeedItem[] = [];

  for (const item of items) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      canMergeAlbumItem(previous) &&
      canMergeAlbumItem(item) &&
      previous.mediaGroupKey === item.mediaGroupKey &&
      previous.channelKey === item.channelKey &&
      previous.senderName === item.senderName
    ) {
      previous.mediaItems = [...(previous.mediaItems ?? [previous.media!]), item.media!];
      if (previous.text === "" && item.text !== "") {
        previous.text = item.text;
        previous.sourceMessage = item.sourceMessage;
      }
      continue;
    }

    merged.push({
      ...item,
      mediaItems: item.media ? [item.media] : item.mediaItems,
    });
  }

  return merged;
}

function getYoutubeId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v") || undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function getMediaPreview(message: Api.Message): FeedItem["media"] | undefined {
  const media = message.media;
  if (media && "className" in media) {
    if (media.className === "MessageMediaWebPage") {
      const webpage = (media as Api.MessageMediaWebPage).webpage;
      if (webpage instanceof Api.WebPage) {
        const youtubeId = getYoutubeId(webpage.url);
        if (youtubeId) {
          return {
            meta: {
              type: "youtube",
              width: 1280,
              height: 720,
              sizeBytes: 0,
              title: webpage.title || "YouTube Video",
            },
            url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
            alt: webpage.title || "YouTube Video",
            key: `youtube-${youtubeId}`,
          };
        }
      }
    }

    if (media.className === "MessageMediaPhoto") {
      const photo = media.photo instanceof Api.Photo ? media.photo : undefined;
      const sizes = photo?.sizes ?? [];
      const size = sizes.reduce<{
        w: number;
        h: number;
        sizeBytes: number;
      } | null>((acc, current) => {
        const w = "w" in current ? current.w : 0;
        const h = "h" in current ? current.h : 0;
        const sizeBytesRaw = "size" in current ? current.size : 0;
        const sizeBytes =
          typeof sizeBytesRaw === "bigint" ? Number(sizeBytesRaw) : Number(sizeBytesRaw);
        if (!acc || w * h > acc.w * acc.h) {
          return { w, h, sizeBytes };
        }
        return acc;
      }, null);
      if (size) {
        return {
          meta: {
            type: "image",
            width: size.w,
            height: size.h,
            sizeBytes: size.sizeBytes,
            mimeType: "image/jpeg",
          },
          alt: "Photo",
          key: `photo-${photo?.id?.toString() ?? message.id}`,
        };
      }
    }

    if (media.className === "MessageMediaDocument") {
      const document = media.document instanceof Api.Document ? media.document : undefined;
      if (document) {
        const mimeType = document.mimeType ? String(document.mimeType) : "";
        const sizeBytesRaw = document.size ?? 0;
        const sizeBytes =
          typeof sizeBytesRaw === "bigint" ? Number(sizeBytesRaw) : Number(sizeBytesRaw);
        let width = 0;
        let height = 0;
        let fileName = "";
        let hasAudioAttribute = false;
        for (const attribute of document.attributes ?? []) {
          if (attribute instanceof Api.DocumentAttributeVideo) {
            width = attribute.w;
            height = attribute.h;
          }
          if (attribute instanceof Api.DocumentAttributeImageSize) {
            width = attribute.w;
            height = attribute.h;
          }
          if (
            attribute instanceof Api.DocumentAttributeFilename &&
            typeof attribute.fileName === "string"
          ) {
            fileName = attribute.fileName;
          }
          if (attribute instanceof Api.DocumentAttributeAudio) {
            hasAudioAttribute = true;
          }
        }
        const type = mimeType.startsWith("video")
          ? "video"
          : mimeType.startsWith("image")
            ? "image"
            : mimeType.startsWith("audio") || hasAudioAttribute
              ? "audio"
              : "file";
        if (!width || !height) {
          if (type === "video" || type === "image") {
            width = 640;
            height = 360;
          }
        }
        return {
          meta: {
            type,
            width,
            height,
            sizeBytes,
            mimeType,
            fileName,
          },
          alt: "Media",
          key: `doc-${document.id?.toString() ?? message.id}`,
        };
      }
    }
  }

  const text = message.message || "";
  for (const entity of message.entities || []) {
    let url: string | undefined;
    if (entity instanceof Api.MessageEntityUrl) {
      url = text.slice(entity.offset, entity.offset + entity.length);
    } else if (entity instanceof Api.MessageEntityTextUrl) {
      url = entity.url;
    }

    if (url) {
      const youtubeId = getYoutubeId(url);
      if (youtubeId) {
        return {
          meta: {
            type: "youtube",
            width: 1280,
            height: 720,
            sizeBytes: 0,
            title: "YouTube Video",
          },
          url: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
          alt: "YouTube Video",
          key: `youtube-${youtubeId}`,
        };
      }
    }
  }

  return undefined;
}
