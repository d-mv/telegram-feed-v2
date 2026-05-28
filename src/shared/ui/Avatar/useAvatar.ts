import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../domains/app/AppContext";
import {
	getAvatarPhotoGallery,
	getAvatarPhotoUrl,
	resolveFeedItemSourceMessage,
} from "../../../domains/feed/infra/telegramFeed";
import type { FeedItem } from "../../../types";

export function useAvatar(message: FeedItem, isThread?: boolean) {
	const { avatarVisibility, ensureTelegramConnected } = useContext(AppContext);
	const isAvatarVisible = isThread
		? avatarVisibility?.thread
		: avatarVisibility?.feed;

	const [avatarPhotoMap, setAvatarPhotoMap] = useState<Record<string, string>>(
		{},
	);
	const [avatarGallery, setAvatarGallery] = useState<string[]>([]);
	const [isCarouselOpen, setIsCarouselOpen] = useState(false);
	const [carouselIndex, setCarouselIndex] = useState(0);

	function closeCarousel() {
		setIsCarouselOpen(false);
		setCarouselIndex(-1);
	}

	async function ensureAvatarPhoto() {
		const cacheKey = message.senderId || message.id;
		if (avatarPhotoMap[cacheKey]) {
			return;
		}
		try {
			const client = await ensureTelegramConnected();
			const source = await resolveFeedItemSourceMessage(message, client);
			if (!source) {
				return;
			}
			const sender = await source.getSender();
			const url = await getAvatarPhotoUrl(
				sender,
				cacheKey,
				ensureTelegramConnected,
			);
			if (url) {
				setAvatarPhotoMap((current) => ({ ...current, [cacheKey]: url }));
			}
		} catch {
			// ignore
		}
	}

	async function handleOpenAvatar() {
		try {
			const client = await ensureTelegramConnected();
			const source = await resolveFeedItemSourceMessage(message, client);
			if (!source) return;

			const sender = await source.getSender();
			const cacheKey = message.senderId || message.id;
			const [latest, gallery] = await Promise.all([
				getAvatarPhotoUrl(sender, cacheKey, ensureTelegramConnected),
				getAvatarPhotoGallery(sender, cacheKey, ensureTelegramConnected),
			]);

			if (latest) {
				setAvatarPhotoMap((current) => ({ ...current, [cacheKey]: latest }));
			}

			if (gallery.length > 0) {
				const latestIndex = latest ? Math.max(0, gallery.indexOf(latest)) : 0;
				setAvatarGallery(gallery);
				setCarouselIndex(latestIndex);
				setIsCarouselOpen(true);
			} else if (latest) {
				setAvatarGallery([latest]);
				setCarouselIndex(0);
				setIsCarouselOpen(true);
			}
		} catch {
			// ignore
		}
	}

	useEffect(() => {
		if (!isAvatarVisible) return;

		ensureAvatarPhoto();
	}, [isAvatarVisible, message]);

	return {
		isAvatarVisible,
		ensureAvatarPhoto,
		handleOpenAvatar,
		avatarPhotoMap,
		avatarGallery,
		isCarouselOpen,
		carouselIndex,
		closeCarousel,
	};
}
