import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AppContext } from "../../app/AppContext";
import { FeedList } from "./FeedList";

function Wrapper({ children }: { children: React.ReactNode }) {
	return (
		<AppContext.Provider
			value={
				{
					avatarVisibility: { feed: true, thread: true, notifications: true },
					ensureTelegramConnected: vi.fn(),
					dal: {} as never,
					onVotePoll: vi.fn(),
				} as never
			}
		>
			{children}
		</AppContext.Provider>
	);
}

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
		{ wrapper: Wrapper },
	);

	expect(screen.getByText("Loading older...")).toBeInTheDocument();
	expect(screen.getByText("Hello")).toBeInTheDocument();
});
