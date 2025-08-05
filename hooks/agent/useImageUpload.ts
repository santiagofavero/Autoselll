/**
 * Image Upload Hook
 * Manages file upload, compression, and multi-image handling
 */

'use client';

import { useState, useCallback } from 'react';
import { compressImage, shouldCompressImage } from '@/lib/image-utils';

export interface UploadedImage {
  file: File;
  dataUrl: string;
  compressed?: boolean;
  originalSize: number;
  compressedSize?: number;
}

export interface ImageUploadState {
  images: UploadedImage[];
  currentImageIndex: number;
  isUploading: boolean;
  uploadError: string | null;
  isDragOver: boolean;
}

const initialState: ImageUploadState = {
  images: [],
  currentImageIndex: 0,
  isUploading: false,
  uploadError: null,
  isDragOver: false,
};

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function useImageUpload() {
  const [state, setState] = useState<ImageUploadState>(initialState);

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return `Unsupported file type: ${file.type}. Please use JPEG, PNG, WebP, HEIC, or HEIF.`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 10MB.`;
    }
    
    return null;
  }, []);

  const processFile = useCallback(async (file: File): Promise<UploadedImage> => {
    const originalSize = file.size;
    let processedFile = file;
    let compressed = false;

    // Compress if needed
    if (shouldCompressImage(file)) {
      try {
        processedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
          targetSizeKB: 500,
        });
        compressed = true;
      } catch (error) {
        console.warn('Image compression failed, using original:', error);
      }
    }

    // Convert to data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(processedFile);
    });

    return {
      file: processedFile,
      dataUrl,
      compressed,
      originalSize,
      compressedSize: compressed ? processedFile.size : undefined,
    };
  }, []);

  const addImages = useCallback(async (files: File[]) => {
    if (state.images.length >= MAX_IMAGES) {
      setState(prev => ({ 
        ...prev, 
        uploadError: `Maximum ${MAX_IMAGES} images allowed` 
      }));
      return;
    }

    const remainingSlots = MAX_IMAGES - state.images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    setState(prev => ({ 
      ...prev, 
      isUploading: true, 
      uploadError: null 
    }));

    try {
      const processedImages: UploadedImage[] = [];

      for (const file of filesToProcess) {
        const validationError = validateFile(file);
        if (validationError) {
          setState(prev => ({ 
            ...prev, 
            uploadError: validationError,
            isUploading: false 
          }));
          return;
        }

        const processedImage = await processFile(file);
        processedImages.push(processedImage);
      }

      setState(prev => ({
        ...prev,
        images: [...prev.images, ...processedImages],
        isUploading: false,
        uploadError: null,
      }));

      if (files.length > remainingSlots) {
        setState(prev => ({ 
          ...prev, 
          uploadError: `Only ${remainingSlots} images could be added (max ${MAX_IMAGES} total)` 
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadError: error instanceof Error ? error.message : 'Failed to process images',
      }));
    }
  }, [state.images.length, validateFile, processFile]);

  const removeImage = useCallback((index: number) => {
    setState(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      const newCurrentIndex = Math.min(prev.currentImageIndex, newImages.length - 1);
      
      return {
        ...prev,
        images: newImages,
        currentImageIndex: Math.max(0, newCurrentIndex),
        uploadError: null,
      };
    });
  }, []);

  const setCurrentImageIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentImageIndex: Math.max(0, Math.min(index, prev.images.length - 1)),
    }));
  }, []);

  const clearImages = useCallback(() => {
    setState(initialState);
  }, []);

  const setDragOver = useCallback((isDragOver: boolean) => {
    setState(prev => ({ ...prev, isDragOver }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, uploadError: null }));
  }, []);

  // File input handlers
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      await addImages(files);
    }
    // Reset input
    event.target.value = '';
  }, [addImages]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      await addImages(files);
    }
  }, [addImages, setDragOver]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(true);
  }, [setDragOver]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragOver(false);
  }, [setDragOver]);

  // Get data URLs for API submission
  const getDataUrls = useCallback((): string[] => {
    return state.images.map(img => img.dataUrl);
  }, [state.images]);

  // Get current image
  const getCurrentImage = useCallback((): UploadedImage | null => {
    return state.images[state.currentImageIndex] || null;
  }, [state.images, state.currentImageIndex]);

  // Get submission data for single/multiple images
  const getSubmissionData = useCallback(() => {
    if (state.images.length === 0) return null;

    if (state.images.length === 1) {
      // Single image submission
      return state.images[0].dataUrl;
    } else {
      // Multiple images submission
      return JSON.stringify({
        type: 'multiple',
        images: getDataUrls(),
        primaryIndex: state.currentImageIndex,
        count: state.images.length,
      });
    }
  }, [state.images, state.currentImageIndex, getDataUrls]);

  // Calculate total file sizes
  const getTotalSize = useCallback(() => {
    return state.images.reduce((total, img) => total + img.file.size, 0);
  }, [state.images]);

  const getCompressionStats = useCallback() => {
    const totalOriginal = state.images.reduce((total, img) => total + img.originalSize, 0);
    const totalCompressed = state.images.reduce((total, img) => total + img.file.size, 0);
    const compressionRatio = totalOriginal > 0 ? (totalOriginal - totalCompressed) / totalOriginal : 0;
    
    return {
      originalSize: totalOriginal,
      compressedSize: totalCompressed,
      savedBytes: totalOriginal - totalCompressed,
      compressionRatio,
      compressedCount: state.images.filter(img => img.compressed).length,
    };
  }, [state.images]);

  return {
    // State
    ...state,
    
    // Actions
    addImages,
    removeImage,
    setCurrentImageIndex,
    clearImages,
    setDragOver,
    clearError,
    
    // Event handlers
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    
    // Helpers
    getDataUrls,
    getCurrentImage,
    getSubmissionData,
    getTotalSize,
    getCompressionStats,
    
    // Validation
    validateFile,
    
    // Constants
    maxImages: MAX_IMAGES,
    maxFileSize: MAX_FILE_SIZE,
    supportedTypes: SUPPORTED_TYPES,
  };
}