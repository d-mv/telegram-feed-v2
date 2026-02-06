import { Api } from 'telegram'
import { ensureTelegramConnected } from '../../auth/infra/telegramAuth'
import { createIndexedDbDal } from '../../dal/indexedDbDal'
import type { FeedItem } from '../model/mockFeed'

type FetchFeedOptions = {
	perChat: number
	maxAgeDays: number
}

const DEFAULT_OPTIONS: FetchFeedOptions = {
	perChat: 10,
	maxAgeDays: 7,
}

function toRelativeTime(unixSeconds: number): string {
	const now = Date.now() / 1000
	const diff = Math.max(0, Math.floor(now - unixSeconds))
	if (diff < 60) {
		return 'Just now'
	}
	if (diff < 3600) {
		const minutes = Math.floor(diff / 60)
		return `${minutes} min ago`
	}
	if (diff < 86400) {
		const hours = Math.floor(diff / 3600)
		return `${hours} hr ago`
	}
	const days = Math.floor(diff / 86400)
	return `${days} d ago`
}

function getMediaPreview(message: Api.Message): FeedItem['media'] | undefined {
	const media = message.media
	if (!media || !('className' in media)) {
		return undefined
	}
	if (media.className === 'MessageMediaPhoto') {
		const photo = media.photo instanceof Api.Photo ? media.photo : undefined
		const sizes = photo?.sizes ?? []
		const size = sizes.reduce<{
			w: number
			h: number
			sizeBytes: number
		} | null>((acc, current) => {
			const w = 'w' in current ? current.w : 0
			const h = 'h' in current ? current.h : 0
			const sizeBytesRaw = 'size' in current ? current.size : 0
			const sizeBytes =
				typeof sizeBytesRaw === 'bigint'
					? Number(sizeBytesRaw)
					: Number(sizeBytesRaw)
			if (!acc || w * h > acc.w * acc.h) {
				return { w, h, sizeBytes }
			}
			return acc
		}, null)
		if (!size) {
			return undefined
		}
		return {
			meta: {
				type: 'image',
				width: size.w,
				height: size.h,
				sizeBytes: size.sizeBytes,
				mimeType: 'image/jpeg',
			},
			alt: 'Photo',
			key: `photo-${photo?.id?.toString() ?? message.id}`,
		}
	}
	if (media.className === 'MessageMediaDocument') {
		const document =
			media.document instanceof Api.Document ? media.document : undefined
		if (!document) {
			return undefined
		}
		const mimeType = document.mimeType ? String(document.mimeType) : ''
		const type = mimeType.startsWith('video') ? 'video' : 'image'
		const sizeBytesRaw = document.size ?? 0
		const sizeBytes =
			typeof sizeBytesRaw === 'bigint'
				? Number(sizeBytesRaw)
				: Number(sizeBytesRaw)
		let width = 0
		let height = 0
		for (const attribute of document.attributes ?? []) {
			if (attribute instanceof Api.DocumentAttributeVideo) {
				width = attribute.w
				height = attribute.h
			}
			if (attribute instanceof Api.DocumentAttributeImageSize) {
				width = attribute.w
				height = attribute.h
			}
		}
		if (!width || !height) {
			width = 640
			height = 360
		}
		return {
			meta: {
				type,
				width,
				height,
				sizeBytes,
				mimeType,
			},
			alt: 'Media',
			key: `doc-${document.id?.toString() ?? message.id}`,
		}
	}
	return undefined
}

export async function fetchRecentFeed(
	options: Partial<FetchFeedOptions> = {},
): Promise<FeedItem[]> {
	const { perChat, maxAgeDays } = { ...DEFAULT_OPTIONS, ...options }
	const client = await ensureTelegramConnected()
	const me = await client.getMe()
	const dialogs = await client.getDialogs({})
	const cutoff = Date.now() / 1000 - maxAgeDays * 24 * 60 * 60
	const items: { item: FeedItem; sortDate: number }[] = []

	for (const dialog of dialogs) {
		if (!dialog.entity) {
			continue
		}
		const messages = await client.getMessages(dialog.entity, { limit: perChat })
		for (const message of messages) {
			if (!(message instanceof Api.Message)) {
				continue
			}
			if (message.out) {
				continue
			}
			if (me && message.fromId && 'userId' in message.fromId) {
				if (message.fromId.userId?.toString() === me.id?.toString()) {
					continue
				}
			}
			if (!message.date || message.date < cutoff) {
				continue
			}

			const chatName =
				dialog.name || dialog.title || (dialog.isUser ? 'User' : 'Group')
			const timestamp = toRelativeTime(message.date)
			const text = message.message ?? ''
			const media = getMediaPreview(message)
			const idSuffix = message.id ?? message.date

			if (dialog.isUser) {
				items.push({
					item: {
						id: `dm-${dialog.id?.toString() ?? 'chat'}-${idSuffix}`,
						type: 'dm',
						chatName,
						senderName: chatName,
						timestamp,
						text,
						media,
						reactions: [],
						sourceMessage: message,
					},
					sortDate: message.date,
				})
			} else {
				items.push({
					item: {
						id: `group-${dialog.id?.toString() ?? 'chat'}-${idSuffix}`,
						type: 'group',
						chatName,
						timestamp,
						text,
						media,
						sourceMessage: message,
					},
					sortDate: message.date,
				})
			}
		}
	}

	return items.sort((a, b) => b.sortDate - a.sortDate).map(({ item }) => item)
}

