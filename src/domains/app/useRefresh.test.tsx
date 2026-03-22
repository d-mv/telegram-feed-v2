import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { beforeEach, vi } from "vitest";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";

const fetchRecentFeedMock = vi.hoisted(() => vi.fn());

vi.mock("../feed/infra/telegramFeed", () => ({
  fetchRecentFeed: fetchRecentFeedMock,
}));

import { useRefresh } from "./useRefresh";

beforeEach(() => {
  fetchRecentFeedMock.mockReset();
});

function createDalStub() {
  return {
    getSession: vi.fn(),
    setSession: vi.fn(),
    getNotificationSettings: vi.fn(),
    setNotificationSettings: vi.fn(),
    getFeedFilterSettings: vi.fn(),
    setFeedFilterSettings: vi.fn(),
    getAvatarVisibilitySettings: vi.fn(),
    setAvatarVisibilitySettings: vi.fn(),
    getFeedCache: vi.fn().mockResolvedValue(undefined),
    setFeedCache: vi.fn().mockResolvedValue(undefined),
    getSaved: vi.fn(),
    setSaved: vi.fn(),
    getDrafts: vi.fn(),
    setDrafts: vi.fn(),
    getMedia: vi.fn(),
    setMedia: vi.fn(),
    clearCache: vi.fn(),
  };
}

function createWrapper(options?: { isAuthenticated?: boolean }) {
  const store = createStore();
  store.set(isAuthenticatedAtom, options?.isAuthenticated ?? false);
  store.set(authClientAtom, {
    ensureTelegramConnected: vi.fn().mockResolvedValue({}),
  } as never);
  store.set(isLoadingFeedAtom, false);
  store.set(feedItemsAtom, []);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return { store, Wrapper };
}

test("background refresh updates feed without toggling global loading state", async () => {
  const dal = createDalStub();
  const nextItems = [
    {
      id: "dm-1",
      type: "dm",
      channelKey: "dm:1",
      chatName: "Alice",
      senderName: "Alice",
      timestamp: "now",
      text: "Hello",
      reactions: [],
      isFocused: false,
    },
  ];
  let resolveFeed: ((value: typeof nextItems) => void) | null = null;
  fetchRecentFeedMock.mockReturnValue(
    new Promise<typeof nextItems>((resolve) => {
      resolveFeed = resolve;
    }),
  );
  const { store, Wrapper } = createWrapper();

  const { result } = renderHook(() => useRefresh({ dal }), {
    wrapper: Wrapper,
  });

  await act(async () => {
    const refreshPromise = result.current.refreshFeed({ background: true });

    await waitFor(() => {
      expect(fetchRecentFeedMock).toHaveBeenCalled();
    });
    expect(store.get(isLoadingFeedAtom)).toBe(false);

    resolveFeed?.(nextItems);
    await refreshPromise;
  });

  await waitFor(() => {
    expect(store.get(feedItemsAtom)).toEqual(nextItems);
  });
  expect(store.get(isLoadingFeedAtom)).toBe(false);
});

test("refreshes feed when app returns to foreground", async () => {
  const dal = createDalStub();
  fetchRecentFeedMock.mockResolvedValue([]);
  const { Wrapper } = createWrapper({ isAuthenticated: true });
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "hidden",
  });

  renderHook(() => useRefresh({ dal }), {
    wrapper: Wrapper,
  });

  let initialCalls = 0;
  await waitFor(() => {
    initialCalls = fetchRecentFeedMock.mock.calls.length;
    expect(initialCalls).toBeGreaterThanOrEqual(1);
  });

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });

  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await waitFor(() => {
    expect(fetchRecentFeedMock.mock.calls.length).toBe(initialCalls + 1);
  });

  if (originalVisibilityState) {
    Object.defineProperty(document, "visibilityState", originalVisibilityState);
  }
});

test("coalesces overlapping background refresh triggers into a single fetch", async () => {
  const dal = createDalStub();
  let resolveFeed: ((value: unknown[]) => void) | null = null;
  fetchRecentFeedMock.mockReturnValue(
    new Promise<unknown[]>((resolve) => {
      resolveFeed = resolve;
    }),
  );
  const { Wrapper } = createWrapper({ isAuthenticated: true });
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");

  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => "visible",
  });

  renderHook(() => useRefresh({ dal }), {
    wrapper: Wrapper,
  });

  await waitFor(() => {
    expect(fetchRecentFeedMock).toHaveBeenCalledTimes(1);
  });

  act(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("pageshow"));
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await waitFor(() => {
    expect(fetchRecentFeedMock).toHaveBeenCalledTimes(1);
  });

  await act(async () => {
    resolveFeed?.([]);
  });

  if (originalVisibilityState) {
    Object.defineProperty(document, "visibilityState", originalVisibilityState);
  }
});
