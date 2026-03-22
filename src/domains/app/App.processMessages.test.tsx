import { render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { vi } from "vitest";
import { isLoadingFeedAtom } from "../../atoms/app.atom";
import { authClientAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import AuthenticatedApp from "./AuthenticatedApp";

const { useProcessMessagesMock } = vi.hoisted(() => ({
  useProcessMessagesMock: vi.fn(),
}));

vi.mock("../dal/indexedDbDal", () => ({
  createIndexedDbDal: vi.fn(() => ({
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
  })),
}));

vi.mock("./useRefresh", () => ({
  useRefresh: vi.fn(() => ({
    refreshFeed: vi.fn(),
    feedError: "",
  })),
}));

vi.mock("./useSettings", () => ({
  useSettings: vi.fn(() => ({
    handleSetAvatarVisibility: vi.fn(),
    handleEnableAllFeedFilters: vi.fn(),
    handleToggleChannelFilter: vi.fn(),
    handleDisableNotifications: vi.fn(),
    handleRequestNotificationPermission: vi.fn(),
    handleToggleChannelNotification: vi.fn(),
  })),
}));

vi.mock("./useProcessMessages", () => ({
  useProcessMessages: useProcessMessagesMock,
}));

vi.mock("../feed/ui/FeedView", () => ({
  FeedView: () => <div>feed</div>,
}));

test("mounts live message processing when authenticated", () => {
  const store = createStore();

  store.set(isLoadingFeedAtom, false);
  store.set(authClientAtom, {
    ensureTelegramConnected: vi.fn().mockResolvedValue({}),
  } as never);
  store.set(avatarVisibilityAtom, {
    feed: true,
    thread: true,
    notifications: true,
  });
  store.set(feedItemsAtom, [
    {
      id: "dm-1",
      type: "dm",
      channelKey: "dm:1",
      chatName: "Test",
      senderName: "Test",
      timestamp: "Just now",
      text: "Hello",
      reactions: [],
      isFocused: false,
    },
  ]);

  render(
    <Provider store={store}>
      <AuthenticatedApp
        dal={
          {
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
          }
        }
      />
    </Provider>,
  );

  expect(useProcessMessagesMock).toHaveBeenCalled();
  expect(screen.getByText("feed")).toBeInTheDocument();
});
