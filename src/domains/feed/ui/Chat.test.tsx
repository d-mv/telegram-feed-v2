import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppContext } from "../../app/AppContext";
import { Chat } from "./Chat";

const leaveFeedChannelMock = vi.hoisted(() => vi.fn());

vi.mock("../../search/infra/telegramMembership", () => ({
	leaveFeedChannel: leaveFeedChannelMock,
}));

vi.mock("./ChatThread", () => ({
	ChatThread: ({
		sentMessages = [],
	}: {
		sentMessages?: {
			id: string;
			text: string;
			timestamp?: string;
			senderName?: string;
		}[];
	}) => (
		<div>
			<div>Thread</div>
			{sentMessages.map((message) => (
				<div key={message.id}>
					<span>{message.senderName}</span>
					<span>{message.timestamp}</span>
					<span>{message.text}</span>
				</div>
			))}
		</div>
	),
}));

function createDalStub() {
	return {
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
	};
}

test("sends typed message and clears composer", async () => {
	const user = userEvent.setup();
	const onSendMessage = vi.fn().mockResolvedValue(undefined);

	render(
		<AppContext.Provider
			value={{
				dal: createDalStub(),
				onManualRefresh: vi.fn(),
				onSendMessage,
				ensureTelegramConnected: vi.fn().mockResolvedValue({}),
				avatarVisibility: { feed: true, thread: true, notifications: true },
				onSetAvatarVisibility: vi.fn(),
				onToggleChannelNotification: vi.fn(),
				onToggleChannelFilter: vi.fn(),
				onClearChannelState: vi.fn(),
				onRequestNotificationPermission: vi.fn(),
				onDisableNotifications: vi.fn(),
				onEnableAllFeedFilters: vi.fn(),
			}}
		>
			<Chat
				item={{
					id: "dm-1-1",
					type: "dm",
					chatName: "Alice",
					senderName: "Alice",
					timestamp: "now",
					date: 0,
					text: "Hello",
					reactions: [],
					isFocused: false,
				}}
				onClose={vi.fn()}
			/>
		</AppContext.Provider>,
	);

	const input = screen.getByLabelText("Write a reply");
	await user.type(input, "Hi there");
	await user.click(screen.getByRole("button", { name: "Send" }));

	await waitFor(() => {
		expect(onSendMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: "dm-1-1" }),
			"Hi there",
		);
	});

	expect(screen.getByLabelText("Write a reply")).toHaveValue("");
});

test("shows sent message immediately in the open thread", async () => {
	const user = userEvent.setup();
	let resolveSend: ((value: unknown) => void) | null = null;
	const onSendMessage = vi.fn().mockImplementation(
		() =>
			new Promise((resolve) => {
				resolveSend = resolve;
			}),
	);

	render(
		<AppContext.Provider
			value={{
				dal: createDalStub(),
				onManualRefresh: vi.fn(),
				onSendMessage,
				ensureTelegramConnected: vi.fn().mockResolvedValue({}),
				avatarVisibility: { feed: true, thread: true, notifications: true },
				onSetAvatarVisibility: vi.fn(),
				onToggleChannelNotification: vi.fn(),
				onToggleChannelFilter: vi.fn(),
				onClearChannelState: vi.fn(),
				onRequestNotificationPermission: vi.fn(),
				onDisableNotifications: vi.fn(),
				onEnableAllFeedFilters: vi.fn(),
			}}
		>
			<Chat
				item={{
					id: "dm-1-1",
					type: "dm",
					chatName: "Alice",
					senderName: "Alice",
					timestamp: "now",
					date: 0,
					text: "Hello",
					reactions: [],
					isFocused: false,
				}}
				onClose={vi.fn()}
			/>
		</AppContext.Provider>,
	);

	await user.type(screen.getByLabelText("Write a reply"), "Ships immediately");
	await user.click(screen.getByRole("button", { name: "Send" }));

	expect(screen.getByText("Ships immediately")).toBeInTheDocument();
	expect(screen.getByText("You")).toBeInTheDocument();
	expect(screen.getByText("Just now")).toBeInTheDocument();

	resolveSend?.({
		id: "dm-1-99",
		type: "dm",
		channelKey: "dm:1",
		chatName: "Alice",
		senderName: "Alice",
		timestamp: "1 min ago",
		date: Math.floor(Date.now() / 1000) - 60,
		text: "Ships immediately",
		reactions: [],
		isFocused: false,
	});
	await waitFor(() => {
		expect(onSendMessage).toHaveBeenCalled();
	});
	await waitFor(() => {
		expect(screen.getByText("1 min ago")).toBeInTheDocument();
	});
	expect(screen.queryByText("Just now")).not.toBeInTheDocument();
});

