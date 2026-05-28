import {
	Button,
	Checkbox,
	Flex,
	Progress,
	Radio,
	Typography,
	theme,
} from "antd";
import { useContext, useState } from "react";
import type { FeedItem, PollOption } from "../../../../types";
import { AppContext } from "../../../app/AppContext";

type PollProps = {
	item: FeedItem;
};

export function Poll({ item }: PollProps) {
	const { poll } = item;
	const { token } = theme.useToken();
	const { onVotePoll } = useContext(AppContext);
	const [selectedOptions, setSelectedOptions] = useState<Uint8Array[]>([]);
	const [isVoting, setIsVoting] = useState(false);

	if (!poll) return null;

	const hasVoted = poll.options.some((o) => o.chosen);
	const showResults = hasVoted || poll.closed;

	async function handleVote() {
		if (selectedOptions.length === 0 || isVoting) return;
		setIsVoting(true);
		try {
			await onVotePoll(item, selectedOptions);
		} finally {
			setIsVoting(false);
		}
	}

	function toggleOption(option: Uint8Array) {
		if (poll?.multipleChoice) {
			setSelectedOptions((prev) =>
				prev.some((o) => o.toString() === option.toString())
					? prev.filter((o) => o.toString() !== option.toString())
					: [...prev, option],
			);
		} else {
			setSelectedOptions([option]);
		}
	}

	return (
		<div
			style={{
				marginTop: 12,
				padding: 12,
				borderRadius: token.borderRadius,
				background: token.colorBgLayout,
				border: `1px solid ${token.colorBorder}`,
			}}
		>
			<Typography.Title
				level={5}
				style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}
			>
				{poll.question}
			</Typography.Title>

			<Flex vertical gap={12}>
				{poll.options.map((option: PollOption) => {
					const isSelected = selectedOptions.some(
						(o) => o.toString() === option.option.toString(),
					);
					const percentage =
						poll.totalVoters > 0
							? Math.round((option.votersCount / poll.totalVoters) * 100)
							: 0;

					return (
						<div key={option.option.toString()}>
							{showResults ? (
								<div style={{ position: "relative" }}>
									<Flex
										justify="space-between"
										align="center"
										style={{ marginBottom: 4 }}
									>
										<Typography.Text
											strong={option.chosen}
											style={{ fontSize: 13 }}
										>
											{option.text}
											{option.chosen && " (Your vote)"}
											{option.correct && " ✅"}
										</Typography.Text>
										<Typography.Text type="secondary" style={{ fontSize: 12 }}>
											{percentage}% ({option.votersCount})
										</Typography.Text>
									</Flex>
									<Progress
										percent={percentage}
										showInfo={false}
										strokeColor={
											option.chosen
												? token.colorPrimary
												: token.colorFillSecondary
										}
										size="small"
									/>
								</div>
							) : (
								<div
									role="button"
									tabIndex={0}
									aria-label={option.text}
									aria-pressed={isSelected}
									onClick={() => toggleOption(option.option)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											toggleOption(option.option);
										}
									}}
									style={{
										padding: "8px 12px",
										borderRadius: token.borderRadiusSM,
										border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
										background: isSelected
											? token.colorPrimaryBg
											: token.colorBgContainer,
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										gap: 12,
									}}
								>
									{poll.multipleChoice ? (
										<Checkbox checked={isSelected} />
									) : (
										<Radio checked={isSelected} />
									)}
									<Typography.Text style={{ fontSize: 13 }}>
										{option.text}
									</Typography.Text>
								</div>
							)}
						</div>
					);
				})}
			</Flex>

			{!showResults && (
				<Button
					type="primary"
					block
					style={{ marginTop: 16 }}
					onClick={handleVote}
					loading={isVoting}
					disabled={selectedOptions.length === 0}
				>
					Vote
				</Button>
			)}

			<Typography.Text
				type="secondary"
				style={{ display: "block", marginTop: 12, fontSize: 11 }}
			>
				{poll.totalVoters} {poll.totalVoters === 1 ? "vote" : "votes"}
				{poll.closed && " • Closed"}
				{poll.quiz && " • Quiz"}
				{!poll.publicVoters && " • Anonymous"}
			</Typography.Text>
		</div>
	);
}
