"use client";

import React from "react";
import { TrendingUp, CheckCircle, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface PlatformRecommendation {
  platform: string;
  score: number;
  expectedPrice: number;
  fees?: { total: number };
  netProfit: number;
  expectedTimeToSale: string;
  advantages: string[];
  disadvantages: string[];
  reasons?: string[];
  successRate?: number;
  pros?: string[];
}

interface MarketplaceData {
  summary?: {
    totalListings: number;
  };
}

interface AnalysisResult {
  title: string;
  description: string;
  category: { primary: string; confidence: number };
  attributes: {
    brand?: string;
    model?: string;
    color?: string;
    condition: string;
    brand_confidence?: number;
    model_confidence?: number;
  };
  pricing: {
    suggested_price_nok: number;
    confidence: number;
  };
}

interface AgentPlatformStepProps {
  // Loading states
  isScanning: boolean;

  // Data
  marketplaceData: MarketplaceData | null;
  platformRecommendations: {
    recommendations: PlatformRecommendation[];
  } | null;
  analysisResult: AnalysisResult | null;

  // Selected platforms
  targetPlatforms: string[];
  setTargetPlatforms: (platforms: string[]) => void;

  // Actions
  onProceedToDraft: () => void;
  selectedPrice: number | null;
  setSelectedPrice: (price: number) => void;
  isGeneratingDraft?: boolean;
}

export default function AgentPlatformStep({
  isScanning,
  marketplaceData,
  platformRecommendations,
  analysisResult,
  targetPlatforms,
  setTargetPlatforms,
  onProceedToDraft,
  selectedPrice,
  // setSelectedPrice, // Unused parameter
  // isGeneratingDraft = false, // Unused parameter
}: AgentPlatformStepProps) {
  if (isScanning || !platformRecommendations) {
    return (
      <Card className="border-slate-200 shadow-sm animate-in fade-in-0 zoom-in-95 duration-500">
        <CardContent className="py-16">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-slate-900 rounded-full flex items-center justify-center animate-pulse">
                <TrendingUp className="h-10 w-10 text-white animate-bounce" />
              </div>
              <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-slate-200 rounded-full animate-ping" />
              <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-slate-400 rounded-full animate-spin" />
            </div>
            <div className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
              <h3 className="text-xl font-semibold text-slate-900">
                Scanning marketplaces
              </h3>
              <p className="text-slate-600">
                Analyzing prices and competition across FINN.no, Facebook, and
                Amazon...
              </p>
            </div>
            <div className="w-full max-w-xs mx-auto animate-in slide-in-from-bottom-2 duration-300 delay-400">
              <Progress
                value={65}
                className="h-2 transition-all duration-1000"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedRecommendations =
    platformRecommendations.recommendations?.sort(
      (a, b) => (b.netProfit || 0) - (a.netProfit || 0)
    ) || [];

  const highestNetProfit = Math.max(
    ...sortedRecommendations.map((r) => r.netProfit || 0)
  );

  const handlePlatformToggle = (platform: string) => {
    if (targetPlatforms.includes(platform)) {
      setTargetPlatforms(targetPlatforms.filter((p) => p !== platform));
    } else {
      setTargetPlatforms([...targetPlatforms, platform]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          {/* Item Information Header */}
          {analysisResult && (
            <div className="mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {analysisResult.attributes.brand && analysisResult.attributes.model
                      ? `${analysisResult.attributes.brand} ${analysisResult.attributes.model}`
                      : analysisResult.attributes.brand
                      ? `${analysisResult.attributes.brand} ${analysisResult.category.primary}`
                      : analysisResult.title}
                  </h2>
                  {analysisResult.attributes.brand_confidence && 
                   analysisResult.attributes.model_confidence && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const avgConfidence = (analysisResult.attributes.brand_confidence! + analysisResult.attributes.model_confidence!) / 2;
                        return (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.round(avgConfidence / 20)
                                ? "text-amber-400 fill-current"
                                : "text-slate-200"
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-sm text-slate-500">•</span>
                <span className="text-sm font-medium text-slate-600 capitalize">
                  {analysisResult.attributes.condition.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}
          
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            Platform Recommendations
          </CardTitle>
          <CardDescription className="text-slate-600">
            AI-powered analysis of{" "}
            {marketplaceData?.summary?.totalListings || 0} similar{" "}
            {analysisResult?.attributes.brand && analysisResult?.attributes.model
              ? `${analysisResult.attributes.brand} ${analysisResult.attributes.model}`
              : analysisResult?.attributes.brand
              ? analysisResult.attributes.brand
              : ""}{" "}
            listings • Best option auto-selected
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sortedRecommendations.map((rec, index) => {
              const isTopChoice =
                rec.netProfit === highestNetProfit &&
                sortedRecommendations.length > 1;
              const isSelected = targetPlatforms.includes(rec.platform);

              return (
                <div
                  key={rec.platform}
                  className={`relative group animate-in fade-in-50 zoom-in-95 duration-500 ${
                    isTopChoice ? "z-10" : "z-0"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Best Value Badge */}
                  {isTopChoice && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1 animate-pulse">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z"
                          />
                        </svg>
                        Best Value
                      </div>
                    </div>
                  )}

                  <div
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                      isTopChoice
                        ? isSelected
                          ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-xl scale-[1.03] ring-2 ring-amber-200"
                          : "border-amber-300 bg-gradient-to-br from-amber-50/50 to-orange-50/30 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                        : isSelected
                        ? "border-primary bg-gradient-to-br from-slate-50 to-slate-100/50 shadow-lg scale-[1.02]"
                        : "border-muted bg-white hover:border-slate-300 hover:shadow-md hover:scale-[1.01]"
                    }`}
                    onClick={() => handlePlatformToggle(rec.platform)}
                  >
                    {/* Selection Indicator */}
                    <div
                      className={`absolute top-0 left-0 w-full h-1 transition-all duration-300 ${
                        isSelected
                          ? isTopChoice
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : rec.platform === "finn"
                            ? "bg-red-500"
                            : rec.platform === "facebook"
                            ? "bg-blue-600"
                            : "bg-orange-500"
                          : "bg-transparent"
                      }`}
                    />

                    {/* Card Content */}
                    <div className="p-6">
                      {/* Platform Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                              isTopChoice
                                ? isSelected
                                  ? "bg-gradient-to-br from-amber-100 to-orange-100 ring-2 ring-amber-200"
                                  : "bg-gradient-to-br from-amber-50 to-orange-50 group-hover:from-amber-100 group-hover:to-orange-100"
                                : isSelected
                                ? rec.platform === "finn"
                                  ? "bg-red-100"
                                  : rec.platform === "facebook"
                                  ? "bg-blue-100"
                                  : "bg-orange-100"
                                : "bg-slate-100 group-hover:bg-slate-200"
                            }`}
                          >
                            {rec.platform === "finn" ? (
                              <span className="text-2xl font-bold text-red-600">
                                F
                              </span>
                            ) : rec.platform === "facebook" ? (
                              <svg
                                className="w-6 h-6 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                              </svg>
                            ) : (
                              <svg
                                className="w-6 h-6 text-orange-600"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M10.5 13.5c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1zm3 0c.5 0 1-.5 1-1s-.5-1-1-1-1 .5-1 1 .5 1 1 1zm6.5-5v7c0 1.5-1.5 3-3 3H7c-1.5 0-3-1.5-3-3v-7c0-1.5 1.5-3 3-3h10c1.5 0 3 1.5 3 3zM8.5 15.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5c0 .5-.5 1-1 1s-1-.5-1-1c0-1.5-1-2.5-2.5-2.5s-2.5 1-2.5 2.5c0 .5-.5 1-1 1s-1-.5-1-1zm13.5-7c0-2.5-2-4.5-4.5-4.5h-11C4 4 2 6 2 8.5v7C2 18 4 20 6.5 20h11c2.5 0 4.5-2 4.5-4.5v-7z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {rec.platform === "finn"
                                ? "FINN.no"
                                : rec.platform === "facebook"
                                ? "Facebook"
                                : "Amazon"}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < Math.round(rec.score / 20)
                                      ? "text-amber-400 fill-current"
                                      : "text-slate-200"
                                  }`}
                                />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">
                                {rec.score}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300 ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>

                      {/* Price Display */}
                      <div className="mb-6">
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                              Recommended Price
                            </p>
                            <p
                              className={`text-2xl font-bold ${
                                isTopChoice
                                  ? "text-amber-900"
                                  : "text-slate-900"
                              }`}
                            >
                              {rec.expectedPrice?.toLocaleString("en-US")}
                              <span className="text-sm font-normal text-slate-600">
                                {" "}
                                NOK
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                            <div>
                              <p className="text-xs text-slate-500">
                                Platform Fee
                              </p>
                              <p className="text-sm font-medium text-slate-700">
                                -{rec.fees?.total || 0} NOK
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">
                                Net Profit {isTopChoice && "👑"}
                              </p>
                              <p
                                className={`text-sm font-semibold ${
                                  isTopChoice
                                    ? "text-amber-600"
                                    : "text-green-600"
                                }`}
                              >
                                +{rec.netProfit?.toLocaleString("en-US") || 0}{" "}
                                NOK
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Key Stats */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm text-slate-600">
                              Time to sell
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {rec.expectedTimeToSale}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span className="text-sm text-slate-600">
                              Success rate
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {Math.round(rec.score * 0.9)}%
                          </span>
                        </div>
                      </div>

                      {/* Key Benefits */}
                      <div className="space-y-2">
                        {(rec.pros || rec.advantages)
                          ?.slice(0, 2)
                          .map((benefit: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                              <span className="text-xs text-slate-600 leading-relaxed">
                                {benefit}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


          {/* Action Buttons */}
          <div className="mt-6 flex gap-3 justify-center">
            <Button
              onClick={onProceedToDraft}
              disabled={targetPlatforms.length === 0 || !selectedPrice}
              size="lg"
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Generate Listing ({targetPlatforms.length} platform
              {targetPlatforms.length !== 1 ? "s" : ""})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
