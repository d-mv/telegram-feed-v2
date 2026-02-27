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
  class PeerUser {}

  return {
    Api: {
      Message,
      PeerUser,
    },
  };
});

const ensureTelegramConnectedMock = vi.hoisted(() => vi.fn());

vi.mock("../../auth/infra/telegramAuth", () => ({
  ensureTelegramConnected: ensureTelegramConnectedMock,
}));

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
