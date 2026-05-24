import { Api, type TelegramClient } from "telegram";
import { toBinaryObjectUrl } from "./telegramFeed.binary";

type ProfilePhotoEntity = Parameters<TelegramClient["downloadProfilePhoto"]>[0];
type DownloadMediaTarget = Parameters<TelegramClient["downloadMedia"]>[0];
type UserPhotosRequest = ConstructorParameters<
	typeof Api.photos.GetUserPhotos
>[0];
type EnsureTelegramConnected = () => Promise<TelegramClient>;

const avatarPhotoCache = new Map<string, string | undefined>();
const avatarPhotoPending = new Map<string, Promise<string | undefined>>();
const avatarGalleryCache = new Map<string, string[]>();
const avatarGalleryPending = new Map<string, Promise<string[]>>();
const AVATAR_PHOTO_CACHE_LIMIT = 100;
const AVATAR_GALLERY_CACHE_LIMIT = 50;

function revokeObjectUrl(url: string | undefined) {
	if (url?.startsWith("blob:")) {
		URL.revokeObjectURL(url);
	}
}

function revokeObjectUrls(urls: string[]) {
	for (const url of urls) {
		revokeObjectUrl(url);
	}
}

function setAvatarPhotoCache(cacheKey: string, url: string | undefined) {
	const previous = avatarPhotoCache.get(cacheKey);
	if (previous && previous !== url) {
		revokeObjectUrl(previous);
	}
	avatarPhotoCache.set(cacheKey, url);
	if (avatarPhotoCache.size > AVATAR_PHOTO_CACHE_LIMIT) {
		const oldestKey = avatarPhotoCache.keys().next().value;
		if (oldestKey) {
			const oldest = avatarPhotoCache.get(oldestKey);
			avatarPhotoCache.delete(oldestKey);
			revokeObjectUrl(oldest);
		}
	}
}

function setAvatarGalleryCache(cacheKey: string, urls: string[]) {
	const previous = avatarGalleryCache.get(cacheKey);
	if (previous) {
		revokeObjectUrls(previous.filter((url) => !urls.includes(url)));
	}
	avatarGalleryCache.set(cacheKey, urls);
	if (avatarGalleryCache.size > AVATAR_GALLERY_CACHE_LIMIT) {
		const oldestKey = avatarGalleryCache.keys().next().value;
		if (oldestKey) {
			const oldest = avatarGalleryCache.get(oldestKey) ?? [];
			avatarGalleryCache.delete(oldestKey);
			revokeObjectUrls(oldest);
		}
	}
}

export function clearAvatarCaches() {
	for (const url of avatarPhotoCache.values()) {
		revokeObjectUrl(url);
	}
	for (const urls of avatarGalleryCache.values()) {
		revokeObjectUrls(urls);
	}
	avatarPhotoCache.clear();
	avatarPhotoPending.clear();
	avatarGalleryCache.clear();
	avatarGalleryPending.clear();
}

export async function getAvatarPhotoUrl(
	entity: unknown,
	cacheKey: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<string | undefined> {
	if (!entity || typeof entity !== "object") {
		return undefined;
	}
	if (avatarPhotoCache.has(cacheKey)) {
		return avatarPhotoCache.get(cacheKey);
	}
	const pending = avatarPhotoPending.get(cacheKey);
	if (pending) {
		return pending;
	}
	const task = (async () => {
		try {
			const gallery = await getAvatarPhotoGallery(
				entity,
				cacheKey,
				ensureTelegramConnected,
			);
			if (gallery.length > 0) {
				const latest = gallery[0];
				setAvatarPhotoCache(cacheKey, latest);
				return latest;
			}

			const client = await ensureTelegramConnected();
			const photo = await client.downloadProfilePhoto(
				entity as ProfilePhotoEntity,
				{ isBig: false },
			);
			const url = toBinaryObjectUrl(photo);
			setAvatarPhotoCache(cacheKey, url);
			return url;
		} catch {
			setAvatarPhotoCache(cacheKey, undefined);
			return undefined;
		} finally {
			avatarPhotoPending.delete(cacheKey);
		}
	})();
	avatarPhotoPending.set(cacheKey, task);
	return task;
}

export async function getAvatarPhotoGallery(
	entity: unknown,
	cacheKey: string,
	ensureTelegramConnected: EnsureTelegramConnected,
): Promise<string[]> {
	if (!entity || typeof entity !== "object") {
		return [];
	}
	if (avatarGalleryCache.has(cacheKey)) {
		return avatarGalleryCache.get(cacheKey) ?? [];
	}
	const pending = avatarGalleryPending.get(cacheKey);
	if (pending) {
		return pending;
	}
	const task = (async () => {
		try {
			const client = await ensureTelegramConnected();
			const response = await client.invoke(
				new Api.photos.GetUserPhotos({
					userId: entity as UserPhotosRequest["userId"],
					offset: 0,
					maxId: 0n as unknown as UserPhotosRequest["maxId"],
					limit: 20,
				}),
			);
			const photos =
				"photos" in response && Array.isArray(response.photos)
					? response.photos
					: [];
			const urls: string[] = [];
			for (const photo of photos) {
				if (!(photo instanceof Api.Photo)) {
					continue;
				}
				const binary = await client.downloadMedia(
					photo as unknown as DownloadMediaTarget,
					{},
				);
				const url = toBinaryObjectUrl(binary);
				if (url) {
					urls.push(url);
				}
			}
			setAvatarGalleryCache(cacheKey, urls);
			return urls;
		} catch {
			setAvatarGalleryCache(cacheKey, []);
			return [];
		} finally {
			avatarGalleryPending.delete(cacheKey);
		}
	})();
	avatarGalleryPending.set(cacheKey, task);
	return task;
}
