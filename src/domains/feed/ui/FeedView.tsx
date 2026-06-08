import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import {
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { WindowVirtualizer } from "virtua";
import { Spin } from "antd";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import type { FeedItem } from "../../../types";
import { AppContext } from "../../app/AppContext";
import { toCachedFeedItems } from "../infra/feedCache";
import { Chat } from "./Chat";
import { FeedCard } from "./FeedCard";
import { FeedHeader } from "./FeedHeader";
import { groupConsecutiveMediaOnlyItems } from "./groupConsecutiveMediaOnlyItems";
import { ScrollTopButton } from "./ScrollTopButton";

function getItemChannelKey(item: FeedItem): string {
	if (item.channelKey) {
		return item.channelKey;
	}
	const [prefix, chatId] = item.id.split("-");
	if ((prefix === "dm" || prefix === "group") && chatId) {
		return `${prefix}:${chatId}`;
	}
	return `${item.type}:${item.chatName}`;
}

export function FeedView() {
	const [feedItems, setFeedItems] = useAtom(feedItemsAtom);
	const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
	const notificationFocus = useAtomValue(notificationFocusAtom);
	const setNotificationFocus = useSetAtom(notificationFocusAtom);
	const setChannels = useSetAtom(channelsAtom);
	const { onManualLoadOlder, isLoadingOlder, dal } = useContext(AppContext);

	const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);

	const handleFocus = useCallback(
		(item: FeedItem) => {
			setFocusedItem(item);
			if (item.isRead === false) {
				setFeedItems((items) => {
					const next = items.map((i) =>
						i.id === item.id ? { ...i, isRead: true } : i,
					);
					void dal.setFeedCache(toCachedFeedItems(next));
					return next;
				});
			}
		},
		[dal, setFeedItems],
	);
	const [showScrollTop, setShowScrollTop] = useState(false);
	const bottomSentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const entries = new Map<string, { key: string; label: string }>();
		for (const item of feedItems) {
			const key = getItemChannelKey(item);
			if (!entries.has(key)) {
				entries.set(key, { key, label: item.chatName });
			}
		}
		setChannels(() =>
			[...entries.values()].sort((a, b) => a.label.localeCompare(b.label)),
		);
	}, [feedItems, setChannels]);

	useEffect(() => {
		const handleScroll = () => setShowScrollTop(window.scrollY > 400);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const MIN_ITEMS_FOR_PAGINATION = 5;

	useEffect(() => {
		const sentinel = bottomSentinelRef.current;
		if (!sentinel || feedItems.length < MIN_ITEMS_FOR_PAGINATION) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !isLoadingOlder) {
					onManualLoadOlder();
				}
			},
			{ rootMargin: "400px" },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [feedItems.length, isLoadingOlder, onManualLoadOlder]);

	useEffect(() => {
		document.body.style.overflow = focusedItem ? "hidden" : "";
	}, [focusedItem]);

	useEffect(() => {
		if (!notificationFocus) return;
		const targetItem =
			(notificationFocus.itemId
				? feedItems.find((item) => item.id === notificationFocus.itemId)
				: undefined) ??
			(notificationFocus.channelKey
				? feedItems.find(
						(item) => getItemChannelKey(item) === notificationFocus.channelKey,
					)
				: undefined);

		if (!targetItem) return;

		if (notificationFocus.view === "thread") {
			setFocusedItem(targetItem);
			setNotificationFocus(null);
			return;
		}

		const targetChannelKey = getItemChannelKey(targetItem);
		if (focusedItem && getItemChannelKey(focusedItem) === targetChannelKey) {
			setFocusedItem(targetItem);
			setNotificationFocus(null);
			return;
		}

		setFocusedItem(null);
		window.setTimeout(() => {
			const node = document.querySelector(
				`[data-feed-item-id="${targetItem.id.replaceAll('"', '\\"')}"]`,
			) as HTMLElement | null;
			if (node) {
				node.scrollIntoView({ block: "center" });
				node.focus({ preventScroll: true });
			}
		}, 0);
		setNotificationFocus(null);
	}, [feedItems, focusedItem, notificationFocus, setNotificationFocus]);

	const visibleItems = useMemo(
		() =>
			feedItems.filter(
				(item) => feedFilterSettings[getItemChannelKey(item)] !== false,
			),
		[feedFilterSettings, feedItems],
	);

	const visibleItemGroups = useMemo(
		() => groupConsecutiveMediaOnlyItems(visibleItems),
		[visibleItems],
	);

	return (
		<>
			<div id="feed-top-anchor" style={{ position: "absolute", top: 0 }} />
			<FeedHeader />
			<section
				style={{
					width: "100%",
					maxWidth: 640,
					margin: "0 auto",
					padding: "0 16px",
				}}
			>
				<WindowVirtualizer>
					{visibleItemGroups.map((group) => (
						<FeedCard
							key={group[0].id}
							item={group[0]}
							groupedItems={group.length > 1 ? group : undefined}
							onFocus={handleFocus}
						/>
					))}
				</WindowVirtualizer>
				<div ref={bottomSentinelRef} style={{ height: 20 }} />
				{isLoadingOlder && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 8,
							padding: "16px 0",
						}}
						aria-live="polite"
					>
						<Spin size="small" />
						<span style={{ fontSize: 14, color: "#888" }}>
							Loading older messages...
						</span>
					</div>
				)}
				{focusedItem && (
					<Chat item={focusedItem} onClose={() => setFocusedItem(null)} />
				)}
				{showScrollTop && (
					<ScrollTopButton
						onClick={() =>
							document
								.getElementById("feed-top-anchor")
								?.scrollIntoView({ behavior: "smooth", block: "start" })
						}
					/>
				)}
			</section>
		</>
	);
}
