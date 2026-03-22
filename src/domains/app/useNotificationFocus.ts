import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { Api } from "telegram";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { notificationFocusAtom, type NotificationFocusTarget } from "../../atoms/notificationFocus.atom";
import { pushToastAtom } from "../../atoms/toasts.atom";
import type { FeedItem } from "../../types";
import { APP_OPEN_TARGET_EVENT } from "./openTarget";
import type { EnsureTelegramConnected } from "../auth/model/authTypes";
import {
  getEntityLabel,
  getMediaGroupKey,
  getMediaPreview,
  getMessageCommentsCount,
  toRelativeTime,
} from "../feed/infra/telegramFeed";

function parseFocusTarget(value: unknown): NotificationFocusTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const target = value as { itemId?: unknown; channelKey?: unknown; view?: unknown };
  const itemId = typeof target.itemId === "string" ? target.itemId : undefined;
  const channelKey = typeof target.channelKey === "string" ? target.channelKey : undefined;
  const view =
    target.view === "thread" || target.view === "feed" ? target.view : undefined;
  if (!itemId && !channelKey) {
    return null;
  }
  return { itemId, channelKey, view };
}

function normalizePath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/";
  }
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function clearLocation() {
  window.history.replaceState({}, "", "/");
}

type TelegramRoute = {
  kind: "telegram";
  url: string;
};

function parseTelegramMessageId(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseTelegramRoute(url: string): TelegramRoute | "unsupported" {
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
      const normalized = post ? `https://t.me/${domain}/${post}` : `https://t.me/${domain}`;
      return { kind: "telegram", url: normalized };
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
    const normalized = post
      ? `https://t.me/${segments[0]}/${post}`
      : `https://t.me/${segments[0]}`;
    return { kind: "telegram", url: normalized };
  } catch {
    return "unsupported";
  }
}

