"use client"

import React from "react"
import Image from "next/image"
import { CheckCircle, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// Removed unused import: ListingPreview

interface DraftResult {
  title: string
  description: string
  tags: string[]
  selling_points: string[]
  price: number
}

interface AgentReviewStepProps {
  draftResult: DraftResult
  previews: string[]
  primaryImageIndex: number
  targetPlatforms: string[]
  publishListing: () => Promise<void>
  isPublishing: boolean
}

export default function AgentReviewStep({
  draftResult,
  previews,
  primaryImageIndex,
  targetPlatforms,
  publishListing,
  isPublishing,
}: AgentReviewStepProps) {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-slate-900 animate-in slide-in-from-left-2 duration-300">
            <CheckCircle className="h-5 w-5 text-slate-600 animate-in zoom-in-50 duration-300 delay-100" />
            Listing Ready for Review
          </CardTitle>
          <CardDescription className="text-slate-600">
            Review and edit your listing before publishing
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Preview Image */}
            {previews.length > 0 && (
              <div className="lg:col-span-1 animate-in slide-in-from-left-4 duration-300 delay-200">
                <div className="relative w-full aspect-square">
                  <Image
                    src={previews[primaryImageIndex] || "/placeholder.svg"}
                    alt="Product"
                    fill
                    className="object-cover rounded-lg shadow-sm border border-slate-200 hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            )}

            {/* Listing Details */}
            <div className="lg:col-span-2 space-y-6 animate-in slide-in-from-right-4 duration-300 delay-300">
              {/* Title and Price */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-slate-900 hover:text-slate-700 transition-colors duration-200">
                  {draftResult.title}
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-slate-900 hover:scale-105 transition-transform duration-200">
                    {draftResult.price.toLocaleString()} NOK
                  </span>
                  <div className="flex gap-2">
                    <Badge
                      variant="default"
                      className="bg-slate-100 text-slate-800 border-slate-200 hover:scale-105 transition-transform duration-200"
                    >
                      AI Recommended
                    </Badge>
                    {targetPlatforms.map((platform, index) => (
                      <Badge
                        key={platform}
                        variant="secondary"
                        className="bg-slate-100 text-slate-600 hover:scale-105 transition-transform duration-200"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {platform === "finn" ? "FINN.no" : 
                         platform === "facebook" ? "Facebook" : 
                         "Amazon"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300 delay-400">
                <h4 className="font-semibold text-slate-900">Description</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors duration-200">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {draftResult.description}
                  </p>
                </div>
              </div>

              {/* Selling Points */}
              {draftResult.selling_points && draftResult.selling_points.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300 delay-500">
                  <h4 className="font-semibold text-slate-900">Key Selling Points</h4>
                  <ul className="space-y-2">
                    {draftResult.selling_points.map((point, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm hover:bg-slate-50 p-2 rounded-lg transition-colors duration-150 animate-in slide-in-from-left-2 duration-300"
                        style={{ animationDelay: `${(index + 1) * 100}ms` }}
                      >
                        <CheckCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <span className="text-slate-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {draftResult.tags && draftResult.tags.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300 delay-600">
                  <h4 className="font-semibold text-slate-900">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {draftResult.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-slate-600 border-slate-300 hover:scale-105 transition-transform duration-200 animate-in zoom-in-50 duration-300"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex justify-center animate-in slide-in-from-bottom-2 duration-300 delay-700">
            <Button
              onClick={publishListing}
              disabled={isPublishing}
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
            >
              {isPublishing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                  Publish to {targetPlatforms.length} Platform{targetPlatforms.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}