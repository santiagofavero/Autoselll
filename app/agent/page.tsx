"use client";

import React, { useState, useCallback, useEffect } from "react";
import { compressImage, shouldCompressImage } from "@/lib/image-utils";
import { 
  type SupportedLanguage, 
  DEFAULT_LANGUAGE, 
  isSupportedLanguage 
} from "@/lib/config/languages";

// Import our new modular components
import AgentLayout from "@/components/agent/AgentLayout";
import AgentHeader from "@/components/agent/AgentHeader";
import AgentUploadStep from "@/components/agent/AgentUploadStep";
import AgentAnalysisStep from "@/components/agent/AgentAnalysisStep";
import AgentPlatformStep from "@/components/agent/AgentPlatformStep";
import AgentDraftStep from "@/components/agent/AgentDraftStep";
import AgentReviewStep from "@/components/agent/AgentReviewStep";
import AgentPublishStep from "@/components/agent/AgentPublishStep";

// Types
type WorkflowStep =
  | "upload"
  | "analysis"
  | "platform-selection"
  | "draft"
  | "review"
  | "publishing";

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

interface DraftResult {
  title: string;
  description: string;
  tags: string[];
  selling_points: string[];
  price: number;
}

export default function AgentPage() {
  // File handling state
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number>(0);
  const [compressing, setCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<
    {
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      newDimensions: { width: number; height: number };
    }[]
  >([]);

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // UI state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [marketplaceData, setMarketplaceData] = useState<{
    summary?: {
      totalListings: number;
    };
  } | null>(null);
  const [platformRecommendations, setPlatformRecommendations] =
    useState<{ recommendations: PlatformRecommendation[] } | null>(null);

  // Configuration state
  const [hints, setHints] = useState("");
  const [userPreference, setUserPreference] = useState<
    "quick_sale" | "market_price" | "maximize_profit"
  >("market_price");
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([
    "finn",
    "facebook",
  ]);
  const [autoPublish, setAutoPublish] = useState(false);
  
  // Language preference state
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  
  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('agent-language');
    if (savedLanguage && isSupportedLanguage(savedLanguage)) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);
  
  // Save language preference to localStorage when changed
  const handleLanguageChange = useCallback((language: SupportedLanguage) => {
    setSelectedLanguage(language);
    localStorage.setItem('agent-language', language);
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = useCallback(async (selectedFiles: File[]) => {
    const maxFiles = 5;
    const filesToProcess = selectedFiles.slice(0, maxFiles);

    setCompressing(true);
    setError(null);

    try {
      const processedFiles: File[] = [];
      const newPreviews: string[] = [];
      const newCompressionInfo: typeof compressionInfo = [];

      for (const file of filesToProcess) {
        if (shouldCompressImage(file)) {
          const {
            file: compressedFile,
            compressionRatio,
            newDimensions,
            compressedSize,
          } = await compressImage(file);
          processedFiles.push(compressedFile);
          newCompressionInfo.push({
            originalSize: file.size,
            compressedSize,
            compressionRatio,
            newDimensions,
          });
        } else {
          processedFiles.push(file);
          newCompressionInfo.push(
            null as unknown as (typeof compressionInfo)[number]
          );
        }

        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(processedFiles[processedFiles.length - 1]);
        });
        newPreviews.push(preview);
      }

      setFiles(processedFiles);
      setPreviews(newPreviews);
      setCompressionInfo(newCompressionInfo);
      setPrimaryImageIndex(0);
      setImageLoaded(false);
    } catch (error) {
      setError("Failed to process images. Please try again.");
      console.error("Image processing error:", error);
    } finally {
      setCompressing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  };

  // Workflow functions
  const runAnalysis = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    setCurrentStep("analysis");

    try {
      // Create form data for API call
      const formData = new FormData();

      // Add fileCount for the API to know how many files to expect
      formData.append("fileCount", files.length.toString());

      // Add files with indexed keys (file_0, file_1, etc.)
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      formData.append("primaryImageIndex", primaryImageIndex.toString());
      if (hints.trim()) {
        formData.append("hints", hints.trim());
      }
      formData.append("language", selectedLanguage);

      const response = await fetch("/api/agent/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();

      if (!result.success || !result.draft) {
        throw new Error(result.error || "Analysis failed");
      }

      setAnalysisResult(result.draft);

      // Start marketplace scanning
      await scanMarketplacesWithAnalysis(result.draft);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Analysis failed");
      setCurrentStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const scanMarketplacesWithAnalysis = async (analysis: AnalysisResult) => {
    setIsScanning(true);
    setCurrentStep("platform-selection");

    try {
      // Scan marketplaces
      const scanResponse = await fetch("/api/marketplace/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productAnalysis: analysis,
          platforms: ["finn", "facebook", "amazon"],
          basePrice: analysis.pricing.suggested_price_nok,
        }),
      });

      const scanData = await scanResponse.json();
      setMarketplaceData(scanData);

      // Get platform recommendations
      const recommendResponse = await fetch("/api/marketplace/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scanResult: scanData,
          userPreferences: {
            strategy: userPreference,
          },
        }),
      });

      const recommendData = await recommendResponse.json();
      setPlatformRecommendations(recommendData);

      // Auto-select highest profit platform and set price
      if (recommendData.recommendations?.length > 0) {
        const topChoice = recommendData.recommendations.reduce(
          (best: PlatformRecommendation, current: PlatformRecommendation) =>
            (current.netProfit || 0) > (best.netProfit || 0) ? current : best
        );
        setTargetPlatforms([topChoice.platform]);
        setSelectedPrice(
          topChoice.expectedPrice || analysis.pricing.suggested_price_nok
        );
      }
    } catch (error) {
      console.error("Marketplace scanning failed:", error);
      setSelectedPrice(analysis.pricing.suggested_price_nok);
    } finally {
      setIsScanning(false);
    }
  };

  const generateDraft = async () => {
    if (!analysisResult || !selectedPrice) return;

    setIsGeneratingDraft(true);
    setCurrentStep("draft");

    try {
      const response = await fetch("/api/agent/generate-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: analysisResult,
          selectedPrice,
          targetPlatforms,
          hints: hints || undefined,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Draft generation failed");
      }

      const result = await response.json();
      setDraftResult(result.optimizedListing);
      setCurrentStep("review");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Draft generation failed"
      );
      setCurrentStep("platform-selection");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const publishListing = async () => {
    if (!draftResult) return;

    setIsPublishing(true);
    setCurrentStep("publishing");

    try {
      const response = await fetch("/api/agent/publish-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing: draftResult,
          platforms: targetPlatforms,
        }),
      });

      if (!response.ok) {
        throw new Error("Publishing failed");
      }

      // Publishing completed successfully
      setTimeout(() => {
        setIsPublishing(false);
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Publishing failed");
      setCurrentStep("review");
      setIsPublishing(false);
    }
  };

  const resetWorkflow = () => {
    setFiles([]);
    setPreviews([]);
    setPrimaryImageIndex(0);
    setAnalysisResult(null);
    setSelectedPrice(null);
    setDraftResult(null);
    setMarketplaceData(null);
    setPlatformRecommendations(null);
    setCurrentStep("upload");
    setError(null);
    setLoading(false);
    setIsGeneratingDraft(false);
    setIsPublishing(false);
    setIsScanning(false);
    setImageLoaded(false);
  };

  const createChatUrl = () => {
    if (!analysisResult || !draftResult) return "/chat";

    const encodedData = encodeURIComponent(
      JSON.stringify({
        analysis: analysisResult,
        draft: draftResult,
        platforms: targetPlatforms,
        price: selectedPrice,
      })
    );

    return `/chat?listing=${encodedData}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <AgentHeader
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        userPreference={userPreference}
        setUserPreference={setUserPreference}
        targetPlatforms={targetPlatforms}
        setTargetPlatforms={setTargetPlatforms}
        hints={hints}
        setHints={setHints}
        autoPublish={autoPublish}
        setAutoPublish={setAutoPublish}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <AgentLayout currentStep={currentStep} error={error}>
        {currentStep === "upload" && (
          <AgentUploadStep
            files={files}
            previews={previews}
            primaryImageIndex={primaryImageIndex}
            setPrimaryImageIndex={setPrimaryImageIndex}
            loading={loading}
            compressing={compressing}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            compressionInfo={compressionInfo}
            runAnalysis={runAnalysis}
            resetWorkflow={resetWorkflow}
            imageLoaded={imageLoaded}
            setImageLoaded={setImageLoaded}
            targetPlatforms={targetPlatforms}
          />
        )}

        {currentStep === "analysis" && <AgentAnalysisStep files={files} />}

        {currentStep === "platform-selection" && (
          <AgentPlatformStep
            isScanning={isScanning}
            marketplaceData={marketplaceData}
            platformRecommendations={platformRecommendations}
            analysisResult={analysisResult}
            targetPlatforms={targetPlatforms}
            setTargetPlatforms={setTargetPlatforms}
            onProceedToDraft={generateDraft}
            selectedPrice={selectedPrice}
            setSelectedPrice={setSelectedPrice}
            isGeneratingDraft={isGeneratingDraft}
          />
        )}

        {currentStep === "draft" && <AgentDraftStep />}

        {currentStep === "review" && draftResult && (
          <AgentReviewStep
            draftResult={draftResult}
            previews={previews}
            primaryImageIndex={primaryImageIndex}
            targetPlatforms={targetPlatforms}
            publishListing={publishListing}
            isPublishing={isPublishing}
          />
        )}

        {currentStep === "publishing" && (
          <AgentPublishStep
            isPublishing={isPublishing}
            targetPlatforms={targetPlatforms}
            resetWorkflow={resetWorkflow}
            createChatUrl={createChatUrl}
          />
        )}
      </AgentLayout>
    </div>
  );
}
