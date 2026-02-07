import { useEffect, useMemo, useState } from 'react'
import {
	downloadMediaForItem,
	downloadThumbnailForItem,
	getCachedMediaUrl,
} from '../infra/telegramFeed'
import type { FeedItem } from '../model/mockFeed'
import styles from './FeedCardMedia.module.css'

type Props = {
	item: FeedItem
}

export function FeedCardMedia({ item }: Props) {
	const media = item.media

	const [previewUrl, setPreviewUrl] = useState<string | undefined>(
		item.media?.url,
	)
	const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
	const [downloadError, setDownloadError] = useState('')
	const [previewFailed, setPreviewFailed] = useState(false)

	const ratio = useMemo(() => {
		if (!media) return '16 / 9'

		const { width, height } = media.meta
		if (!width || !height) {
			return '16 / 9'
		}
		return `${width} / ${height}`
	}, [media])

	const shouldOfferFullDownload = useMemo(() => {
		if (!media) return false

		return media.meta.type === 'video' || media.meta.sizeBytes >= 524288
	}, [media])

	function formatBytes(bytes: number) {
		if (!Number.isFinite(bytes) || bytes <= 0) {
			return ''
		}
		const kb = 1024
		const mb = kb * 1024
		const gb = mb * 1024
		if (bytes >= gb) {
			return `${(bytes / gb).toFixed(1)} GB`
		}
		if (bytes >= mb) {
			return `${(bytes / mb).toFixed(1)} MB`
		}
		if (bytes >= kb) {
			return `${Math.round(bytes / kb)} KB`
		}
		return `${bytes} B`
	}

	function getDownloadLabel() {
		if (isDownloading) {
			return 'Downloading...'
		}
		if (media && media.meta.sizeBytes > 0) {
			return `Download (${formatBytes(media.meta.sizeBytes)})`
		}
		return 'Download media'
	}

	function getProgressLabel() {
		if (downloadProgress === null) {
			return 'Downloading...'
		}
		return `${Math.round(downloadProgress * 100)}%`
	}

	async function handleDownload() {
		if (!item.media) {
			return
		}
		setIsDownloading(true)
		setDownloadProgress(0)
		setDownloadError('')
		try {
			let nextUrl: string | undefined
			if (item.media.meta.type === 'video') {
				nextUrl = await downloadMediaForItem(item, (downloaded, total) => {
					if (total > 0) {
						setDownloadProgress(downloaded / total)
					}
				})
			} else {
				nextUrl = await downloadMediaForItem(item)
			}
			const url = nextUrl
			if (!url) {
				setDownloadError('Download failed')
				return
			}
			if (item.media.meta.type === 'video') {
				setVideoUrl(url)
				return
			}
			setPreviewUrl(url)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Download failed'
			console.error('[FeedCardMedia] download failed', error)
			setDownloadError(message || 'Download failed')
		} finally {
			setIsDownloading(false)
		}
	}

	useEffect(() => {
		if (!media || media.url || previewUrl || previewFailed) return

		let active = true
		downloadThumbnailForItem(item, 480)
			.then((url) => {
				if (active && url) {
					setPreviewUrl(url)
				}
			})
			.catch((error) => {
				console.error('Failed to load media preview', error)
			})
		return () => {
			active = false
		}
	}, [media, previewUrl, previewFailed, item])

	useEffect(() => {
		if (!media || media.meta.type !== 'video') {
			return
		}
		if (videoUrl) {
			return
		}
		let active = true
		getCachedMediaUrl(item)
			.then((url) => {
				if (active && url) {
					setVideoUrl(url)
				}
			})
			.catch(() => {})
		return () => {
			active = false
		}
	}, [item, media, videoUrl])

	if (!media) return null
	function renderMedia() {
		if (!previewUrl || !media) return null

		if (media.meta.type === 'image')
			return (
				<img
					src={previewUrl}
					alt={media.alt}
					loading="lazy"
					className={styles.mediaImage}
					onError={() => {
						setPreviewUrl(undefined)
						setPreviewFailed(true)
					}}
				/>
			)

		if (media.meta.type === 'video') {
			return (
				<video
					src={videoUrl}
					poster={previewUrl}
					controls
					autoPlay={false}
					muted
					playsInline
					className={styles.mediaVideo}
					onClick={(event) => event.stopPropagation()}
				/>
			)
		}

		return (
			<div className={styles.mediaPlaceholder}>
				<span>Media preview</span>
			</div>
		)
	}
	return (
		<div
			className={styles.feedCardMedia}
			data-media-type={media.meta.type}
			style={{ aspectRatio: ratio }}
		>
			{renderMedia()}
			{isDownloading && media.meta.type === 'video' && (
				<div className={styles.mediaProgress}>
					<div className={styles.mediaProgressLabel}>{getProgressLabel()}</div>
				</div>
			)}
			{(shouldOfferFullDownload || downloadError) && !videoUrl && (
				<button
					type="button"
					className={styles.mediaDownload}
					onClick={(event) => {
						event.stopPropagation()
						handleDownload()
					}}
					disabled={isDownloading}
				>
					{getDownloadLabel()}
				</button>
			)}
			{downloadError && (
				<span className={styles.mediaDownloadError}>{downloadError}</span>
			)}
		</div>
	)
}
