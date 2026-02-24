import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadMediaForItem,
  downloadThumbnailForItem,
  getCachedMediaUrl,
} from "../../../domains/feed/infra/telegramFeed";
import type { FeedItem } from "../../../types";
import { Controls } from "./Controls";
import styles from "./Media.module.css";

type Props = {
  item: FeedItem;
};

export function Media({ item }: Props) {
  const media = item.media;

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(item.media?.url);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const ratio = useMemo(() => {
    if (!media) return "16 / 9";

    const { width, height } = media.meta;
    if (!width || !height) {
      return "16 / 9";
    }
    return `${width} / ${height}`;
  }, [media]);

  const shouldOfferFullDownload = useMemo(() => {
    if (!media) return false;

    return media.meta.type === "video" || media.meta.sizeBytes >= 524288;
  }, [media]);

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "";
    }
    const kb = 1024;
    const mb = kb * 1024;
    const gb = mb * 1024;
    if (bytes >= gb) {
      return `${(bytes / gb).toFixed(1)} GB`;
    }
    if (bytes >= mb) {
      return `${(bytes / mb).toFixed(1)} MB`;
    }
    if (bytes >= kb) {
      return `${Math.round(bytes / kb)} KB`;
    }
    return `${bytes} B`;
  }

  function getDownloadLabel() {
    if (isDownloading) {
      return "Downloading...";
    }
    if (media && media.meta.sizeBytes > 0) {
      return `Download (${formatBytes(media.meta.sizeBytes)})`;
    }
    return "Download media";
  }

  function getProgressLabel() {
    if (downloadProgress === null) {
      return "Downloading...";
    }
    return `${Math.round(downloadProgress * 100)}%`;
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remaining = totalSeconds % 60;
    const padded = remaining < 10 ? `0${remaining}` : `${remaining}`;
    return `${minutes}:${padded}`;
  }

  function getTimeLeftLabel() {
    if (!duration) {
      return "0:00";
    }
    const remaining = Math.max(0, duration - currentTime);
    return `-${formatTime(remaining)}`;
  }

  function getPlayLabel() {
    if (isPlaying) {
      return "Pause";
    }
    return "Play";
  }

  function getMuteLabel() {
    if (isMuted) {
      return "Unmute";
    }
    return "Mute";
  }

  function handleTogglePlay() {
    const player = videoRef.current;
    if (!player) {
      return;
    }
    if (player.paused) {
      player.play().catch(() => {});
      return;
    }
    player.pause();
  }

  function handleToggleMute() {
    const player = videoRef.current;
    if (!player) {
      return;
    }
    const nextMuted = !player.muted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  function handleScrub(value: number) {
    const player = videoRef.current;
    if (!player) {
      return;
    }
    player.currentTime = value;
    setCurrentTime(value);
  }

  async function handleDownload() {
    if (!item.media) {
      return;
    }
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError("");
    try {
      let nextUrl: string | undefined;
      if (item.media.meta.type === "video") {
        nextUrl = await downloadMediaForItem(item, (downloaded, total) => {
          console.log("downloaded", downloaded, "total", total);
          if (Number(total) > 0) setDownloadProgress(Number(downloaded) / Number(total));
        });
      } else {
        nextUrl = await downloadMediaForItem(item);
      }
      const url = nextUrl;
      if (!url) {
        setDownloadError("Download failed");
        return;
      }
      if (item.media.meta.type === "video") {
        setVideoUrl(url);
        return;
      }
      setPreviewUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      console.error("[FeedCardMedia] download failed", error);
      setDownloadError(message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  useEffect(() => {
    if (!media || media.url || previewUrl || previewFailed) return;

    let active = true;
    downloadThumbnailForItem(item, 480)
      .then((url) => {
        if (active && url) {
          setPreviewUrl(url);
        }
      })
      .catch((error) => {
        console.error("Failed to load media preview", error);
      });

    return () => {
      active = false;
    };
  }, [media, previewUrl, previewFailed, item]);

  useEffect(() => {
    if (!media || media.meta.type !== "video") {
      return;
    }
    if (videoUrl) {
      return;
    }
    let active = true;
    getCachedMediaUrl(item)
      .then((url) => {
        if (active && url) {
          setVideoUrl(url);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item, media, videoUrl]);

  if (!media) return null;

  function renderMedia() {
    if (!previewUrl || !media) return null;

    if (media.meta.type === "image")
      return (
        <img
          id={`media_${media.meta.type}_${item.id}`}
          src={previewUrl}
          alt={media.alt}
          loading="lazy"
          className={styles.image}
          onError={() => {
            setPreviewUrl(undefined);
            setPreviewFailed(true);
          }}
        />
      );

    if (media.meta.type === "video") {
      return (
        <div className={styles["container-video"]}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={previewUrl}
            autoPlay={false}
            muted={isMuted}
            playsInline
            className={styles.video}
            onClick={(event) => event.stopPropagation()}
            onLoadedMetadata={(event) => {
              const target = event.currentTarget;
              setDuration(target.duration || 0);
            }}
            onTimeUpdate={(event) => {
              const target = event.currentTarget;
              setCurrentTime(target.currentTime || 0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          <Controls
            handleTogglePlay={handleTogglePlay}
            handleToggleMute={handleToggleMute}
            handleScrub={handleScrub}
            getPlayLabel={getPlayLabel}
            getMuteLabel={getMuteLabel}
            getTimeLeftLabel={getTimeLeftLabel}
            isPlaying={isPlaying}
            isMuted={isMuted}
            duration={duration}
            currentTime={currentTime}
            videoUrl={videoUrl}
          />
          {/* <div
            className={styles['container-controls']}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles['control-button']}
              onClick={handleTogglePlay}
              disabled={!videoUrl}
              aria-label={getPlayLabel()}
            >
              <img
                src={isPlaying ? '/icons/pause.svg' : '/icons/play.svg'}
                alt=""
                aria-hidden="true"
                className={styles['control-icon']}
              />
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(event) => handleScrub(Number(event.target.value))}
              className={styles['control-scrubber']}
              disabled={!videoUrl || duration <= 0}
            />
            <span className={styles['control-time']}>{getTimeLeftLabel()}</span>
            <button
              type="button"
              className={styles['control-button']}
              onClick={handleToggleMute}
              disabled={!videoUrl}
              aria-label={getMuteLabel()}
            >
              <img
                src={isMuted ? '/icons/volume-x.svg' : '/icons/volume.svg'}
                alt=""
                aria-hidden="true"
                className={styles['control-icon']}
              />
            </button>
          </div> */}
        </div>
      );
    }

    return (
      <div className={styles.placeholder}>
        <span>Media preview</span>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      data-media-type={media.meta.type}
      style={{ aspectRatio: ratio }}
    >
      {renderMedia()}
      {isDownloading && media.meta.type === "video" && (
        <div className={styles.progress}>
          <div className={styles["progress-label"]}>{getProgressLabel()}</div>
        </div>
      )}
      {(shouldOfferFullDownload || downloadError) && !videoUrl && (
        <button
          type="button"
          className={styles["download-button"]}
          onClick={(event) => {
            event.stopPropagation();
            handleDownload();
          }}
          disabled={isDownloading}
        >
          {getDownloadLabel()}
        </button>
      )}
      {downloadError && <span className={styles["download-error"]}>{downloadError}</span>}
    </div>
  );
}
