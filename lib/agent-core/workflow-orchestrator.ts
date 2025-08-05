/**
 * Workflow Orchestrator
 * Coordinates the execution of all agent tools in a structured workflow
 */

import { loggers, createPerformanceLogger } from "@/lib/agent-utils/logging";
import {
  agentWorkflowInputSchema,
  type AgentWorkflowInput,
} from "@/lib/agent-utils/validation";

// Import all agent tools
import {
  analyzeImage,
  type ImageAnalysisResult,
} from "@/lib/agent-tools/image-analyzer";
import {
  validatePriceOnFinn,
  extractItemAttributesFromDraft,
  type PriceValidationResult,
} from "@/lib/agent-tools/price-validator";
import {
  analyzeAmazonEligibility,
  extractAmazonAttributesFromDraft,
  type AmazonAnalysisResult,
} from "@/lib/agent-tools/amazon-analyzer";
import {
  recommendOptimalPlatforms,
  extractPlatformAttributesFromDraft,
  type PlatformRecommendationResult,
} from "@/lib/agent-tools/platform-recommender";
import {
  suggestPriceRange,
  extractMarketInsights,
  type PriceOptimizationResult,
} from "@/lib/agent-tools/price-optimizer";
import {
  createOptimizedListing,
  determinePlatformForOptimization,
  type ContentOptimizationResult,
} from "@/lib/agent-tools/content-optimizer";
import {
  queueMarketplacePublishing,
  prepareListingDataFromOptimized,
  type PublishingResult,
} from "@/lib/agent-tools/publisher";

const logger = loggers.workflow;
const performanceLogger = createPerformanceLogger("WorkflowOrchestrator");

// =================================
// WORKFLOW TYPES
// =================================

export type WorkflowPhase =
  | "analysis"
  | "pricing"
  | "platform_selection"
  | "optimization"
  | "publishing"
  | "completed"
  | "error";

export interface WorkflowStep {
  tool: string;
  result: unknown;
  summary: string;
  success: boolean;
  duration?: number;
}

export interface WorkflowState {
  phase: WorkflowPhase;
  imageUrl: string;
  hints?: string;
  userPreference: "quick_sale" | "market_price" | "maximize_profit";
  targetPlatforms: Array<"finn" | "facebook" | "amazon">;
  autoPublish: boolean;
  results: {
    analysis: ImageAnalysisResult | null;
    priceValidation: PriceValidationResult | null;
    amazonEligibility: AmazonAnalysisResult | null;
    platformRecommendation: PlatformRecommendationResult | null;
    priceRange: PriceOptimizationResult | null;
    optimizedListing: ContentOptimizationResult | null;
    publishing: PublishingResult | null;
  };
  steps: WorkflowStep[];
  workflowText: string;
  startTime: number;
  errors: string[];
}

export interface AgentWorkflowResult {
  phase: WorkflowPhase;
  data: {
    workflowText: string;
    steps: WorkflowStep[];
    fullResult?: unknown;
    workflowState?: WorkflowState["results"];
  };
  nextAction?: string;
  needsUserInput?: boolean;
  summary: string;
  success: boolean;
  duration?: number;
}

// =================================
// ORCHESTRATOR CLASS
// =================================

export class WorkflowOrchestrator {
  private state: WorkflowState;

  constructor(input: AgentWorkflowInput) {
    logger.info("Initializing workflow orchestrator", {
      userPreference: input.userPreference,
      targetPlatforms: input.targetPlatforms,
      autoPublish: input.autoPublish,
    });

    this.state = {
      phase: "analysis",
      imageUrl: input.imageUrl,
      hints: input.hints,
      userPreference: input.userPreference,
      targetPlatforms: input.targetPlatforms,
      autoPublish: input.autoPublish,
      results: {
        analysis: null,
        priceValidation: null,
        amazonEligibility: null,
        platformRecommendation: null,
        priceRange: null,
        optimizedListing: null,
        publishing: null,
      },
      steps: [],
      workflowText: "",
      startTime: Date.now(),
      errors: [],
    };
  }

