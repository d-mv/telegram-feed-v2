import { useAtomValue, useSetAtom } from "jotai/react";
import { useEffect, useMemo, useState } from "react";
import { WindowVirtualizer } from "virtua";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import type { FeedItem } from "../../../types";
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
	const feedItems = useAtomValue(feedItemsAtom);
	const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
	const notificationFocus = useAtomValue(notificationFocusAtom);
	const setNotificationFocus = useSetAtom(notificationFocusAtom);
	const setChannels = useSetAtom(channelsAtom);

	const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);
	const [showScrollTop, setShowScrollTop] = useState(false);

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
							onFocus={setFocusedItem}
						/>
					))}
				</WindowVirtualizer>
				{focusedItem && (
					<Chat item={focusedItem} onClose={() => setFocusedItem(null)} />
				)}
				{showScrollTop && (
					<ScrollTopButton
						onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
					/>
				)}
			</section>
		</>
	);
}
