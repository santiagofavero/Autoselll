/**
 * Marketplace Agent - Refactored Architecture
 * Main entry point that uses the new modular agent tools and orchestrator
 */

// Re-export the new orchestrator as the main agent function
export { 
  runMarketplaceAgent,
  type AgentWorkflowResult,
  type WorkflowPhase,
  type WorkflowStep,
  WorkflowOrchestrator 
} from '@/lib/agent-core/workflow-orchestrator';

// Re-export individual tools for standalone use
export {
  analyzeImage,
  type ImageAnalysisInput,
  type ImageAnalysisResult,
} from '@/lib/agent-tools/image-analyzer';

export {
  validatePriceOnFinn,
  type PriceValidationInput,
  type PriceValidationResult,
  type ItemAttributes,
} from '@/lib/agent-tools/price-validator';

export {
  analyzeAmazonEligibility,
  type AmazonAnalysisInput,
  type AmazonAnalysisResult,
  type AmazonItemAttributes,
} from '@/lib/agent-tools/amazon-analyzer';

export {
  recommendOptimalPlatforms,
  type PlatformRecommendationInput,
  type PlatformRecommendationResult,
  type PlatformItemAttributes,
} from '@/lib/agent-tools/platform-recommender';

export {
  suggestPriceRange,
  type PriceOptimizationInput,
  type PriceOptimizationResult,
  type PriceRange,
} from '@/lib/agent-tools/price-optimizer';

export {
  createOptimizedListing,
  type ContentOptimizationInput,
  type ContentOptimizationResult,
  type OptimizedListing,
} from '@/lib/agent-tools/content-optimizer';

export {
  queueMarketplacePublishing,
  type PublishingInput,
  type PublishingResult,
  type ListingData,
} from '@/lib/agent-tools/publisher';

// Re-export utilities and validation for convenience
export {
  loggers,
  createLogger,
  createPerformanceLogger,
} from '@/lib/agent-utils/logging';

export {
  createErrorResponse,
  createValidationError,
  handleCaughtError,
} from '@/lib/agent-utils/error-handling';

export {
  agentWorkflowInputSchema,
  conditionSchema,
  userPreferenceSchema,
  platformSchema,
  type AgentWorkflowInput,
  type ItemCondition,
  type UserPreference,
  type Platform,
} from '@/lib/agent-utils/validation';