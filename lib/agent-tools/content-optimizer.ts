/**
 * Content Optimization Tool
 * Creates platform-optimized listing content
 */

import { tool, generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { loggers } from '@/lib/agent-utils/logging';
import { numericConstraints } from '@/lib/agent-utils/validation';
import type { ListingDraft } from '@/lib/createListingDraftFromImage';
import { 
  type SupportedLanguage, 
  DEFAULT_LANGUAGE, 
  getAIPrompts, 
  isSupportedLanguage 
} from '@/lib/config/languages';

const logger = loggers.marketplace;

// =================================
// SCHEMAS
// =================================

const optimizedListingSchema = z.object({
  title: z.string().max(80),
  description: z.string().max(1500),
  tags: z.array(z.string()).max(10),
  selling_points: z.array(z.string()).max(7),
});

// =================================
// TOOL DEFINITION
// =================================

export const createOptimizedListingTool = tool({
  description: "Create platform-optimized listing", 
  inputSchema: z.object({
    originalDraft: z.any(), // ListingDraft type
    finalPrice: numericConstraints.price,
    platform: z.enum(['finn', 'facebook', 'amazon', 'both']),
    marketInsights: z.array(z.string()).optional(),
    language: z.enum(['nb-NO', 'en-US']).optional(),
  }),
  execute: async ({ originalDraft, finalPrice, platform, marketInsights = [], language = DEFAULT_LANGUAGE }) => {
    const draft = originalDraft as ListingDraft;
    
    // Validate language
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}. Supported languages: nb-NO, en-US`);
    }
    
    logger.starting('content optimization', { platform, finalPrice, language });
    
    // Get language-specific prompts
    const prompts = getAIPrompts(language);
    const platformPrompts = prompts.contentOptimization.platformPrompts;
    
    const system = prompts.contentOptimization.system(
      finalPrice, 
      marketInsights, 
      platformPrompts[platform]
    );

    try {
      const { object } = await generateObject({
        model: openai("gpt-4o"),
        schema: optimizedListingSchema,
        messages: [
          {
            role: "system", 
            content: system
          },
          {
            role: "user",
            content: `Original listing:
Title: ${draft.title}
Description: ${draft.description}
Category: ${draft.category.primary}
Condition: ${draft.attributes.condition}
Brand: ${draft.attributes.brand || 'Unknown'}
Color: ${draft.attributes.color || 'N/A'}

Optimize this for ${platform} platform(s) with price ${finalPrice} NOK.`
          }
        ],
        maxTokens: 800,
      });

      logger.success('Content optimization completed', {
        title: object.title,
        platform,
        finalPrice,
        language
      });

      return {
        success: true,
        optimizedListing: {
          ...object,
          price: finalPrice,
          platform,
          language,
          originalDraft: draft,
        },
        summary: `Created optimized listing for ${platform}: "${object.title}" - ${finalPrice} NOK`
      };
    } catch (error) {
      logger.failed('Content optimization', error instanceof Error ? error : String(error));
      throw error;
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface ContentOptimizationInput {
  originalDraft: ListingDraft;
  finalPrice: number;
  platform: 'finn' | 'facebook' | 'amazon' | 'both';
  marketInsights?: string[];
  language?: SupportedLanguage;
}

export interface OptimizedListing {
  title: string;
  description: string;
  tags: string[];
  selling_points: string[];
  price: number;
  platform: string;
  language: SupportedLanguage;
  originalDraft: ListingDraft;
}

export interface ContentOptimizationResult {
  success: boolean;
  optimizedListing?: OptimizedListing;
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone content optimization function for use outside of agent tools
 */
export async function createOptimizedListing(input: ContentOptimizationInput): Promise<ContentOptimizationResult> {
  return createOptimizedListingTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

const contentOptimizationInputSchema = z.object({
  originalDraft: z.any(),
  finalPrice: numericConstraints.price,
  platform: z.enum(['finn', 'facebook', 'amazon', 'both']),
  marketInsights: z.array(z.string()).optional(),
});

/**
 * Validates content optimization input
 */
export function validateContentOptimizationInput(input: unknown): input is ContentOptimizationInput {
  try {
    contentOptimizationInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe content optimization input with defaults
 */
export function createContentOptimizationInput(
  originalDraft: ListingDraft,
  finalPrice: number,
  platform: 'finn' | 'facebook' | 'amazon' | 'both',
  marketInsights: string[] = []
): ContentOptimizationInput {
  return {
    originalDraft,
    finalPrice: Math.round(finalPrice),
    platform,
    marketInsights: marketInsights.filter(insight => insight.trim().length > 0)
  };
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Determines optimal platform for content optimization
 */
export function determinePlatformForOptimization(
  targetPlatforms: string[],
  preferences: { prioritizeAmazon?: boolean } = {}
): 'finn' | 'facebook' | 'amazon' | 'both' {
  if (targetPlatforms.length === 1) {
    return targetPlatforms[0] as 'finn' | 'facebook' | 'amazon';
  }
  
  if (targetPlatforms.includes('amazon') && preferences.prioritizeAmazon) {
    return 'amazon';
  }
  
  return 'both';
}

/**
 * Extracts market insights from analysis results
 */
export function extractMarketInsights(
  priceValidation?: { summary?: string },
  priceRange?: { reasoning?: string }
): string[] {
  const insights: string[] = [];
  
  if (priceValidation?.summary) {
    insights.push(priceValidation.summary);
  }
  
  if (priceRange?.reasoning) {
    insights.push(priceRange.reasoning);
  }
  
  return insights.filter(insight => insight.length > 0);
}

/**
 * Validates optimized listing quality
 */
export function validateOptimizedListing(listing: OptimizedListing): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (listing.title.length < 5) {
    issues.push('Title too short');
  }
  
  if (listing.title.length > 80) {
    issues.push('Title too long');
  }
  
  if (listing.description.length < 30) {
    issues.push('Description too short');
  }
  
  if (listing.description.length > 1500) {
    issues.push('Description too long');
  }
  
  if (listing.tags.length === 0) {
    issues.push('No tags provided');
  }
  
  if (listing.selling_points.length === 0) {
    issues.push('No selling points provided');
  }
  
  if (listing.price <= 0) {
    issues.push('Invalid price');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}