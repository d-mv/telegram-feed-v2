import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { Api } from "telegram";
import { NewMessage } from "telegram/events";
import { isAuthenticatedAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import {
  notificationPermissionAtom,
  notificationSettingsAtom,
} from "../../atoms/notifications.atom";
import { getAvatarDataUrl } from "../../shared/ui/Avatar/utils";
import type { FeedItem } from "../../types";
import { ensureTelegramConnected } from "../auth/infra/telegramAuth";
import {
  getAvatarPhotoUrl,
  getMediaPreview,
  getMessageCommentsCount,
  mergeAlbumFeedItems,
  toRelativeTime,
} from "../feed/infra/telegramFeed";
import { formatSender, getFallbackChatName } from "./utils";

export function useProcessMessages() {
  const notificationPermission = useAtomValue(notificationPermissionAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const notificationSettings = useAtomValue(notificationSettingsAtom);
  const avatarVisibility = useAtomValue(avatarVisibilityAtom);
  const [feedItems, setFeedItems] = useAtom(feedItemsAtom);

  const clientRef = useRef<ReturnType<typeof ensureTelegramConnected> | null>(null);

  const run = useCallback(async () => {
    let isActive = true;
    let handler: ((event: { message?: Api.Message }) => void) | null = null;
    let eventBuilder: NewMessage | null = null;

    try {
      const client = await ensureTelegramConnected();

      clientRef.current = Promise.resolve(client);
      const me = await client.getMe();
      const meId = me?.id?.toString();

      handler = async (event) => {
        if (!isActive) return;

        const message = event.message;
        if (!message || !(message instanceof Api.Message)) return;
        if (message.out) return;
        if (meId && message.senderId?.toString() === meId) return;

        const chatEntity = await message.getChat();
        const chatId = message.chatId?.toString() ?? "chat";
        const isPrivate = Boolean(message.isPrivate);
        const fallbackChatName = getFallbackChatName(isPrivate);
        const chatName = formatSender(chatEntity, fallbackChatName);
        const senderEntity = await message.getSender();
        const senderName = formatSender(senderEntity, chatName);
        const timestamp = message.date ? toRelativeTime(message.date) : "";
        const media = getMediaPreview(message);
        const groupedId = (message as Api.Message & { groupedId?: unknown }).groupedId;
        const mediaGroupKey =
          typeof groupedId === "bigint" ||
          typeof groupedId === "number" ||
          typeof groupedId === "string"
            ? String(groupedId)
            : undefined;
        const idPrefix = isPrivate ? "dm" : "group";
        const channelKey = `${isPrivate ? "dm" : "group"}:${chatId}`;
        const legacyChannelKey = `${isPrivate ? "dm" : "group"}:${chatName}`;
        const itemId = `${idPrefix}-${chatId}-${message.id ?? message.date}`;
        const currentFeedItems = feedItems;
        if (currentFeedItems.some((entry) => entry.id === itemId)) return;

        let nextItem: FeedItem;
        if (isPrivate) {
          nextItem = {
            id: itemId,
            channelKey,
            type: "dm",
            chatName,
            senderName,
            timestamp,
            text: message.message ?? "",
            commentsCount: getMessageCommentsCount(message),
            media,
            mediaGroupKey,
            reactions: [],
            sourceMessage: message,
            isFocused: false,
          };
        } else {
          nextItem = {
            id: itemId,
            channelKey,
            type: "group",
            chatName,
            senderName,
            timestamp,
            text: message.message ?? "",
            commentsCount: getMessageCommentsCount(message),
            media,
            mediaGroupKey,
            sourceMessage: message,
            isFocused: false,
          };
        }
        const nextFeedItems = mergeAlbumFeedItems([nextItem, ...currentFeedItems]);
        setFeedItems(nextFeedItems);

        const notificationsEnabled =
          notificationSettings[channelKey] === true ||
          notificationSettings[legacyChannelKey] === true;
        const canNotify =
          typeof Notification !== "undefined" && notificationPermission === "granted";

        if (notificationsEnabled && canNotify) {
          const body = message.message ?? "";
          const notificationAvatar = avatarVisibility.notifications
            ? await getAvatarPhotoUrl(senderEntity, `notify:${channelKey}`)
            : undefined;
          const payload = {
            body: body === "" ? "New message" : body,
            tag: channelKey,
            icon:
              notificationAvatar ??
              (avatarVisibility.notifications ? getAvatarDataUrl(senderName) : "/favicon-192.png"),
          };
          try {
            let shown = false;
            if ("serviceWorker" in navigator) {
              try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration && "showNotification" in registration) {
                  await registration.showNotification(chatName, {
                    ...payload,
                    badge: "/favicon-96.png",
                  });
                  shown = true;
                }
              } catch {
                shown = false;
              }
            }
            if (!shown) {
              new Notification(chatName, payload);
            }
          } catch {
            // ignore notification errors
          }
        }
      };

      eventBuilder = new NewMessage({ incoming: true });
      client.addEventHandler(handler, eventBuilder);
    } catch {
    } finally {
      {
        isActive = false;
        if (handler) {
          const clientPromise = clientRef.current;
          if (clientPromise) {
            try {
              const client = await clientPromise;

              if (handler && eventBuilder) {
                client.removeEventHandler(handler, eventBuilder);
              }
            } catch {}
          }
        }
      }
    }
  }, [avatarVisibility.notifications, notificationPermission, notificationSettings]);

  useEffect(() => {
    if (!isAuthenticated) return;

    run();
  }, [
    avatarVisibility.notifications,
    isAuthenticated,
    notificationPermission,
    notificationSettings,
  ]);
}
