import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppContext } from "../../../app/AppContext";
import { Poll } from "./Poll";
import type { FeedItem } from "../../../../types";

function makeOption(
	text: string,
	votersCount = 0,
	chosen = false,
	correct = false,
): import("../../../../types").PollOption {
	return {
		option: new Uint8Array([text.charCodeAt(0)]),
		text,
		votersCount,
		chosen,
		correct,
	};
}

function makePollItem(overrides: Partial<FeedItem["poll"]> = {}): FeedItem {
	return {
		id: "dm-1-1",
		channelKey: "dm:1",
		type: "dm",
		chatName: "Test",
		senderName: "Test",
		date: 0,
		text: "",
		poll: {
			question: "Best language?",
			options: [makeOption("TypeScript"), makeOption("Python")],
			totalVoters: 0,
			closed: false,
			multipleChoice: false,
			quiz: false,
			publicVoters: false,
			...overrides,
		},
	} as unknown as FeedItem;
}

const onVotePoll = vi.fn().mockResolvedValue(undefined);

function renderPoll(item: FeedItem) {
	return render(
		<AppContext.Provider
			value={
				{
					onVotePoll,
				} as never
			}
		>
			<Poll item={item} />
		</AppContext.Provider>,
	);
}

afterEach(() => {
	vi.clearAllMocks();
});

test("renders poll question and options", () => {
	renderPoll(makePollItem());
	expect(screen.getByText("Best language?")).toBeInTheDocument();
	expect(screen.getByText("TypeScript")).toBeInTheDocument();
	expect(screen.getByText("Python")).toBeInTheDocument();
});

test("renders nothing when poll is absent", () => {
	const item = makePollItem();
	(item as Record<string, unknown>).poll = undefined;
	const { container } = renderPoll(item);
	expect(container).toBeEmptyDOMElement();
});

test("shows vote counts and percentages when poll has been voted on", () => {
	const item = makePollItem({
		options: [
			makeOption("TypeScript", 3, true),
			makeOption("Python", 1, false),
		],
		totalVoters: 4,
	});
	renderPoll(item);
	expect(screen.getByText(/75%/)).toBeInTheDocument();
	expect(screen.getByText(/25%/)).toBeInTheDocument();
	expect(screen.getByText(/Your vote/)).toBeInTheDocument();
});

test("shows results when poll is closed", () => {
	const item = makePollItem({ closed: true });
	renderPoll(item);
	expect(screen.getByText(/Closed/)).toBeInTheDocument();
	// Vote button should not be visible
	expect(
		screen.queryByRole("button", { name: /Vote/i }),
	).not.toBeInTheDocument();
});

test("single-choice: selecting an option enables the Vote button", async () => {
	const user = userEvent.setup();
	renderPoll(makePollItem());

	const tsOption = screen.getByText("TypeScript").closest("div")!;
	await user.click(tsOption);

	const voteBtn = screen.getByRole("button", { name: /Vote/i });
	expect(voteBtn).not.toBeDisabled();
});

test("single-choice: clicking Vote calls onVotePoll", async () => {
	const user = userEvent.setup();
	const item = makePollItem();
	renderPoll(item);

	const tsOption = screen.getByText("TypeScript").closest("div")!;
	await user.click(tsOption);
	await user.click(screen.getByRole("button", { name: /Vote/i }));

	await waitFor(() => {
		expect(onVotePoll).toHaveBeenCalledWith(
			item,
			expect.arrayContaining([expect.any(Uint8Array)]),
		);
	});
});

test("multiple-choice: selecting two options and voting passes both", async () => {
	const user = userEvent.setup();
	const item = makePollItem({ multipleChoice: true });
	renderPoll(item);

	await user.click(screen.getByText("TypeScript").closest("div")!);
	await user.click(screen.getByText("Python").closest("div")!);

	await user.click(screen.getByRole("button", { name: /Vote/i }));

	await waitFor(() => {
		const [, options] = onVotePoll.mock.calls[0] as [unknown, Uint8Array[]];
		expect(options).toHaveLength(2);
	});
});

test("multiple-choice: deselecting an option removes it", async () => {
	const user = userEvent.setup();
	renderPoll(makePollItem({ multipleChoice: true }));

	const tsOption = screen.getByText("TypeScript").closest("div")!;
	await user.click(tsOption);
	await user.click(tsOption); // deselect

	const voteBtn = screen.getByRole("button", { name: /Vote/i });
	expect(voteBtn).toBeDisabled();
});

test("shows quiz badge in footer", () => {
	renderPoll(makePollItem({ quiz: true }));
	expect(screen.getByText(/Quiz/)).toBeInTheDocument();
});

test("shows anonymous badge in footer when not public", () => {
	renderPoll(makePollItem({ publicVoters: false }));
	expect(screen.getByText(/Anonymous/)).toBeInTheDocument();
});

test("shows correct answer checkmark", () => {
	const item = makePollItem({
		options: [makeOption("TypeScript", 1, true, true)],
		totalVoters: 1,
	});
	renderPoll(item);
	expect(screen.getByText(/✅/)).toBeInTheDocument();
});

test("vote button is disabled when nothing is selected", () => {
	renderPoll(makePollItem());
	expect(screen.getByRole("button", { name: /Vote/i })).toBeDisabled();
});

test("poll option is keyboard-accessible as a button", () => {
	renderPoll(makePollItem());
	expect(
		screen.getByRole("button", { name: "TypeScript" }),
	).toBeInTheDocument();
	expect(screen.getByRole("button", { name: "Python" })).toBeInTheDocument();
});

test("poll option can be activated by pressing Enter", async () => {
	const user = userEvent.setup();
	renderPoll(makePollItem());

	const tsOption = screen.getByRole("button", { name: "TypeScript" });
	tsOption.focus();
	await user.keyboard("{Enter}");

	expect(screen.getByRole("button", { name: /Vote/i })).not.toBeDisabled();
});

test("poll option can be activated by pressing Space", async () => {
	const user = userEvent.setup();
	renderPoll(makePollItem());

	const tsOption = screen.getByRole("button", { name: "TypeScript" });
	tsOption.focus();
	await user.keyboard(" ");

	expect(screen.getByRole("button", { name: /Vote/i })).not.toBeDisabled();
});

test("poll option receives keyboard focus via Tab", async () => {
	const user = userEvent.setup();
	renderPoll(makePollItem());

	await user.tab();
	expect(screen.getByRole("button", { name: "TypeScript" })).toHaveFocus();
});

test("does not call onVotePoll when isVoting is true", async () => {
	let resolveVote!: () => void;
	onVotePoll.mockReturnValue(
		new Promise<void>((r) => {
			resolveVote = r;
		}),
	);
	const user = userEvent.setup();
	renderPoll(makePollItem());

	await user.click(screen.getByText("TypeScript").closest("div")!);
	await user.click(screen.getByRole("button", { name: /Vote/i }));
	// Second click while in-flight should be no-op (button shows loading)
	await user.click(screen.getByRole("button", { name: /Vote/i }));

	expect(onVotePoll).toHaveBeenCalledTimes(1);
	await act(async () => {
		resolveVote();
	});
});
