import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Controls } from "./Controls";

const defaultProps = {
	handleTogglePlay: vi.fn(),
	handleToggleMute: vi.fn(),
	handleScrub: vi.fn(),
	getPlayLabel: () => "Play",
	getMuteLabel: () => "Mute",
	getTimeLeftLabel: () => "-1:00",
	isPlaying: false,
	isMuted: true,
	duration: 60,
	currentTime: 0,
	videoUrl: "blob:test",
	disabled: false,
};

describe("Controls accessibility", () => {
	it("video scrubber has an accessible label", () => {
		render(<Controls {...defaultProps} />);
		expect(screen.getByRole("slider", { name: /scrub/i })).toBeInTheDocument();
	});

	it("play button has accessible label from prop", () => {
		render(<Controls {...defaultProps} />);
		expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
	});

	it("mute button has accessible label from prop", () => {
		render(<Controls {...defaultProps} />);
		expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
	});

	it("returns null when disabled", () => {
		const { container } = render(
			<Controls {...defaultProps} disabled={true} />,
		);
		expect(container).toBeEmptyDOMElement();
	});
});
