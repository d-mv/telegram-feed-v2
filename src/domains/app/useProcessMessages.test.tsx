import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import {
	notificationPermissionAtom,
	notificationSettingsAtom,
} from "../../atoms/notifications.atom";

const ensureTelegramConnectedMock = vi.hoisted(() => vi.fn());

vi.mock("telegram", () => ({
	Api: {
		Message: class Message {
			constructor(data: Record<string, unknown> = {}) {
				Object.assign(this, data);
			}
		},
	},
}));

vi.mock("telegram/events", () => ({
	NewMessage: class NewMessage {
		constructor(_options?: unknown) {}
	},
}));

vi.mock("telegram/events/EditedMessage", () => ({
	EditedMessage: class EditedMessage {
		constructor(_options?: unknown) {}
	},
}));

import { useProcessMessages } from "./useProcessMessages";
import type { FeedItem } from "../../types";

function createWrapper() {
	const store = createStore();
	store.set(isAuthenticatedAtom, true);
	store.set(authClientAtom, {
		ensureTelegramConnected: ensureTelegramConnectedMock,
	} as never);
	store.set(notificationPermissionAtom, "default");
	store.set(notificationSettingsAtom, {});
	store.set(avatarVisibilityAtom, {
		feed: true,
		notifications: true,
	});
	store.set(feedItemsAtom, []);

	const Wrapper = ({ children }: { children: ReactNode }) => (
		<Provider store={store}>{children}</Provider>
	);

	return { store, Wrapper };
}

test("does not re-register handler when notificationSettings changes", async () => {
	const addEventHandler = vi.fn();
	const removeEventHandler = vi.fn();

	ensureTelegramConnectedMock.mockResolvedValue({
		getMe: vi.fn().mockResolvedValue({ id: 1 }),
		addEventHandler,
		removeEventHandler,
	});

	const dal = { setFeedCache: vi.fn().mockResolvedValue(undefined) };
	const { store, Wrapper } = createWrapper();

	renderHook(() => useProcessMessages({ dal } as never), { wrapper: Wrapper });

	await waitFor(() => {
		expect(addEventHandler).toHaveBeenCalledTimes(2);
	});

	// Changing notification settings should NOT tear down and re-register the handler
	act(() => {
		store.set(notificationSettingsAtom, { "dm:99": true });
	});

	await waitFor(() => {
		expect(addEventHandler).toHaveBeenCalledTimes(2);
	});
	expect(removeEventHandler).not.toHaveBeenCalled();
});

test("does not re-register handler when notificationPermission changes", async () => {
	const addEventHandler = vi.fn();
	const removeEventHandler = vi.fn();

	ensureTelegramConnectedMock.mockResolvedValue({
		getMe: vi.fn().mockResolvedValue({ id: 1 }),
		addEventHandler,
		removeEventHandler,
	});

	const dal = { setFeedCache: vi.fn().mockResolvedValue(undefined) };
	const { store, Wrapper } = createWrapper();

	renderHook(() => useProcessMessages({ dal } as never), { wrapper: Wrapper });

	await waitFor(() => {
		expect(addEventHandler).toHaveBeenCalledTimes(2);
	});

	act(() => {
		store.set(notificationPermissionAtom, "granted");
	});

	await waitFor(() => {
		expect(addEventHandler).toHaveBeenCalledTimes(2);
	});
	expect(removeEventHandler).not.toHaveBeenCalled();
});

test("keeps Telegram message handler subscribed until unmount", async () => {
	const addEventHandler = vi.fn();
	const removeEventHandler = vi.fn();

	ensureTelegramConnectedMock.mockResolvedValue({
		getMe: vi.fn().mockResolvedValue({ id: 1 }),
		addEventHandler,
		removeEventHandler,
	});

	const dal = {
		setFeedCache: vi.fn().mockResolvedValue(undefined),
	};

	const { unmount } = renderHook(() => useProcessMessages({ dal } as never), {
		wrapper: createWrapper().Wrapper,
	});

	await waitFor(() => {
		expect(addEventHandler).toHaveBeenCalledTimes(2);
	});
	expect(removeEventHandler).not.toHaveBeenCalled();

	unmount();

	await waitFor(() => {
		expect(removeEventHandler).toHaveBeenCalledTimes(2);
	});
});

