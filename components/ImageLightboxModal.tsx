'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

export interface LightboxImage {
  url: string;
  name: string;
  storagePath?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: LightboxImage[];
  initialIndex?: number;
  onClose: () => void;
  onDownload?: (image: LightboxImage) => void;
}

export function ImageLightboxModal({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  onDownload,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setRotation(0);
  }, [initialIndex, isOpen]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setRotation(0);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  }, [images.length]);

  // Keyboard navigation (Esc, Arrow keys)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleDownload = () => {
    if (onDownload) {
      onDownload(currentImage);
      return;
    }
    // Default fallback direct download
    const link = document.createElement('a');
    link.href = currentImage.url;
    link.download = currentImage.name || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-white/90 z-20 bg-gradient-to-b from-black/60 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <span className="text-xs sm:text-sm font-medium truncate max-w-[200px] sm:max-w-md">
            {currentImage.name}
          </span>
          {images.length > 1 && (
            <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full font-mono">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="확대"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="축소"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="회전"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition ml-1"
            title="다운로드"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition ml-1"
            title="닫기 (Esc)"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 sm:left-4 z-20 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 bg-black/40 rounded-full backdrop-blur-sm transition"
            title="이전 이미지 (←)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        )}

        {/* The Image */}
        <div
          className="relative max-h-[82vh] max-w-[92vw] flex items-center justify-center transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={currentImage.url}
            alt={currentImage.name}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-all"
            draggable={false}
          />
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 sm:right-4 z-20 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 bg-black/40 rounded-full backdrop-blur-sm transition"
            title="다음 이미지 (→)"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {images.length > 1 && (
        <div
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-t from-black/70 to-transparent overflow-x-auto z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={`${img.url}-${idx}`}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setZoom(1);
                setRotation(0);
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                currentIndex === idx
                  ? 'border-amber-400 scale-105 shadow-md'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
