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
const previewInviteLinkMock = vi.hoisted(() => vi.fn());
const joinInviteLinkMock = vi.hoisted(() => vi.fn());
const joinSearchResultMock = vi.hoisted(() => vi.fn());

vi.mock("../../search/infra/telegramSearch", () => ({
  searchTelegram: searchTelegramMock,
}));

vi.mock("../../app/resolveTelegramFeedItem", () => ({
  resolveTelegramFeedItem: resolveTelegramFeedItemMock,
}));

vi.mock("../../search/infra/telegramMembership", () => ({
  previewInviteLink: previewInviteLinkMock,
  joinInviteLink: joinInviteLinkMock,
  joinSearchResult: joinSearchResultMock,
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
  previewInviteLinkMock.mockResolvedValue(null);
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
  previewInviteLinkMock.mockResolvedValue(null);

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

test("shows join for unjoined results and joins before opening", async () => {
  const user = userEvent.setup();
  const ensureTelegramConnected = vi.fn().mockResolvedValue({});
  const onManualRefresh = vi.fn().mockResolvedValue(undefined);

  vi.stubGlobal("confirm", vi.fn(() => true));
  previewInviteLinkMock.mockResolvedValue(null);
  searchTelegramMock.mockResolvedValue([
    {
      kind: "channel",
      id: "88",
      title: "Public Channel",
      username: "public",
      channelKey: "group:88",
      isJoined: false,
      entity: { className: "Channel", id: 88, title: "Public Channel", username: "public" },
    },
  ]);
  joinSearchResultMock.mockResolvedValue({ className: "Channel", id: 88, title: "Public Channel", username: "public" });
  resolveTelegramFeedItemMock.mockResolvedValue({
    id: "group-88-1",
    channelKey: "group:88",
    type: "group",
    chatName: "Public Channel",
    senderName: "Public Channel",
    text: "Hello",
    timestamp: "Just now",
    commentsCount: 0,
    isFocused: false,
  });

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh,
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected,
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onClearChannelState: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <SearchDialog />
      </AppContext.Provider>
    </Provider>,
  );

  await user.type(screen.getByLabelText("Search Telegram"), "public");

  const joinButton = await screen.findByRole("button", { name: /Join Public Channel/i });
  expect(joinButton).toBeInTheDocument();

  await user.click(joinButton);

  await waitFor(() => {
    expect(joinSearchResultMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "88", isJoined: false }),
      ensureTelegramConnected,
    );
  });
  expect(onManualRefresh).toHaveBeenCalledTimes(1);
  expect(resolveTelegramFeedItemMock).toHaveBeenCalled();
});

test("shows invite preview and joins invite links", async () => {
  const user = userEvent.setup();
  const ensureTelegramConnected = vi.fn().mockResolvedValue({});
  const onManualRefresh = vi.fn().mockResolvedValue(undefined);

  vi.stubGlobal("confirm", vi.fn(() => true));
  previewInviteLinkMock.mockResolvedValue({
    hash: "invite_hash",
    title: "Invite Group",
    participantsCount: 12,
    kind: "group",
    entity: undefined,
    isJoined: false,
  });
  joinInviteLinkMock.mockResolvedValue({ className: "Channel", id: 12, title: "Invite Group" });
  resolveTelegramFeedItemMock.mockResolvedValue({
    id: "group-12-1",
    channelKey: "group:12",
    type: "group",
    chatName: "Invite Group",
    senderName: "Invite Group",
    text: "Hello",
    timestamp: "Just now",
    commentsCount: 0,
    isFocused: false,
  });

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh,
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected,
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onClearChannelState: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <SearchDialog />
      </AppContext.Provider>
    </Provider>,
  );

  await user.type(screen.getByLabelText("Search Telegram"), "https://t.me/+invite_hash");

  expect(await screen.findByText("Invite Group")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Join" }));

  await waitFor(() => {
    expect(joinInviteLinkMock).toHaveBeenCalledWith(
      "https://t.me/+invite_hash",
      ensureTelegramConnected,
    );
  });
  expect(onManualRefresh).toHaveBeenCalledTimes(1);
  expect(resolveTelegramFeedItemMock).toHaveBeenCalled();
});
