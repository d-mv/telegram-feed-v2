import type { FeedItem } from "../../../types";

function getConversationKey(item: FeedItem): string {
	if (item.channelKey) {
		return item.channelKey;
	}
	return `${item.type}:${item.chatName}`;
}

function getSenderKey(item: FeedItem): string {
	return item.senderName || item.chatName;
}

function isMediaOnlyItem(item: FeedItem): boolean {
	return (
		(Boolean(item.media) || (item.mediaItems?.length ?? 0) > 0) &&
		item.text.trim() === ""
	);
}

function shouldGroupTogether(previous: FeedItem, next: FeedItem): boolean {
	return (
		isMediaOnlyItem(previous) &&
		isMediaOnlyItem(next) &&
		getConversationKey(previous) === getConversationKey(next) &&
		getSenderKey(previous) === getSenderKey(next)
	);
}

export function groupConsecutiveMediaOnlyItems(
	items: FeedItem[],
): FeedItem[][] {
	const groups: FeedItem[][] = [];

	for (const item of items) {
		const currentGroup = groups[groups.length - 1];
		const previousItem = currentGroup?.[currentGroup.length - 1];

		if (
			currentGroup &&
			previousItem &&
			shouldGroupTogether(previousItem, item)
		) {
			currentGroup.push(item);
			continue;
		}

		groups.push([item]);
	}

	return groups;
}
