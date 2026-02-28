import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
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

  render(
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

test("marks clicked message and previous ones as read", async () => {
  const user = userEvent.setup();
  const now = Math.floor(Date.now() / 1000);
  const { Api } = await import("telegram");
  const onMarkRead = vi.fn();

  const firstMessage = new Api.Message({
    id: 10,
    date: now - 120,
    message: "First",
    toId: {},
    sender: { firstName: "Alice" },
  });

  const secondMessage = new Api.Message({
    id: 11,
    date: now - 60,
    message: "Second",
    toId: {},
    sender: { firstName: "Bob" },
  });

  const sourceMessage = new Api.Message({
    id: 11,
    date: now - 60,
    message: "Second",
    toId: {},
    getInputChat: vi.fn().mockResolvedValue("chat"),
    sender: { firstName: "Bob" },
  });

  ensureTelegramConnectedMock.mockResolvedValue({
    getMessages: vi.fn().mockResolvedValue([secondMessage, firstMessage]),
  });

  render(
    <ChatThread
      item={{
        id: "group-1-11",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "Second",
        sourceMessage,
        isFocused: true,
      }}
      onMarkReadThrough={onMarkRead}
    />, 
  );

  expect(await screen.findByText("First")).toBeInTheDocument();
  expect(screen.getAllByLabelText("Unread message")).toHaveLength(2);

  await user.click(screen.getByText("Second"));

  await waitFor(() => {
    expect(screen.queryByLabelText("Unread message")).not.toBeInTheDocument();
  });
  expect(onMarkRead).toHaveBeenCalledWith(["10", "11"]);
});

test("marks a video message as read when play starts", async () => {
  const onMarkRead = vi.fn();

  render(
    <ChatThread
      item={{
        id: "group-1-20",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        text: "Video",
        media: {
          meta: {
            type: "video",
            width: 640,
            height: 360,
            sizeBytes: 2048,
            mimeType: "video/mp4",
          },
          url: "https://example.com/preview.jpg",
          alt: "video",
        },
        isFocused: true,
      }}
      onMarkReadThrough={onMarkRead}
    />, 
  );

  const video = await screen.findByLabelText("Video media");
  fireEvent.play(video);

  await waitFor(() => {
    expect(screen.queryByLabelText("Unread message")).not.toBeInTheDocument();
  });
  expect(onMarkRead).toHaveBeenCalledWith(["group-1-20"]);
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

  render(
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

test("keeps media visible for mixed text and media messages in the thread", () => {
  render(
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
  render(
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

  render(
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
