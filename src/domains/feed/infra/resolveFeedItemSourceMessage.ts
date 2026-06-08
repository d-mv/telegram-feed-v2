import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";
import { runtimeLogger } from "../../../shared/infra/runtimeLogger";

type MessagesTarget = Parameters<TelegramClient["getMessages"]>[0];

function getCachedItemMessageId(item: FeedItem): number | undefined {
	const match = item.id.match(/-(\d+)$/);
	if (!match) {
		return undefined;
	}

	const parsed = Number(match[1]);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function getChatIdFromChannelKey(item: FeedItem): string | undefined {
	if (!item.channelKey) {
		return undefined;
	}

	const separatorIndex = item.channelKey.indexOf(":");
	if (separatorIndex === -1) {
		return undefined;
	}

	return item.channelKey.slice(separatorIndex + 1) || undefined;
}

// Restored-from-cache items can lose `channelKey`, but the id keeps the same
// `${type}-${chatId}-${messageId}` shape it was built with (chatId may be
// negative for channels/groups), so recover the chat id from there.
function getChatIdFromItemId(item: FeedItem): string | undefined {
	const match = item.id.match(/^(?:dm|group)-(-?\d+)-\d+$/);
	return match ? match[1] : undefined;
}

function getCachedItemChatId(item: FeedItem): string | undefined {
	return getChatIdFromChannelKey(item) ?? getChatIdFromItemId(item);
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
		runtimeLogger.warn(
			"[resolveFeedItemSourceMessage] cannot derive chat/message id from cached item",
			{ id: item.id, channelKey: item.channelKey, chatId, messageId },
		);
		return undefined;
	}

	try {
		// Convert numeric chat IDs to BigInt for better gramjs compatibility
		const targetId = /^-?\d+$/.test(chatId) ? BigInt(chatId) : chatId;
		const messages = await client.getMessages(targetId as MessagesTarget, {
			ids: [messageId],
		});
		const sourceMessage = messages[0];
		if (!(sourceMessage instanceof Api.Message)) {
			runtimeLogger.warn(
				"[resolveFeedItemSourceMessage] getMessages returned no usable message",
				{ id: item.id, chatId, messageId },
			);
			return undefined;
		}
		return sourceMessage;
	} catch (error) {
		runtimeLogger.error(
			"[resolveFeedItemSourceMessage] getMessages failed",
			error,
		);
		return undefined;
	}
}
