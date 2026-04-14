import { theme } from "antd";

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

const iconStyle: React.CSSProperties = { width: 16, height: 16, display: "block" };

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
      <button type="button" style={btnStyle} onClick={handleTogglePlay} disabled={!videoUrl} aria-label={getPlayLabel()}>
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={iconStyle}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={iconStyle}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
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
      <span style={{ color: "#fff", fontSize: 11, whiteSpace: "nowrap" }}>{getTimeLeftLabel()}</span>
      <button type="button" style={btnStyle} onClick={handleToggleMute} disabled={!videoUrl} aria-label={getMuteLabel()}>
        {!isMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={iconStyle}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={iconStyle}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
