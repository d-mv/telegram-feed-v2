import type { FeedItem } from "../../../types";

export function getItemSenderLabel(item: FeedItem): string {
	return item.type === "dm" ? item.senderName || item.chatName : item.chatName;
}
