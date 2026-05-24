import { theme } from "antd";
import {
	CaretRightOutlined,
	PauseOutlined,
	SoundOutlined,
	AudioMutedOutlined,
} from "@ant-design/icons";

type Props = {
	handleTogglePlay: () => void;
	handleToggleMute: () => void;
	handleScrub: (value: number) => void;
	getPlayLabel: () => string;
	getMuteLabel: () => string;
	getTimeLeftLabel: () => string;
	isPlaying: boolean;
	isMuted: boolean;
	duration: number;
	currentTime: number;
	videoUrl: string | undefined;
	disabled: boolean;
};

const iconStyle: React.CSSProperties = { fontSize: 16 };

export function Controls({
	handleTogglePlay,
	handleToggleMute,
	handleScrub,
	getPlayLabel,
	getMuteLabel,
	getTimeLeftLabel,
	isPlaying,
	isMuted,
	duration,
	currentTime,
	videoUrl,
	disabled,
}: Props) {
	const { token } = theme.useToken();

	if (disabled) return null;

	const btnStyle: React.CSSProperties = {
		background: "rgba(0,0,0,0.5)",
		border: "none",
		borderRadius: token.borderRadius,
		color: "#fff",
		cursor: "pointer",
		padding: "4px 6px",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	};

	return (
		<div
			onClick={(event) => event.stopPropagation()}
			style={{
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				display: "flex",
				alignItems: "center",
				gap: 6,
				padding: "6px 8px",
				background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
			}}
		>
			<button
				type="button"
				style={btnStyle}
				onClick={handleTogglePlay}
				disabled={!videoUrl}
				aria-label={getPlayLabel()}
			>
				{isPlaying ? (
					<PauseOutlined aria-hidden style={iconStyle} />
				) : (
					<CaretRightOutlined aria-hidden style={iconStyle} />
				)}
			</button>

			<input
				type="range"
				min={0}
				max={duration || 0}
				step={0.1}
				value={currentTime}
				onChange={(event) => handleScrub(Number(event.target.value))}
				style={{ flex: 1, accentColor: token.colorPrimary }}
				disabled={!videoUrl || duration <= 0}
			/>
			<span style={{ color: "#fff", fontSize: 11, whiteSpace: "nowrap" }}>
				{getTimeLeftLabel()}
			</span>
			<button
				type="button"
				style={btnStyle}
				onClick={handleToggleMute}
				disabled={!videoUrl}
				aria-label={getMuteLabel()}
			>
				{!isMuted ? (
					<SoundOutlined aria-hidden style={iconStyle} />
				) : (
					<AudioMutedOutlined aria-hidden style={iconStyle} />
				)}
			</button>
		</div>
	);
}
