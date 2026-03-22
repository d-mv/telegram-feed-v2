import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import type { FeedItem } from "../../types";
import type { Dal } from "../dal/types";
import { fetchRecentFeed } from "../feed/infra/telegramFeed";
import { emitTelemetry } from "../../shared/infra/telemetry";

export function useRefresh({ dal }: { dal: Dal }) {
  const setIsLoadingFeed = useSetAtom(isLoadingFeedAtom);
  const [feedError, setFeedError] = useState("");
  const setFeedItems = useSetAtom(feedItemsAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const authClient = useAtomValue(authClientAtom);
  const inFlightRefreshRef = useRef<Promise<void> | null>(null);

  const refreshFeed = useCallback(async (options?: { background?: boolean }) => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }

    const isBackground = options?.background === true;
    const refreshPromise = (async () => {
      const startedAt = Date.now();
      if (!isBackground) {
        setIsLoadingFeed(true);
      }
      setFeedError("");
      dal
        .getFeedCache()
        .then((cached) => {
          if (Array.isArray(cached)) {
            const nextItems = cached as FeedItem[];

            setFeedItems(nextItems);
          }
        })
        .catch(() => {});

      try {
        if (!authClient) {
          throw new Error("Telegram auth client not initialized");
        }
        const items = await fetchRecentFeed(
          { perChat: 10, maxAgeDays: 7 },
          authClient.ensureTelegramConnected,
        );
        setFeedItems(items);
        const cacheItems = items.map(({ sourceMessage: _sourceMessage, ...rest }) => rest);
        await dal.setFeedCache(cacheItems);
        emitTelemetry("feed_refresh_completed", {
          background: isBackground,
          durationMs: Date.now() - startedAt,
          itemCount: items.length,
        });
      } catch (err) {
        const error = err as Error;
        const message =
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: string }).message)
            : "Failed to load feed";
        setFeedError(message);
        emitTelemetry("feed_refresh_failed", {
          background: isBackground,
          durationMs: Date.now() - startedAt,
          error: message,
        });
      } finally {
        if (!isBackground) {
          setIsLoadingFeed(false);
        }
        inFlightRefreshRef.current = null;
      }
    })();

    inFlightRefreshRef.current = refreshPromise;
    return refreshPromise;
  }, [authClient, dal, setFeedItems, setIsLoadingFeed]);

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

    const refreshInBackground = () => {
      void refreshFeed({ background: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      refreshInBackground();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", refreshInBackground);
    window.addEventListener("focus", refreshInBackground);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", refreshInBackground);
      window.removeEventListener("focus", refreshInBackground);
    };
  }, [isAuthenticated, refreshFeed]);

  return {
    feedError,
    refreshFeed,
  };
}
