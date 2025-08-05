/**
 * Price Range Optimization Tool
 * Calculates optimized price ranges based on market data and user preferences
 */

import { tool } from 'ai';
import { z } from 'zod';
import { loggers } from '@/lib/agent-utils/logging';
import { numericConstraints, userPreferenceSchema } from '@/lib/agent-utils/validation';

const logger = loggers.pricing;

// =================================
// SCHEMAS
// =================================

const marketAnalysisSchema = z.object({
  suggestions: z.object({
    conservative: z.number(),
    market: z.number(),
    optimistic: z.number(),
  }),
  confidence: z.number(),
  sampleSize: z.number(),
}).optional();

// =================================
// TOOL DEFINITION
// =================================

export const suggestPriceRangeTool = tool({
  description: "Suggest price range using market data",
  inputSchema: z.object({
    aiSuggestedPrice: numericConstraints.price,
    marketAnalysis: marketAnalysisSchema,
    userPreference: userPreferenceSchema.optional(),
  }),
  execute: async ({ aiSuggestedPrice, marketAnalysis, userPreference = 'market_price' }) => {
    logger.starting('price range optimization', { aiSuggestedPrice, userPreference });
    
    // Simple conservative pricing: 10-15% discount from AI price
    const discountPercent = 0.15; // 15% discount for conservative estimate
    const conservativePrice = Math.round(aiSuggestedPrice * (1 - discountPercent));
    
    let finalRange: { min: number; max: number; recommended: number };

    // Always use simple logic for now instead of complex FINN analysis
    switch (userPreference) {
      case 'quick_sale':
        finalRange = { 
          min: conservativePrice, 
          max: aiSuggestedPrice, 
          recommended: conservativePrice 
        };
        break;
      case 'maximize_profit':
        finalRange = { 
          min: aiSuggestedPrice, 
          max: Math.round(aiSuggestedPrice * 1.1), 
          recommended: aiSuggestedPrice 
        };
        break;
      default: // market_price
        finalRange = { 
          min: conservativePrice, 
          max: aiSuggestedPrice, 
          recommended: conservativePrice 
        };
    }

    const confidence = 0.8; // High confidence in simple calculation
    const reasoning = `Conservative estimate (${Math.round(discountPercent * 100)}% discount from AI price for faster sale)`;

    logger.success('Price range calculated', {
      recommended: finalRange.recommended,
      range: `${finalRange.min}-${finalRange.max}`,
      confidence
    });

    return {
      success: true,
      priceRange: finalRange,
      confidence,
      reasoning,
      marketBased: false, // This is now AI-based conservative pricing
      summary: `Recommended price: ${finalRange.recommended} NOK (range: ${finalRange.min}-${finalRange.max} NOK). ${reasoning}.`
    };
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface MarketAnalysis {
  suggestions: {
    conservative: number;
    market: number;
    optimistic: number;
  };
  confidence: number;
  sampleSize: number;
}

export interface PriceOptimizationInput {
  aiSuggestedPrice: number;
  marketAnalysis?: MarketAnalysis;
  userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
}

export interface PriceRange {
  min: number;
  max: number;
  recommended: number;
}

export interface PriceOptimizationResult {
  success: boolean;
  priceRange?: PriceRange;
  confidence?: number;
  reasoning?: string;
  marketBased?: boolean;
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone price optimization function for use outside of agent tools
 */
export async function suggestPriceRange(input: PriceOptimizationInput): Promise<PriceOptimizationResult> {
  return suggestPriceRangeTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

const priceOptimizationInputSchema = z.object({
  aiSuggestedPrice: numericConstraints.price,
  marketAnalysis: marketAnalysisSchema,
  userPreference: userPreferenceSchema.optional(),
});

/**
 * Validates price optimization input
 */
export function validatePriceOptimizationInput(input: unknown): input is PriceOptimizationInput {
  try {
    priceOptimizationInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe price optimization input with defaults
 */
export function createPriceOptimizationInput(
  aiSuggestedPrice: number,
  options: {
    marketAnalysis?: MarketAnalysis;
    userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
  } = {}
): PriceOptimizationInput {
  return {
    aiSuggestedPrice: Math.round(aiSuggestedPrice),
    marketAnalysis: options.marketAnalysis,
    userPreference: options.userPreference || 'market_price'
  };
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Calculates percentage difference between prices
 */
export function calculatePriceAdjustment(originalPrice: number, newPrice: number): {
  percentage: number;
  direction: 'increase' | 'decrease' | 'same';
  difference: number;
} {
  const difference = newPrice - originalPrice;
  const percentage = Math.abs((difference / originalPrice) * 100);
  
  let direction: 'increase' | 'decrease' | 'same';
  if (difference > 0) {
    direction = 'increase';
  } else if (difference < 0) {
    direction = 'decrease';
  } else {
    direction = 'same';
  }
  
  return {
    percentage: Math.round(percentage * 100) / 100,
    direction,
    difference: Math.abs(difference)
  };
}

/**
 * Validates that price range makes sense
 */
export function validatePriceRange(range: PriceRange): { valid: boolean; error?: string } {
  if (range.min <= 0) {
    return { valid: false, error: 'Minimum price must be positive' };
  }
  
  if (range.max < range.min) {
    return { valid: false, error: 'Maximum price must be greater than minimum price' };
  }
  
  if (range.recommended < range.min || range.recommended > range.max) {
    return { valid: false, error: 'Recommended price must be within the range' };
  }
  
  return { valid: true };
}

/**
 * Formats price range for display
 */
export function formatPriceRange(range: PriceRange): string {
  if (range.min === range.max) {
    return `${range.recommended.toLocaleString()} NOK`;
  }
  
  return `${range.min.toLocaleString()}-${range.max.toLocaleString()} NOK (recommended: ${range.recommended.toLocaleString()} NOK)`;
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