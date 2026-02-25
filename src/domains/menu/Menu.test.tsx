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

test("refresh menu item triggers manual refresh callback", async () => {
  const user = userEvent.setup();
  const onManualRefresh = vi.fn();

  render(
    <Provider>
      <AppContext.Provider
        value={{
          dal: createDalStub(),
          onManualRefresh,
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

