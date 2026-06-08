import { Api, type TelegramClient } from "telegram";
import { describe, expect, it, vi } from "vitest";
import type { FeedItem } from "../../../types";
import { resolveFeedItemSourceMessage } from "./resolveFeedItemSourceMessage";

function makeMessage(id: number): Api.Message {
	const message = Object.create(Api.Message.prototype) as Api.Message;
	Object.assign(message, { id });
	return message;
}

function makeItem(overrides: Partial<FeedItem>): FeedItem {
	return {
		id: "group--1001164797853-36363",
		type: "group",
		chatName: "Test",
		timestamp: "now",
		text: "",
		isFocused: false,
		...overrides,
	};
}

describe("resolveFeedItemSourceMessage", () => {
	it("returns the in-memory source message when present", async () => {
		const sourceMessage = makeMessage(36363);
		const client = { getMessages: vi.fn() } as unknown as TelegramClient;
		const item = makeItem({ sourceMessage });

		const result = await resolveFeedItemSourceMessage(item, client);

		expect(result).toBe(sourceMessage);
		expect(client.getMessages).not.toHaveBeenCalled();
	});

	it("recovers the chat id from item.id when channelKey is missing", async () => {
		const sourceMessage = makeMessage(36363);
		const getMessages = vi.fn().mockResolvedValue([sourceMessage]);
		const client = { getMessages } as unknown as TelegramClient;
		// Restored-from-cache item: sourceMessage stripped, channelKey lost.
		const item = makeItem({
			id: "group--1001164797853-36363",
			channelKey: undefined,
		});

		const result = await resolveFeedItemSourceMessage(item, client);

		expect(result).toBe(sourceMessage);
		expect(getMessages).toHaveBeenCalledWith(BigInt("-1001164797853"), {
			ids: [36363],
		});
	});

	it("prefers channelKey when it is present", async () => {
		const sourceMessage = makeMessage(36363);
		const getMessages = vi.fn().mockResolvedValue([sourceMessage]);
		const client = { getMessages } as unknown as TelegramClient;
		const item = makeItem({
			id: "group--1001164797853-36363",
			channelKey: "group:-1001164797853",
		});

		await resolveFeedItemSourceMessage(item, client);

		expect(getMessages).toHaveBeenCalledWith(BigInt("-1001164797853"), {
			ids: [36363],
		});
	});

	it("returns undefined when neither channelKey nor id yield a chat id", async () => {
		const getMessages = vi.fn();
		const client = { getMessages } as unknown as TelegramClient;
		const item = makeItem({ id: "poll-12345", channelKey: undefined });

		const result = await resolveFeedItemSourceMessage(item, client);

		expect(result).toBeUndefined();
		expect(getMessages).not.toHaveBeenCalled();
	});
});
