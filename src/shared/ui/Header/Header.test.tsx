import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import type { FeedItem } from "../../../types";
import { Header } from "./Header";

vi.mock("../Avatar/Avatar", () => ({
  Avatar: () => <div data-testid="avatar" />,
}));

function createMessage(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id: "group-1",
    type: "group",
    chatName: "Team",
    timestamp: "fallback",
    text: "Update",
    isFocused: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-06T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

test("updates relative timestamp while the feed card stays mounted", () => {
  const message = createMessage({
    timestamp: "1 min ago",
    sourceMessage: { date: Math.floor(Date.now() / 1000) - 90 },
  });

  render(<Header message={message}>Team</Header>);

  expect(screen.getByText("1 min ago")).toBeInTheDocument();

  act(() => {
    vi.setSystemTime(new Date("2026-03-06T11:05:00Z"));
    vi.advanceTimersByTime(30_000);
  });

  expect(screen.getByText("1 hr ago")).toBeInTheDocument();
});

test("keeps provided timestamp when source message has no date", () => {
  const message = createMessage({
    timestamp: "2 min ago",
    sourceMessage: {},
  });

  render(<Header message={message}>Team</Header>);

  act(() => {
    vi.advanceTimersByTime(30_000);
  });

  expect(screen.getByText("2 min ago")).toBeInTheDocument();
});
