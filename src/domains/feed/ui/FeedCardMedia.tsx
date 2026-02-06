import { useEffect, useMemo, useState } from 'react'
import {
	downloadMediaForItem,
	downloadThumbnailForItem,
} from '../infra/telegramFeed'
import type { FeedItem } from '../model/mockFeed'

type Props = {
	item: FeedItem
}

export function FeedCardMedia({ item }: Props) {
	const media = item.media

	const [previewUrl, setPreviewUrl] = useState<string | undefined>(
		item.media?.url,
	)
	const [isDownloading, setIsDownloading] = useState(false)
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

	async function handleDownload() {
		if (!item.media) {
			return
		}
		setIsDownloading(true)
		setDownloadError('')
		try {
			const url = await downloadMediaForItem(item)
			if (!url) {
				return
			}
			if (item.media.meta.type === 'video') {
				const link = document.createElement('a')
				link.href = url
				link.download = `${item.id}.${item.media.meta.mimeType?.split('/')[1] ?? 'mp4'}`
				document.body.appendChild(link)
				link.click()
				link.remove()
				URL.revokeObjectURL(url)
				return
			}
			setPreviewUrl(url)
		} catch {
			setDownloadError('Download failed')
		} finally {
			setIsDownloading(false)
		}
	}

	useEffect(() => {
		if (!media || media.url || previewUrl || previewFailed) return

		if (media.meta.type === 'video') {
			console.log('[VideoPreview] requesting thumb', {
				id: item.id,
				key: media.key,
				mimeType: media.meta.mimeType,
				sizeBytes: media.meta.sizeBytes,
				dims: { width: media.meta.width, height: media.meta.height },
			})
		}

		let active = true
		downloadThumbnailForItem(item, 480)
			.then((url) => {
				if (media.meta.type === 'video') {
					console.log('[VideoPreview] thumb result', { id: item.id, url })
				}
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

	if (!media) return null
	function renderMedia() {
		if (!previewUrl || !media) return null

		if (media.meta.type === 'image')
			return (
				<img
					src={previewUrl}
					alt={media.alt}
					loading="lazy"
					onLoad={() => {
						if (media.meta.type === 'video') {
							console.log('[VideoPreview] img loaded', {
								id: item.id,
								url: previewUrl,
							})
						}
					}}
					onError={() => {
						console.log(media)
						if (media.meta.type === 'video') {
							console.log('[VideoPreview] img error', {
								id: item.id,
								url: previewUrl,
							})
						}
						setPreviewUrl(undefined)
						setPreviewFailed(true)
					}}
				/>
			)

		if (media.meta.type === 'video')
			return (
				<video
					src={previewUrl}
					autoPlay={false}
					loop
					muted
					playsInline
					style={{
						objectFit: 'contain',
						width: '100%',
						height: '100%',
					}}
				/>
			)

		return (
			<div className="feed-card-media-placeholder">
				<span>Media preview</span>
			</div>
		)
	}
	return (
		<div
			className="feed-card-media"
			aria-hidden="true"
			data-media-type={media.meta.type}
			style={{ aspectRatio: ratio }}
		>
			{renderMedia()}
			{/* {media.meta.type === 'video' && (
				<span className="feed-card-media-pill">Video preview</span>
			)} */}
			{(shouldOfferFullDownload || downloadError) && (
				<button
					type="button"
					className="feed-card-download"
					onClick={(event) => {
						event.stopPropagation()
						handleDownload()
					}}
					disabled={isDownloading}
				>
					{isDownloading ? 'Downloading...' : 'Download media'}
				</button>
			)}
			{downloadError && (
				<span className="feed-card-download-error">{downloadError}</span>
			)}
		</div>
	)
}