test("appends incoming messages to the feed", async () => {
	const addEventHandler = vi.fn();
	let registeredHandler:
		| ((event: { message?: unknown }) => Promise<void>)
		| null = null;

	addEventHandler.mockImplementationOnce((handler) => {
		registeredHandler = handler;
	});

	ensureTelegramConnectedMock.mockResolvedValue({
		getMe: vi.fn().mockResolvedValue({ id: 1 }),
		addEventHandler,
		removeEventHandler: vi.fn(),
	});

	const { store, Wrapper } = createWrapper();
	const dal = {
		setFeedCache: vi.fn().mockResolvedValue(undefined),
	};

	renderHook(() => useProcessMessages({ dal } as never), {
		wrapper: Wrapper,
	});

	await waitFor(() => {
		expect(registeredHandler).not.toBeNull();
	});

	const { Api } = await import("telegram");
	const message = new Api.Message({
		id: 42,
		out: false,
		senderId: { toString: () => "2" },
		chatId: { toString: () => "99" },
		isPrivate: true,
		date: 1_709_000_000,
		message: "Hello from runtime",
		getChat: vi.fn().mockResolvedValue({ firstName: "Alice" }),
		getSender: vi.fn().mockResolvedValue({ firstName: "Alice" }),
	});

	await act(async () => {
		await registeredHandler?.({ message });
	});

	await waitFor(() => {
		expect(store.get(feedItemsAtom)).toHaveLength(1);
	});

	expect(store.get(feedItemsAtom)[0]).toMatchObject({
		id: "dm-99-42",
		channelKey: "dm:99",
		type: "dm",
		chatName: "Alice",
		senderName: "Alice",
		text: "Hello from runtime",
		isRead: false,
	});
	expect(dal.setFeedCache).toHaveBeenCalledWith([
		expect.objectContaining({
			id: "dm-99-42",
			channelKey: "dm:99",
			text: "Hello from runtime",
		}),
	]);
});

test("updates feed item text when an existing message is edited", async () => {
	const addEventHandler = vi.fn();
	const handlers: ((event: { message?: unknown }) => Promise<void>)[] = [];
	addEventHandler.mockImplementation(
		(handler: (event: { message?: unknown }) => Promise<void>) => {
			handlers.push(handler);
		},
	);

	ensureTelegramConnectedMock.mockResolvedValue({
		getMe: vi.fn().mockResolvedValue({ id: 1 }),
		addEventHandler,
		removeEventHandler: vi.fn(),
	});

	const existingItem: FeedItem = {
		id: "dm-99-42",
		channelKey: "dm:99",
		type: "dm",
		chatName: "Alice",
		senderName: "Alice",
		timestamp: "2024-01-01",
		date: 1_709_000_000,
		text: "Original text",
		reactions: [],
		isFocused: false,
	};

	const { store, Wrapper } = createWrapper();
	store.set(feedItemsAtom, [existingItem]);

	const dal = { setFeedCache: vi.fn().mockResolvedValue(undefined) };
	renderHook(() => useProcessMessages({ dal } as never), { wrapper: Wrapper });

	// Wait for both NewMessage and EditedMessage handlers to be registered
	await waitFor(() => {
		expect(handlers.length).toBeGreaterThanOrEqual(2);
	});

	const { Api } = await import("telegram");
	const editedMessage = new Api.Message({
		id: 42,
		out: false,
		chatId: { toString: () => "99" },
		isPrivate: true,
		date: 1_709_000_000,
		message: "Edited text",
		getChat: vi.fn().mockResolvedValue({ firstName: "Alice" }),
		getSender: vi.fn().mockResolvedValue({ firstName: "Alice" }),
	});

	// EditedMessage handler is registered second (index 1)
	const editHandler = handlers[1];
	await act(async () => {
		await editHandler?.({ message: editedMessage });
	});

	await waitFor(() => {
		expect(store.get(feedItemsAtom)[0]).toMatchObject({
			id: "dm-99-42",
			text: "Edited text",
		});
	});
});
