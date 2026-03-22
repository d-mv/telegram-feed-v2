import { renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "../../atoms/feedFilters.atom";
import { notificationPermissionAtom, notificationSettingsAtom } from "../../atoms/notifications.atom";

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
    getNotificationSettings: vi.fn().mockRejectedValue(new Error("no settings")),
    setNotificationSettings: vi.fn().mockResolvedValue(undefined),
    getFeedFilterSettings: vi.fn().mockRejectedValue(new Error("no filters")),
    setFeedFilterSettings: vi.fn().mockResolvedValue(undefined),
    getAvatarVisibilitySettings: vi.fn().mockRejectedValue(new Error("no avatars")),
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

  return { Wrapper };
}

afterEach(() => {
  vi.restoreAllMocks();
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

    expect(runtimeLoggerMock.warn).toHaveBeenCalledWith("settings_load_failed", {
      scope: "notifications",
      error: "no settings",
    });
    expect(runtimeLoggerMock.warn).toHaveBeenCalledWith("settings_load_failed", {
      scope: "feed_filters",
      error: "no filters",
    });
    expect(runtimeLoggerMock.warn).toHaveBeenCalledWith("settings_load_failed", {
      scope: "avatar_visibility",
      error: "no avatars",
    });
  });
});
