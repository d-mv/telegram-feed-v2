import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";

type MessagesTarget = Parameters<TelegramClient["getMessages"]>[0];

function getCachedItemMessageId(item: FeedItem): number | undefined {
	const match = item.id.match(/-(\d+)$/);
	if (!match) {
		return undefined;
	}

	const parsed = Number(match[1]);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function getCachedItemChatId(item: FeedItem): string | undefined {
	if (!item.channelKey) {
		return undefined;
	}

	const separatorIndex = item.channelKey.indexOf(":");
	if (separatorIndex === -1) {
		return undefined;
	}

	return item.channelKey.slice(separatorIndex + 1) || undefined;
}

export async function resolveFeedItemSourceMessage(
	item: FeedItem,
	client: TelegramClient,
): Promise<Api.Message | undefined> {
	if (item.sourceMessage instanceof Api.Message) {
		return item.sourceMessage;
	}

	const chatId = getCachedItemChatId(item);
	const messageId = getCachedItemMessageId(item);
	if (!chatId || messageId === undefined) {
		return undefined;
	}

	const messages = await client.getMessages(chatId as MessagesTarget, {
		ids: [messageId],
	});
	const sourceMessage = messages[0];
	return sourceMessage instanceof Api.Message ? sourceMessage : undefined;
}
