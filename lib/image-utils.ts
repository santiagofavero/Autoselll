// Image compression utilities for reducing context window usage
// Client-side image compression for browser usage

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  newDimensions: { width: number; height: number };
}

export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  console.log('🗜️ [Image Compression] Starting compression', {
    originalSize: file.size,
    originalName: file.name,
    maxWidth,
    maxHeight,
    quality
  });

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, maxHeight);
            width = height * aspectRatio;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx!.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File(
              [blob],
              `compressed_${file.name}`,
              { type: `image/${format}` }
            );

            const compressionRatio = (1 - blob.size / file.size) * 100;

            console.log('✅ [Image Compression] Compression complete', {
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: `${compressionRatio.toFixed(1)}%`,
              newDimensions: `${width}x${height}`
            });

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio,
              newDimensions: { width, height }
            });
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        console.error('❌ [Image Compression] Failed', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = URL.createObjectURL(file);
  });
}

export function estimateBase64Size(file: File): number {
  // Base64 encoding increases size by ~33%
  return Math.ceil(file.size * 1.33);
}

export function estimateTokenCount(base64Size: number): number {
  // Rough estimate: 1 token per 4 characters for base64
  return Math.ceil(base64Size / 4);
}

export function shouldCompressImage(file: File): boolean {
  const estimatedBase64Size = estimateBase64Size(file);
  const estimatedTokens = estimateTokenCount(estimatedBase64Size);
  
  // Compress if estimated tokens > 50k (conservative limit)
  return estimatedTokens > 50000 || file.size > 1024 * 1024; // 1MB
}

export async function optimizeImageForAPI(file: File): Promise<{
  file: File;
  metadata: {
    originalSize: number;
    finalSize: number;
    compressionRatio: number;
    estimatedTokens: number;
    wasCompressed: boolean;
  };
}> {
  const shouldCompress = shouldCompressImage(file);
  
  if (!shouldCompress) {
    const estimatedTokens = estimateTokenCount(estimateBase64Size(file.size));
    return {
      file,
      metadata: {
        originalSize: file.size,
        finalSize: file.size,
        compressionRatio: 0,
        estimatedTokens,
        wasCompressed: false,
      },
    };
  }

  const result = await compressImage(file, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.8,
    format: 'jpeg',
  });

  const estimatedTokens = estimateTokenCount(estimateBase64Size(result.compressedSize));

  return {
    file: result.file,
    metadata: {
      originalSize: result.originalSize,
      finalSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      estimatedTokens,
      wasCompressed: true,
    },
  };
}

// Batch processing functions for multiple images
export interface BatchCompressionResult {
  files: File[];
  metadata: {
    originalTotalSize: number;
    compressedTotalSize: number;
    totalCompressionRatio: number;
    totalEstimatedTokens: number;
    individualResults: {
      originalSize: number;
      finalSize: number;
      compressionRatio: number;
      estimatedTokens: number;
      wasCompressed: boolean;
    }[];
  };
}

export async function optimizeBatchForAPI(files: File[]): Promise<BatchCompressionResult> {
  console.log('🗜️ [Batch Compression] Starting batch optimization', { fileCount: files.length });
  
  const results = await Promise.all(files.map(file => optimizeImageForAPI(file)));
  
  const individualResults = results.map(result => result.metadata);
  const processedFiles = results.map(result => result.file);
  
  const originalTotalSize = individualResults.reduce((sum, meta) => sum + meta.originalSize, 0);
  const compressedTotalSize = individualResults.reduce((sum, meta) => sum + meta.finalSize, 0);
  const totalCompressionRatio = originalTotalSize > 0 ? ((originalTotalSize - compressedTotalSize) / originalTotalSize) * 100 : 0;
  const totalEstimatedTokens = individualResults.reduce((sum, meta) => sum + meta.estimatedTokens, 0);
  
  console.log('✅ [Batch Compression] Batch optimization complete', {
    fileCount: files.length,
    originalTotalSize,
    compressedTotalSize,
    totalCompressionRatio: `${totalCompressionRatio.toFixed(1)}%`,
    totalEstimatedTokens,
    compressedCount: individualResults.filter(meta => meta.wasCompressed).length
  });
  
  return {
    files: processedFiles,
    metadata: {
      originalTotalSize,
      compressedTotalSize,
      totalCompressionRatio,
      totalEstimatedTokens,
      individualResults,
    },
  };
}

export function shouldCompressBatch(files: File[]): boolean {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const estimatedTotalBase64Size = files.reduce((sum, file) => sum + estimateBase64Size(file), 0);
  const estimatedTotalTokens = estimateTokenCount(estimatedTotalBase64Size);
  
  // Compress if any individual file needs compression or total estimated tokens > 80k
  return files.some(file => shouldCompressImage(file)) || estimatedTotalTokens > 80000 || totalSize > 5 * 1024 * 1024; // 5MB total
}

export async function createDataUrlsFromFiles(files: File[]): Promise<string[]> {
  console.log('🔄 [Data URLs] Converting files to data URLs', { fileCount: files.length });
  
  const dataUrls = await Promise.all(
    files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })
  );
  
  console.log('✅ [Data URLs] Conversion complete', { 
    fileCount: files.length,
    totalDataUrlLength: dataUrls.reduce((sum, url) => sum + url.length, 0)
  });
  
  return dataUrls;
}