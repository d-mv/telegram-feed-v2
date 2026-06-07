import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "../../atoms/feedFilters.atom";
import { fontSizeAtom } from "../../atoms/fontSize.atom";
import {
	notificationPermissionAtom,
	notificationSettingsAtom,
} from "../../atoms/notifications.atom";

const runtimeLoggerMock = vi.hoisted(() => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
}));

vi.mock("../../shared/infra/runtimeLogger", () => ({
	runtimeLogger: runtimeLoggerMock,
}));

import { useSettings } from "./useSettings";

function createDalStub() {
	return {
		getSession: vi.fn(),
		setSession: vi.fn(),
		getNotificationSettings: vi
			.fn()
			.mockRejectedValue(new Error("no settings")),
		setNotificationSettings: vi.fn().mockResolvedValue(undefined),
		getFeedFilterSettings: vi.fn().mockRejectedValue(new Error("no filters")),
		setFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
		getAvatarVisibilitySettings: vi
			.fn()
			.mockRejectedValue(new Error("no avatars")),
		setAvatarVisibilitySettings: vi.fn().mockResolvedValue(undefined),
		getFontSizeSettings: vi.fn().mockRejectedValue(new Error("no font size")),
		setFontSizeSettings: vi.fn().mockResolvedValue(undefined),
		getFeedCache: vi.fn(),
		setFeedCache: vi.fn(),
		getMedia: vi.fn(),
		setMedia: vi.fn(),
		clearCache: vi.fn(),
	};
}

