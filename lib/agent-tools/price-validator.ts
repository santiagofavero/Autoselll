/**
 * Price Validation Tool
 * Validates pricing against FINN.no market data
 */

import { tool } from 'ai';
import { z } from 'zod';
import { finnAPI, type PriceAnalysis } from '@/lib/finn-api';
import { loggers } from '@/lib/agent-utils/logging';
import { numericConstraints, textConstraints } from '@/lib/agent-utils/validation';

const logger = loggers.finn;

// =================================
// SCHEMAS
// =================================

const itemAttributesSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  model_number: z.string().optional(),
  series: z.string().optional(),
  color: z.string().optional(),
  category: z.string(),
  condition: z.string().optional(),
  technical_specs: z.array(z.string()).optional(),
});

// =================================
// TOOL DEFINITION
// =================================

export const validatePriceOnFinnTool = tool({
  description: "Check FINN.no market prices",
  inputSchema: z.object({
    itemAttributes: itemAttributesSchema,
    suggestedPrice: numericConstraints.price,
  }),
  execute: async ({ itemAttributes, suggestedPrice }) => {
    logger.starting('price validation', { itemAttributes, suggestedPrice });
    
    try {
      // Generate search query
      const searchQuery = finnAPI.generateSearchQuery(itemAttributes);
      const finnCategory = finnAPI.mapCategoryToFinn(itemAttributes.category);
      
      logger.debug('Search parameters', { searchQuery, finnCategory });
      
      // Analyze market prices
      const analysis = await finnAPI.analyzePrices({
        query: searchQuery,
        category: finnCategory,
        price_from: Math.round(suggestedPrice * 0.5), // Search from 50% to 200% of suggested
        price_to: Math.round(suggestedPrice * 2),
      });

      logger.info('Market analysis complete', {
        averagePrice: analysis.averagePrice,
        sampleSize: analysis.sampleSize,
        confidence: analysis.confidence
      });

      // Compare suggested price to market
      const pricePosition = suggestedPrice < analysis.suggestions.conservative ? 'below_market' :
                           suggestedPrice > analysis.suggestions.optimistic ? 'above_market' : 'market_range';

      logger.success('Price position determined', { pricePosition, suggestedPrice });

      return {
        success: true,
        analysis,
        pricePosition,
        recommendation: pricePosition === 'below_market' ? 'increase' : 
                       pricePosition === 'above_market' ? 'decrease' : 'good',
        summary: `Market analysis: Average ${analysis.averagePrice} NOK (${analysis.sampleSize} samples). Your price ${suggestedPrice} NOK is ${pricePosition.replace('_', ' ')}.`
      };
    } catch (error) {
      logger.failed('Price validation', error instanceof Error ? error : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Price validation failed',
        summary: 'Could not validate price against market data.'
      };
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface ItemAttributes {
  brand?: string;
  model?: string;
  model_number?: string;
  series?: string;
  color?: string;
  category: string;
  condition?: string;
  technical_specs?: string[];
}

export interface PriceValidationInput {
  itemAttributes: ItemAttributes;
  suggestedPrice: number;
}

export type PricePosition = 'below_market' | 'market_range' | 'above_market';
export type PriceRecommendation = 'increase' | 'decrease' | 'good';

export interface PriceValidationResult {
  success: boolean;
  analysis?: PriceAnalysis;
  pricePosition?: PricePosition;
  recommendation?: PriceRecommendation;
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone price validation function for use outside of agent tools
 */
export async function validatePriceOnFinn(input: PriceValidationInput): Promise<PriceValidationResult> {
  return validatePriceOnFinnTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

/**
 * Validates price validation input
 */
const priceValidationInputSchema = z.object({
  itemAttributes: itemAttributesSchema,
  suggestedPrice: numericConstraints.price,
});

export function validatePriceValidationInput(input: unknown): input is PriceValidationInput {
  try {
    priceValidationInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe price validation input with defaults
 */
export function createPriceValidationInput(
  itemAttributes: ItemAttributes,
  suggestedPrice: number
): PriceValidationInput {
  return {
    itemAttributes: {
      ...itemAttributes,
      category: itemAttributes.category.trim(),
      brand: itemAttributes.brand?.trim() || undefined,
      model: itemAttributes.model?.trim() || undefined,
    },
    suggestedPrice: Math.round(suggestedPrice)
  };
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Extracts item attributes from listing draft
 */
export function extractItemAttributesFromDraft(draft: {
  attributes: {
    brand?: string;
    model?: string;
    model_number?: string;
    series?: string;
    color?: string;
    condition: string;
    technical_specs?: string[];
  };
  category: {
    primary: string;
  };
}): ItemAttributes {
  return {
    brand: draft.attributes.brand || 'Unknown',
    model: draft.attributes.model || 'Unknown',
    model_number: draft.attributes.model_number,
    series: draft.attributes.series,
    color: draft.attributes.color || 'Unknown',
    category: draft.category.primary,
    condition: draft.attributes.condition,
    technical_specs: draft.attributes.technical_specs,
  };
}