test("renders close icon button and leave action in the overflow menu", async () => {
	const user = userEvent.setup();
	const onClose = vi.fn();

	render(
		<AppContext.Provider
			value={{
				dal: createDalStub(),
				onManualRefresh: vi.fn(),
				onSendMessage: vi.fn().mockResolvedValue(undefined),
				ensureTelegramConnected: vi.fn().mockResolvedValue({}),
				avatarVisibility: { feed: true, thread: true, notifications: true },
				onSetAvatarVisibility: vi.fn(),
				onToggleChannelNotification: vi.fn(),
				onToggleChannelFilter: vi.fn(),
				onClearChannelState: vi.fn(),
				onRequestNotificationPermission: vi.fn(),
				onDisableNotifications: vi.fn(),
				onEnableAllFeedFilters: vi.fn(),
			}}
		>
			<Chat
				item={{
					id: "group-1-1",
					type: "group",
					channelKey: "group:1",
					chatName: "Group",
					senderName: "Group",
					timestamp: "now",
					date: 0,
					text: "Hello",
					commentsCount: 0,
					isFocused: false,
				}}
				onClose={onClose}
			/>
		</AppContext.Provider>,
	);

	expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
	expect(
		screen.getByRole("button", { name: "More actions" }),
	).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: "More actions" }));

	expect(
		await screen.findByRole("menuitem", { name: "Leave" }),
	).toBeInTheDocument();

	await user.click(screen.getByRole("button", { name: "Close" }));

	expect(onClose).toHaveBeenCalledTimes(1);
});

test("leaves the current chat, clears channel state, refreshes, and closes", async () => {
	const user = userEvent.setup();
	const onClose = vi.fn();
	const onManualRefresh = vi.fn().mockResolvedValue(undefined);
	const onClearChannelState = vi.fn();
	const ensureTelegramConnected = vi.fn().mockResolvedValue({});

	vi.stubGlobal(
		"confirm",
		vi.fn(() => true),
	);
	leaveFeedChannelMock.mockResolvedValue(undefined);

	render(
		<AppContext.Provider
			value={{
				dal: createDalStub(),
				onManualRefresh,
				onSendMessage: vi.fn().mockResolvedValue(undefined),
				ensureTelegramConnected,
				avatarVisibility: { feed: true, thread: true, notifications: true },
				onSetAvatarVisibility: vi.fn(),
				onToggleChannelNotification: vi.fn(),
				onToggleChannelFilter: vi.fn(),
				onClearChannelState,
				onRequestNotificationPermission: vi.fn(),
				onDisableNotifications: vi.fn(),
				onEnableAllFeedFilters: vi.fn(),
			}}
		>
			<Chat
				item={{
					id: "group-4-1",
					type: "group",
					channelKey: "group:4",
					chatName: "Group",
					senderName: "Group",
					timestamp: "now",
					date: 0,
					text: "Hello",
					commentsCount: 0,
					isFocused: false,
					sourceMessage: {
						inputChat: { className: "InputPeerChannel", channelId: 4 },
					},
				}}
				onClose={onClose}
			/>
		</AppContext.Provider>,
	);

	await user.click(screen.getByRole("button", { name: "More actions" }));
	await user.click(screen.getByRole("menuitem", { name: "Leave" }));

	await waitFor(() => {
		expect(leaveFeedChannelMock).toHaveBeenCalledWith(
			expect.objectContaining({ channelKey: "group:4" }),
			ensureTelegramConnected,
		);
	});
	expect(onClearChannelState).toHaveBeenCalledWith("group:4");
	expect(onManualRefresh).toHaveBeenCalledTimes(1);
	expect(onClose).toHaveBeenCalledTimes(1);
});
