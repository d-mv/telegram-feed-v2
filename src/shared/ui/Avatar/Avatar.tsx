// import type { ThreadMessage } from "../../../domains/feed/model/feed";
import type { FeedItem } from "../../../types";
import styles from "./Avatar.module.css";
import { AvatarCarousel } from "./AvatarCarousel";
import { useAvatar } from "./useAvatar";
import { getAvatarColor, getAvatarInitials } from "./utils";

type Props = {
  noPreview?: boolean;
  message: FeedItem;
};

export function Avatar({ message, noPreview }: Props) {
  const {
    handleOpenAvatar,
    avatarPhotoMap,
    avatarGallery,
    isCarouselOpen,
    carouselIndex,
    closeCarousel,
    isAvatarVisible,
  } = useAvatar(message);

  if (!isAvatarVisible) return null;

  const background = avatarPhotoMap[`thread:${message.id}`]
    ? undefined
    : getAvatarColor(message.senderName || "unknown");
  const backgroundImage = avatarPhotoMap[`thread:${message.id}`]
    ? `url(${avatarPhotoMap[`thread:${message.id}`]})`
    : undefined;
  const backgroundSize = avatarPhotoMap[`thread:${message.id}`] ? "cover" : undefined;
  const backgroundPosition = avatarPhotoMap[`thread:${message.id}`] ? "center" : undefined;

  return (
    <>
      <button
        className={styles.image}
        style={{
          background,
          backgroundImage,
          backgroundSize,
          backgroundPosition,
        }}
        aria-label={`Avatar for ${message.senderName}`}
        title={message.senderName}
        role="button"
        onClick={handleOpenAvatar}
      >
        {avatarPhotoMap[`thread:${message.id}`]
          ? ""
          : getAvatarInitials(message.senderName || "unknown")}
      </button>
      {!noPreview && isCarouselOpen && avatarGallery.length > 0 && (
        <AvatarCarousel
          photos={avatarGallery}
          initialIndex={carouselIndex}
          onClose={closeCarousel}
        />
      )}
    </>
  );
}