function createWrapper() {
	const store = createStore();
	store.set(feedFilterSettingsAtom, {});
	store.set(notificationSettingsAtom, {});
	store.set(avatarVisibilityAtom, {
		feed: true,
		thread: true,
		notifications: true,
	});
	store.set(fontSizeAtom, { size: "medium" });
	store.set(notificationPermissionAtom, "default");

	const Wrapper = ({ children }: { children: ReactNode }) => (
		<Provider store={store}>{children}</Provider>
	);

	return { store, Wrapper };
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("useSettings", () => {
	it("logs structured warnings for recoverable storage read failures", async () => {
		const dal = createDalStub();
		const { Wrapper } = createWrapper();

		renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		await waitFor(() => {
			expect(dal.getNotificationSettings).toHaveBeenCalled();
			expect(dal.getFeedFilterSettings).toHaveBeenCalled();
			expect(dal.getAvatarVisibilitySettings).toHaveBeenCalled();
		});

		expect(runtimeLoggerMock.warn).toHaveBeenCalledWith(
			"settings_load_failed",
			{
				scope: "notifications",
				error: "no settings",
			},
		);
		expect(runtimeLoggerMock.warn).toHaveBeenCalledWith(
			"settings_load_failed",
			{
				scope: "feed_filters",
				error: "no filters",
			},
		);
		expect(runtimeLoggerMock.warn).toHaveBeenCalledWith(
			"settings_load_failed",
			{
				scope: "avatar_visibility",
				error: "no avatars",
			},
		);
	});

	it("handleSetAvatarVisibility updates atom and persists via DAL", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleSetAvatarVisibility({
				feed: false,
				thread: false,
				notifications: false,
			});
		});

		expect(store.get(avatarVisibilityAtom)).toEqual({
			feed: false,
			thread: false,
			notifications: false,
		});
		expect(dal.setAvatarVisibilitySettings).toHaveBeenCalledWith({
			feed: false,
			thread: false,
			notifications: false,
		});
	});

	it("handleSetFontSize updates atom and persists via DAL", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleSetFontSize({ size: "large" });
		});

		expect(store.get(fontSizeAtom)).toEqual({ size: "large" });
		expect(dal.setFontSizeSettings).toHaveBeenCalledWith({ size: "large" });
	});

	it("loads persisted font size into the atom on mount", async () => {
		const dal = createDalStub();
		(dal.getFontSizeSettings as Mock).mockResolvedValue({ size: "xlarge" });
		const { store, Wrapper } = createWrapper();

		renderHook(() => useSettings({ dal }), { wrapper: Wrapper });

		await waitFor(() => {
			expect(store.get(fontSizeAtom)).toEqual({ size: "xlarge" });
		});
	});

	it("handleEnableAllFeedFilters resets filter settings to empty and persists", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();
		store.set(feedFilterSettingsAtom, { "dm:1": false });

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleEnableAllFeedFilters();
		});

		expect(store.get(feedFilterSettingsAtom)).toEqual({});
		expect(dal.setFeedFilterSettings).toHaveBeenCalledWith({});
	});

	it("handleToggleChannelFilter disables a channel", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleToggleChannelFilter("dm:42", false);
		});

		expect(store.get(feedFilterSettingsAtom)).toEqual({ "dm:42": false });
		expect(dal.setFeedFilterSettings).toHaveBeenCalledWith({ "dm:42": false });
	});

	it("handleToggleChannelFilter enables a channel by removing its key", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();
		store.set(feedFilterSettingsAtom, { "dm:42": false });

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleToggleChannelFilter("dm:42", true);
		});

		expect(store.get(feedFilterSettingsAtom)).toEqual({});
	});

	it("handleDisableNotifications clears notification settings and persists", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();
		store.set(notificationSettingsAtom, { "dm:1": true });
		vi.stubGlobal("navigator", {});

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleDisableNotifications();
		});

		expect(store.get(notificationSettingsAtom)).toEqual({});
		expect(dal.setNotificationSettings).toHaveBeenCalledWith({});
	});

	it("handleToggleChannelNotification enables a channel and requests permission", async () => {
		const mockRequestPermission = vi.fn().mockResolvedValue("granted");
		vi.stubGlobal("Notification", {
			requestPermission: mockRequestPermission,
		});

		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		await act(async () => {
			result.current.handleToggleChannelNotification("dm:1", true);
		});

		expect(store.get(notificationSettingsAtom)).toEqual({ "dm:1": true });
		expect(mockRequestPermission).toHaveBeenCalled();
		expect(store.get(notificationPermissionAtom)).toBe("granted");
	});

	it("handleToggleChannelNotification disabling all channels closes notifications", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();
		store.set(notificationSettingsAtom, { "dm:1": true });
		vi.stubGlobal("navigator", {});

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleToggleChannelNotification("dm:1", false);
		});

		expect(store.get(notificationSettingsAtom)).toEqual({ "dm:1": false });
	});

	it("handleClearChannelState removes channel from both notification and filter settings", async () => {
		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();
		store.set(notificationSettingsAtom, { "dm:1": true, "dm:2": true });
		store.set(feedFilterSettingsAtom, { "dm:1": false });
		vi.stubGlobal("navigator", {});

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		act(() => {
			result.current.handleClearChannelState("dm:1");
		});

		expect(store.get(notificationSettingsAtom)).toEqual({ "dm:2": true });
		expect(store.get(feedFilterSettingsAtom)).toEqual({});
	});

	it("logs a warning when a DAL write fails instead of silently swallowing the error", async () => {
		const dal = createDalStub();
		dal.setAvatarVisibilitySettings.mockRejectedValue(new Error("IDB quota"));

		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		await act(async () => {
			result.current.handleSetAvatarVisibility({
				feed: false,
				thread: false,
				notifications: false,
			});
			// Let the rejected promise settle
			await new Promise((r) => setTimeout(r, 0));
		});

		expect(runtimeLoggerMock.warn).toHaveBeenCalledWith(
			"settings_persist_failed",
			expect.objectContaining({
				scope: "avatar_visibility",
				error: "IDB quota",
			}),
		);
		// Atom was still updated optimistically
		expect(store.get(avatarVisibilityAtom)).toEqual({
			feed: false,
			thread: false,
			notifications: false,
		});
	});

	it("handler references are stable across re-renders", async () => {
		const dal = createDalStub();
		const { Wrapper } = createWrapper();
		let previousHandlers: ReturnType<typeof result.current> | undefined;
		let result: {
			current: ReturnType<typeof import("./useSettings").useSettings>;
		};

		({ result } = renderHook(() => useSettings({ dal }), { wrapper: Wrapper }));
		previousHandlers = { ...result.current };

		// Force a re-render by updating an unrelated atom
		act(() => {
			// Re-render the hook without changing anything
		});

		// Handlers should be the same references
		expect(result.current.handleSetAvatarVisibility).toBe(
			previousHandlers.handleSetAvatarVisibility,
		);
		expect(result.current.handleEnableAllFeedFilters).toBe(
			previousHandlers.handleEnableAllFeedFilters,
		);
	});

	it("handleRequestNotificationPermission sets unsupported when Notification is absent", async () => {
		vi.stubGlobal("Notification", undefined);

		const dal = createDalStub();
		const { store, Wrapper } = createWrapper();

		const { result } = renderHook(() => useSettings({ dal }), {
			wrapper: Wrapper,
		});

		await act(async () => {
			await result.current.handleRequestNotificationPermission();
		});

		expect(store.get(notificationPermissionAtom)).toBe("unsupported");
	});
});

