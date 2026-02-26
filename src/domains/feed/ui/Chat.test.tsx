import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppContext } from "../../app/AppContext";
import { Chat } from "./Chat";

vi.mock("./ChatThread", () => ({
  ChatThread: () => <div>Thread</div>,
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

test("sends typed message and clears composer", async () => {
  const user = userEvent.setup();
  const onSendMessage = vi.fn().mockResolvedValue(undefined);

  render(
    <AppContext.Provider
      value={{
        dal: createDalStub(),
        onManualRefresh: vi.fn(),
        onSendMessage,
        avatarVisibility: { feed: true, thread: true, notifications: true },
        onSetAvatarVisibility: vi.fn(),
        onToggleChannelNotification: vi.fn(),
        onToggleChannelFilter: vi.fn(),
        onRequestNotificationPermission: vi.fn(),
        onDisableNotifications: vi.fn(),
        onEnableAllFeedFilters: vi.fn(),
      }}
    >
      <Chat
        item={{
          id: "dm-1-1",
          type: "dm",
          chatName: "Alice",
          senderName: "Alice",
          timestamp: "now",
          text: "Hello",
          reactions: [],
        }}
        onClose={vi.fn()}
      />
    </AppContext.Provider>,
  );

  const input = screen.getByLabelText("Write a reply");
  await user.type(input, "Hi there");
  await user.click(screen.getByRole("button", { name: "Send" }));

  await waitFor(() => {
    expect(onSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dm-1-1" }),
      "Hi there",
    );
  });

  expect(screen.getByLabelText("Write a reply")).toHaveValue("");
});
