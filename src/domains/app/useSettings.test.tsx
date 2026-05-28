import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "../../atoms/feedFilters.atom";
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
