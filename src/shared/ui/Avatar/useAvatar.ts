import { useContext, useEffect, useState } from "react";
import { Api } from "telegram";
import { AppContext } from "../../../domains/app/AppContext";
import { getAvatarPhotoGallery, getAvatarPhotoUrl } from "../../../domains/feed/infra/telegramFeed";
import type { FeedItem } from "../../../types";

export function useAvatar(message: FeedItem, isThread?: boolean) {
  const { avatarVisibility } = useContext(AppContext);
  const isAvatarVisible = isThread ? avatarVisibility?.thread : avatarVisibility?.feed;

  const [avatarPhotoMap, setAvatarPhotoMap] = useState<Record<string, string>>({});
  const [avatarGallery, setAvatarGallery] = useState<string[]>([]);
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  function closeCarousel() {
    setIsCarouselOpen(false);
    setCarouselIndex(-1);
  }

  async function ensureAvatarPhoto() {
    const source = message.sourceMessage;
    if (!(source instanceof Api.Message)) {
      return;
    }
    const cacheKey = isThread ? `thread:${message.id}` : `feed:${message.id}`;
    if (avatarPhotoMap[cacheKey]) {
      return;
    }
    try {
      const sender = await source.getSender();
      const url = await getAvatarPhotoUrl(sender, cacheKey);
      if (url) {
        setAvatarPhotoMap((current) => ({ ...current, [cacheKey]: url }));
      }
    } catch {
      // ignore
    }
  }

  async function handleOpenAvatar() {
    const source = message.sourceMessage;

    if (!(source instanceof Api.Message)) return;

    try {
      const sender = await source.getSender();
      const cacheKey = `thread:${message.id}`;
      const [latest, gallery] = await Promise.all([
        getAvatarPhotoUrl(sender, cacheKey),
        getAvatarPhotoGallery(sender, cacheKey),
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
