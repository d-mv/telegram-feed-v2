import { createStore } from "jotai";
import { Provider } from "jotai/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { menuIsOpenAtom, menuItemAtom } from "../../../atoms/menu.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import { AppContext } from "../../app/AppContext";
import SearchDialog from "./SearchDialog";

const searchTelegramMock = vi.hoisted(() => vi.fn());
const resolveTelegramFeedItemMock = vi.hoisted(() => vi.fn());

vi.mock("../../search/infra/telegramSearch", () => ({
  searchTelegram: searchTelegramMock,
}));

vi.mock("../../app/resolveTelegramFeedItem", () => ({
  resolveTelegramFeedItem: resolveTelegramFeedItemMock,
}));

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
    getFeedCache: vi.fn(),
    setFeedCache: vi.fn(),
    getSaved: vi.fn(),
    setSaved: vi.fn(),
    getDrafts: vi.fn(),
    setDrafts: vi.fn(),
    getMedia: vi.fn(),
    setMedia: vi.fn(),
    clearCache: vi.fn(),
  };
}

test("searches Telegram and opens the selected result in thread view", async () => {
  const user = userEvent.setup();
  const ensureTelegramConnected = vi.fn().mockResolvedValue({});
  const store = createStore();
  store.set(menuIsOpenAtom, true);
  store.set(menuItemAtom, 1);

  searchTelegramMock.mockResolvedValue([
    {
      kind: "message",
      id: "10:33",
      title: "Joined Channel",
      username: "joined",
      channelKey: "group:10",
      messageId: 33,
      text: "Matched message",
      isJoined: true,
      entity: { className: "Channel", id: 10, title: "Joined Channel", username: "joined" },
    },
  ]);
  resolveTelegramFeedItemMock.mockResolvedValue({
    id: "group-10-33",
    channelKey: "group:10",
    type: "group",
    chatName: "Joined Channel",
    senderName: "Joined Channel",
    text: "Matched message",
    timestamp: "Just now",
    commentsCount: 0,
    isFocused: false,
  });

  render(
    <Provider store={store}>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh: vi.fn(),
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected,
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <SearchDialog />
      </AppContext.Provider>
    </Provider>,
  );

  await user.type(screen.getByLabelText("Search Telegram"), "joined");

  await waitFor(() => {
    expect(searchTelegramMock).toHaveBeenCalledWith("joined", ensureTelegramConnected);
  });

  await user.click(screen.getByRole("button", { name: /Open Joined Channel/i }));

  await waitFor(() => {
    expect(resolveTelegramFeedItemMock).toHaveBeenCalledWith(
      { className: "Channel", id: 10, title: "Joined Channel", username: "joined" },
      ensureTelegramConnected,
      33,
    );
  });

  expect(store.get(feedItemsAtom)).toEqual([
    expect.objectContaining({
      id: "group-10-33",
      channelKey: "group:10",
    }),
  ]);
  expect(store.get(notificationFocusAtom)).toEqual({
    channelKey: "group:10",
    itemId: "group-10-33",
    view: "thread",
  });
  expect(store.get(menuIsOpenAtom)).toBe(false);
  expect(store.get(menuItemAtom)).toBe(null);
});

test("shows an empty state when no results are found", async () => {
  const user = userEvent.setup();
  searchTelegramMock.mockResolvedValue([]);

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh: vi.fn(),
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected: vi.fn().mockResolvedValue({}),
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <SearchDialog />
      </AppContext.Provider>
    </Provider>,
  );

  await user.type(screen.getByLabelText("Search Telegram"), "missing");

  expect(await screen.findByText("No results.")).toBeInTheDocument();
});
