import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "telegram";
import { NewMessage } from "telegram/events";
import { AppContext } from "./domains/app/AppContext";
import { Message } from "./domains/app/components/Message";
import { createAuthFromEnv } from "./domains/auth/infra/authFactory";
import { ensureTelegramConnected } from "./domains/auth/infra/telegramAuth";
import type { AuthClient } from "./domains/auth/model/authTypes";
import { LoginView } from "./domains/auth/ui/LoginView";
import { createIndexedDbDal } from "./domains/dal/indexedDbDal";
import {
  fetchRecentFeed,
  getMediaPreview,
  toRelativeTime,
} from "./domains/feed/infra/telegramFeed";
import type { FeedItem } from "./domains/feed/model/mockFeed";
import { FeedView } from "./domains/feed/ui/FeedView";
import { Loading } from "./shared/ui/Loading/Loading";

const Empty = lazy(() => import("./domains/app/components/Empty"));

type AppProps = {
  auth?: AuthClient;
};

type NotificationSettings = Record<string, boolean>;

function getChannelKey(item: FeedItem) {
  return `${item.type}:${item.chatName}`;
}

function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "boolean");
}

function hasEnabledChannels(settings: NotificationSettings) {
  return Object.values(settings).some((entry) => entry === true);
}

function App({ auth }: AppProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedError, setFeedError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [authClient, setAuthClient] = useState<AuthClient | null>(auth ?? null);
  const [isAuthLoading, setIsAuthLoading] = useState(auth ? false : true);
  const dal = useMemo(() => createIndexedDbDal(), []);
  const clientRef = useRef<ReturnType<typeof ensureTelegramConnected> | null>(null);
  const notificationSettingsRef = useRef<NotificationSettings>({});

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
    if (isPrivate) {
      return "User";
    }
    return "Group";
  }

  useEffect(() => {
    if (auth) {
      setAuthClient(auth);
      setIsAuthLoading(false);
      return;
    }
    dal
      .getSession()
      .then((session) => {
        const sessionValue = typeof session === "string" ? session : undefined;
        const client = createAuthFromEnv(import.meta.env, {
          session: sessionValue,
          onSession: (nextSession) => {
            dal.setSession(nextSession).catch(() => {});
          },
        });
        setAuthClient(client);
      })
      .catch(() => {
        const client = createAuthFromEnv(import.meta.env, {
          onSession: (nextSession) => {
            dal.setSession(nextSession).catch(() => {});
          },
        });
        setAuthClient(client);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, [auth, dal]);

  useEffect(() => {
    dal
      .getNotificationSettings()
      .then((stored) => {
        if (isNotificationSettings(stored)) {
          setNotificationSettings(stored);
        }
      })
      .catch(() => {});
  }, [dal]);

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings;
  }, [notificationSettings]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    setIsLoadingFeed(true);
    setFeedError("");
    dal
      .getFeedCache()
      .then((cached) => {
        if (Array.isArray(cached)) {
          setFeedItems(cached as FeedItem[]);
        }
      })
      .catch(() => {});

    fetchRecentFeed({ perChat: 10, maxAgeDays: 7 })
      .then((items) => {
        setFeedItems(items);
        const cacheItems = items.map(({ sourceMessage, ...rest }) => rest);
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
  }, [isAuthenticated]);

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
          const itemId = `${idPrefix}-${chatId}-${message.id ?? message.date}`;

          let inserted = false;

          setFeedItems((current) => {
            if (current.some((entry) => entry.id === itemId)) {
              return current;
            }
            let nextItem: FeedItem;
            if (isPrivate) {
              nextItem = {
                id: itemId,
                type: "dm",
                chatName,
                senderName,
                timestamp,
                text: message.message ?? "",
                media,
                reactions: [],
                sourceMessage: message,
              };
            } else {
              nextItem = {
                id: itemId,
                type: "group",
                chatName,
                timestamp,
                text: message.message ?? "",
                media,
                sourceMessage: message,
              };
            }
            inserted = true;
            return [nextItem, ...current];
          });

          const channelKey = `${isPrivate ? "dm" : "group"}:${chatName}`;
          const notificationsEnabled = notificationSettings[channelKey] === true;
          const canNotify =
            typeof Notification !== "undefined" &&
            notificationPermission === "granted" &&
            document.visibilityState !== "visible";

          if (inserted && notificationsEnabled && canNotify) {
            const body = message.message ?? "";
            try {
              if ("serviceWorker" in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(chatName, {
                  body: body === "" ? "New message" : body,
                  tag: channelKey,
                  icon: "/favicon-192.png",
                  badge: "/favicon-96.png",
                });
              } else {
                new Notification(chatName, {
                  body: body === "" ? "New message" : body,
                  tag: channelKey,
                  icon: "/favicon-192.png",
                });
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
  }, [isAuthenticated, notificationPermission, notificationSettings]);

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
      ...notificationSettingsRef.current,
      [channelKey]: enabled,
    };
    notificationSettingsRef.current = nextSettings;
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

  async function handleRequestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setNotificationPermission(nextPermission);
  }

  if (isLoading) {
    return <Message>Loading...</Message>;
  }

  if (isAuthLoading || !authClient) return <Message>Preparing session...</Message>;

  if (isAuthenticated) {
    if (isLoadingFeed) {
      return <Message>Loading feed...</Message>;
    }

    if (feedError) {
      return <Message>Feed error: {feedError}</Message>;
    }

    if (feedItems.length === 0)
      return (
        <Suspense fallback={<Loading />}>
          <Empty />
        </Suspense>
      );

    return (
      <AppContext.Provider
        value={{
          items: feedItems,
          notificationSettings: notificationSettings,
          hasEnabledNotifications: hasEnabledChannels(notificationSettings),
          notificationPermission: notificationPermission,
          onToggleChannelNotification: handleToggleChannelNotification,
          onRequestNotificationPermission: handleRequestNotificationPermission,
          onDisableNotifications: handleDisableNotifications,
        }}
      >
        <FeedView />
      </AppContext.Provider>
    );
  }

  return <LoginView auth={authClient} onAuthenticated={() => setIsAuthenticated(true)} />;
}

export default App;
