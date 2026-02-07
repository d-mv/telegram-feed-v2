import styles from './Media.module.css'

type Props = {
  handleTogglePlay: () => void
  handleToggleMute: () => void
  handleScrub: (value: number) => void
  getPlayLabel: () => string
  getMuteLabel: () => string
  getTimeLeftLabel: () => string
  isPlaying: boolean
  isMuted: boolean
  duration: number
  currentTime: number
  videoUrl: string | undefined
}

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
}: Props) {
  return (
    <div
      className={styles.container}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={styles.button}
        onClick={handleTogglePlay}
        disabled={!videoUrl}
        aria-label={getPlayLabel()}
      >
        <img
          src={isPlaying ? '/icons/pause.svg' : '/icons/play.svg'}
          alt=""
          aria-hidden="true"
          className={styles.icon}
        />
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(event) => handleScrub(Number(event.target.value))}
        className={styles.scrubber}
        disabled={!videoUrl || duration <= 0}
      />
      <span className={styles.time}>{getTimeLeftLabel()}</span>
      <button
        type="button"
        className={styles.button}
        onClick={handleToggleMute}
        disabled={!videoUrl}
        aria-label={getMuteLabel()}
      >
        <img
          src={isMuted ? '/icons/volume-x.svg' : '/icons/volume.svg'}
          alt=""
          aria-hidden="true"
          className={styles.icon}
        />
      </button>
    </div>
  )
}
