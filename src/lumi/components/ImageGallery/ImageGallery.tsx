import { useState, useEffect } from 'react';
import type { DesireImage } from '../../types';
import './ImageGallery.css';
import { useI18n } from '../../i18n';

interface ImageGalleryProps {
  images: DesireImage[];
  title?: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Если нет изображений, не показываем галерею
  if (!images || images.length === 0) {
    return null;
  }

  // Сортируем изображения по порядку
  const sortedImages = [...images].sort((a, b) => a.order - b.order);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  };

  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index);
  };

  // Поддержка свайпов
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      touchStartX = touchEvent.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: Event) => {
      const touchEvent = e as TouchEvent;
      touchEndX = touchEvent.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const diff = touchStartX - touchEndX;
      const minSwipeDistance = 50;

      if (Math.abs(diff) > minSwipeDistance) {
        if (diff > 0) {
          // Свайп влево - следующее изображение
          handleNext();
        } else {
          // Свайп вправо - предыдущее изображение
          handlePrevious();
        }
      }
    };

    const gallery = document.querySelector('.image-gallery-container');
    if (gallery) {
      gallery.addEventListener('touchstart', handleTouchStart);
      gallery.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (gallery) {
        gallery.removeEventListener('touchstart', handleTouchStart);
        gallery.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [sortedImages.length]);

  return (
    <div className="image-gallery">
      <div className="image-gallery-container">
        <div
          className="image-gallery-slider"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {sortedImages.map((image) => (
            <div key={image.id} className="image-gallery-slide">
              <img src={image.url} alt={title || t('gallery.imageAlt')} />
            </div>
          ))}
        </div>

        {/* Кнопки навигации (опционально, можно скрыть на мобильных) */}
        {sortedImages.length > 1 && (
          <>
            <button
              className="image-gallery-nav image-gallery-nav-prev"
              onClick={handlePrevious}
              aria-label={t('gallery.prev')}
            >
              ‹
            </button>
            <button
              className="image-gallery-nav image-gallery-nav-next"
              onClick={handleNext}
              aria-label={t('gallery.next')}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Индикаторы (точки) - показываем только если ≥ 2 изображений */}
      {sortedImages.length >= 2 && (
        <div className="image-gallery-indicators">
          {sortedImages.map((_, index) => (
            <button
              key={index}
              className={`image-gallery-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleIndicatorClick(index)}
              aria-label={t('gallery.imageN', { n: index + 1 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

