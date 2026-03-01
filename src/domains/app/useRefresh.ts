import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import type { FeedItem } from "../../types";
import type { Dal } from "../dal/types";
import { fetchRecentFeed } from "../feed/infra/telegramFeed";

export function useRefresh({ dal }: { dal: Dal }) {
  const setIsLoadingFeed = useSetAtom(isLoadingFeedAtom);
  const [feedError, setFeedError] = useState("");
  const setFeedItems = useSetAtom(feedItemsAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  const refreshFeed = useCallback(async () => {
    setIsLoadingFeed(true);
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
      const items = await fetchRecentFeed({ perChat: 10, maxAgeDays: 7 });
      setFeedItems(items);
      const cacheItems = items.map(({ sourceMessage: _sourceMessage, ...rest }) => rest);
      return dal.setFeedCache(cacheItems);
    } catch (err) {
      const error = err as Error;
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: string }).message)
          : "Failed to load feed";
      setFeedError(message);
    } finally {
      setIsLoadingFeed(false);
    }
  }, [dal, setFeedItems]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    refreshFeed();
  }, [isAuthenticated, refreshFeed]);

  return {
    feedError,
    refreshFeed,
  };
}
