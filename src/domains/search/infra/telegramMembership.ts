import { Api } from "telegram";
import type { FeedItem } from "../../../types";
import type { EnsureTelegramConnected } from "../../auth/model/authTypes";
import type { SearchChatTarget } from "../model/searchTypes";

type InvitePreview = {
	hash: string;
	title: string;
	participantsCount: number;
	kind: "channel" | "group";
	entity?: unknown;
	isJoined: boolean;
};

function getInviteHash(value: string): string | null {
	try {
		const parsed = new URL(value);
		if (parsed.protocol === "tg:") {
			const invite = parsed.searchParams.get("invite");
			return invite && invite !== "" ? invite : null;
		}

		if (parsed.hostname !== "t.me" && parsed.hostname !== "telegram.me") {
			return null;
		}

		const segments = parsed.pathname.split("/").filter(Boolean);
		if (segments[0]?.startsWith("+")) {
			return segments[0].slice(1) || null;
		}
		if (segments[0] === "joinchat" && segments[1]) {
			return segments[1];
		}
	} catch {
		return null;
	}

	return null;
}

function getInviteTitle(invite: unknown): string {
	if (
		invite &&
		typeof invite === "object" &&
		"title" in invite &&
		typeof invite.title === "string"
	) {
		return invite.title;
	}
	return "Invite";
}

function getInviteParticipantsCount(invite: unknown): number {
	if (
		invite &&
		typeof invite === "object" &&
		"participantsCount" in invite &&
		typeof invite.participantsCount === "number"
	) {
		return invite.participantsCount;
	}
	return 0;
}

function getInviteKind(invite: unknown): "channel" | "group" {
	if (
		invite &&
		typeof invite === "object" &&
		"broadcast" in invite &&
		invite.broadcast === true
	) {
		return "channel";
	}
	return "group";
}

export async function previewInviteLink(
	value: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<InvitePreview | null> {
	const hash = getInviteHash(value);
	if (!hash) {
		return null;
	}

	const client = await ensureTelegramConnected();
	const invite = await client.invoke(
		new Api.messages.CheckChatInvite({ hash }),
	);
	const entity =
		invite && typeof invite === "object" && "chat" in invite
			? invite.chat
			: undefined;

	return {
		hash,
		title: getInviteTitle(entity ?? invite),
		participantsCount: getInviteParticipantsCount(entity ?? invite),
		kind: getInviteKind(entity ?? invite),
		entity,
		isJoined: Boolean(entity),
	};
}

export async function joinInviteLink(
	value: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<unknown> {
	const hash = getInviteHash(value);
	if (!hash) {
		throw new Error("Unsupported invite");
	}

	const client = await ensureTelegramConnected();
	const updates = await client.invoke(
		new Api.messages.ImportChatInvite({ hash }),
	);
	if (
		updates &&
		typeof updates === "object" &&
		"chats" in updates &&
		Array.isArray(updates.chats)
	) {
		return updates.chats[0];
	}
	throw new Error("Unsupported invite");
}

export async function joinSearchResult(
	result: SearchChatTarget,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<unknown> {
	const client = await ensureTelegramConnected();
	await client.invoke(
		new Api.channels.JoinChannel({
			channel: result.entity as never,
		}),
	);
	return result.entity;
}

export async function leaveFeedChannel(
	item: FeedItem,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<void> {
	const client = await ensureTelegramConnected();
	const source = item.sourceMessage as
		| { getInputChat?: () => Promise<unknown>; inputChat?: unknown }
		| undefined;
	const inputChat = source?.getInputChat
		? await source.getInputChat()
		: source?.inputChat;

	if (
		inputChat &&
		typeof inputChat === "object" &&
		"className" in inputChat &&
		inputChat.className === "InputPeerChat"
	) {
		const fallbackChatId = item.channelKey
			? Number.parseInt(item.channelKey.split(":")[1] ?? "0", 10)
			: 0;
		const chatId =
			"chatId" in inputChat && typeof inputChat.chatId === "number"
				? inputChat.chatId
				: fallbackChatId;
		await client.invoke(
			new Api.messages.DeleteChatUser({
				chatId: BigInt(chatId) as never,
				userId: new Api.InputUserSelf(),
			}),
		);
		return;
	}

	if (!inputChat) {
		throw new Error("Unsupported leave target");
	}

	await client.invoke(
		new Api.channels.LeaveChannel({
			channel: inputChat as never,
		}),
	);
}
