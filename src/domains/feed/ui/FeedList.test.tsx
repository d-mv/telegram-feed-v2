import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { FeedList } from "./FeedList";

test("renders loading and feed items", () => {
  const onFocus = vi.fn();
  const topSentinelRef = createRef<HTMLDivElement>();
  render(
    <FeedList
      items={[
        {
          id: "dm-1",
          type: "dm",
          chatName: "Alice",
          senderName: "Alice",
          timestamp: "now",
          text: "Hello",
          reactions: [],
          isFocused: false,
        },
      ]}
      isLoadingOlder
      topSentinelRef={topSentinelRef}
      onFocus={onFocus}
    />,
  );

  expect(screen.getByText("Loading older...")).toBeInTheDocument();
  expect(screen.getByText("Hello")).toBeInTheDocument();
});
