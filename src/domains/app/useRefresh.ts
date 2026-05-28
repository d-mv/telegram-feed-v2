import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import type { FeedItem } from "../../types";
import type { Dal } from "../dal/types";
import {
	getLatestMessageIdsByChat,
	getOldestMessageIdsByChat,
	mergeFeedItems,
	toCachedFeedItems,
} from "../feed/infra/feedCache";
import { fetchRecentFeed } from "../feed/infra/telegramFeed";
import { emitTelemetry } from "../../shared/infra/telemetry";

export function useRefresh({ dal }: { dal: Dal }) {
	const setIsLoadingFeed = useSetAtom(isLoadingFeedAtom);
	const [isLoadingOlder, setIsLoadingOlder] = useState(false);
	const [feedError, setFeedError] = useState("");
	const setFeedItems = useSetAtom(feedItemsAtom);
	const feedItems = useAtomValue(feedItemsAtom);
	const isAuthenticated = useAtomValue(isAuthenticatedAtom);
	const authClient = useAtomValue(authClientAtom);
	const inFlightRefreshRef = useRef<Promise<void> | null>(null);
	const lastCutoffRef = useRef<number>(0);

	const refreshFeed = useCallback(
		async (options?: { background?: boolean }) => {
			if (inFlightRefreshRef.current) {
				return inFlightRefreshRef.current;
			}

			const isBackground = options?.background === true;
			const refreshPromise = (async () => {
				const startedAt = Date.now();
				setFeedError("");
				const cachedFeedPromise = dal
					.getFeedCache()
					.then((cached) =>
						Array.isArray(cached) ? (cached as FeedItem[]) : [],
					)
					.catch(() => []);

				const cachedItems = await cachedFeedPromise;

				if (cachedItems.length > 0) {
					setFeedItems(cachedItems);
					setIsLoadingFeed(false);
				}

				const shouldShowLoading =
					!isBackground && cachedItems.length === 0 && feedItems.length === 0;
				if (shouldShowLoading) {
					setIsLoadingFeed(true);
				}

				try {
					if (!authClient) {
						throw new Error("Telegram auth client not initialized");
					}
					const items = await fetchRecentFeed(
						{
							perChat: 10,
							maxAgeDays: 7,
							latestMessageIdsByChat: getLatestMessageIdsByChat(cachedItems),
						},
						authClient.ensureTelegramConnected,
					);
					const nextItems = mergeFeedItems(items, cachedItems);
					setFeedItems(nextItems);
					await dal.setFeedCache(toCachedFeedItems(nextItems));
					emitTelemetry("feed_refresh_completed", {
						background: isBackground,
						durationMs: Date.now() - startedAt,
						itemCount: nextItems.length,
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
					setIsLoadingFeed(false);
					inFlightRefreshRef.current = null;
				}
			})();

			inFlightRefreshRef.current = refreshPromise;
			return refreshPromise;
		},
		[authClient, dal, feedItems.length, setFeedItems, setIsLoadingFeed],
	);

	const loadOlder = useCallback(async () => {
		if (isLoadingOlder || !authClient || feedItems.length === 0) {
			return;
		}

		const oldestItem = feedItems[feedItems.length - 1];
		const oldestDate = oldestItem.date || Date.now() / 1000;
		// Load 3 days before the oldest item we have
		const daysToLoad = 3;
		const dynamicCutoff = oldestDate - daysToLoad * 24 * 60 * 60;

		// If we already tried to load this window and got nothing new, don't spam
		if (lastCutoffRef.current && dynamicCutoff <= lastCutoffRef.current) {
			// Increase the window if we keep scrolling
			lastCutoffRef.current = dynamicCutoff - daysToLoad * 24 * 60 * 60;
		} else {
			lastCutoffRef.current = dynamicCutoff;
		}

		setIsLoadingOlder(true);
		const startedAt = Date.now();
		try {
			const items = await fetchRecentFeed(
				{
					perChat: 20,
					maxAgeDays: Math.ceil(
						(Date.now() / 1000 - lastCutoffRef.current) / (24 * 60 * 60),
					),
					oldestMessageIdsByChat: getOldestMessageIdsByChat(feedItems),
				},
				authClient.ensureTelegramConnected,
			);
			const nextItems = mergeFeedItems(items, feedItems);
			setFeedItems(nextItems);
			await dal.setFeedCache(toCachedFeedItems(nextItems));
			emitTelemetry("feed_load_older_completed", {
				durationMs: Date.now() - startedAt,
				itemCount: items.length,
				totalCount: nextItems.length,
				windowDays: Math.ceil(
					(Date.now() / 1000 - lastCutoffRef.current) / (24 * 60 * 60),
				),
			});
		} catch (err) {
			const error = err as Error;
			emitTelemetry("feed_load_older_failed", {
				durationMs: Date.now() - startedAt,
				error: error.message,
			});
		} finally {
			setIsLoadingOlder(false);
		}
	}, [authClient, dal, feedItems, isLoadingOlder, setFeedItems]);

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
		loadOlder,
		isLoadingOlder,
	};
}
