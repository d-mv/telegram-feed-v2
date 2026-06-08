import { theme, Typography } from "antd";
import {
	DownloadOutlined,
	FileTextOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
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

export function Media({
	item,
	onVideoPlay,
	grayscale = true,
	aspectRatioOverride,
}: Props) {
	const { token } = theme.useToken();
	const { ensureTelegramConnected, dal } = useContext(AppContext);
	const media = item.media;

	const [previewUrl, setPreviewUrl] = useState<string | undefined>(
		item.media?.url,
	);
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
		return (
			media.meta.type === "video" ||
			media.meta.type === "file" ||
			media.meta.type === "audio" ||
			media.meta.sizeBytes >= 524288
		);
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
		if (media && media.meta.sizeBytes > 0)
			return `Download (${formatBytes(media.meta.sizeBytes)})`;
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

	function getPlayLabel() {
		return isPlaying ? "Pause" : "Play";
	}
	function getMuteLabel() {
		return isMuted ? "Unmute" : "Mute";
	}

	function handleTogglePlay() {
		const player = videoRef.current;
		if (!player) return;
		if (player.paused) {
			player.play().catch(() => {});
			return;
		}
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
		console.log("Download initiated for media", media);
		if (!item.media) return;
		setIsDownloading(true);
		setDownloadProgress(0);
		setDownloadError("");
		try {
			let nextUrl: string | undefined;
			if (item.media.meta.type === "video") {
				nextUrl = await downloadMediaForItem(
					item,
					ensureTelegramConnected,
					dal,
					(downloaded, total) => {
						if (Number(total) > 0)
							setDownloadProgress(Number(downloaded) / Number(total));
					},
				);
			} else {
				nextUrl = await downloadMediaForItem(
					item,
					ensureTelegramConnected,
					dal,
				);
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
			if (item.media.meta.type === "file" || item.media.meta.type === "audio") {
				const a = document.createElement("a");
				a.href = url;
				a.download = item.media.meta.fileName || "download";
				a.click();
				return;
			}
			setPreviewUrl(url);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Download failed";
			runtimeLogger.error("[FeedCardMedia] download failed", error);
			setDownloadError(message || "Download failed");
		} finally {
			setIsDownloading(false);
		}
	}

	const previewBlobRef = useRef<string | undefined>(undefined);
	const videoBlobRef = useRef<string | undefined>(undefined);

	// Revoke blob URLs only when the item changes or the component unmounts,
	// not on every state update — revoking on state change causes ERR_FILE_NOT_FOUND
	// because the blob is still being displayed when the cleanup runs.
	useEffect(() => {
		return () => {
			if (previewBlobRef.current?.startsWith("blob:")) {
				URL.revokeObjectURL(previewBlobRef.current);
				previewBlobRef.current = undefined;
			}
			if (videoBlobRef.current?.startsWith("blob:")) {
				URL.revokeObjectURL(videoBlobRef.current);
				videoBlobRef.current = undefined;
			}
		};
	}, [item]);

	useEffect(() => {
		if (!media || media.url || previewUrl || previewFailed) return;
		let active = true;
		downloadThumbnailForItem(item, 480, ensureTelegramConnected, dal)
			.then((url) => {
				if (active && url) {
					previewBlobRef.current = url;
					setPreviewUrl(url);
				}
			})
			.catch((error) => {
				runtimeLogger.error("Failed to load media preview", error);
			});
		return () => {
			active = false;
		};
	}, [ensureTelegramConnected, item, media, previewUrl, previewFailed, dal]);

	useEffect(() => {
		if (!media || media.meta.type !== "video") return;
		if (videoUrl) return;
		let active = true;
		getCachedMediaUrl(item, dal)
			.then((url) => {
				if (active && url) {
					videoBlobRef.current = url;
					setVideoUrl(url);
				}
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, [item, media, videoUrl, dal]);

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
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
							display: "block",
						}}
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
						onPlay={() => {
							setIsPlaying(true);
							onVideoPlay?.();
						}}
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
						disabled={Boolean(
							(shouldOfferFullDownload || downloadError) && !videoUrl,
						)}
					/>
				</div>
			);
		}

		if (media.meta.type === "youtube") {
			const rawId = item.media?.key?.split("-")[1] ?? "";
			const youtubeId = /^[a-zA-Z0-9_-]{11}$/.test(rawId) ? rawId : null;
			if (!youtubeId) return null;
			const embedUrl = `https://www.youtube.com/embed/${youtubeId}?rel=0`;
			return (
				<div style={{ position: "relative", width: "100%", height: "100%" }}>
					<iframe
						src={embedUrl}
						title={media.meta.title || "YouTube video player"}
						frameBorder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
						style={{
							width: "100%",
							height: "100%",
							display: "block",
						}}
						onClick={(event) => event.stopPropagation()}
					/>
				</div>
			);
		}

		return null;
	}

	function renderAttachment() {
		if (!media || !shouldRenderAsDocument) return null;
		const fileLabel =
			media.meta.fileName || media.meta.mimeType || "Attachment";
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					padding: "10px 12px",
					background: token.colorBgContainer,
					border: `1px solid ${token.colorBorder}`,
					borderRadius: token.borderRadius,
				}}
			>
				<span style={{ color: token.colorTextSecondary }}>
					<FileTextOutlined aria-hidden style={{ fontSize: 32 }} />
				</span>
				<div style={{ minWidth: 0, flex: 1 }}>
					<Typography.Text
						strong
						style={{
							display: "block",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{fileLabel}
					</Typography.Text>
					<Typography.Text type="secondary" style={{ fontSize: 12 }}>
						{formatBytes(media.meta.sizeBytes)}
					</Typography.Text>
				</div>
				<button
					type="button"
					aria-label={getDownloadLabel()}
					onClick={(event) => {
						event.stopPropagation();
						void handleDownload();
					}}
					disabled={isDownloading}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						color: token.colorPrimary,
						padding: 4,
						display: "flex",
						alignItems: "center",
						borderRadius: "50%",
						height: 40,
						width: 40,
					}}
				>
					{isDownloading ? (
						<ReloadOutlined aria-hidden spin style={{ fontSize: 18 }} />
					) : (
						<DownloadOutlined aria-hidden style={{ fontSize: 18 }} />
					)}
				</button>
			</div>
		);
	}

	return (
		<div
			data-media-type={media.meta.type}
			style={{
				position: "relative",
				width: "100%",
				aspectRatio: shouldRenderAsDocument ? undefined : ratio,
				overflow: "hidden",
				borderRadius: token.borderRadius,
				background: shouldRenderAsDocument ? "none" : token.colorBgLayout,
				filter: grayscale ? "grayscale(100%)" : undefined,
			}}
		>
			{renderMedia()}
			{renderAttachment()}
			{isDownloading && media.meta.type === "video" && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(0,0,0,0.5)",
					}}
				>
					<Typography.Text style={{ color: "#fff" }}>
						{getProgressLabel()}
					</Typography.Text>
				</div>
			)}
			{(shouldOfferFullDownload || downloadError) &&
				!videoUrl &&
				!shouldRenderAsDocument && (
					<button
						type="button"
						aria-label={getDownloadLabel()}
						onClick={(event) => {
							event.stopPropagation();
							void handleDownload();
						}}
						disabled={isDownloading}
						style={{
							position: "absolute",
							bottom: 8,
							right: 8,
							background: "rgba(0,0,0,0.6)",
							border: "none",
							color: "#fff",
							padding: "6px 8px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "50%",
							height: 40,
							width: 40,
						}}
					>
						{isDownloading ? (
							<ReloadOutlined aria-hidden spin style={{ fontSize: 16 }} />
						) : (
							<DownloadOutlined aria-hidden style={{ fontSize: 16 }} />
						)}
					</button>
				)}
			{downloadError && (
				<Typography.Text
					type="danger"
					style={{ position: "absolute", bottom: 8, left: 8, fontSize: 11 }}
				>
					{downloadError}
				</Typography.Text>
			)}
		</div>
	);
}