function getEntityId(entity: unknown): string | null {
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

async function resolveTelegramRouteToFeedItem(
  route: TelegramRoute,
  ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem> {
  const client = (await ensureTelegramConnected()) as {
    getEntity: (entity: string) => Promise<unknown>;
    getMessages: (entity: unknown, options: { ids?: number[]; limit?: number }) => Promise<unknown[]>;
  };
  const parsed = new URL(route.url);
  const segments = parsed.pathname.split("/").filter(Boolean);
  const entityRef = segments[0];
  const messageId = parseTelegramMessageId(segments[1] ?? null);
  if (!entityRef) {
    throw new Error("Unsupported link");
  }

  const entity = await client.getEntity(entityRef);
  const messages = await client.getMessages(entity, messageId ? { ids: [messageId] } : { limit: 1 });
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

function parseInboundLocation(
  location: Pick<Location, "pathname" | "search">,
): NotificationFocusTarget | TelegramRoute | "unsupported" | null {
  const params = new URLSearchParams(location.search);
  const focusItemId = params.get("focusItemId") ?? undefined;
  const focusChannelKey = params.get("focusChannelKey") ?? undefined;
  if (focusItemId || focusChannelKey) {
    return {
      itemId: focusItemId,
      channelKey: focusChannelKey,
      view: "feed",
    };
  }

  const pathname = normalizePath(location.pathname);
  if (pathname === "/open") {
    const channelKey = params.get("channel") ?? undefined;
    if (!channelKey) {
      return "unsupported";
    }
    return { channelKey, view: "thread" };
  }
  if (pathname === "/thread") {
    const itemId = params.get("itemId") ?? undefined;
    const channelKey = params.get("channel") ?? undefined;
    if (!itemId && !channelKey) {
      return "unsupported";
    }
    return { itemId, channelKey, view: "thread" };
  }

  const incomingUrl = params.get("url");
  if (!incomingUrl) {
    return null;
  }

  try {
    const parsed = new URL(incomingUrl);
    if (
      parsed.protocol === "tg:" ||
      parsed.hostname === "t.me" ||
      parsed.hostname === "telegram.me"
    ) {
      return parseTelegramRoute(incomingUrl);
    }
  } catch {
    return "unsupported";
  }

  return "unsupported";
}

export function useNotificationFocus() {
  const authClient = useAtomValue(authClientAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const setFeedItems = useSetAtom(feedItemsAtom);
  const setNotificationFocus = useSetAtom(notificationFocusAtom);
  const pushToast = useSetAtom(pushToastAtom);

  useEffect(() => {
    let isActive = true;
    const target = parseInboundLocation(window.location);
    if (!target) {
      return;
    }

    clearLocation();

    if (!isAuthenticated) {
      pushToast("Open links after logging in.");
      return;
    }

    if (target === "unsupported") {
      pushToast("Unsupported link.");
      return;
    }

    if ("kind" in target && target.kind === "telegram") {
      if (!authClient) {
        pushToast("Unsupported link.");
        return;
      }
      void resolveTelegramRouteToFeedItem(target, authClient.ensureTelegramConnected)
        .then((item) => {
          if (!isActive) {
            return;
          }
          setFeedItems((currentItems) =>
            currentItems.some((entry) => entry.id === item.id) ? currentItems : [item, ...currentItems],
          );
          setNotificationFocus({
            channelKey: item.channelKey,
            itemId: item.id,
            view: "thread",
          });
        })
        .catch(() => {
          if (isActive) {
            pushToast("Unsupported link.");
          }
        });
      return () => {
        isActive = false;
      };
    }

    setNotificationFocus(target as NotificationFocusTarget);
    return () => {
      isActive = false;
    };
  }, [authClient, isAuthenticated, pushToast, setFeedItems, setNotificationFocus]);

  useEffect(() => {
    let isActive = true;

    function handleOpenTarget(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail !== "string" || detail === "") {
        return;
      }

      let target: NotificationFocusTarget | TelegramRoute | "unsupported" | null;
      try {
        const parsed = detail.startsWith("/")
          ? new URL(detail, window.location.origin)
          : new URL(detail);
        target = parseInboundLocation(parsed);
      } catch {
        pushToast("Unsupported link.");
        return;
      }

      if (!target || target === "unsupported") {
        pushToast("Unsupported link.");
        return;
      }
      if (!isAuthenticated) {
        pushToast("Open links after logging in.");
        return;
      }
      if ("kind" in target && target.kind === "telegram") {
        if (!authClient) {
          pushToast("Unsupported link.");
          return;
        }
        void resolveTelegramRouteToFeedItem(target, authClient.ensureTelegramConnected)
          .then((item) => {
            if (!isActive) {
              return;
            }
            setFeedItems((currentItems) =>
              currentItems.some((entry) => entry.id === item.id) ? currentItems : [item, ...currentItems],
            );
            setNotificationFocus({
              channelKey: item.channelKey,
              itemId: item.id,
              view: "thread",
            });
          })
          .catch(() => {
            if (isActive) {
              pushToast("Unsupported link.");
            }
          });
        return;
      }

      setNotificationFocus(target as NotificationFocusTarget);
    }

    window.addEventListener(APP_OPEN_TARGET_EVENT, handleOpenTarget as EventListener);
    return () => {
      isActive = false;
      window.removeEventListener(APP_OPEN_TARGET_EVENT, handleOpenTarget as EventListener);
    };
  }, [authClient, isAuthenticated, pushToast, setFeedItems, setNotificationFocus]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; payload?: unknown } | undefined;
      if (data?.type !== "NOTIFICATION_FOCUS") {
        return;
      }
      const target = parseFocusTarget(data.payload);
      if (target) {
        setNotificationFocus(target);
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [setNotificationFocus]);

  useEffect(() => {
    if (!("registerProtocolHandler" in navigator)) {
      return;
    }
    try {
      navigator.registerProtocolHandler("web+tgfeed", "/?url=%s");
    } catch {
      // ignore unsupported protocol registration
    }
  }, []);
}
