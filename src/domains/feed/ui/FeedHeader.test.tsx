import { Provider } from "jotai/react";
import { createStore } from "jotai/vanilla";
import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { AppContext } from "../../app/AppContext";
import { FeedHeader } from "./FeedHeader";

function renderWithStore(store = createStore()) {
	return render(
		<Provider store={store}>
			<AppContext.Provider
				value={
					{
						avatarVisibility: { feed: true, thread: true, notifications: true },
						ensureTelegramConnected: vi.fn(),
						dal: {} as never,
					} as never
				}
			>
				<FeedHeader />
			</AppContext.Provider>
		</Provider>,
	);
}

test("shows unread count badge when there are unread items", () => {
	const store = createStore();
	act(() => {
		store.set(feedItemsAtom, [
			{
				id: "dm-1",
				type: "dm" as const,
				chatName: "Alice",
				senderName: "Alice",
				timestamp: "now",
				date: 0,
				text: "Unread",
				reactions: [],
				isRead: false,
				isFocused: false,
			},
			{
				id: "dm-2",
				type: "dm" as const,
				chatName: "Alice",
				senderName: "Alice",
				timestamp: "now",
				date: 0,
				text: "Also unread",
				reactions: [],
				isRead: false,
				isFocused: false,
			},
		]);
	});

	renderWithStore(store);

	expect(screen.getByLabelText("2 unread messages")).toBeInTheDocument();
});

test("hides unread badge when all items are read", () => {
	const store = createStore();
	act(() => {
		store.set(feedItemsAtom, [
			{
				id: "dm-1",
				type: "dm" as const,
				chatName: "Alice",
				senderName: "Alice",
				timestamp: "now",
				date: 0,
				text: "Read",
				reactions: [],
				isRead: true,
				isFocused: false,
			},
		]);
	});

	renderWithStore(store);

	expect(screen.queryByLabelText(/unread messages/)).not.toBeInTheDocument();
});
