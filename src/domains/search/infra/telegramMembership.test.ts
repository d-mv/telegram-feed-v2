import { expect, test, vi } from "vitest";

vi.mock("telegram", () => {
	class CheckChatInvite {
		constructor(data: Record<string, unknown>) {
			Object.assign(this, data);
		}
	}
	class ImportChatInvite {
		constructor(data: Record<string, unknown>) {
			Object.assign(this, data);
		}
	}
	class JoinChannel {
		constructor(data: Record<string, unknown>) {
			Object.assign(this, data);
		}
	}
	class LeaveChannel {
		constructor(data: Record<string, unknown>) {
			Object.assign(this, data);
		}
	}
	class DeleteChatUser {
		constructor(data: Record<string, unknown>) {
			Object.assign(this, data);
		}
	}
	class InputUserSelf {}

	return {
		Api: {
			messages: { CheckChatInvite, ImportChatInvite, DeleteChatUser },
			channels: { JoinChannel, LeaveChannel },
			InputUserSelf,
		},
	};
});

import {
	joinInviteLink,
	joinSearchResult,
	leaveFeedChannel,
	previewInviteLink,
} from "./telegramMembership";

test("previews Telegram invite links", async () => {
	const client = {
		invoke: vi.fn().mockResolvedValue({
			className: "ChatInvite",
			title: "Preview Group",
			participantsCount: 42,
			megagroup: true,
		}),
	};

	const preview = await previewInviteLink(
		"https://t.me/+preview_hash",
		async () => client as never,
	);

	expect(client.invoke).toHaveBeenCalledWith(
		expect.objectContaining({ hash: "preview_hash" }),
	);
	expect(preview).toEqual({
		hash: "preview_hash",
		title: "Preview Group",
		participantsCount: 42,
		kind: "group",
		entity: undefined,
		isJoined: false,
	});
});

test("joins invite links and returns the joined chat entity", async () => {
	const joinedEntity = { className: "Channel", id: 99, title: "Joined" };
	const client = {
		invoke: vi.fn().mockResolvedValue({
			chats: [joinedEntity],
		}),
	};

	const entity = await joinInviteLink(
		"tg://join?invite=joined_hash",
		async () => client as never,
	);

	expect(client.invoke).toHaveBeenCalledWith(
		expect.objectContaining({ hash: "joined_hash" }),
	);
	expect(entity).toBe(joinedEntity);
});

test("joins public search results through channels.JoinChannel", async () => {
	const entity = { className: "Channel", id: 77, title: "Public" };
	const client = {
		invoke: vi.fn().mockResolvedValue(undefined),
	};

	const joined = await joinSearchResult(
		{
			kind: "channel",
			id: "77",
			title: "Public",
			channelKey: "group:77",
			isJoined: false,
			entity,
			username: "public",
		},
		async () => client as never,
	);

	expect(client.invoke).toHaveBeenCalledWith(
		expect.objectContaining({ channel: entity }),
	);
	expect(joined).toBe(entity);
});

test("leaves channels with channels.LeaveChannel", async () => {
	const client = {
		invoke: vi.fn().mockResolvedValue(undefined),
	};

	await leaveFeedChannel(
		{
			id: "group-10-1",
			type: "group",
			chatName: "Channel",
			senderName: "Channel",
			timestamp: "now",
			text: "Hello",
			commentsCount: 0,
			channelKey: "group:10",
			isFocused: false,
			sourceMessage: {
				inputChat: { className: "InputPeerChannel", channelId: 10 },
			},
		},
		async () => client as never,
	);

	expect(client.invoke).toHaveBeenCalledWith(
		expect.objectContaining({
			channel: { className: "InputPeerChannel", channelId: 10 },
		}),
	);
});

test("leaves basic groups with messages.DeleteChatUser", async () => {
	const client = {
		invoke: vi.fn().mockResolvedValue(undefined),
	};

	await leaveFeedChannel(
		{
			id: "group-15-1",
			type: "group",
			chatName: "Basic Group",
			senderName: "Basic Group",
			timestamp: "now",
			text: "Hello",
			commentsCount: 0,
			channelKey: "group:15",
			isFocused: false,
			sourceMessage: {
				inputChat: { className: "InputPeerChat", chatId: 15 },
			},
		},
		async () => client as never,
	);

	expect(client.invoke).toHaveBeenCalledWith(
		expect.objectContaining({ chatId: 15n, userId: expect.any(Object) }),
	);
});
