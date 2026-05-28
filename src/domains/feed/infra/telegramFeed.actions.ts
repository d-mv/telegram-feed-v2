import { Api, type TelegramClient } from "telegram";
import type { FeedItem } from "../../../types";
import {
	getMediaGroupKey,
	getMediaPreview,
	getMessageCommentsCount,
	getPollPreview,
	toRelativeTime,
} from "./telegramFeed.shared";
import { resolveFeedItemSourceMessage } from "./resolveFeedItemSourceMessage";

type SendTarget = Parameters<TelegramClient["sendMessage"]>[0];
type EnsureTelegramConnected = () => Promise<TelegramClient>;

async function resolveInputChat(sourceMessage: Api.Message): Promise<unknown> {
	return sourceMessage.getInputChat
		? sourceMessage.getInputChat()
		: (sourceMessage as Api.Message & { inputChat?: unknown }).inputChat;
}

export async function sendMessageToFeedItem(
	item: FeedItem,
	text: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem | undefined> {
	const trimmed = text.trim();
	if (trimmed === "") {
		return undefined;
	}

	const client = await ensureTelegramConnected();
	const sourceMessage = await resolveFeedItemSourceMessage(item, client);

	if (!sourceMessage) {
		throw new Error("Cannot send message for this conversation");
	}

	const inputChat = await resolveInputChat(sourceMessage);
	const sentMessage = await client.sendMessage(
		(inputChat ?? undefined) as SendTarget,
		{
			message: trimmed,
			replyTo: sourceMessage.id,
		},
	);
	if (!(sentMessage instanceof Api.Message)) {
		return undefined;
	}
	return {
		id: String(sentMessage.id ?? `${item.id}:sent:${Date.now()}`),
		channelKey: item.channelKey,
		type: item.type,
		chatName: item.chatName,
		senderName: "You",
		senderId: (sentMessage.senderId || sentMessage.peerId)?.toString(),
		timestamp: toRelativeTime(sentMessage.date),
		date: sentMessage.date,
		text: sentMessage.message ?? trimmed,
		commentsCount: getMessageCommentsCount(sentMessage),
		media: getMediaPreview(sentMessage),
		poll: getPollPreview(sentMessage),
		mediaGroupKey: getMediaGroupKey(sentMessage),
		reactions: item.type === "dm" ? [] : undefined,
		sourceMessage: sentMessage,
		isFocused: false,
	} as FeedItem;
}

export async function voteOnPoll(
	item: FeedItem,
	options: Uint8Array[],
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<FeedItem | undefined> {
	const client = await ensureTelegramConnected();
	const sourceMessage = await resolveFeedItemSourceMessage(item, client);
	if (!sourceMessage) {
		return undefined;
	}

	const inputChat = await resolveInputChat(sourceMessage);
	await client.invoke(
		new Api.messages.SendVote({
			peer: (inputChat ?? undefined) as SendTarget,
			msgId: sourceMessage.id,
			options,
		}),
	);

	const messages = await client.getMessages(
		(inputChat ?? undefined) as SendTarget,
		{
			ids: [sourceMessage.id],
		},
	);
	const updatedMessage = messages[0];

	if (!(updatedMessage instanceof Api.Message)) {
		return undefined;
	}

	return {
		...item,
		poll: getPollPreview(updatedMessage),
		sourceMessage: updatedMessage,
	} as FeedItem;
}
