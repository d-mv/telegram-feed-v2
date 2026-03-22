import { Provider } from "jotai/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppContext } from "../app/AppContext";
import { Menu } from "./Menu";

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

test("refresh menu item triggers manual refresh callback", async () => {
  const user = userEvent.setup();
  const onManualRefresh = vi.fn();

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh,
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
        <Menu />
      </AppContext.Provider>
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Refresh" }));

  expect(onManualRefresh).toHaveBeenCalledTimes(1);
});

test("filters menu item opens filters settings without manual refresh", async () => {
  const user = userEvent.setup();
  const onManualRefresh = vi.fn();

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh,
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
        <Menu />
      </AppContext.Provider>
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Filters" }));

  expect(onManualRefresh).not.toHaveBeenCalled();
  expect(await screen.findByRole("dialog", { name: "Filters" })).toBeInTheDocument();
});

test("search menu item opens search dialog shell", async () => {
  const user = userEvent.setup();

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
        <Menu />
      </AppContext.Provider>
    </Provider>,
  );

  await user.click(screen.getByRole("button", { name: "Menu" }));
  await user.click(screen.getByRole("menuitem", { name: "Search" }));

  expect(await screen.findByRole("dialog", { name: "Search" })).toBeInTheDocument();
  expect(await screen.findByLabelText("Search Telegram")).toBeInTheDocument();
  expect(screen.getByText("Search results will appear here.")).toBeInTheDocument();
});
