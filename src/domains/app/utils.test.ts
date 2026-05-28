import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	closeVisibleNotifications,
	formatSender,
	getFallbackChatName,
	isAvatarVisibilitySettings,
	isFeedFilterSettings,
	isNotificationSettings,
} from "./utils";

describe("isNotificationSettings", () => {
	it("returns true for an empty object", () => {
		expect(isNotificationSettings({})).toBe(true);
	});
	it("returns true for an object with boolean values", () => {
		expect(isNotificationSettings({ "dm:1": true, "group:2": false })).toBe(
			true,
		);
	});
	it("returns false for null", () => {
		expect(isNotificationSettings(null)).toBe(false);
	});
	it("returns false when a value is not boolean", () => {
		expect(isNotificationSettings({ "dm:1": "yes" })).toBe(false);
	});
});

describe("isFeedFilterSettings", () => {
	it("returns true for an empty object", () => {
		expect(isFeedFilterSettings({})).toBe(true);
	});
	it("returns true for boolean-valued object", () => {
		expect(isFeedFilterSettings({ "channel:a": false })).toBe(true);
	});
	it("returns false for a non-object", () => {
		expect(isFeedFilterSettings("string")).toBe(false);
	});
	it("returns false when a value is not boolean", () => {
		expect(isFeedFilterSettings({ key: 42 })).toBe(false);
	});
});

describe("isAvatarVisibilitySettings", () => {
	it("returns true for valid settings", () => {
		expect(
			isAvatarVisibilitySettings({
				feed: true,
				thread: false,
				notifications: true,
			}),
		).toBe(true);
	});
	it("returns false when a required field is missing", () => {
		expect(isAvatarVisibilitySettings({ feed: true, thread: false })).toBe(
			false,
		);
	});
	it("returns false for null", () => {
		expect(isAvatarVisibilitySettings(null)).toBe(false);
	});
	it("returns false when a field is not boolean", () => {
		expect(
			isAvatarVisibilitySettings({
				feed: "yes",
				thread: false,
				notifications: true,
			}),
		).toBe(false);
	});
});

describe("getFallbackChatName", () => {
	it("returns User for private chats", () => {
		expect(getFallbackChatName(true)).toBe("User");
	});
	it("returns Group for non-private chats", () => {
		expect(getFallbackChatName(false)).toBe("Group");
	});
});

describe("formatSender", () => {
	it("returns fallback when entity is null", () => {
		expect(formatSender(null, "fallback")).toBe("fallback");
	});
	it("returns fallback when entity is not an object", () => {
		expect(formatSender("string", "fallback")).toBe("fallback");
	});
	it("returns title when entity has a title", () => {
		expect(formatSender({ title: "My Channel" }, "fallback")).toBe(
			"My Channel",
		);
	});
	it("returns firstName + lastName trimmed", () => {
		expect(
			formatSender({ firstName: "Alice", lastName: "Smith" }, "fallback"),
		).toBe("Alice Smith");
	});
	it("returns firstName alone when lastName is absent", () => {
		expect(formatSender({ firstName: "Alice" }, "fallback")).toBe("Alice");
	});
	it("returns username when no firstName or title", () => {
		expect(formatSender({ username: "alice_tg" }, "fallback")).toBe("alice_tg");
	});
	it("returns fallback when entity has no recognised fields", () => {
		expect(formatSender({ id: 42 }, "fallback")).toBe("fallback");
	});
});

describe("closeVisibleNotifications", () => {
	const mockClose = vi.fn();
	const mockGetNotifications = vi
		.fn()
		.mockResolvedValue([{ close: mockClose }, { close: mockClose }]);
	const mockReady = Promise.resolve({ getNotifications: mockGetNotifications });

	beforeEach(() => {
		vi.stubGlobal("navigator", {
			serviceWorker: { ready: mockReady },
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("closes all visible notifications via service worker", async () => {
		closeVisibleNotifications();
		// Flush the promise chain inside closeVisibleNotifications
		await mockReady;
		await new Promise((r) => setTimeout(r, 0));
		expect(mockGetNotifications).toHaveBeenCalled();
		expect(mockClose).toHaveBeenCalledTimes(2);
	});

	it("does nothing when serviceWorker is not available", () => {
		vi.stubGlobal("navigator", {});
		expect(() => closeVisibleNotifications()).not.toThrow();
	});
});
