import { useAtom } from "jotai/react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "telegram";
import { NewMessage } from "telegram/events";
import { avatarVisibilityAtom } from "./atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "./atoms/feedFilters.atom";
import { feedItemsAtom } from "./atoms/feedItems.atom";
import {
  hasEnabledChannels,
  notificationPermissionAtom,
  notificationSettingsAtom,
} from "./atoms/notifications.atom";
import { AppContext } from "./domains/app/AppContext";
import { Message } from "./domains/app/components/Message";
import { createAuthFromEnv } from "./domains/auth/infra/authFactory";
import { ensureTelegramConnected } from "./domains/auth/infra/telegramAuth";
import type { AuthClient } from "./domains/auth/model/authTypes";
import { LoginView } from "./domains/auth/ui/LoginView";
import { createIndexedDbDal } from "./domains/dal/indexedDbDal";
import {
  fetchRecentFeed,
  getAvatarPhotoUrl,
  getMessageCommentsCount,
  getMediaPreview,
  sendMessageToFeedItem,
  toRelativeTime,
} from "./domains/feed/infra/telegramFeed";
import { FeedView } from "./domains/feed/ui/FeedView";
import { getAvatarDataUrl } from "./shared/ui/Avatar/utils";
import { Loading } from "./shared/ui/Loading/Loading";
import type {
  AvatarVisibilitySettings,
  FeedFilterSettings,
  FeedItem,
  NotificationSettings,
} from "./types";

const Empty = lazy(() => import("./domains/app/components/Empty"));

type AppProps = {
  auth?: AuthClient;
};

function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "boolean");
}

function isFeedFilterSettings(value: unknown): value is FeedFilterSettings {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "boolean");
}

function isAvatarVisibilitySettings(value: unknown): value is AvatarVisibilitySettings {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as AvatarVisibilitySettings;
  return (
    typeof candidate.feed === "boolean" &&
    typeof candidate.thread === "boolean" &&
    typeof candidate.notifications === "boolean"
  );
}