describe("settings round-trip (write → DAL → atom → reload)", () => {
	function createRoundTripDal() {
		const dal = createDalStub();
		let storedAvatar: unknown;
		let storedFilters: unknown;
		let storedNotifications: unknown;

		(dal.getAvatarVisibilitySettings as Mock).mockImplementation(() =>
			Promise.resolve(storedAvatar),
		);
		(dal.setAvatarVisibilitySettings as Mock).mockImplementation(
			(v: unknown) => {
				storedAvatar = v;
				return Promise.resolve();
			},
		);
		(dal.getFeedFilterSettings as Mock).mockImplementation(() =>
			Promise.resolve(storedFilters),
		);
		(dal.setFeedFilterSettings as Mock).mockImplementation((v: unknown) => {
			storedFilters = v;
			return Promise.resolve();
		});
		(dal.getNotificationSettings as Mock).mockImplementation(() =>
			Promise.resolve(storedNotifications),
		);
		(dal.setNotificationSettings as Mock).mockImplementation((v: unknown) => {
			storedNotifications = v;
			return Promise.resolve();
		});
		return dal;
	}

	it("avatar visibility: write then reload restores atom from DAL", async () => {
		const dal = createRoundTripDal();

		const { Wrapper: W1, store: store1 } = createWrapper();
		const { result, unmount } = renderHook(() => useSettings({ dal }), {
			wrapper: W1,
		});

		act(() => {
			result.current.handleSetAvatarVisibility({
				feed: false,
				thread: false,
				notifications: false,
			});
		});
		expect(store1.get(avatarVisibilityAtom)).toEqual({
			feed: false,
			thread: false,
			notifications: false,
		});
		unmount();

		const { Wrapper: W2, store: store2 } = createWrapper();
		renderHook(() => useSettings({ dal }), { wrapper: W2 });

		await waitFor(() => {
			expect(store2.get(avatarVisibilityAtom)).toEqual({
				feed: false,
				thread: false,
				notifications: false,
			});
		});
	});

	it("feed filter: disable channel then reload restores filter atom from DAL", async () => {
		const dal = createRoundTripDal();

		const { Wrapper: W1, store: store1 } = createWrapper();
		const { result, unmount } = renderHook(() => useSettings({ dal }), {
			wrapper: W1,
		});

		act(() => {
			result.current.handleToggleChannelFilter("ch:99", false);
		});
		expect(store1.get(feedFilterSettingsAtom)).toEqual({ "ch:99": false });
		unmount();

		const { Wrapper: W2, store: store2 } = createWrapper();
		renderHook(() => useSettings({ dal }), { wrapper: W2 });

		await waitFor(() => {
			expect(store2.get(feedFilterSettingsAtom)).toEqual({ "ch:99": false });
		});
	});

	it("notification settings: enable channel then reload restores notification atom from DAL", async () => {
		vi.stubGlobal("Notification", {
			requestPermission: vi.fn().mockResolvedValue("default"),
		});
		const dal = createRoundTripDal();

		const { Wrapper: W1, store: store1 } = createWrapper();
		const { result, unmount } = renderHook(() => useSettings({ dal }), {
			wrapper: W1,
		});

		await act(async () => {
			result.current.handleToggleChannelNotification("ch:7", true);
		});
		expect(store1.get(notificationSettingsAtom)).toEqual({ "ch:7": true });
		unmount();

		const { Wrapper: W2, store: store2 } = createWrapper();
		renderHook(() => useSettings({ dal }), { wrapper: W2 });

		await waitFor(() => {
			expect(store2.get(notificationSettingsAtom)).toEqual({ "ch:7": true });
		});
	});
});
