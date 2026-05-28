import { Api } from "telegram";
import type { FeedItem } from "../../../types";
import type { Dal } from "../../dal/types";
import type { TelegramClient } from "telegram";
import {
	getBinarySize,
	sniffImageMime,
	toBlob,
	toUint8Array,
} from "./telegramFeed.binary";
import { resolveFeedItemSourceMessage } from "./resolveFeedItemSourceMessage";

type DownloadProgressCallback = (
	downloaded: bigInt.BigInteger,
	total: bigInt.BigInteger,
) => void;
type EnsureTelegramConnected = () => Promise<TelegramClient>;

async function storeBlob(cacheKey: string, blob: Blob | undefined, dal: Dal) {
	if (!blob) {
		return;
	}
	await dal.setMedia(cacheKey, blob);
}

export async function downloadMediaForItem(
	item: FeedItem,
	ensureTelegramConnected: EnsureTelegramConnected,
	dal: Dal,
	onProgress?: DownloadProgressCallback,
): Promise<string | undefined> {
	if (!item.media) {
		return undefined;
	}
	const client = await ensureTelegramConnected();
	const cacheKey = item.media.key ?? item.id;
	const cached = await dal.getMedia(cacheKey);
	if (cached && cached.size > 0) {
		return URL.createObjectURL(cached);
	}

	const sourceMessage = await resolveFeedItemSourceMessage(item, client);
	if (!sourceMessage) {
		return undefined;
	}

	const buffer = await client.downloadMedia(sourceMessage, {
		progressCallback: onProgress,
	});
	const size = getBinarySize(buffer);
	if (!buffer || size === 0) {
		return undefined;
	}
	const blob = toBlob(
		buffer,
		item.media.meta.mimeType ?? "application/octet-stream",
	);
	if (!blob) {
		return undefined;
	}
	await storeBlob(cacheKey, blob, dal);
	return URL.createObjectURL(blob);
}

export async function getCachedMediaUrl(
	item: FeedItem,
	dal: Dal,
): Promise<string | undefined> {
	if (!item.media) {
		return undefined;
	}
	const cacheKey = item.media.key ?? item.id;
	const cached = await dal.getMedia(cacheKey);
	if (!cached || cached.size === 0) {
		return undefined;
	}
	return URL.createObjectURL(cached);
}

function pickThumbByWidth(sizes: Api.TypePhotoSize[], targetWidth: number) {
	let over: Api.TypePhotoSize | undefined;
	let under: Api.TypePhotoSize | undefined;

	for (const size of sizes) {
		if (!("w" in size)) {
			continue;
		}
		if (size.w >= targetWidth) {
			if (!over || ("w" in over && size.w < over.w)) {
				over = size;
			}
		} else if (!under || ("w" in under && size.w > under.w)) {
			under = size;
		}
	}

	return over ?? under;
}

function getThumbCandidate(sourceMessage: Api.Message, targetWidth: number) {
	if (sourceMessage.media instanceof Api.MessageMediaPhoto) {
		const photo =
			sourceMessage.media.photo instanceof Api.Photo
				? sourceMessage.media.photo
				: undefined;
		return pickThumbByWidth(photo?.sizes ?? [], targetWidth);
	}
	if (sourceMessage.media instanceof Api.MessageMediaDocument) {
		const document =
			sourceMessage.media.document instanceof Api.Document
				? sourceMessage.media.document
				: undefined;
		return pickThumbByWidth(document?.thumbs ?? [], targetWidth);
	}
	return undefined;
}

export async function downloadThumbnailForItem(
	item: FeedItem,
	targetWidth: number,
	ensureTelegramConnected: EnsureTelegramConnected,
	dal: Dal,
): Promise<string | undefined> {
	if (!item.media) return undefined;
	const client = await ensureTelegramConnected();
	const cacheKey = `${item.media.key ?? item.id}:thumb:${targetWidth}`;
	const cached = await dal.getMedia(cacheKey);
	if (cached && cached.size > 0) {
		return URL.createObjectURL(cached);
	}

	const sourceMessage = await resolveFeedItemSourceMessage(item, client);
	if (!sourceMessage) {
		return undefined;
	}
	const thumb = getThumbCandidate(sourceMessage, targetWidth);
	if (item.media.meta.type === "video" && !thumb) {
		return undefined;
	}

	const buffer = thumb
		? await client.downloadMedia(sourceMessage, { thumb })
		: await client.downloadMedia(sourceMessage);
	const bufferSize = getBinarySize(buffer);
	if (!buffer || bufferSize === 0) {
		if (item.media.meta.type === "video") {
			return undefined;
		}
		const fallback = await client.downloadMedia(sourceMessage);
		const fallbackSize = getBinarySize(fallback);
		if (!fallback || fallbackSize === 0) {
			return undefined;
		}
		const fallbackMimeType =
			item.media.meta.mimeType || "application/octet-stream";
		const fallbackBlob = toBlob(fallback, fallbackMimeType);
		if (!fallbackBlob) {
			return undefined;
		}
		await storeBlob(cacheKey, fallbackBlob, dal);
		return URL.createObjectURL(fallbackBlob);
	}

	let resolvedMimeType = thumb
		? "image/jpeg"
		: item.media.meta.mimeType || "image/jpeg";
	if (thumb) {
		const sniffed = sniffImageMime(toUint8Array(buffer));
		if (sniffed) {
			resolvedMimeType = sniffed;
		}
	}
	const blob = toBlob(buffer, resolvedMimeType);
	if (!blob) {
		return undefined;
	}
	await storeBlob(cacheKey, blob, dal);
	return URL.createObjectURL(blob);
}
