import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { APP_OPEN_TARGET_EVENT } from "../../app/openTarget";
import { FeedCard } from "./FeedCard";

test("shows comments icon only when message has comments", () => {
  const onFocus = () => {};
  const withComments = {
    id: "group-1",
    type: "group" as const,
    chatName: "Team",
    timestamp: "now",
    date: 0,
    text: "With comments",
    commentsCount: 3,
    isFocused: false,
  };
  const withoutComments = {
    id: "group-2",
    type: "group" as const,
    chatName: "Team",
    timestamp: "now",
    date: 0,
    text: "Without comments",
    isFocused: false,
  };

  const { rerender } = render(<FeedCard item={withComments} onFocus={onFocus} />);
  expect(screen.getByLabelText("Has comments")).toBeInTheDocument();

  rerender(<FeedCard item={withoutComments} onFocus={onFocus} />);
  expect(screen.queryByLabelText("Has comments")).not.toBeInTheDocument();
});

test("keeps media visible for mixed text and media messages in the feed", () => {
  render(
    <FeedCard
      item={{
        id: "group-5",
        type: "group",
        chatName: "Team",
        timestamp: "now",
        date: 0,
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
        isFocused: false,
      }}
      onFocus={() => {}}
    />,
  );

  expect(screen.getByText("Look at this")).toBeInTheDocument();
  expect(screen.getByAltText("mixed")).toBeInTheDocument();
});

test("renders grouped images in a tiled row layout", () => {
  const groupedItems = [
    {
      id: "dm-1",
      type: "dm" as const,
      chatName: "Alice",
      senderName: "Alice",
      timestamp: "now",
      date: 0,
      text: "",
      reactions: [],
      media: {
        meta: {
          type: "image" as const,
          width: 640,
          height: 360,
          sizeBytes: 1024,
          mimeType: "image/jpeg",
        },
        url: "https://example.com/one.jpg",
        alt: "one",
      },
      isFocused: false,
    },
    {
      id: "dm-2",
      type: "dm" as const,
      chatName: "Alice",
      senderName: "Alice",
      timestamp: "now",
      date: 0,
      text: "",
      reactions: [],
      media: {
        meta: {
          type: "image" as const,
          width: 640,
          height: 360,
          sizeBytes: 1024,
          mimeType: "image/jpeg",
        },
        url: "https://example.com/two.jpg",
        alt: "two",
      },
      isFocused: false,
    },
    {
      id: "dm-3",
      type: "dm" as const,
      chatName: "Alice",
      senderName: "Alice",
      timestamp: "now",
      date: 0,
      text: "",
      reactions: [],
      media: {
        meta: {
          type: "image" as const,
          width: 640,
          height: 360,
          sizeBytes: 1024,
          mimeType: "image/jpeg",
        },
        url: "https://example.com/three.jpg",
        alt: "three",
      },
      isFocused: false,
    },
  ];

  const { container } = render(
    <FeedCard item={groupedItems[0]} groupedItems={groupedItems} onFocus={() => {}} />,
  );

  const grid = container.querySelector('[data-media-group-layout="image-grid"]');
  expect(grid).toBeTruthy();
  expect(grid?.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(3);
  expect(grid).toHaveStyle({ "--media-group-columns": "3" });
  const mediaNodes = container.querySelectorAll('[data-media-type="image"]');
  expect(mediaNodes[0]).toHaveStyle({ aspectRatio: '1 / 1' });
});

test("balances larger grouped image sets with fixed columns", () => {
  const groupedItems = Array.from({ length: 7 }, (_, index) => ({
    id: `dm-${index + 1}`,
    type: "dm" as const,
    chatName: "Alice",
    senderName: "Alice",
    timestamp: "now",
    text: "",
    reactions: [],
    media: {
      meta: {
        type: "image" as const,
        width: 640,
        height: 360,
        sizeBytes: 1024,
        mimeType: "image/jpeg",
      },
      url: `https://example.com/${index + 1}.jpg`,
      alt: `image-${index + 1}`,
    },
    isFocused: false,
  }));

  const { container } = render(
    <FeedCard item={groupedItems[0]} groupedItems={groupedItems} onFocus={() => {}} />,
  );

  const grid = container.querySelector('[data-media-group-layout="image-grid"]');
  expect(grid).toHaveStyle({ "--media-group-columns": "4" });
});

test("renders a single message with multiple images as a gallery", () => {
  const item = {
    id: "group-multi-1",
    type: "group" as const,
    chatName: "Team",
    senderName: "Alice",
    timestamp: "now",
    date: 0,
    text: "Album caption",
    media: {
      meta: {
        type: "image" as const,
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
          type: "image" as const,
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
          type: "image" as const,
          width: 640,
          height: 360,
          sizeBytes: 1024,
          mimeType: "image/jpeg",
        },
        url: "https://example.com/2.jpg",
        alt: "two",
      },
      {
        meta: {
          type: "image" as const,
          width: 640,
          height: 360,
          sizeBytes: 1024,
          mimeType: "image/jpeg",
        },
        url: "https://example.com/3.jpg",
        alt: "three",
      },
    ],
    isFocused: false,
  };

  const { container } = render(<FeedCard item={item} onFocus={() => {}} />);

  expect(screen.getByText("Album caption")).toBeInTheDocument();
  expect(container.querySelector('[data-media-group-layout="image-grid"]')).toBeTruthy();
  expect(container.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(3);
});

test("renders forwarded source metadata and opens resolvable forwarded targets internally", async () => {
  const user = userEvent.setup();
  const handler = vi.fn();
  window.addEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);

  render(
    <FeedCard
      item={{
        id: "group-forwarded-1",
        type: "group",
        chatName: "Team",
        senderName: "Alice",
        timestamp: "now",
        date: 0,
        text: "Forwarded text",
        sourceMessage: {
          fwdFrom: {
            channelPost: 33,
            postAuthor: "Anonymous Admin",
          },
          forward: {
            chat: {
              title: "News",
              username: "news",
            },
          },
        },
        isFocused: false,
      }}
      onFocus={() => {}}
    />,
  );

  expect(screen.getByText("Forwarded from From anonymous via News")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Forwarded from From anonymous via News" }));

  expect(handler).toHaveBeenCalledTimes(1);
  window.removeEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);
});

test("renders Telegram message entities in feed text and routes Telegram links internally", async () => {
  const user = userEvent.setup();
  const handler = vi.fn();
  window.addEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);

  render(
    <FeedCard
      item={{
        id: "group-format-1",
        type: "group",
        chatName: "Team",
        senderName: "Alice",
        timestamp: "now",
        date: 0,
        text: "Bold Telegram",
        sourceMessage: {
          entities: [
            { className: "MessageEntityBold", offset: 0, length: 4 },
            {
              className: "MessageEntityTextUrl",
              offset: 5,
              length: 8,
              url: "https://t.me/news/33",
            },
          ],
        },
        isFocused: false,
      }}
      onFocus={() => {}}
    />,
  );

  expect(screen.getByText("Bold").tagName).toBe("STRONG");
  await user.click(screen.getByRole("button", { name: "Telegram" }));
  expect(handler).toHaveBeenCalledTimes(1);

  window.removeEventListener(APP_OPEN_TARGET_EVENT, handler as EventListener);
});
