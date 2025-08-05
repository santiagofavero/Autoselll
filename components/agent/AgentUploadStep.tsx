"use client"

import React from "react"
import { Upload, Loader2, Eye, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CompressionInfo {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  newDimensions: { width: number; height: number }
}

interface AgentUploadStepProps {
  // File state
  files: File[]
  previews: string[]
  primaryImageIndex: number
  setPrimaryImageIndex: (index: number) => void
  
  // Loading states
  loading: boolean
  compressing: boolean
  
  // Drag and drop
  dragActive: boolean
  handleDrag: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  
  // Compression info
  compressionInfo: CompressionInfo[]
  
  // Actions
  runAnalysis: () => Promise<void>
  resetWorkflow: () => void
  
  // UI state
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
  
  // Configuration
  targetPlatforms: string[]
}

export default function AgentUploadStep({
  // files, // Unused parameter
  previews,
  primaryImageIndex,
  setPrimaryImageIndex,
  loading,
  compressing,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileSelect,
  compressionInfo,
  runAnalysis,
  resetWorkflow,
  imageLoaded,
  setImageLoaded,
  targetPlatforms,
}: AgentUploadStepProps) {
  return (
    <Card className="border-slate-200 shadow-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center border-b border-slate-100">
        <CardTitle className="text-xl text-slate-900">Upload Product Images</CardTitle>
        <CardDescription className="text-slate-600">
          Upload 1-5 clear photos of your product (multiple angles recommended)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive
              ? "border-slate-400 bg-slate-50 scale-105 shadow-lg"
              : "border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:scale-[1.02]"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {compressing ? (
            <div className="space-y-4 animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-slate-600 mb-4" />
                  <div className="absolute inset-0 h-12 w-12 border-4 border-slate-200 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-medium text-slate-900">Optimizing image...</p>
                <p className="text-sm text-slate-500">Preparing for AI analysis</p>
              </div>
            </div>
          ) : previews.length > 0 ? (
            <div className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-500">
              {/* Image Gallery */}
              <div className="space-y-4">
                {/* Primary Image */}
                <div className="relative inline-block">
                  <img
                    src={previews[primaryImageIndex] || "/placeholder.svg"}
                    alt={`Preview ${primaryImageIndex + 1}`}
                    className={`max-w-full max-h-80 mx-auto rounded-lg shadow-sm border border-slate-200 transition-all duration-500 ${
                      imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                    }`}
                    onLoad={() => setImageLoaded(true)}
                  />
                  {compressionInfo[primaryImageIndex] && (
                    <div className="absolute top-2 right-2 animate-in slide-in-from-top-2 duration-300 delay-200">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 border-slate-200 hover:scale-105 transition-transform duration-200"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Optimized
                      </Badge>
                    </div>
                  )}
                  {previews.length > 1 && (
                    <div className="absolute bottom-2 right-2 animate-in slide-in-from-bottom-2 duration-300 delay-200">
                      <Badge
                        variant="secondary"
                        className="bg-slate-900 text-white border-slate-200 hover:scale-105 transition-transform duration-200"
                      >
                        {primaryImageIndex + 1} / {previews.length}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery for Multiple Images */}
                {previews.length > 1 && (
                  <div className="flex justify-center gap-2 animate-in slide-in-from-bottom-2 duration-300 delay-300">
                    {previews.map((preview, index) => (
                      <button
                        key={index}
                        onClick={() => setPrimaryImageIndex(index)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                          index === primaryImageIndex
                            ? "border-slate-900 ring-2 ring-slate-900 ring-offset-2"
                            : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <img
                          src={preview}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {compressionInfo[index] && (
                          <div className="absolute top-0.5 right-0.5">
                            <Zap className="h-2 w-2 text-white drop-shadow-sm" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Compression Info */}
              {compressionInfo.some(info => info !== null) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm max-w-md mx-auto animate-in slide-in-from-bottom-2 duration-300 delay-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-800">
                      {previews.length === 1 ? "Image Optimized" : `${compressionInfo.filter(info => info !== null).length} Images Optimized`}
                    </span>
                  </div>
                  {compressionInfo[primaryImageIndex] && (
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div className="hover:text-slate-800 transition-colors duration-150">
                        Original: {(compressionInfo[primaryImageIndex].originalSize / 1024).toFixed(0)} KB
                      </div>
                      <div className="hover:text-slate-800 transition-colors duration-150">
                        Optimized: {(compressionInfo[primaryImageIndex].compressedSize / 1024).toFixed(0)} KB
                      </div>
                      <div className="hover:text-slate-800 transition-colors duration-150">
                        Saved: {compressionInfo[primaryImageIndex].compressionRatio.toFixed(1)}%
                      </div>
                      <div className="hover:text-slate-800 transition-colors duration-150">
                        Size: {compressionInfo[primaryImageIndex].newDimensions.width}×{compressionInfo[primaryImageIndex].newDimensions.height}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-center animate-in slide-in-from-bottom-2 duration-300 delay-400">
                <Button
                  onClick={runAnalysis}
                  disabled={loading || targetPlatforms.length === 0}
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      Start AI Analysis
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetWorkflow}
                  className="border-slate-300 text-slate-600 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Upload
                className={`mx-auto h-16 w-16 text-slate-400 transition-all duration-300 ${dragActive ? "scale-110 text-slate-600" : "hover:scale-105"}`}
              />
              <div>
                <p className="text-xl font-medium text-slate-700">Drag & drop your images here</p>
                <p className="text-slate-500 mt-1">or click to browse files (up to 5 images)</p>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    size="lg"
                    className="cursor-pointer border-slate-300 text-slate-600 hover:bg-slate-50 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                  >
                    <Upload className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    Choose Files
                  </Button>
                </label>
              </div>
              <p className="text-xs text-slate-400">Supports JPG, PNG, WebP • Max 10MB</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}