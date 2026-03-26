import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { APP_OPEN_TARGET_EVENT } from "../../app/openTarget";
import { AppContext } from "../../app/AppContext";
import { ChatThread } from "./ChatThread";

vi.mock("telegram", () => {
  class Message {
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data);
    }
  }
  class Photo {
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data);
    }
  }
  class PeerUser {}

  return {
    Api: {
      Message,
      Photo,
      PeerUser,
    },
  };
});

const ensureTelegramConnectedMock = vi.hoisted(() => vi.fn());
const downloadThumbnailForItemMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue("https://example.com/thread-preview.jpg"),
);

vi.mock("../../auth/infra/telegramAuth", () => ({
  ensureTelegramConnected: ensureTelegramConnectedMock,
}));

vi.mock("../infra/telegramFeed", async () => {
  const actual = await vi.importActual<typeof import("../infra/telegramFeed")>("../infra/telegramFeed");
  return {
    ...actual,
    downloadThumbnailForItem: downloadThumbnailForItemMock,
  };
});

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

function renderThread(node: ReactElement) {
  return render(
    <AppContext.Provider
      value={{
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
                                  getMedia: vi.fn(),
          setMedia: vi.fn(),
          clearCache: vi.fn(),
        },
        onManualRefresh: vi.fn(),
        onSendMessage: vi.fn().mockResolvedValue(undefined),
        ensureTelegramConnected: ensureTelegramConnectedMock,
        avatarVisibility: { feed: true, thread: true, notifications: true },
        onSetAvatarVisibility: vi.fn(),
        onToggleChannelNotification: vi.fn(),
        onToggleChannelFilter: vi.fn(),
        onRequestNotificationPermission: vi.fn(),
        onDisableNotifications: vi.fn(),
        onEnableAllFeedFilters: vi.fn(),
      }}
    >
      {node}
    </AppContext.Provider>,
  );
}

test("loads message comments in accordion and shows comments icon", async () => {
  const user = userEvent.setup();
  const now = Math.floor(Date.now() / 1000);
  const { Api } = await import("telegram");

  const sourceMessage = new Api.Message({
    id: 10,
    date: now - 60,
    message: "Parent",
    replies: { replies: 1 },
    toId: {},
    getInputChat: vi.fn().mockResolvedValue("chat"),
    sender: { firstName: "Alice" },
  });

  const commentMessage = new Api.Message({
    id: 11,
    date: now - 10,
    message: "First comment",
    toId: {},
    sender: { firstName: "Bob" },
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMessages: vi.fn().mockImplementation((_chat: unknown, options?: { replyTo?: number }) => {
      if (options?.replyTo === 10) {
        return Promise.resolve([commentMessage]);
      }
      return Promise.resolve([sourceMessage]);
    }),
  });

  renderThread(
    <ChatThread
      item={{
        id: "group-1-10",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "Parent",
        sourceMessage,
        isFocused: true,
      }}
    />,
  );

  expect(await screen.findByText("Parent")).toBeInTheDocument();
  const trigger = await screen.findByLabelText("Comments");
  await user.click(trigger);

  await waitFor(() => {
    expect(screen.getByText("First comment")).toBeInTheDocument();
  });
});

