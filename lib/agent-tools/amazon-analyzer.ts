/**
 * Amazon Eligibility Analysis Tool
 * Analyzes Amazon listing eligibility and catalog matching
 */

import { tool } from 'ai';
import { z } from 'zod';
import { amazonAPI, mapConditionToAmazon, mapCategoryToAmazonProductType, type AmazonCatalogItem, type AmazonListingEligibility } from '@/lib/amazon-api';
import { loggers } from '@/lib/agent-utils/logging';
import { numericConstraints } from '@/lib/agent-utils/validation';

const logger = loggers.amazon;

// =================================
// SCHEMAS
// =================================

const amazonItemAttributesSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  model_number: z.string().optional(),
  series: z.string().optional(),
  category: z.string(),
  condition: z.string(),
  title: z.string(),
  technical_specs: z.array(z.string()).optional(),
});

// =================================
// TOOL DEFINITION
// =================================

export const analyzeAmazonEligibilityTool = tool({
  description: "Check Amazon listing eligibility and catalog match",
  inputSchema: z.object({
    itemAttributes: amazonItemAttributesSchema,
    suggestedPrice: numericConstraints.price,
  }),
  execute: async ({ itemAttributes, suggestedPrice }) => {
    logger.starting('Amazon analysis', { itemAttributes, suggestedPrice });
    
    if (!amazonAPI.isConfigured()) {
      logger.warn('Amazon API not configured');
      return {
        success: false,
        available: false,
        error: 'Amazon SP-API not configured',
        summary: 'Amazon listing not available - API credentials not configured'
      };
    }
    
    try {
      // Generate search query for Amazon catalog
      const searchQuery = [
        itemAttributes.brand,
        itemAttributes.series || itemAttributes.model,
        itemAttributes.model_number,
      ].filter(Boolean).join(' ').trim() || itemAttributes.title;
      
      logger.debug('Searching Amazon catalog', { searchQuery });
      
      // Search Amazon catalog for existing products
      const catalogItems = await amazonAPI.searchCatalogItems({
        query: searchQuery,
        brand: itemAttributes.brand,
        model: itemAttributes.model || itemAttributes.series,
        condition: mapConditionToAmazon(itemAttributes.condition),
      });
      
      const marketplaceInfo = amazonAPI.getMarketplaceInfo();
      let eligibility: AmazonListingEligibility | null = null;
      let bestMatch: AmazonCatalogItem | null = null;
      
      // Find best matching product in catalog
      if (catalogItems.length > 0) {
        bestMatch = catalogItems[0]; // Take first match for now
        logger.info('Found catalog match', { asin: bestMatch.asin, title: bestMatch.title });
        
        // Check listing eligibility for the matched ASIN
        eligibility = await amazonAPI.checkListingEligibility(bestMatch.asin);
      }
      
      // Determine if Amazon is suitable for this item
      const amazonCondition = mapConditionToAmazon(itemAttributes.condition);
      const productType = mapCategoryToAmazonProductType(itemAttributes.category);
      const isNewOrLikeNew = ['new', 'used_like_new'].includes(amazonCondition);
      const hasBrand = itemAttributes.brand && itemAttributes.brand !== 'Unknown';
      
      // Calculate suitability score
      let suitabilityScore = 0.3; // Base score
      if (isNewOrLikeNew) suitabilityScore += 0.3;
      if (hasBrand) suitabilityScore += 0.2;
      if (bestMatch) suitabilityScore += 0.2;
      if (eligibility?.canList) suitabilityScore += 0.3;
      if (suggestedPrice > 50) suitabilityScore += 0.1; // Higher value items
      
      const isRecommended = suitabilityScore >= 0.6;
      
      logger.info('Analysis complete', {
        suitabilityScore: suitabilityScore.toFixed(2),
        isRecommended,
        catalogMatches: catalogItems.length,
        canList: eligibility?.canList
      });
      
      const analysis = {
        available: true,
        recommended: isRecommended,
        suitabilityScore,
        catalogMatch: bestMatch ? {
          asin: bestMatch.asin,
          title: bestMatch.title,
          category: bestMatch.category,
          productType: bestMatch.productType,
        } : null,
        eligibility: eligibility ? {
          canList: eligibility.canList,
          requiresApproval: eligibility.requiresApproval,
          restrictions: eligibility.restrictions,
          estimatedFees: eligibility.estimatedFees,
        } : null,
        recommendations: [] as string[],
        marketplace: marketplaceInfo,
        suggestedCondition: amazonCondition,
        suggestedProductType: productType,
      };
      
      // Generate recommendations
      if (!isNewOrLikeNew) {
        analysis.recommendations.push('Consider improving item condition for better Amazon performance');
      }
      if (!hasBrand) {
        analysis.recommendations.push('Brand identification crucial for Amazon listing success');
      }
      if (!bestMatch) {
        analysis.recommendations.push('No existing catalog match - may require new product creation');
      }
      if (eligibility?.requiresApproval) {
        analysis.recommendations.push('Amazon approval required for this category');
      }
      if (suggestedPrice < 20) {
        analysis.recommendations.push('Low price may not be profitable after Amazon fees');
      }
      
      const summary = bestMatch 
        ? `Amazon listing possible. Found catalog match: ${bestMatch.title} (${bestMatch.asin}). ${eligibility?.canList ? 'Eligible for listing' : 'May have restrictions'}.`
        : `Amazon listing possible but no catalog match found. Would need to create new product. ${isRecommended ? 'Recommended' : 'Not optimal'} based on condition and brand.`;
      
      logger.success('Amazon analysis completed', { summary });
      
      return {
        success: true,
        analysis,
        summary,
      };
      
    } catch (error) {
      logger.failed('Amazon analysis', error instanceof Error ? error : String(error));
      return {
        success: false,
        available: false,
        error: error instanceof Error ? error.message : 'Amazon analysis failed',
        summary: 'Amazon eligibility check failed - using other platforms'
      };
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface AmazonItemAttributes {
  brand?: string;
  model?: string;
  model_number?: string;
  series?: string;
  category: string;
  condition: string;
  title: string;
  technical_specs?: string[];
}

export interface AmazonAnalysisInput {
  itemAttributes: AmazonItemAttributes;
  suggestedPrice: number;
}

export interface AmazonCatalogMatch {
  asin: string;
  title: string;
  category: string;
  productType: string;
}

export interface AmazonEligibilityInfo {
  canList: boolean;
  requiresApproval: boolean;
  restrictions: string[];
  estimatedFees?: {
    referralFee: number;
    variableClosingFee: number;
    fulfillmentFee?: number;
  };
}

export interface AmazonAnalysisData {
  available: boolean;
  recommended: boolean;
  suitabilityScore: number;
  catalogMatch: AmazonCatalogMatch | null;
  eligibility: AmazonEligibilityInfo | null;
  recommendations: string[];
  marketplace: {
    id: string;
    region: string;
    countryCode: string;
  };
  suggestedCondition: string;
  suggestedProductType: string;
}

export interface AmazonAnalysisResult {
  success: boolean;
  available?: boolean;
  analysis?: AmazonAnalysisData;
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone Amazon analysis function for use outside of agent tools
 */
export async function analyzeAmazonEligibility(input: AmazonAnalysisInput): Promise<AmazonAnalysisResult> {
  return analyzeAmazonEligibilityTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

const amazonAnalysisInputSchema = z.object({
  itemAttributes: amazonItemAttributesSchema,
  suggestedPrice: numericConstraints.price,
});

/**
 * Validates Amazon analysis input
 */
export function validateAmazonAnalysisInput(input: unknown): input is AmazonAnalysisInput {
  try {
    amazonAnalysisInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe Amazon analysis input with defaults
 */
export function createAmazonAnalysisInput(
  itemAttributes: AmazonItemAttributes,
  suggestedPrice: number
): AmazonAnalysisInput {
  return {
    itemAttributes: {
      ...itemAttributes,
      category: itemAttributes.category.trim(),
      condition: itemAttributes.condition.trim(),
      title: itemAttributes.title.trim(),
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
 * Extracts Amazon item attributes from listing draft
 */
export function extractAmazonAttributesFromDraft(draft: {
  attributes: {
    brand?: string;
    model?: string;
    model_number?: string;
    series?: string;
    condition: string;
    technical_specs?: string[];
  };
  category: {
    primary: string;
  };
  title: string;
}): AmazonItemAttributes {
  return {
    brand: draft.attributes.brand || 'Unknown',
    model: draft.attributes.model || 'Unknown',
    model_number: draft.attributes.model_number,
    series: draft.attributes.series,
    category: draft.category.primary,
    condition: draft.attributes.condition,
    title: draft.title,
    technical_specs: draft.attributes.technical_specs,
  };
}

/**
 * Checks if Amazon is configured and available
 */
export function isAmazonAvailable(): boolean {
  return amazonAPI.isConfigured();
}