  /**
   * Executes the complete workflow
   */
  async execute(): Promise<AgentWorkflowResult> {
    logger.starting("agent workflow execution");
    performanceLogger.start("complete_workflow");

    try {
      // Step 1: Image Analysis
      await this.executeStep1ImageAnalysis();

      // Step 2: Price Validation (FINN.no)
      await this.executeStep2PriceValidation();

      // Step 3: Amazon Eligibility Analysis
      await this.executeStep3AmazonAnalysis();

      // Step 4: Platform Recommendations
      await this.executeStep4PlatformRecommendation();

      // Step 5: Price Range Optimization
      await this.executeStep5PriceOptimization();

      // Step 6: Content Optimization
      await this.executeStep6ContentOptimization();

      // Step 7: Publishing (optional)
      if (this.state.autoPublish) {
        await this.executeStep7Publishing();
        this.state.phase = "completed";
      } else {
        this.state.workflowText +=
          "Workflow Complete: Ready for user confirmation before publishing\n\n";
        this.state.phase = "optimization";
      }

      performanceLogger.end("complete_workflow");

      const result = this.buildSuccessResult();
      logger.success("Workflow execution completed", {
        phase: result.phase,
        stepsExecuted: result.data.steps.length,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      performanceLogger.end("complete_workflow");
      this.state.phase = "error";
      this.state.errors.push(
        error instanceof Error ? error.message : String(error)
      );

      logger.error("Workflow execution failed", {
        error: error instanceof Error ? error.message : String(error),
      });

      return this.buildErrorResult(error);
    }
  }

  // =================================
  // WORKFLOW STEPS
  // =================================

  private async executeStep1ImageAnalysis(): Promise<void> {
    logger.step("Step 1", "Image Analysis");
    this.state.phase = "analysis";

    const startTime = Date.now();

    try {
      const result = await analyzeImage({
        imageUrl: this.state.imageUrl,
        hints: this.state.hints,
      });

      const duration = Date.now() - startTime;

      this.state.results.analysis = result;
      this.addStep(
        "analyzeImage",
        result,
        result.summary || "Image analysis completed",
        result.success,
        duration
      );
      this.state.workflowText += `Step 1 Complete: ${result.summary}\n\n`;

      if (!result.success || !result.draft) {
        throw new Error("Image analysis failed - cannot continue workflow");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.addStep(
        "analyzeImage",
        { success: false, error: errorMessage },
        errorMessage,
        false,
        duration
      );
      throw error;
    }
  }

  private async executeStep2PriceValidation(): Promise<void> {
    logger.step("Step 2", "Multi-Platform Price Research");
    this.state.phase = "pricing";

    const startTime = Date.now();

    try {
      if (!this.state.results.analysis?.draft) {
        throw new Error("No analysis result available");
      }

      const itemAttributes = extractItemAttributesFromDraft({
        attributes: {
          brand:
            this.state.results.analysis.draft.attributes.brand || "Unknown",
          model:
            this.state.results.analysis.draft.attributes.model || "Unknown",
          model_number:
            this.state.results.analysis.draft.attributes.model_number,
          series: this.state.results.analysis.draft.attributes.series,
          color:
            this.state.results.analysis.draft.attributes.color || "Unknown",
          condition: this.state.results.analysis.draft.attributes.condition,
          technical_specs:
            this.state.results.analysis.draft.attributes.technical_specs,
        },
        category: {
          primary: this.state.results.analysis.draft.category.primary,
        },
      });

      const result = await validatePriceOnFinn({
        itemAttributes,
        suggestedPrice:
          this.state.results.analysis.draft.pricing.suggested_price_nok,
      });

      const duration = Date.now() - startTime;

      this.state.results.priceValidation = result;
      this.addStep(
        "validatePriceOnFinn",
        result,
        result.summary,
        result.success,
        duration
      );
      this.state.workflowText += `Step 2 Complete: ${result.summary}\n\n`;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Step 2 failed, continuing with AI price", {
        error: errorMessage,
      });

      const fallbackResult = {
        success: false,
        error: errorMessage,
        summary: "Price validation failed, using AI suggested price",
      };

      this.state.results.priceValidation = fallbackResult;
      this.addStep(
        "validatePriceOnFinn",
        fallbackResult,
        fallbackResult.summary,
        false,
        duration
      );
      this.state.workflowText += `Step 2 Warning: Price validation failed, continuing with AI price\n\n`;
    }
  }

  private async executeStep3AmazonAnalysis(): Promise<void> {
    logger.step("Step 3", "Amazon Eligibility Analysis");

    const startTime = Date.now();

    try {
      if (!this.state.results.analysis?.draft) {
        throw new Error("No analysis result available");
      }

      const itemAttributes = extractAmazonAttributesFromDraft({
        attributes: {
          brand:
            this.state.results.analysis.draft.attributes.brand || "Unknown",
          model:
            this.state.results.analysis.draft.attributes.model || "Unknown",
          model_number:
            this.state.results.analysis.draft.attributes.model_number,
          series: this.state.results.analysis.draft.attributes.series,
          condition: this.state.results.analysis.draft.attributes.condition,
          technical_specs:
            this.state.results.analysis.draft.attributes.technical_specs,
        },
        category: {
          primary: this.state.results.analysis.draft.category.primary,
        },
        title: this.state.results.analysis.draft.title,
      });

      const result = await analyzeAmazonEligibility({
        itemAttributes,
        suggestedPrice:
          this.state.results.analysis.draft.pricing.suggested_price_nok,
      });

      const duration = Date.now() - startTime;

      this.state.results.amazonEligibility = result;
      this.addStep(
        "analyzeAmazonEligibility",
        result,
        result.summary,
        result.success,
        duration
      );
      this.state.workflowText += `Step 3 Complete: ${result.summary}\n\n`;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Step 3 failed, continuing without Amazon", {
        error: errorMessage,
      });

      const fallbackResult = {
        success: false,
        available: false,
        error: errorMessage,
        summary: "Amazon eligibility check failed",
      };

      this.state.results.amazonEligibility = fallbackResult;
      this.addStep(
        "analyzeAmazonEligibility",
        fallbackResult,
        fallbackResult.summary,
        false,
        duration
      );
      this.state.workflowText += `Step 3 Warning: Amazon analysis failed, continuing with other platforms\n\n`;
    }
  }

  private async executeStep4PlatformRecommendation(): Promise<void> {
    logger.step("Step 4", "Platform Recommendation");
    this.state.phase = "platform_selection";

    const startTime = Date.now();

    try {
      if (!this.state.results.analysis?.draft) {
        throw new Error("No analysis result available");
      }

      const itemAttributes = extractPlatformAttributesFromDraft({
        attributes: {
          brand:
            this.state.results.analysis.draft.attributes.brand || "Unknown",
          model:
            this.state.results.analysis.draft.attributes.model || "Unknown",
          condition: this.state.results.analysis.draft.attributes.condition,
          color: this.state.results.analysis.draft.attributes.color,
        },
        category: {
          primary: this.state.results.analysis.draft.category.primary,
        },
        title: this.state.results.analysis.draft.title,
      });

      const result = await recommendOptimalPlatforms({
        itemAttributes,
        suggestedPrice:
          this.state.results.analysis.draft.pricing.suggested_price_nok,
        finnAnalysis: this.state.results.priceValidation,
        amazonAnalysis: this.state.results.amazonEligibility,
        userPreference: this.state.userPreference,
      });

      const duration = Date.now() - startTime;

      this.state.results.platformRecommendation = result;
      this.addStep(
        "recommendOptimalPlatforms",
        result,
        result.recommendations?.summary || "Platform recommendation completed",
        result.success,
        duration
      );
      this.state.workflowText += `Step 4 Complete: ${result.recommendations?.summary}\n\n`;

      // Update target platforms based on recommendations if available
      if (result.success && result.recommendations?.primary) {
        this.state.targetPlatforms = result.recommendations.primary as Array<
          "finn" | "facebook" | "amazon"
        >;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.warn("Step 4 failed", { error: errorMessage });

      const fallbackResult = {
        success: false,
        error: errorMessage,
      };

      this.state.results.platformRecommendation = fallbackResult;
      this.addStep(
        "recommendOptimalPlatforms",
        fallbackResult,
        "Platform recommendation failed, using default platforms",
        false,
        duration
      );
      this.state.workflowText += `Step 4 Warning: Platform recommendation failed, using default platforms\n\n`;
    }
  }

  private async executeStep5PriceOptimization(): Promise<void> {
    logger.step("Step 5", "Price Range Optimization");

    const startTime = Date.now();

    try {
      if (!this.state.results.analysis?.draft) {
        throw new Error("No analysis result available");
      }

      const result = await suggestPriceRange({
        aiSuggestedPrice:
          this.state.results.analysis.draft.pricing.suggested_price_nok,
        marketAnalysis: this.state.results.priceValidation?.analysis,
        userPreference: this.state.userPreference,
      });

      const duration = Date.now() - startTime;

      this.state.results.priceRange = result;
      this.addStep(
        "suggestPriceRange",
        result,
        result.summary,
        result.success,
        duration
      );
      this.state.workflowText += `Step 5 Complete: ${result.summary}\n\n`;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addStep(
        "suggestPriceRange",
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        "Price range optimization failed",
        false,
        duration
      );
      throw error;
    }
  }

  private async executeStep6ContentOptimization(): Promise<void> {
    logger.step("Step 6", "Content Optimization");
    this.state.phase = "optimization";

    const startTime = Date.now();

    try {
      if (
        !this.state.results.analysis?.draft ||
        !this.state.results.priceRange?.priceRange
      ) {
        throw new Error("Missing required data for content optimization");
      }

      const finalPrice = this.state.results.priceRange.priceRange.recommended;
      const platform = determinePlatformForOptimization(
        this.state.targetPlatforms,
        { prioritizeAmazon: this.state.targetPlatforms.includes("amazon") }
      );

      const marketInsights = extractMarketInsights(
        this.state.results.priceValidation || undefined,
        this.state.results.priceRange || undefined
      );

      const result = await createOptimizedListing({
        originalDraft: this.state.results.analysis.draft,
        finalPrice,
        platform,
        marketInsights,
      });

      const duration = Date.now() - startTime;

      this.state.results.optimizedListing = result;
      this.addStep(
        "createOptimizedListing",
        result,
        result.summary,
        result.success,
        duration
      );
      this.state.workflowText += `Step 6 Complete: ${result.summary}\n\n`;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addStep(
        "createOptimizedListing",
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        "Content optimization failed",
        false,
        duration
      );
      throw error;
    }
  }

  private async executeStep7Publishing(): Promise<void> {
    logger.step("Step 7", "Intelligent Publishing Queue");
    this.state.phase = "publishing";

    const startTime = Date.now();

    try {
      if (!this.state.results.optimizedListing?.optimizedListing) {
        throw new Error("No optimized listing available");
      }

      const amazonAnalysisForPublishing = this.state.results.amazonEligibility ? {
        analysis: {
          catalogMatch: this.state.results.amazonEligibility.analysis?.catalogMatch || undefined
        }
      } : undefined;

      const listingData = prepareListingDataFromOptimized(
        this.state.results.optimizedListing.optimizedListing,
        amazonAnalysisForPublishing
      );

      const result = await queueMarketplacePublishing({
        listing: listingData,
        platforms: this.state.targetPlatforms,
        schedule: "immediate",
      });

      const duration = Date.now() - startTime;

      this.state.results.publishing = result;
      this.addStep(
        "queueMarketplacePublishing",
        result,
        result.summary,
        result.success,
        duration
      );
      this.state.workflowText += `Step 7 Complete: ${result.summary}\n\n`;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addStep(
        "queueMarketplacePublishing",
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        "Publishing queue failed",
        false,
        duration
      );
      throw error;
    }
  }

  // =================================
  // HELPER METHODS
  // =================================

  private addStep(
    tool: string,
    result: unknown,
    summary: string,
    success: boolean,
    duration?: number
  ): void {
    this.state.steps.push({
      tool,
      result,
      summary,
      success,
      duration,
    });
  }

  private buildSuccessResult(): AgentWorkflowResult {
    const totalDuration = Date.now() - this.state.startTime;
    const needsUserInput =
      !this.state.autoPublish &&
      (this.state.phase === "optimization" ||
        this.state.phase === "pricing" ||
        this.state.phase === "platform_selection");

    return {
      phase: this.state.phase,
      data: {
        workflowText: this.state.workflowText.trim(),
        steps: this.state.steps.map((step) => ({
          tool: step.tool,
          result: step.result,
          summary: step.summary,
          success: step.success,
          duration: step.duration,
        })),
        fullResult: {
          steps: this.state.steps,
          text: this.state.workflowText.trim(),
        },
        workflowState: this.state.results,
      },
      nextAction: needsUserInput
        ? this.state.phase === "pricing"
          ? "confirm_price_range"
          : "confirm_publishing"
        : "workflow_complete",
      needsUserInput,
      summary:
        this.state.workflowText
          .split("\n")
          .filter((line) => line.trim())
          .pop() || "Marketplace listing workflow completed",
      success: true,
      duration: totalDuration,
    };
  }

  private buildErrorResult(error: unknown): AgentWorkflowResult {
    const totalDuration = Date.now() - this.state.startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      phase: "error",
      data: {
        workflowText: this.state.workflowText || "Workflow failed to start",
        steps: this.state.steps,
        fullResult: {
          error: errorMessage,
          errors: this.state.errors,
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      summary: `Workflow failed: ${errorMessage}`,
      success: false,
      duration: totalDuration,
    };
  }
}

// =================================
// MAIN ORCHESTRATOR FUNCTION
// =================================

/**
 * Main entry point for the marketplace agent workflow
 */
export async function runMarketplaceAgent(
  input: AgentWorkflowInput
): Promise<AgentWorkflowResult> {
  logger.starting("marketplace agent workflow", {
    imageUrl: input.imageUrl.substring(0, 50) + "...",
    hints: input.hints,
    userPreference: input.userPreference,
    targetPlatforms: input.targetPlatforms,
    autoPublish: input.autoPublish,
  });

  // Validate input
  try {
    agentWorkflowInputSchema.parse(input);
  } catch (error) {
    logger.error("Invalid workflow input", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      phase: "error",
      data: {
        workflowText: "Workflow failed: Invalid input parameters",
        steps: [],
        fullResult: { error: "Invalid input parameters" },
      },
      summary: "Workflow failed: Invalid input parameters",
      success: false,
    };
  }

  // Create and execute orchestrator
  const orchestrator = new WorkflowOrchestrator(input);
  return orchestrator.execute();
}
