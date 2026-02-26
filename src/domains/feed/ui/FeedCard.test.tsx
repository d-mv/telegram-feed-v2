import { render, screen } from "@testing-library/react";
import { FeedCard } from "./FeedCard";

test("shows comments icon only when message has comments", () => {
  const onFocus = () => {};
  const withComments = {
    id: "group-1",
    type: "group" as const,
    chatName: "Team",
    timestamp: "now",
    text: "With comments",
    commentsCount: 3,
    isFocused: false,
  };
  const withoutComments = {
    id: "group-2",
    type: "group" as const,
    chatName: "Team",
    timestamp: "now",
    text: "Without comments",
    isFocused: false,
  };

  const { rerender } = render(<FeedCard item={withComments} onFocus={onFocus} />);
  expect(screen.getByLabelText("Has comments")).toBeInTheDocument();

  rerender(<FeedCard item={withoutComments} onFocus={onFocus} />);
  expect(screen.queryByLabelText("Has comments")).not.toBeInTheDocument();
});