test("groups consecutive media-only messages from the same sender in the thread", async () => {
  const now = Math.floor(Date.now() / 1000);
  const { Api } = await import("telegram");

  const firstMessage = new Api.Message({
    id: 30,
    date: now - 120,
    message: "",
    media: {
      className: "MessageMediaPhoto",
      photo: new Api.Photo({
        id: 301,
        sizes: [{ w: 640, h: 360, size: 1024 }],
      }),
    },
    toId: {},
    sender: { firstName: "Alice" },
  });

  const secondMessage = new Api.Message({
    id: 31,
    date: now - 60,
    message: "",
    media: {
      className: "MessageMediaPhoto",
      photo: new Api.Photo({
        id: 302,
        sizes: [{ w: 640, h: 360, size: 1024 }],
      }),
    },
    toId: {},
    sender: { firstName: "Alice" },
  });

  const sourceMessage = new Api.Message({
    id: 31,
    date: now - 60,
    message: "",
    toId: {},
    getInputChat: vi.fn().mockResolvedValue("chat"),
    sender: { firstName: "Alice" },
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMessages: vi.fn().mockResolvedValue([secondMessage, firstMessage]),
  });

  renderThread(
    <ChatThread
      item={{
        id: "group-1-31",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "",
        sourceMessage,
        isFocused: true,
      }}
    />,
  );

  await waitFor(() => {
    expect(document.querySelectorAll('[data-media-type="image"]')).toHaveLength(2);
  });
  expect(screen.getAllByText("Alice")).toHaveLength(1);
  expect(document.querySelector('[data-media-group-layout="image-grid"]')).toBeTruthy();
  expect(document.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(2);
  expect(document.querySelector('[data-media-type="image"]')).toHaveStyle({ aspectRatio: '1 / 1' });
});

test("loads full thread history for a cached item without sourceMessage", async () => {
  const now = Math.floor(Date.now() / 1000);
  const { Api } = await import("telegram");

  const firstMessage = new Api.Message({
    id: 70,
    date: now - 120,
    message: "Older message",
    toId: {},
    sender: { firstName: "Alice" },
  });

  const secondMessage = new Api.Message({
    id: 71,
    date: now - 60,
    message: "Newest message",
    toId: {},
    getInputChat: vi.fn().mockResolvedValue("chat"),
    sender: { firstName: "Alice" },
  });

  const getMessages = vi.fn().mockImplementation((chat: unknown, options?: { ids?: number[] }) => {
    if (options?.ids) {
      return Promise.resolve([secondMessage]);
    }
    return Promise.resolve([secondMessage, firstMessage]);
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMessages,
  });

  renderThread(
    <ChatThread
      item={{
        id: "group-1-71",
        type: "group",
        channelKey: "group:1",
        chatName: "Team",
        timestamp: "now",
        text: "Newest message",
        isFocused: true,
      }}
    />,
  );

  await waitFor(() => {
    expect(screen.getByText("Older message")).toBeInTheDocument();
  });
  expect(getMessages).toHaveBeenCalledWith("1", { ids: [71] });
  expect(screen.getByText("Newest message")).toBeInTheDocument();
});

test("keeps media visible for mixed text and media messages in the thread", () => {
  renderThread(
    <ChatThread
      item={{
        id: "group-1-40",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "Look at this",
        media: {
          meta: {
            type: "image",
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: "image/jpeg",
          },
          url: "https://example.com/mixed.jpg",
          alt: "mixed",
        },
        isFocused: true,
      }}
    />,
  );

  expect(screen.getByText("Look at this")).toBeInTheDocument();
  expect(screen.getByAltText("mixed")).toBeInTheDocument();
});

test("renders a single thread message with multiple images as a gallery", () => {
  renderThread(
    <ChatThread
      item={{
        id: "group-1-50",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "Album caption",
        media: {
          meta: {
            type: "image",
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: "image/jpeg",
          },
          url: "https://example.com/cover.jpg",
          alt: "cover",
        },
        mediaItems: [
          {
            meta: {
              type: "image",
              width: 640,
              height: 360,
              sizeBytes: 1024,
              mimeType: "image/jpeg",
            },
            url: "https://example.com/1.jpg",
            alt: "one",
          },
          {
            meta: {
              type: "image",
              width: 640,
              height: 360,
              sizeBytes: 1024,
              mimeType: "image/jpeg",
            },
            url: "https://example.com/2.jpg",
            alt: "two",
          },
        ],
        isFocused: true,
      }}
    />,
  );

  expect(screen.getByText("Album caption")).toBeInTheDocument();
  expect(document.querySelector('[data-media-group-layout="image-grid"]')).toBeTruthy();
  expect(document.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(2);
});

test("groups a media-only multi-image thread message with adjacent media-only messages", async () => {
  const now = Math.floor(Date.now() / 1000);
  const { Api } = await import("telegram");

  const firstMessage = new Api.Message({
    id: 60,
    date: now - 120,
    message: "",
    groupedId: 111n,
    media: {
      className: "MessageMediaPhoto",
      photo: new Api.Photo({
        id: 601,
        sizes: [{ w: 640, h: 360, size: 1024 }],
      }),
    },
    toId: {},
    sender: { firstName: "Alice" },
  });

  const secondMessage = new Api.Message({
    id: 61,
    date: now - 119,
    message: "",
    groupedId: 111n,
    media: {
      className: "MessageMediaPhoto",
      photo: new Api.Photo({
        id: 602,
        sizes: [{ w: 640, h: 360, size: 1024 }],
      }),
    },
    toId: {},
    sender: { firstName: "Alice" },
  });

  const thirdMessage = new Api.Message({
    id: 62,
    date: now - 60,
    message: "",
    media: {
      className: "MessageMediaPhoto",
      photo: new Api.Photo({
        id: 603,
        sizes: [{ w: 640, h: 360, size: 1024 }],
      }),
    },
    toId: {},
    sender: { firstName: "Alice" },
  });

  const sourceMessage = new Api.Message({
    id: 62,
    date: now - 60,
    message: "",
    toId: {},
    getInputChat: vi.fn().mockResolvedValue("chat"),
    sender: { firstName: "Alice" },
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMessages: vi.fn().mockResolvedValue([thirdMessage, secondMessage, firstMessage]),
  });

  renderThread(
    <ChatThread
      item={{
        id: "group-1-62",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "",
        sourceMessage,
        isFocused: true,
      }}
    />,
  );

  await waitFor(() => {
    expect(document.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(3);
  });
  expect(screen.getAllByText("Alice")).toHaveLength(1);
});

test("renders forwarded metadata inside the thread and routes clicks internally", async () => {
  const user = userEvent.setup();
  const handler = vi.fn();
  window.addEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);

  renderThread(
    <ChatThread
      item={{
        id: "group-forwarded-1",
        type: "group",
        chatName: "Team",
        senderName: "Alice",
        timestamp: "now",
        text: "Forwarded text",
        sourceMessage: {
          fwdFrom: {
            channelPost: 42,
            postAuthor: "Anonymous Admin",
          },
          forward: {
            chat: {
              title: "News",
              username: "news",
            },
          },
        },
        isFocused: true,
      }}
    />,
  );

  const badge = screen.getByRole("button", { name: "Forwarded from From anonymous via News" });
  expect(badge).toBeInTheDocument();
  await user.click(badge);

  expect(handler).toHaveBeenCalledTimes(1);
  window.removeEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);
});
