import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Api } from "telegram";
import { NewMessage } from "telegram/events";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { notificationFocusAtom } from "../../atoms/notificationFocus.atom";
import {
  notificationPermissionAtom,
  notificationSettingsAtom,
} from "../../atoms/notifications.atom";
import { getAvatarDataUrl } from "../../shared/ui/Avatar/utils";
import type { FeedItem } from "../../types";
import {
  getAvatarPhotoUrl,
  getMediaPreview,
  getMessageCommentsCount,
  mergeAlbumFeedItems,
  toRelativeTime,
} from "../feed/infra/telegramFeed";
import { formatSender, getFallbackChatName } from "./utils";
import type { Dal } from "../dal/types";
import { toCachedFeedItems } from "../feed/infra/feedCache";

export function useProcessMessages({ dal }: { dal: Dal }) {
  const notificationPermission = useAtomValue(notificationPermissionAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authClient = useAtomValue(authClientAtom);
  const notificationSettings = useAtomValue(notificationSettingsAtom);
  const avatarVisibility = useAtomValue(avatarVisibilityAtom);
  const setFeedItems = useSetAtom(feedItemsAtom);
  const setNotificationFocus = useSetAtom(notificationFocusAtom);

  const clientRef = useRef<Awaited<ReturnType<NonNullable<typeof authClient>["ensureTelegramConnected"]>> | null>(null);
  const handlerRef = useRef<((event: { message?: Api.Message }) => void) | null>(null);
  const eventBuilderRef = useRef<NewMessage | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !authClient) return;
    let isActive = true;

    void authClient.ensureTelegramConnected()
      .then(async (client) => {
        clientRef.current = client;
        const me = await client.getMe();
        const meId = me?.id?.toString();
        if (!isActive) {
          return;
        }

        const handler = async (event: { message?: Api.Message }) => {
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

          let isDuplicate = false;
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

          let nextFeedItems: FeedItem[] | null = null;
          setFeedItems((currentFeedItems) => {
            isDuplicate = currentFeedItems.some((entry) => entry.id === itemId);
            if (isDuplicate) {
              return currentFeedItems;
            }
            nextFeedItems = mergeAlbumFeedItems([nextItem, ...currentFeedItems]);
            return nextFeedItems;
          });

          if (isDuplicate) {
            return;
          }

          if (nextFeedItems) {
            await dal.setFeedCache(toCachedFeedItems(nextFeedItems));
          }

          const notificationsEnabled =
            notificationSettings[channelKey] === true ||
            notificationSettings[legacyChannelKey] === true;
          const canNotify =
            typeof Notification !== "undefined" && notificationPermission === "granted";

          if (notificationsEnabled && canNotify) {
            const body = message.message ?? "";
            const notificationAvatar = avatarVisibility.notifications
              ? await getAvatarPhotoUrl(
                  senderEntity,
                  `notify:${channelKey}`,
                  authClient.ensureTelegramConnected,
                )
              : undefined;
            const payload = {
              body: body === "" ? "New message" : body,
              tag: channelKey,
              data: {
                itemId,
                channelKey,
              },
              icon:
                notificationAvatar ??
                (avatarVisibility.notifications
                  ? getAvatarDataUrl(senderName)
                  : "/favicon-192.png"),
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
                const notification = new Notification(chatName, payload);
                notification.onclick = () => {
                  window.focus();
                  setNotificationFocus({ itemId, channelKey });
                  notification.close();
                };
              }
            } catch {
              // ignore notification errors
            }
          }
        };

        const eventBuilder = new NewMessage({ incoming: true });
        handlerRef.current = handler;
        eventBuilderRef.current = eventBuilder;
        client.addEventHandler(handler, eventBuilder);
      })
      .catch(() => {});

    return () => {
      isActive = false;
      const client = clientRef.current;
      const handler = handlerRef.current;
      const eventBuilder = eventBuilderRef.current;
      if (client && handler && eventBuilder) {
        client.removeEventHandler(handler, eventBuilder);
      }
      handlerRef.current = null;
      eventBuilderRef.current = null;
    };
  }, [
    authClient,
    avatarVisibility.notifications,
    dal,
    isAuthenticated,
    notificationPermission,
    notificationSettings,
    setNotificationFocus,
    setFeedItems,
  ]);
}
