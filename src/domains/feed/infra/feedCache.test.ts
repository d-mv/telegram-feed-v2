import { describe, it, expect } from "vitest";
import type { FeedItem } from "../../../types";
import {
	getLatestMessageIdsByChat,
	getOldestMessageIdsByChat,
	mergeFeedItems,
} from "./feedCache";

describe("feedCache", () => {
	const mockItems: FeedItem[] = [
		{
			id: "group-123-100",
			channelKey: "group:123",
			date: 1000,
			chatName: "Chat 1",
			senderName: "User 1",
			type: "group",
			text: "Msg 100",
			timestamp: "1s ago",
			commentsCount: 0,
			isFocused: false,
		},
		{
			id: "group-123-90",
			channelKey: "group:123",
			date: 900,
			chatName: "Chat 1",
			senderName: "User 1",
			type: "group",
			text: "Msg 90",
			timestamp: "2s ago",
			commentsCount: 0,
			isFocused: false,
		},
		{
			id: "dm-456-50",
			channelKey: "dm:456",
			date: 500,
			chatName: "User 2",
			senderName: "User 2",
			type: "dm",
			text: "Msg 50",
			timestamp: "3s ago",
			commentsCount: 0,
			isFocused: false,
			reactions: [],
		},
	];

	it("getLatestMessageIdsByChat should return the highest message ID for each chat", () => {
		const result = getLatestMessageIdsByChat(mockItems);
		expect(result).toEqual({
			"group:123": 100,
			"dm:456": 50,
		});
	});

	it("getOldestMessageIdsByChat should return the lowest message ID for each chat", () => {
		const result = getOldestMessageIdsByChat(mockItems);
		expect(result).toEqual({
			"group:123": 90,
			"dm:456": 50,
		});
	});

	it("mergeFeedItems should merge and sort items by date descending", () => {
		const nextItems: FeedItem[] = [
			{
				id: "group-123-110",
				channelKey: "group:123",
				date: 1100,
				chatName: "Chat 1",
				senderName: "User 1",
				type: "group",
				text: "Msg 110",
				timestamp: "now",
				commentsCount: 0,
				isFocused: false,
			},
			{
				id: "group-123-80",
				channelKey: "group:123",
				date: 800,
				chatName: "Chat 1",
				senderName: "User 1",
				type: "group",
				text: "Msg 80",
				timestamp: "3s ago",
				commentsCount: 0,
				isFocused: false,
			},
		];

		const result = mergeFeedItems(nextItems, mockItems);
		expect(result.map((i) => i.id)).toEqual([
			"group-123-110",
			"group-123-100",
			"group-123-90",
			"group-123-80",
			"dm-456-50",
		]);
	});
});
