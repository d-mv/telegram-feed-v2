import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppContext } from "../../app/AppContext";
import { Chat } from "./Chat";

vi.mock("./ChatThread", () => ({
  ChatThread: ({
    sentMessages = [],
  }: {
    sentMessages?: { id: string; text: string; timestamp?: string; senderName?: string }[];
  }) => (
    <div>
      <div>Thread</div>
      {sentMessages.map((message) => (
        <div key={message.id}>
          <span>{message.senderName}</span>
          <span>{message.timestamp}</span>
          <span>{message.text}</span>
        </div>
      ))}
    </div>
  ),
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

test("shows sent message immediately in the open thread", async () => {
  const user = userEvent.setup();
  let resolveSend: ((value: unknown) => void) | null = null;
  const onSendMessage = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSend = resolve;
      }),
  );

  render(
    <AppContext.Provider
      value={{
        dal: createDalStub(),
        onManualRefresh: vi.fn(),
        onSendMessage,
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

  await user.type(screen.getByLabelText("Write a reply"), "Ships immediately");
  await user.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("Ships immediately")).toBeInTheDocument();
  expect(screen.getByText("You")).toBeInTheDocument();
  expect(screen.getByText("Just now")).toBeInTheDocument();

  resolveSend?.({
    id: "dm-1-99",
    type: "dm",
    channelKey: "dm:1",
    chatName: "Alice",
    senderName: "Alice",
    timestamp: "1 min ago",
    text: "Ships immediately",
    reactions: [],
    isFocused: false,
  });
  await waitFor(() => {
    expect(onSendMessage).toHaveBeenCalled();
  });
  await waitFor(() => {
    expect(screen.getByText("1 min ago")).toBeInTheDocument();
  });
  expect(screen.queryByText("Just now")).not.toBeInTheDocument();
});
