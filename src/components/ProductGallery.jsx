import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export const ProductGallery = ({
  images = [],
  fallbackImage = '',
  alt = 'Product photograph',
  aspectRatio = '4 / 3',
  showZoomModal = false
}) => {
  // Normalize image list: if images array is provided, use it; otherwise fallback to single image
  const validImages = Array.isArray(images) && images.length > 0
    ? images.filter(Boolean)
    : (fallbackImage ? [fallbackImage] : []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const totalImages = validImages.length;
  const currentImage = validImages[activeIndex] || fallbackImage || '';

  const handlePrev = (e) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
  };

  if (totalImages === 0) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio,
          backgroundColor: 'var(--surface-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-color)'
        }}
      >
        No visual documentation available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Large Main Showcase Frame */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio,
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: 'var(--radius-xs)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}
        className="product-main-gallery"
      >
        <img
          key={currentImage}
          src={currentImage}
          alt={`${alt} — Photograph ${activeIndex + 1} of ${totalImages}`}
          loading="eager"
          onLoad={() => setImageLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 200ms ease, transform 300ms ease',
            opacity: imageLoaded ? 1 : 0.8
          }}
          className="gallery-active-img"
        />

        {/* Previous / Next Arrow Controls (if more than 1 image) */}
        {totalImages > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Previous photograph"
              style={{
                position: 'absolute',
                top: '50%',
                left: '12px',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, transform 150ms ease',
                zIndex: 4
              }}
              className="gallery-arrow"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              aria-label="Next photograph"
              style={{
                position: 'absolute',
                top: '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                cursor: 'pointer',
                transition: 'background-color 150ms ease, transform 150ms ease',
                zIndex: 4
              }}
              className="gallery-arrow"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Count Indicator Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            padding: '4px 10px',
            backgroundColor: 'rgba(25, 25, 25, 0.85)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            borderRadius: 'var(--radius-xs)',
            backdropFilter: 'blur(4px)',
            zIndex: 4
          }}
        >
          {totalImages > 1 ? `${activeIndex + 1} / ${totalImages}` : 'Single View'}
        </div>
      </div>

      {/* Thumbnails Row: Supports 5–6 thumbnail positions */}
      {totalImages > 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(totalImages, 6)}, 1fr)`,
            gap: '8px',
            width: '100%'
          }}
        >
          {validImages.slice(0, 6).map((imgUrl, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  setImageLoaded(false);
                  setActiveIndex(idx);
                }}
                aria-label={`View photo ${idx + 1}`}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 'var(--radius-xs)',
                  overflow: 'hidden',
                  border: isSelected
                    ? '2px solid var(--accent-burgundy)'
                    : '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  opacity: isSelected ? 1 : 0.72,
                  transition: 'opacity 150ms ease, border-color 150ms ease, transform 150ms ease',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                }}
                className="gallery-thumbnail-btn"
              >
                <img
                  src={imgUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .gallery-arrow:hover {
          background-color: #FFFFFF !important;
          transform: translateY(-50%) scale(1.06) !important;
        }
        .gallery-thumbnail-btn:hover {
          opacity: 1 !important;
          border-color: #555 !important;
        }
      `}</style>
    </div>
  );
};
