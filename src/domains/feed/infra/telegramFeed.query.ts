import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";
import { runtimeLogger } from "../../../shared/infra/runtimeLogger";
import {
	buildFeedItem,
	getEntityLabel,
	mergeAlbumFeedItems,
} from "./telegramFeed.shared";

type FetchFeedOptions = {
	perChat: number;
	maxAgeDays?: number;
	latestMessageIdsByChat?: Record<string, number>;
	oldestMessageIdsByChat?: Record<string, number>;
};

type TelegramDialog = {
	entity?: unknown;
	name?: string;
	title?: string;
	isUser?: boolean;
	id?: { toString(): string } | string | number;
};

type MessagesTarget = Parameters<TelegramClient["getMessages"]>[0];
type EnsureTelegramConnected = () => Promise<TelegramClient>;

const DEFAULT_OPTIONS: FetchFeedOptions = {
	perChat: 10,
	maxAgeDays: 7,
};
const TELEGRAM_MAX_MESSAGE_ID = 2_147_483_647;

function toFeedItem(
	dialog: TelegramDialog,
	message: Api.Message,
	senderName: string,
): FeedItem {
	const chatName =
		dialog.name || dialog.title || (dialog.isUser ? "User" : "Group");
	const chatId = dialog.id?.toString() ?? "chat";
	const isPrivate = Boolean(dialog.isUser);
	const channelKey = `${isPrivate ? "dm" : "group"}:${chatId}`;
	const idSuffix = message.id ?? message.date;
	const itemId = `${isPrivate ? "dm" : "group"}-${chatId}-${idSuffix}`;

	return buildFeedItem(
		{
			itemId,
			channelKey,
			isPrivate,
			chatName,
			senderName: isPrivate ? chatName : senderName,
		},
		message,
	);
}

function getDialogChannelKey(dialog: TelegramDialog): string {
	const chatId = dialog.id?.toString() ?? "chat";
	return `${dialog.isUser ? "dm" : "group"}:${chatId}`;
}

export async function fetchRecentFeed(
	options: Partial<FetchFeedOptions> = {},
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem[]> {
	const {
		perChat,
		maxAgeDays,
		latestMessageIdsByChat,
		oldestMessageIdsByChat,
	} = {
		...DEFAULT_OPTIONS,
		...options,
	};
	const client = await ensureTelegramConnected();
	const me = await client.getMe();
	const dialogs = await client.getDialogs({});

	let cutoff: number | undefined;
	if (maxAgeDays !== undefined) {
		cutoff = Date.now() / 1000 - maxAgeDays * 24 * 60 * 60;
	}

	const dialogItems = await Promise.all(
		dialogs.map(async (dialog) => {
			if (!dialog.entity) {
				return [];
			}

			try {
				const channelKey = getDialogChannelKey(dialog);
				const latestMessageId = latestMessageIdsByChat?.[channelKey];
				const oldestMessageId = oldestMessageIdsByChat?.[channelKey];

				let messagesOptions: Parameters<TelegramClient["getMessages"]>[1];
				if (latestMessageId !== undefined) {
					messagesOptions = {
						limit: undefined,
						minId: latestMessageId,
						maxId: TELEGRAM_MAX_MESSAGE_ID,
					};
				} else if (oldestMessageId !== undefined) {
					messagesOptions = {
						limit: perChat,
						maxId: oldestMessageId,
						offsetId: 0,
					};
				} else {
					messagesOptions = { limit: perChat };
				}

				const messages = await client.getMessages(
					dialog.entity as MessagesTarget,
					messagesOptions,
				);
				return Promise.all(
					messages.map(async (message) => {
						if (!(message instanceof Api.Message)) {
							return null;
						}
						if (message.out) {
							return null;
						}
						if (me && message.fromId && "userId" in message.fromId) {
							if (message.fromId.userId?.toString() === me.id?.toString()) {
								return null;
							}
						}
						if (
							latestMessageId !== undefined &&
							typeof message.id === "number" &&
							message.id <= latestMessageId
						) {
							return null;
						}
						if (
							oldestMessageId !== undefined &&
							typeof message.id === "number" &&
							message.id >= oldestMessageId
						) {
							return null;
						}
						if (
							cutoff !== undefined &&
							(!message.date || message.date < cutoff)
						) {
							return null;
						}

						const chatName =
							dialog.name || dialog.title || (dialog.isUser ? "User" : "Group");
						const senderName = dialog.isUser
							? chatName
							: getEntityLabel(
									message.getSender ? await message.getSender() : undefined,
									chatName,
								);

						return {
							item: toFeedItem(dialog, message, senderName),
							sortDate: message.date,
						};
					}),
				);
			} catch (err) {
				runtimeLogger.warn("mtproto_entity_skipped", {
					dialogId: dialog.id?.toString(),
					dialogName: dialog.name || dialog.title,
					isUser: dialog.isUser,
					error: err instanceof Error ? err.message : String(err),
				});
				return [];
			}
		}),
	);

	const sortedItems = dialogItems
		.flat()
		.filter(
			(item): item is { item: FeedItem; sortDate: number } => item !== null,
		)
		.sort((a, b) => b.sortDate - a.sortDate)
		.map(({ item }) => item);
	return mergeAlbumFeedItems(sortedItems);
}
