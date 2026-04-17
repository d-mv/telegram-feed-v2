import { theme, Typography } from "antd";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../../domains/app/AppContext";
import {
  downloadMediaForItem,
  downloadThumbnailForItem,
  getCachedMediaUrl,
} from "../../../domains/feed/infra/telegramFeed";
import type { FeedItem } from "../../../types";
import { Controls } from "./Controls";
import { runtimeLogger } from "../../infra/runtimeLogger";

type Props = {
  item: FeedItem;
  onVideoPlay?: () => void;
  grayscale?: boolean;
  aspectRatioOverride?: string;
};

function DocumentTextIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      style={{ width: 32, height: 32 }}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12h6m-6 3h6m2.25 2.25H6.375a1.125 1.125 0 0 1-1.125-1.125V5.25A2.25 2.25 0 0 1 7.5 3h5.379a2.25 2.25 0 0 1 1.591.659l4.371 4.371a2.25 2.25 0 0 1 .659 1.591v8.754a1.125 1.125 0 0 1-1.125 1.125Z"
      />
    </svg>
  );
}

export function Media({ item, onVideoPlay, grayscale = true, aspectRatioOverride }: Props) {
  const { token } = theme.useToken();
  const { ensureTelegramConnected } = useContext(AppContext);
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
    if (aspectRatioOverride) {
      return aspectRatioOverride;
    }
    if (!media) return "16 / 9";

    const { width, height } = media.meta;
    if (!width || !height) {
      return "16 / 9";
    }
    return `${width} / ${height}`;
  }, [aspectRatioOverride, media]);

  const shouldOfferFullDownload = useMemo(() => {
    if (!media) return false;
    return media.meta.type === "video" || media.meta.sizeBytes >= 524288;
  }, [media]);

  const shouldRenderAsDocument = useMemo(() => {
    if (!media) return false;
    return media.meta.type !== "image" && media.meta.type !== "video";
  }, [media]);

  function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const kb = 1024;
    const mb = kb * 1024;
    const gb = mb * 1024;
    if (bytes >= gb) return `${(bytes / gb).toFixed(1)} GB`;
    if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
    if (bytes >= kb) return `${Math.round(bytes / kb)} KB`;
    return `${bytes} B`;
  }

  function getDownloadLabel() {
    if (isDownloading) return "Downloading...";
    if (media && media.meta.sizeBytes > 0) return `Download (${formatBytes(media.meta.sizeBytes)})`;
    return "Download media";
  }

  function getProgressLabel() {
    if (downloadProgress === null) return "Downloading...";
    return `${Math.round(downloadProgress * 100)}%`;
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remaining = totalSeconds % 60;
    const padded = remaining < 10 ? `0${remaining}` : `${remaining}`;
    return `${minutes}:${padded}`;
  }

  function getTimeLeftLabel() {
    if (!duration) return "0:00";
    const remaining = Math.max(0, duration - currentTime);
    return `-${formatTime(remaining)}`;
  }

  function getPlayLabel() { return isPlaying ? "Pause" : "Play"; }
  function getMuteLabel() { return isMuted ? "Unmute" : "Mute"; }

  function handleTogglePlay() {
    const player = videoRef.current;
    if (!player) return;
    if (player.paused) { player.play().catch(() => {}); return; }
    player.pause();
  }

  function handleToggleMute() {
    const player = videoRef.current;
    if (!player) return;
    const nextMuted = !player.muted;
    player.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  function handleScrub(value: number) {
    const player = videoRef.current;
    if (!player) return;
    player.currentTime = value;
    setCurrentTime(value);
  }

  async function handleDownload() {
    if (!item.media) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError("");
    try {
      let nextUrl: string | undefined;
      if (item.media.meta.type === "video") {
        nextUrl = await downloadMediaForItem(item, ensureTelegramConnected, (downloaded, total) => {
          if (Number(total) > 0) setDownloadProgress(Number(downloaded) / Number(total));
        });
      } else {
        nextUrl = await downloadMediaForItem(item, ensureTelegramConnected);
      }
      const url = nextUrl;
      if (!url) { setDownloadError("Download failed"); return; }
      if (item.media.meta.type === "video") { setVideoUrl(url); return; }
      setPreviewUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      runtimeLogger.error("[FeedCardMedia] download failed", error);
      setDownloadError(message || "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  useEffect(() => {
    if (!media || media.url || previewUrl || previewFailed) return;
    let active = true;
    downloadThumbnailForItem(item, 480, ensureTelegramConnected)
      .then((url) => { if (active && url) setPreviewUrl(url); })
      .catch((error) => { runtimeLogger.error("Failed to load media preview", error); });
    return () => { active = false; };
  }, [ensureTelegramConnected, item, media, previewUrl, previewFailed]);

  useEffect(() => {
    if (!media || media.meta.type !== "video") return;
    if (videoUrl) return;
    let active = true;
    getCachedMediaUrl(item)
      .then((url) => { if (active && url) setVideoUrl(url); })
      .catch(() => {});
    return () => { active = false; };
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={() => {
            setPreviewUrl(undefined);
            setPreviewFailed(true);
          }}
        />
      );

    if (media.meta.type === "video" && !shouldRenderAsDocument) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <video
            ref={videoRef}
            src={videoUrl}
            poster={previewUrl}
            autoPlay={false}
            muted={isMuted}
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            aria-label="Video media"
            onClick={(event) => event.stopPropagation()}
            onLoadedMetadata={(event) => {
              const target = event.currentTarget;
              setDuration(target.duration || 0);
            }}
            onTimeUpdate={(event) => {
              const target = event.currentTarget;
              setCurrentTime(target.currentTime || 0);
            }}
            onPlay={() => { setIsPlaying(true); onVideoPlay?.(); }}
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
            disabled={Boolean((shouldOfferFullDownload || downloadError) && !videoUrl)}
          />
        </div>
      );
    }

    if (media.meta.type === "youtube") {
      const videoUrl = `https://www.youtube.com/watch?v=${item.media?.key?.split("-")[1]}`;
      return (
        <div
          style={{ position: "relative", width: "100%", height: "100%", cursor: "pointer" }}
          onClick={(event) => {
            event.stopPropagation();
            window.open(videoUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <img
            src={previewUrl}
            alt={media.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              padding: 12,
            }}
          >
            <Typography.Text style={{ color: "#fff", fontWeight: 600 }}>{media.meta.title}</Typography.Text>
            <Typography.Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>YouTube</Typography.Text>
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 64,
              height: 64,
              background: "rgba(255,0,0,0.9)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "20px solid white", marginLeft: 4 }} />
          </div>
        </div>
      );
    }

    return null;
  }

  function renderAttachment() {
    if (!media || !shouldRenderAsDocument) return null;
    const fileLabel = media.meta.fileName || media.meta.mimeType || "Attachment";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: token.colorBgContainer, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius }}>
        <span style={{ color: token.colorTextSecondary }}>
          <DocumentTextIcon />
        </span>
        <div style={{ minWidth: 0 }}>
          <Typography.Text strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileLabel}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatBytes(media.meta.sizeBytes)}
          </Typography.Text>
        </div>
      </div>
    );
  }

  return (
    <div
      data-media-type={media.meta.type}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        overflow: "hidden",
        borderRadius: token.borderRadius,
        background: token.colorBgLayout,
        filter: grayscale ? "grayscale(100%)" : undefined,
      }}
    >
      {renderMedia()}
      {renderAttachment()}
      {isDownloading && media.meta.type === "video" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
          <Typography.Text style={{ color: "#fff" }}>{getProgressLabel()}</Typography.Text>
        </div>
      )}
      {(shouldOfferFullDownload || downloadError) && !videoUrl && (
        <button
          type="button"
          aria-label={getDownloadLabel()}
          onClick={(event) => {
            event.stopPropagation();
            handleDownload();
          }}
          disabled={isDownloading}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: "rgba(0,0,0,0.6)",
            border: "none",
            borderRadius: token.borderRadius,
            color: "#fff",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {isDownloading ? "⏳" : "⬇"}
        </button>
      )}
      {downloadError && (
        <Typography.Text type="danger" style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11 }}>
          {downloadError}
        </Typography.Text>
      )}
    </div>
  );
}
