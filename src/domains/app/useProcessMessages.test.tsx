import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { notificationPermissionAtom, notificationSettingsAtom } from "../../atoms/notifications.atom";

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

import { useProcessMessages } from "./useProcessMessages";

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

test("keeps Telegram message handler subscribed until unmount", async () => {
  const addEventHandler = vi.fn();
  const removeEventHandler = vi.fn();

  ensureTelegramConnectedMock.mockResolvedValue({
    getMe: vi.fn().mockResolvedValue({ id: 1 }),
    addEventHandler,
    removeEventHandler,
  });

  const { unmount } = renderHook(() => useProcessMessages(), {
    wrapper: createWrapper().Wrapper,
  });

  await waitFor(() => {
    expect(addEventHandler).toHaveBeenCalledTimes(1);
  });
  expect(removeEventHandler).not.toHaveBeenCalled();

  unmount();

  await waitFor(() => {
    expect(removeEventHandler).toHaveBeenCalledTimes(1);
  });
});

test("appends incoming messages to the feed", async () => {
  const addEventHandler = vi.fn();
  let registeredHandler: ((event: { message?: unknown }) => Promise<void>) | null = null;

  addEventHandler.mockImplementation((handler) => {
    registeredHandler = handler;
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMe: vi.fn().mockResolvedValue({ id: 1 }),
    addEventHandler,
    removeEventHandler: vi.fn(),
  });

  const { store, Wrapper } = createWrapper();

  renderHook(() => useProcessMessages(), {
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
  });
});
