import { Provider } from "jotai/react";
import { createStore } from "jotai/vanilla";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { notificationPermissionAtom, notificationSettingsAtom } from "../../../atoms/notifications.atom";
import { AppContext } from "../../app/AppContext";
import AvatarsSettings from "./AvatarsSettings";
import { ChannelFilters } from "./ChannelFilters";
import { ChannelNotifications } from "./ChannelNotifications";
import FiltersSettings from "./FiltersSettings";
import Maintenance from "./Maintenance";
import { MenuDialog } from "./MenuDialog";
import { MenuHeader } from "./MenuHeader";
import NotificationsSettings from "./NotificationsSettings";
import { SettingButtonRow } from "./SettingButtonRow";

type AppCtxValue = {
  dal: {
    clearCache: () => Promise<void>;
  };
  onManualRefresh: () => void;
  onSendMessage: () => Promise<void>;
  avatarVisibility: { feed: boolean; thread: boolean; notifications: boolean };
  onSetAvatarVisibility: (value: { feed: boolean; thread: boolean; notifications: boolean }) => void;
  onToggleChannelNotification: (key: string, enabled: boolean) => void;
  onToggleChannelFilter: (key: string, enabled: boolean) => void;
  onRequestNotificationPermission: () => void;
  onDisableNotifications: () => void;
  onEnableAllFeedFilters: () => void;
};

function contextValue(overrides: Partial<AppCtxValue> = {}) {
  return {
    dal: {
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
    clearCache: vi.fn().mockResolvedValue(undefined),
  },
    onManualRefresh: vi.fn(),
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    avatarVisibility: { feed: true, thread: true, notifications: true },
    onSetAvatarVisibility: vi.fn(),
    onToggleChannelNotification: vi.fn(),
    onToggleChannelFilter: vi.fn(),
    onRequestNotificationPermission: vi.fn(),
    onDisableNotifications: vi.fn(),
    onEnableAllFeedFilters: vi.fn(),
  ...overrides,
  };
}

function renderWithProviders(
  ui: ReactNode,
  options: {
    channels?: { key: string; label: string }[];
    feedFilters?: Record<string, boolean>;
    notificationSettings?: Record<string, boolean>;
    notificationPermission?: NotificationPermission | "unsupported";
    contextOverrides?: Partial<AppCtxValue>;
  } = {},
) {
  const store = createStore();
  if (options.channels) store.set(channelsAtom, options.channels);
  if (options.feedFilters) store.set(feedFilterSettingsAtom, options.feedFilters);
  if (options.notificationSettings) store.set(notificationSettingsAtom, options.notificationSettings);
  if (options.notificationPermission) {
    store.set(notificationPermissionAtom, options.notificationPermission);
  }
  return render(
    <Provider store={store}>
      <AppContext.Provider value={contextValue(options.contextOverrides) as never}>
        {ui}
      </AppContext.Provider>
    </Provider>,
  );
}

test("menu dialog closes by escape and backdrop", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  renderWithProviders(
    <MenuDialog title="Dialog" onClose={onClose}>
      content
    </MenuDialog>,
  );

  await user.keyboard("{Escape}");
  await user.click(screen.getByText("Dialog").closest("main")!.previousElementSibling as HTMLElement);

  expect(onClose).toHaveBeenCalledTimes(2);
});

test("setting button row renders and handles click", async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  renderWithProviders(
    <SettingButtonRow title="Row" subtitle="Sub" buttonText="Do it" onClick={onClick} />,
  );
  expect(screen.getByText("Sub")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Do it" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("channel toggles call context handlers", async () => {
  const user = userEvent.setup();
  const onToggleChannelFilter = vi.fn();
  const onToggleChannelNotification = vi.fn();
  renderWithProviders(
    <>
      <ChannelFilters />
      <ChannelNotifications />
    </>,
    {
      channels: [{ key: "group:1", label: "Team" }],
      feedFilters: { "group:1": false },
      notificationSettings: { "group:1": true },
      contextOverrides: { onToggleChannelFilter, onToggleChannelNotification },
    },
  );

  await user.click(screen.getByLabelText("Feed visibility for Team"));
  await user.click(screen.getByLabelText("Notifications for Team"));

  expect(onToggleChannelFilter).toHaveBeenCalledWith("group:1", true);
  expect(onToggleChannelNotification).toHaveBeenCalledWith("group:1", false);
});

test("filters settings enables all channels", async () => {
  const user = userEvent.setup();
  const onEnableAllFeedFilters = vi.fn();
  renderWithProviders(<FiltersSettings />, {
    channels: [
      { key: "dm:1", label: "Alice" },
      { key: "group:2", label: "Team" },
    ],
    feedFilters: { "dm:1": true, "group:2": false },
    contextOverrides: { onEnableAllFeedFilters },
  });

  await user.click(screen.getByRole("button", { name: "Show all" }));
  expect(onEnableAllFeedFilters).toHaveBeenCalledTimes(1);
});

test("notifications settings disables enabled notifications", async () => {
  const user = userEvent.setup();
  const onDisableNotifications = vi.fn();
  renderWithProviders(<NotificationsSettings />, {
    channels: [{ key: "group:2", label: "Team" }],
    notificationSettings: { "group:2": true },
    notificationPermission: "granted",
    contextOverrides: { onDisableNotifications },
  });

  await user.click(screen.getByRole("button", { name: "Disable" }));
  expect(onDisableNotifications).toHaveBeenCalledTimes(1);
});

test("avatars settings toggles visibility", async () => {
  const user = userEvent.setup();
  const onSetAvatarVisibility = vi.fn();
  renderWithProviders(<AvatarsSettings />, {
    contextOverrides: { onSetAvatarVisibility },
  });

  await user.click(screen.getAllByRole("button", { name: "On" })[0]!);
  expect(onSetAvatarVisibility).toHaveBeenCalled();
});

test("maintenance clears cache", async () => {
  const user = userEvent.setup();
  const clearCache = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(<Maintenance />, {
    contextOverrides: { dal: { ...contextValue().dal, clearCache } as never },
  });

  await user.click(screen.getByRole("button", { name: "Clear" }));
  expect(clearCache).toHaveBeenCalledTimes(1);
});

test("menu header close button works", async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  renderWithProviders(<MenuHeader onClose={onClose}>Head</MenuHeader>);

  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
