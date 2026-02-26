import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";
import styles from "./AvatarCarousel.module.css";

type Props = {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function AvatarCarousel({ photos, initialIndex = 0, onClose }: Props) {
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

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Close" />
      <div className={styles.panel}>
        <div className={styles.viewport} ref={emblaRef}>
          <div className={styles.container}>
            {photos.map((photo, index) => (
              <div key={`${photo}-${index}`} className={styles.slide}>
                <img src={photo} alt={`Avatar ${index + 1}`} className={styles.image} />
              </div>
            ))}
          </div>
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              className={styles.prev}
              onClick={handlePrev}
              aria-label="Previous avatar"
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.next}
              onClick={handleNext}
              aria-label="Next avatar"
            >
              ›
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close carousel"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
