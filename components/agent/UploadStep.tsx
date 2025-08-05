/**
 * Upload Step Component
 * Handles file upload and image selection for the agent workflow
 */

'use client';

import React, { useRef } from 'react';
import { Upload, FileImage, Loader2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useImageUpload } from '@/hooks/agent/useImageUpload';
import { ImageGallery } from './shared/ImageGallery';

interface UploadStepProps {
  onImagesReady: (imageUrl: string, hints?: string) => void;
  isDisabled?: boolean;
  className?: string;
}

export function UploadStep({ onImagesReady, isDisabled = false, className = "" }: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hints, setHints] = React.useState('');
  
  const {
    images,
    currentImageIndex,
    isUploading,
    uploadError,
    isDragOver,
    setCurrentImageIndex,
    removeImage,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearError,
    getSubmissionData,
    getCompressionStats,
    maxImages,
    maxFileSize,
  } = useImageUpload();

  const handleContinue = () => {
    const submissionData = getSubmissionData();
    if (submissionData) {
      onImagesReady(submissionData, hints.trim() || undefined);
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const compressionStats = getCompressionStats();
  const canContinue = images.length > 0 && !isUploading && !isDisabled;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileImage className="w-5 h-5" />
            <span>Upload Product Photos</span>
          </CardTitle>
          <CardDescription>
            Add up to {maxImages} photos of your item. The first photo will be the main image.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {images.length === 0 ? (
            /* Upload Drop Zone */
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : uploadError 
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={!isDisabled ? handleFileInputClick : undefined}
              onDrop={!isDisabled ? handleDrop : undefined}
              onDragOver={!isDisabled ? handleDragOver : undefined}
              onDragLeave={!isDisabled ? handleDragLeave : undefined}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isDisabled}
              />
              
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin" />
                  <div>
                    <div className="text-lg font-medium text-gray-900">Processing images...</div>
                    <div className="text-sm text-gray-500">Compressing and optimizing for analysis</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className={`w-12 h-12 mx-auto ${uploadError ? 'text-red-400' : 'text-gray-400'}`} />
                  <div>
                    <div className="text-lg font-medium text-gray-900">
                      {uploadError ? 'Upload Failed' : 'Upload Product Photos'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Drag and drop images here, or click to browse
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      JPEG, PNG, WebP, HEIC, HEIF • Max {(maxFileSize / 1024 / 1024).toFixed(0)}MB per file
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Image Gallery */
            <div className="space-y-4">
              <ImageGallery
                images={images.map(img => img.dataUrl)}
                currentIndex={currentImageIndex}
                onIndexChange={setCurrentImageIndex}
                onRemoveImage={removeImage}
                showRemoveButton={!isDisabled}
                showThumbnails={true}
                maxHeight="300px"
              />
              
              {/* Add More Images Button */}
              {images.length < maxImages && !isDisabled && (
                <Button
                  variant="outline"
                  onClick={handleFileInputClick}
                  className="w-full"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add More Images ({images.length}/{maxImages})
                </Button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isDisabled}
              />
            </div>
          )}
          
          {/* Upload Error */}
          {uploadError && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{uploadError}</span>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Compression Stats */}
          {images.length > 0 && compressionStats.compressedCount > 0 && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Compressed {compressionStats.compressedCount} image(s), saved {' '}
                {(compressionStats.savedBytes / 1024 / 1024).toFixed(1)}MB 
                {' '}({(compressionStats.compressionRatio * 100).toFixed(0)}% reduction)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Optional Hints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information (Optional)</CardTitle>
          <CardDescription>
            Provide any specific details about your item to improve analysis accuracy
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="hints">Description or Notes</Label>
            <Textarea
              id="hints"
              placeholder="e.g., Brand: Apple, Model: iPhone 14, Color: Blue, Condition: Like new with original box..."
              value={hints}
              onChange={(e) => setHints(e.target.value)}
              disabled={isDisabled}
              rows={3}
              className="resize-none"
            />
            <div className="text-xs text-gray-500">
              This helps the AI identify the item more accurately
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          size="lg"
          className="min-w-32"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Continue to Analysis
              <FileImage className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Image Count Badge */}
      {images.length > 0 && (
        <div className="flex justify-center">
          <Badge variant="secondary" className="text-sm">
            {images.length} image{images.length !== 1 ? 's' : ''} ready for analysis
          </Badge>
        </div>
      )}
    </div>
  );
}

export default UploadStep;