import { theme } from "antd";
import type { FeedItem } from "../../../types";
import { AvatarCarousel } from "./AvatarCarousel";
import { useAvatar } from "./useAvatar";
import { getAvatarColor, getAvatarInitials } from "./utils";

type Props = {
  noPreview?: boolean;
  message: FeedItem;
  isThread?: boolean;
};

export function Avatar({ message, noPreview, isThread }: Props) {
  const { token } = theme.useToken();
  const {
    handleOpenAvatar,
    avatarPhotoMap,
    avatarGallery,
    isCarouselOpen,
    carouselIndex,
    closeCarousel,
    isAvatarVisible,
  } = useAvatar(message, isThread);

  if (!isAvatarVisible) return null;

  const size = isThread ? 28 : 32;
  const cacheKey = isThread ? `thread:${message.id}` : `feed:${message.id}`;
  const background = avatarPhotoMap[cacheKey]
    ? undefined
    : getAvatarColor(message.senderName || "unknown");
  const backgroundImage = avatarPhotoMap[cacheKey]
    ? `url(${avatarPhotoMap[cacheKey]})`
    : undefined;

  return (
    <>
      <button
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background,
          backgroundImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          color: "#fff",
          fontWeight: 600,
          flexShrink: 0,
          padding: 0,
          outline: "none",
          boxShadow: `0 0 0 1px ${token.colorBorder}`,
        }}
        aria-label={`Avatar for ${message.senderName}`}
        title={message.senderName}
        role="button"
        onClick={handleOpenAvatar}
      >
        {avatarPhotoMap[cacheKey]
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