function toObjectUrl(input: unknown, mimeType: string): string | undefined {
	if (!input) {
		return undefined
	}
	if (typeof input === 'string') {
		if (
			input.startsWith('blob:') ||
			input.startsWith('data:') ||
			input.startsWith('http')
		) {
			return input
		}
		const bytes = new Uint8Array(input.length)
		for (let index = 0; index < input.length; index += 1) {
			bytes[index] = input.charCodeAt(index) & 0xff
		}
		const blob = new Blob([bytes], { type: mimeType })
		return URL.createObjectURL(blob)
	}
	if (input instanceof Blob) {
		return URL.createObjectURL(input)
	}
	if (input instanceof ArrayBuffer) {
		const blob = new Blob([input], { type: mimeType })
		return URL.createObjectURL(blob)
	}
	if (input instanceof Uint8Array) {
		const blob = new Blob([input], { type: mimeType })
		return URL.createObjectURL(blob)
	}
	return undefined
}

function getBinarySize(input: unknown): number | null {
	if (input instanceof Blob) {
		return input.size
	}
	if (input instanceof ArrayBuffer) {
		return input.byteLength
	}
	if (input instanceof Uint8Array) {
		return input.byteLength
	}
	if (typeof input === 'string') {
		return input.length
	}
	return null
}

export async function downloadMediaForItem(
	item: FeedItem,
): Promise<string | undefined> {
	if (!item.media || !item.sourceMessage) {
		return undefined
	}
	const client = await ensureTelegramConnected()
	const dal = createIndexedDbDal()
	const cacheKey = item.media.key ?? item.id
	const cached = await dal.getMedia(cacheKey)
	if (cached) {
		if (cached.size > 0) {
			return URL.createObjectURL(cached)
		}
	}
	const buffer = await client.downloadMedia(item.sourceMessage as Api.Message)
	const size = getBinarySize(buffer)
	if (!buffer || size === 0) {
		return undefined
	}
	const url = toObjectUrl(
		buffer,
		item.media.meta.mimeType ?? 'application/octet-stream',
	)
	if (!url) {
		return undefined
	}
	if (url.startsWith('blob:')) {
		const blob = await (await fetch(url)).blob()
		await dal.setMedia(cacheKey, blob)
	}
	return url
}

export async function downloadThumbnailForItem(
	item: FeedItem,
	targetWidth: number,
): Promise<string | undefined> {
	if (!item.media || !item.sourceMessage) return undefined
	const client = await ensureTelegramConnected()
	const dal = createIndexedDbDal()
	const cacheKey = `${item.media.key ?? item.id}:thumb:${targetWidth}`
	const cached = await dal.getMedia(cacheKey)
	if (cached) {
		if (cached.size > 0) {
			return URL.createObjectURL(cached)
		}
	}

	const sourceMessage = item.sourceMessage as Api.Message
	const mimeType = item.media.meta.mimeType || 'image/jpeg'
	let thumb: Api.TypePhotoSize | number | undefined
	if (sourceMessage.media instanceof Api.MessageMediaPhoto) {
		const photo =
			sourceMessage.media.photo instanceof Api.Photo
				? sourceMessage.media.photo
				: undefined
		const sizes = photo?.sizes ?? []
		thumb = sizes.reduce<Api.TypePhotoSize | undefined>((best, current) => {
			if (!('w' in current)) {
				return best
			}
			if (!best || (best && 'w' in best && current.w >= targetWidth)) {
				return current
			}
			return best
		}, undefined)
	}
	if (sourceMessage.media instanceof Api.MessageMediaDocument) {
		const doc =
			sourceMessage.media.document instanceof Api.Document
				? sourceMessage.media.document
				: undefined
		const sizes = doc?.thumbs ?? []
		thumb = sizes.find((current) => 'w' in current && current.w >= targetWidth)
	}
	const buffer = thumb
		? await client.downloadMedia(sourceMessage, { thumb })
		: await client.downloadMedia(sourceMessage)
	const bufferSize = getBinarySize(buffer)
	if (!buffer || bufferSize === 0) {
		if (item.media.meta.type === 'image') {
			const fallback = await client.downloadMedia(sourceMessage)
			const fallbackSize = getBinarySize(fallback)
			if (!fallback || fallbackSize === 0) {
				return undefined
			}
			const url = toObjectUrl(fallback, mimeType)
			if (!url) {
				return undefined
			}
			if (url.startsWith('blob:')) {
				const blob = await (await fetch(url)).blob()
				await dal.setMedia(cacheKey, blob)
			}
			return url
		}
		return undefined
	}
	const url = toObjectUrl(buffer, mimeType)
	if (!url) {
		return undefined
	}
	if (url.startsWith('blob:')) {
		const blob = await (await fetch(url)).blob()
		await dal.setMedia(cacheKey, blob)
	}
	return url
}
