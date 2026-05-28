import { describe, expect, test } from "vitest";
import type { FeedItem } from "../../../types";
import { getItemSenderLabel } from "./feedItemUtils";

function makeItem(overrides: Partial<FeedItem>): FeedItem {
	return {
		id: "test-1",
		type: "group",
		chatName: "Team",
		timestamp: "now",
		text: "hello",
		...overrides,
	};
}

describe("getItemSenderLabel", () => {
	test("returns senderName for DM items", () => {
		const item = makeItem({
			type: "dm",
			senderName: "Alice",
			chatName: "Alice",
		});
		expect(getItemSenderLabel(item)).toBe("Alice");
	});

	test("returns chatName for group items", () => {
		const item = makeItem({
			type: "group",
			senderName: "Alice",
			chatName: "Team",
		});
		expect(getItemSenderLabel(item)).toBe("Team");
	});

	test("falls back to chatName when DM senderName is absent", () => {
		const item = makeItem({ type: "dm", chatName: "Bob" });
		expect(getItemSenderLabel(item)).toBe("Bob");
	});
});
