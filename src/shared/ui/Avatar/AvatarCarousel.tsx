import { theme } from "antd";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";

type Props = {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function AvatarCarousel({ photos, initialIndex = 0, onClose }: Props) {
  const { token } = theme.useToken();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: photos.length > 1,
    align: "center",
  });

  const handlePrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const handleNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") handlePrev();
      if (event.key === "ArrowRight") handleNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }
    const target = Math.max(0, Math.min(initialIndex, photos.length - 1));
    emblaApi.scrollTo(target, true);
  }, [emblaApi, initialIndex, photos.length]);

  if (photos.length === 0) {
    return null;
  }

  const navButtonStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    width: 40,
    height: 40,
    cursor: "pointer",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorText,
    zIndex: 1,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.75)",
          border: "none",
          cursor: "pointer",
        }}
      />
      <div style={{ position: "relative", width: "min(480px, 90vw)", zIndex: 1 }}>
        <div ref={emblaRef} style={{ overflow: "hidden", borderRadius: token.borderRadiusLG }}>
          <div style={{ display: "flex" }}>
            {photos.map((photo, index) => (
              <div
                key={`${photo}-${index}`}
                style={{ flex: "0 0 100%", minWidth: 0 }}
              >
                <img
                  src={photo}
                  alt={`Avatar ${index + 1}`}
                  style={{ width: "100%", display: "block", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" style={{ ...navButtonStyle, left: -20 }} onClick={handlePrev} aria-label="Previous avatar">
              ‹
            </button>
            <button type="button" style={{ ...navButtonStyle, right: -20 }} onClick={handleNext} aria-label="Next avatar">
              ›
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close carousel"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: "50%",
            width: 32,
            height: 32,
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: token.colorText,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
