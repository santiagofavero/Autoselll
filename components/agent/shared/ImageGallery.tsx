/**
 * Image Gallery Component
 * Handles display and navigation of multiple product images
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageGalleryProps {
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onRemoveImage?: (index: number) => void;
  className?: string;
  showThumbnails?: boolean;
  showRemoveButton?: boolean;
  maxHeight?: string;
}

export function ImageGallery({ 
  images, 
  currentIndex, 
  onIndexChange, 
  onRemoveImage,
  className = "",
  showThumbnails = true,
  showRemoveButton = false,
  maxHeight = "400px"
}: ImageGalleryProps) {
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageLoadErrors(prev => new Set(prev).add(index));
  };

  const handlePrevImage = () => {
    if (images.length > 1) {
      onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
    }
  };

  const handleNextImage = () => {
    if (images.length > 1) {
      onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (onRemoveImage) {
      onRemoveImage(index);
      // Adjust current index if needed
      if (index === currentIndex && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (index < currentIndex) {
        onIndexChange(currentIndex - 1);
      }
    }
  };

  if (!images.length) {
    return (
      <div className={`flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg ${className}`} 
           style={{ height: maxHeight }}>
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No images</div>
          <div className="text-sm">Upload an image to get started</div>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  const hasError = imageLoadErrors.has(currentIndex);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image Display */}
      <div className="relative">
        <div 
          className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ height: maxHeight }}
        >
          {hasError ? (
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">Failed to load image</div>
              <div className="text-sm">Image may be corrupted or invalid</div>
            </div>
          ) : (
            <img
              src={currentImage}
              alt={`Product image ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onError={() => handleImageError(currentIndex)}
            />
          )}
          
          {/* Navigation Arrows */}
          {images.length > 1 && !hasError && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={handlePrevImage}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                onClick={handleNextImage}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {/* Remove Button */}
          {showRemoveButton && images.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 hover:text-red-600"
              onClick={() => handleRemoveImage(currentIndex)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          
          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-2 py-1 rounded text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              className={`flex-shrink-0 relative w-16 h-16 rounded border-2 overflow-hidden transition-all duration-200 ${
                index === currentIndex 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => onIndexChange(index)}
            >
              {imageLoadErrors.has(index) ? (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-400" />
                </div>
              ) : (
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                />
              )}
              
              {/* Remove button on thumbnail */}
              {showRemoveButton && (
                <button
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageGallery;