import { Api } from "telegram";
import type { EnsureTelegramConnected } from "../../auth/model/authTypes";
import type { SearchResult } from "../model/searchTypes";
import { getEntityLabel } from "../../feed/infra/telegramFeed";

type SearchPeer =
	| Api.TypePeer
	| {
			className?: unknown;
			userId?: unknown;
			channelId?: unknown;
			chatId?: unknown;
	  };
type SearchChat =
	| Api.TypeChat
	| {
			className?: unknown;
			id?: unknown;
			title?: unknown;
			username?: unknown;
			broadcast?: unknown;
	  };
type SearchUser =
	| Api.TypeUser
	| {
			className?: unknown;
			id?: unknown;
			firstName?: unknown;
			lastName?: unknown;
			username?: unknown;
	  };

function getIdValue(value: unknown): string | null {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number" || typeof value === "bigint") {
		return String(value);
	}
	if (
		value &&
		typeof value === "object" &&
		"toString" in value &&
		typeof value.toString === "function"
	) {
		return value.toString();
	}
	return null;
}

function getPeerClassName(peer: SearchPeer): string | null {
	return typeof peer === "object" &&
		peer &&
		"className" in peer &&
		typeof peer.className === "string"
		? peer.className
		: null;
}

function getPeerKey(peer: SearchPeer): string | null {
	const className = getPeerClassName(peer);
	if (className === "PeerUser") {
		const userId = getIdValue("userId" in peer ? peer.userId : undefined);
		return userId ? `user:${userId}` : null;
	}
	if (className === "PeerChannel") {
		const channelId = getIdValue(
			"channelId" in peer ? peer.channelId : undefined,
		);
		return channelId ? `channel:${channelId}` : null;
	}
	if (className === "PeerChat") {
		const chatId = getIdValue("chatId" in peer ? peer.chatId : undefined);
		return chatId ? `chat:${chatId}` : null;
	}
	return null;
}

function buildJoinedSet(peers: SearchPeer[]) {
	const joined = new Set<string>();
	for (const peer of peers) {
		const key = getPeerKey(peer);
		if (key) {
			joined.add(key);
		}
	}
	return joined;
}

function getEntityMaps(chats: SearchChat[], users: SearchUser[]) {
	const chatsById = new Map<string, SearchChat>();
	const usersById = new Map<string, SearchUser>();

	for (const chat of chats) {
		const id = getIdValue("id" in chat ? chat.id : undefined);
		if (id) {
			chatsById.set(id, chat);
		}
	}
	for (const user of users) {
		const id = getIdValue("id" in user ? user.id : undefined);
		if (id) {
			usersById.set(id, user);
		}
	}

	return { chatsById, usersById };
}

function toSearchResultFromPeer(
	peer: SearchPeer,
	maps: ReturnType<typeof getEntityMaps>,
	joined: Set<string>,
): SearchResult | null {
	const className = getPeerClassName(peer);
	if (className === "PeerUser") {
		const id = getIdValue("userId" in peer ? peer.userId : undefined);
		if (!id) return null;
		const user = maps.usersById.get(id);
		if (!user) return null;
		return {
			kind: "direct",
			id,
			title: getEntityLabel(user, "User"),
			username:
				"username" in user && typeof user.username === "string"
					? user.username
					: undefined,
			channelKey: `dm:${id}`,
			isJoined: joined.has(`user:${id}`),
			entity: user,
		};
	}

	if (className === "PeerChannel") {
		const id = getIdValue("channelId" in peer ? peer.channelId : undefined);
		if (!id) return null;
		const chat = maps.chatsById.get(id);
		if (!chat) return null;
		const isChannel = "broadcast" in chat && chat.broadcast === true;
		return {
			kind: isChannel ? "channel" : "group",
			id,
			title: getEntityLabel(chat, "Chat"),
			username:
				"username" in chat && typeof chat.username === "string"
					? chat.username
					: undefined,
			channelKey: `group:${id}`,
			isJoined: joined.has(`channel:${id}`),
			entity: chat,
		};
	}

	if (className === "PeerChat") {
		const id = getIdValue("chatId" in peer ? peer.chatId : undefined);
		if (!id) return null;
		const chat = maps.chatsById.get(id);
		if (!chat) return null;
		return {
			kind: "group",
			id,
			title: getEntityLabel(chat, "Chat"),
			channelKey: `group:${id}`,
			isJoined: joined.has(`chat:${id}`),
			entity: chat,
		};
	}

	return null;
}

function toMessageResult(
	message: Api.Message,
	maps: ReturnType<typeof getEntityMaps>,
	joined: Set<string>,
): SearchResult | null {
	const peer = message.peerId as SearchPeer | undefined;
	if (!peer) {
		return null;
	}
	const target = toSearchResultFromPeer(peer, maps, joined);
	if (!target || target.kind === "message") {
		return null;
	}
	return {
		kind: "message",
		id: `${target.id}:${message.id}`,
		title: target.title,
		username: target.username,
		channelKey: target.channelKey,
		messageId: Number(message.id ?? 0),
		text: message.message ?? "",
		isJoined: target.isJoined,
		entity: target.entity,
	};
}

export async function searchTelegram(
	query: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<SearchResult[]> {
	const trimmed = query.trim();
	if (trimmed === "") {
		return [];
	}

	const client = await ensureTelegramConnected();
	const found = (await client.invoke(
		new Api.contacts.Search({
			q: trimmed,
			limit: 10,
		}),
	)) as Api.contacts.Found;
	const joined = buildJoinedSet(found.myResults ?? []);
	const chatMaps = getEntityMaps(found.chats ?? [], found.users ?? []);
	const peerResults = [...(found.myResults ?? []), ...(found.results ?? [])]
		.map((peer) => toSearchResultFromPeer(peer, chatMaps, joined))
		.filter((result): result is SearchResult => result !== null)
		.filter(
			(result, index, array) =>
				array.findIndex(
					(entry) => entry.id === result.id && entry.kind === result.kind,
				) === index,
		);

	const globalMessages = (await client.invoke(
		new Api.messages.SearchGlobal({
			q: trimmed,
			filter: new Api.InputMessagesFilterEmpty(),
			minDate: 0,
			maxDate: 0,
			offsetRate: 0,
			offsetPeer: new Api.InputPeerEmpty(),
			offsetId: 0,
			limit: 10,
		}),
	)) as Api.messages.Messages;
	const messageMaps = getEntityMaps(
		globalMessages.chats ?? [],
		globalMessages.users ?? [],
	);
	const messageResults = (globalMessages.messages ?? [])
		.filter((message): message is Api.Message =>
			Boolean(message && typeof message === "object" && "peerId" in message),
		)
		.map((message) => toMessageResult(message, messageMaps, joined))
		.filter((result): result is SearchResult => result !== null);

	return [...peerResults, ...messageResults];
}
