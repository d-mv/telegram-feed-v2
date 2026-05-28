import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AppContext } from "../../../domains/app/AppContext";
import { Avatar } from "./Avatar";
import type { FeedItem } from "../../../types";

vi.mock("../../../domains/feed/infra/telegramFeed", () => ({
	getAvatarPhotoUrl: vi.fn().mockResolvedValue(undefined),
	getAvatarPhotoGallery: vi.fn().mockResolvedValue([]),
	resolveFeedItemSourceMessage: vi.fn().mockResolvedValue(null),
}));

function Wrapper({ children }: { children: ReactNode }) {
	return (
		<AppContext.Provider
			value={
				{
					avatarVisibility: { feed: true, thread: true, notifications: true },
					ensureTelegramConnected: vi.fn().mockResolvedValue({}),
				} as never
			}
		>
			{children}
		</AppContext.Provider>
	);
}

function makeItem(senderName: string): FeedItem {
	return {
		id: "dm-1",
		type: "dm",
		chatName: "Test Chat",
		senderName,
		timestamp: "now",
		text: "",
		reactions: [],
	} as unknown as FeedItem;
}

describe("Avatar accessibility", () => {
	it("avatar button has aria-label with sender name", () => {
		render(<Avatar message={makeItem("Alice Smith")} />, { wrapper: Wrapper });
		expect(
			screen.getByRole("button", { name: "Avatar for Alice Smith" }),
		).toBeInTheDocument();
	});

	it("aria-label updates for different sender names", () => {
		render(<Avatar message={makeItem("Bob Jones")} />, { wrapper: Wrapper });
		expect(
			screen.getByRole("button", { name: "Avatar for Bob Jones" }),
		).toBeInTheDocument();
	});

	it("avatar is not rendered when feed visibility is off", () => {
		const { container } = render(
			<AppContext.Provider
				value={
					{
						avatarVisibility: {
							feed: false,
							thread: true,
							notifications: true,
						},
						ensureTelegramConnected: vi.fn(),
					} as never
				}
			>
				<Avatar message={makeItem("Alice Smith")} />
			</AppContext.Provider>,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