function App({ auth }: AppProps) {
  const [feedItems, setFeedItems] = useAtom(feedItemsAtom);
  const [feedFilterSettings, setFeedFilterSettings] = useAtom(feedFilterSettingsAtom);
  const [avatarVisibility, setAvatarVisibility] = useAtom(avatarVisibilityAtom);
  const [notificationSettings, setNotificationSettings] = useAtom(notificationSettingsAtom);
  const [notificationPermission, setNotificationPermission] = useAtom(notificationPermissionAtom);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(auth ?? null);
  const [isAuthLoading, setIsAuthLoading] = useState(auth ? false : true);

  const dal = useMemo(() => createIndexedDbDal(), []);
  const clientRef = useRef<ReturnType<typeof ensureTelegramConnected> | null>(null);
  const notificationSettingsRef = useRef<NotificationSettings>({});
  const feedItemsRef = useRef<FeedItem[]>([]);

  useEffect(() => {
    feedItemsRef.current = feedItems;
  }, [feedItems]);

  function formatSender(entity: unknown, fallback: string) {
    if (!entity || typeof entity !== "object") {
      return fallback;
    }
    if ("title" in entity && typeof entity.title === "string") {
      return entity.title;
    }
    if ("firstName" in entity && typeof entity.firstName === "string") {
      const lastName =
        "lastName" in entity && typeof entity.lastName === "string" ? entity.lastName : "";
      return `${entity.firstName} ${lastName}`.trim();
    }
    if ("username" in entity && typeof entity.username === "string") {
      return entity.username;
    }
    return fallback;
  }

  function getFallbackChatName(isPrivate: boolean) {
    if (isPrivate) return "User";

    return "Group";
  }

  const authenticate = useCallback(async () => {
    try {
      const session = await dal.getSession();
      const sessionValue = typeof session === "string" ? session : undefined;
      const client = createAuthFromEnv(import.meta.env, {
        session: sessionValue,
        onSession: (nextSession) => {
          dal.setSession(nextSession).catch(() => {});
        },
      });
      setAuthClient(client);
    } catch {
      const client = createAuthFromEnv(import.meta.env, {
        onSession: (nextSession) => {
          dal.setSession(nextSession).catch(() => {});
        },
      });
      setAuthClient(client);
    } finally {
      setIsAuthLoading(false);
    }
  }, [dal, setIsAuthLoading, setAuthClient]);

  const getNotificationSettings = useCallback(async () => {
    try {
      const stored = await dal.getNotificationSettings();

      if (isNotificationSettings(stored)) {
        setNotificationSettings(stored);
      }
    } catch (e) {
      console.log("getNotificationSettings", e);
    }
  }, [dal]);

  const getFeedFilterSettings = useCallback(async () => {
    try {
      const stored = await dal.getFeedFilterSettings();
      if (isFeedFilterSettings(stored)) {
        setFeedFilterSettings(stored);
      }
    } catch (e) {
      console.log("getFeedFilterSettings", e);
    }
  }, [dal, setFeedFilterSettings]);

  const getAvatarVisibilitySettings = useCallback(async () => {
    try {
      const stored = await dal.getAvatarVisibilitySettings();
      if (isAvatarVisibilitySettings(stored)) {
        setAvatarVisibility(stored);
      }
    } catch (e) {
      console.log("getAvatarVisibilitySettings", e);
    }
  }, [dal, setAvatarVisibility]);

  useEffect(() => {
    if (!auth) authenticate();
    else {
      setAuthClient(auth);
      setIsAuthLoading(false);
    }
  }, [auth, authenticate]);

  useEffect(() => {
    getNotificationSettings();
    getFeedFilterSettings();
    getAvatarVisibilitySettings();
  }, [dal, getAvatarVisibilitySettings, getFeedFilterSettings, getNotificationSettings]);

  useEffect(() => {
    if (!authClient || isAuthenticated) {
      return;
    }
    let cancelled = false;
    ensureTelegramConnected()
      .then((client) => client.checkAuthorization())
      .then((authorized) => {
        if (!cancelled && authorized) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authClient, isAuthenticated]);

  const refreshFeed = useCallback(() => {
    setIsLoadingFeed(true);
    setFeedError("");
    dal
      .getFeedCache()
      .then((cached) => {
        if (Array.isArray(cached)) {
          const nextItems = cached as FeedItem[];
          feedItemsRef.current = nextItems;
          setFeedItems(nextItems);
        }
      })
      .catch(() => {});

    fetchRecentFeed({ perChat: 10, maxAgeDays: 7 })
      .then((items) => {
        feedItemsRef.current = items;
        setFeedItems(items);
        const cacheItems = items.map(({ sourceMessage: _sourceMessage, ...rest }) => rest);
        return dal.setFeedCache(cacheItems);
      })
      .catch((error) => {
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load feed";
        setFeedError(message);
      })
      .finally(() => {
        setIsLoadingFeed(false);
      });
  }, [dal, setFeedItems]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    refreshFeed();
  }, [isAuthenticated, refreshFeed]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isActive = true;
    let handler: ((event: { message?: Api.Message }) => void) | null = null;

    ensureTelegramConnected()
      .then(async (client) => {
        clientRef.current = Promise.resolve(client);
        const me = await client.getMe();
        const meId = me?.id?.toString();

        handler = async (event) => {
          if (!isActive) {
            return;
          }
          const message = event.message;
          if (!message || !(message instanceof Api.Message)) {
            return;
          }
          if (message.out) {
            return;
          }
          if (meId && message.senderId?.toString() === meId) {
            return;
          }

          const chatEntity = await message.getChat();
          const chatId = message.chatId?.toString() ?? "chat";
          const isPrivate = Boolean(message.isPrivate);
          const fallbackChatName = getFallbackChatName(isPrivate);
          const chatName = formatSender(chatEntity, fallbackChatName);
          const senderEntity = await message.getSender();
          const senderName = formatSender(senderEntity, chatName);
          const timestamp = message.date ? toRelativeTime(message.date) : "";
          const media = getMediaPreview(message);
          const idPrefix = isPrivate ? "dm" : "group";
          const channelKey = `${isPrivate ? "dm" : "group"}:${chatId}`;
          const legacyChannelKey = `${isPrivate ? "dm" : "group"}:${chatName}`;
          const itemId = `${idPrefix}-${chatId}-${message.id ?? message.date}`;
          const currentFeedItems = feedItemsRef.current;
          if (currentFeedItems.some((entry) => entry.id === itemId)) {
            return;
          }
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
              reactions: [],
              sourceMessage: message,
            };
          } else {
            nextItem = {
              id: itemId,
              channelKey,
              type: "group",
              chatName,
              timestamp,
              text: message.message ?? "",
              commentsCount: getMessageCommentsCount(message),
              media,
              sourceMessage: message,
            };
          }
          const nextFeedItems = [nextItem, ...currentFeedItems];
          feedItemsRef.current = nextFeedItems;
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
                new Notification(chatName, payload);
              }
            } catch {
              // ignore notification errors
            }
          }
        };

        client.addEventHandler(handler, new NewMessage({ incoming: true }));
      })
      .catch(() => {});

    return () => {
      isActive = false;
      if (handler) {
        const clientPromise = clientRef.current;
        if (clientPromise) {
          clientPromise
            .then((client) => {
              client.removeEventHandler(handler);
            })
            .catch(() => {});
        }
      }
    };
  }, [
    avatarVisibility.notifications,
    isAuthenticated,
    notificationPermission,
    notificationSettings,
  ]);

  function closeVisibleNotifications() {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready
        .then((registration) => registration.getNotifications())
        .then((notifications) => {
          notifications.forEach((notification) => notification.close());
        })
        .catch(() => {});
    }
  }

  function handleToggleChannelNotification(channelKey: string, enabled: boolean) {
    const nextSettings = {
      ...notificationSettings,
      [channelKey]: enabled,
    };
    setNotificationSettings(nextSettings);
    dal.setNotificationSettings(nextSettings).catch(() => {});

    const notificationsOn = hasEnabledChannels(nextSettings);

    if (notificationsOn) {
      if (notificationPermission !== "granted") {
        void handleRequestNotificationPermission();
      }
      return;
    }

    closeVisibleNotifications();
  }

  function handleDisableNotifications() {
    const nextSettings: NotificationSettings = {};
    notificationSettingsRef.current = nextSettings;
    setNotificationSettings(nextSettings);
    dal.setNotificationSettings(nextSettings).catch(() => {});
    closeVisibleNotifications();
  }

  function handleToggleChannelFilter(channelKey: string, enabled: boolean) {
    const nextSettings = { ...feedFilterSettings };
    if (enabled) {
      delete nextSettings[channelKey];
    } else {
      nextSettings[channelKey] = false;
    }
    setFeedFilterSettings(nextSettings);
    dal.setFeedFilterSettings(nextSettings).catch(() => {});
  }

  function handleEnableAllFeedFilters() {
    const nextSettings: FeedFilterSettings = {};
    setFeedFilterSettings(nextSettings);
    dal.setFeedFilterSettings(nextSettings).catch(() => {});
  }

  function handleSetAvatarVisibility(next: AvatarVisibilitySettings) {
    setAvatarVisibility(next);
    dal.setAvatarVisibilitySettings(next).catch(() => {});
  }

  async function handleSendMessage(item: FeedItem, text: string) {
    await sendMessageToFeedItem(item, text);
    refreshFeed();
  }

  async function handleRequestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setNotificationPermission(nextPermission);
  }

  if (isLoading) return <Message>Loading...</Message>;

  if (isAuthLoading || !authClient) return <Message>Preparing session...</Message>;

  if (isAuthenticated) {
    if (isLoadingFeed) return <Message>Loading feed...</Message>;

    if (feedError) return <Message>Feed error: {feedError}</Message>;

    if (feedItems.length === 0)
      return (
        <Suspense fallback={<Loading />}>
          <Empty />
        </Suspense>
      );

    return (
      <AppContext.Provider
        value={{
          dal,
          onManualRefresh: refreshFeed,
          onSendMessage: handleSendMessage,
          avatarVisibility,
          onSetAvatarVisibility: handleSetAvatarVisibility,
          onToggleChannelNotification: handleToggleChannelNotification,
          onToggleChannelFilter: handleToggleChannelFilter,
          onRequestNotificationPermission: handleRequestNotificationPermission,
          onDisableNotifications: handleDisableNotifications,
          onEnableAllFeedFilters: handleEnableAllFeedFilters,
        }}
      >
        <FeedView />
      </AppContext.Provider>
    );
  }

  return <LoginView auth={authClient} onAuthenticated={() => setIsAuthenticated(true)} />;
}

export default App;
