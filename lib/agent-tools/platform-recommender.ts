/**
 * Platform Recommendation Tool
 * Provides intelligent platform recommendations based on cross-platform analytics
 */

import { tool } from 'ai';
import { z } from 'zod';
import { crossPlatformAnalytics, formatCrossPlatformAnalysis, type CrossPlatformAnalysis } from '@/lib/cross-platform-analytics';
import { loggers } from '@/lib/agent-utils/logging';
import { userPreferenceSchema, numericConstraints } from '@/lib/agent-utils/validation';
import { amazonAPI } from '@/lib/amazon-api';

const logger = loggers.platform;

// =================================
// SCHEMAS
// =================================

const platformItemAttributesSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string(),
  condition: z.string(),
  title: z.string(),
  color: z.string().optional(),
});

// =================================
// TOOL DEFINITION
// =================================

export const recommendOptimalPlatformsTool = tool({
  description: "Recommend best platforms for listing based on item analysis",
  inputSchema: z.object({
    itemAttributes: platformItemAttributesSchema,
    suggestedPrice: numericConstraints.price,
    finnAnalysis: z.any().optional(),
    amazonAnalysis: z.any().optional(),
    userPreference: userPreferenceSchema.optional(),
  }),
  execute: async ({ itemAttributes, suggestedPrice, finnAnalysis, amazonAnalysis, userPreference = 'market_price' }) => {
    logger.starting('platform recommendation analysis');
    
    // Use comprehensive cross-platform analytics
    try {
      const crossPlatformAnalysis = await crossPlatformAnalytics.analyzeAcrossPlatforms({
        itemAttributes,
        estimatedPrice: suggestedPrice,
        finnAnalysis,
        amazonAnalysis,
      });
      
      logger.success('Cross-platform analysis complete', {
        bestOverall: crossPlatformAnalysis.recommendations.bestOverall,
        confidence: crossPlatformAnalysis.confidence.toFixed(2),
        platformsAnalyzed: crossPlatformAnalysis.platforms.length
      });
      
      // Format recommendations based on user preference
      const recommendations = crossPlatformAnalysis.recommendations;
      let primaryRecommendation: string;
      
      switch (userPreference) {
        case 'quick_sale':
          primaryRecommendation = recommendations.bestForQuickSale;
          break;
        case 'maximize_profit':
          primaryRecommendation = recommendations.bestForMaxProfit;
          break;
        default:
          primaryRecommendation = recommendations.bestOverall;
      }
      
      // Generate secondary recommendations (for future use)
      // const allPlatforms = crossPlatformAnalysis.platforms.map(p => p.platform);
      // const secondary = allPlatforms.filter(p => p !== primaryRecommendation);
      
      return {
        success: true,
        recommendations: {
          primary: [primaryRecommendation],
          all: crossPlatformAnalysis.platforms.map(platform => ({
            platform: platform.platform,
            score: platform.marketSuitability,
            reasons: platform.insights,
            estimatedTimeToSale: `${platform.estimatedTimeToSale} days`,
            advantages: [
              `Avg price: ${platform.averagePrice.toFixed(0)} NOK`,
              `Success rate: ${(platform.successRate * 100).toFixed(0)}%`,
              `Fees: ${platform.fees.totalFeeRate.toFixed(1)}%`,
              ...platform.insights.slice(0, 2)
            ],
            disadvantages: platform.fees.totalFeeRate > 10 ? ['High fees'] : []
          })),
          reasoning: `Cross-platform analysis: ${crossPlatformAnalysis.marketTrends.demand} demand, ${crossPlatformAnalysis.marketTrends.competition} competition. ${formatCrossPlatformAnalysis(crossPlatformAnalysis)}`,
          summary: `Recommended: ${primaryRecommendation.toUpperCase()} (${userPreference} strategy). Analysis confidence: ${(crossPlatformAnalysis.confidence * 100).toFixed(0)}%`,
          analytics: crossPlatformAnalysis
        }
      };
      
    } catch (error) {
      logger.warn('Cross-platform analytics failed, using fallback', error instanceof Error ? error.message : String(error));
      
      // Fallback to simple logic
      const platforms = [];
    
    // Facebook Marketplace scoring
    const fbScore = {
      platform: 'facebook' as const,
      score: 0.7, // Base score
      reasons: [] as string[],
      estimatedTimeToSale: '1-7 days',
      advantages: [] as string[],
      disadvantages: [] as string[],
    };
    
    // Local/pickup items perform well on Facebook
    if (['Møbler', 'Sport og friluft'].includes(itemAttributes.category)) {
      fbScore.score += 0.15;
      fbScore.advantages.push('Great for local pickup items');
    }
    
    // Lower prices work well on Facebook
    if (suggestedPrice < 2000) {
      fbScore.score += 0.1;
      fbScore.advantages.push('Good for affordable items');
    }
    
    if (userPreference === 'quick_sale') {
      fbScore.score += 0.1;
      fbScore.advantages.push('Fast local sales');
    }
    
    fbScore.reasons.push('Free listings', 'Large local audience', 'Good for secondhand items');
    
    // FINN.no scoring (always recommended for Norwegian market)
    const finnScore = {
      platform: 'finn' as const,
      score: 0.8, // High base score for Norwegian market
      reasons: [] as string[],
      estimatedTimeToSale: '2-14 days',
      advantages: ['Market leader in Norway', 'Trusted platform', 'Detailed listings'] as string[],
      disadvantages: [] as string[],
    };
    
    if (finnAnalysis?.success && finnAnalysis.analysis?.averagePrice) {
      if (suggestedPrice <= finnAnalysis.analysis.averagePrice * 1.1) {
        finnScore.score += 0.1;
        finnScore.advantages.push('Competitive pricing vs market');
      }
    }
    
    if (itemAttributes.brand && itemAttributes.brand !== 'Unknown') {
      finnScore.score += 0.05;
      finnScore.advantages.push('Brand recognition important on FINN');
    }
    
    finnScore.reasons.push('Norwegian market leader', 'High trust level', 'Comprehensive search');
    
    // Amazon scoring
    const amazonScore = {
      platform: 'amazon' as const,
      score: 0.3, // Lower base score
      reasons: [] as string[],
      estimatedTimeToSale: '3-30 days',
      advantages: [] as string[],
      disadvantages: ['Amazon fees', 'Competition'] as string[],
    };
    
    if (amazonAnalysis?.success && amazonAnalysis.analysis) {
      const analysis = amazonAnalysis.analysis;
      
      amazonScore.score = analysis.suitabilityScore || 0.3;
      
      if (analysis.catalogMatch) {
        amazonScore.advantages.push('Existing product catalog match');
        amazonScore.score += 0.1;
      }
      
      if (analysis.eligibility?.canList) {
        amazonScore.advantages.push('Eligible for listing');
      } else {
        amazonScore.disadvantages.push('Listing restrictions');
        amazonScore.score -= 0.2;
      }
      
      if (['new', 'used_like_new'].includes(analysis.suggestedCondition)) {
        amazonScore.advantages.push('Good condition for Amazon');
      }
      
      if (suggestedPrice > 100) {
        amazonScore.score += 0.1;
        amazonScore.advantages.push('Higher value suitable for Amazon');
      }
      
      if (analysis.marketplace) {
        amazonScore.reasons.push(`Global reach (${analysis.marketplace.region})`, 'Professional platform');
      }
      
      if (userPreference === 'maximize_profit' && analysis.recommended) {
        amazonScore.score += 0.15;
        amazonScore.advantages.push('Higher profit potential');
      }
    }
    
    platforms.push(fbScore, finnScore);
    
    if (amazonAPI.isConfigured()) {
      platforms.push(amazonScore);
    }
    
    // Sort by score
    platforms.sort((a, b) => b.score - a.score);
    
    // Generate final recommendations
    const topPlatforms = platforms.filter(p => p.score >= 0.6);
    const recommended = topPlatforms.length > 0 ? topPlatforms.map(p => p.platform) : [platforms[0].platform];
    
    logger.success('Platform recommendations generated', {
      recommended,
      scores: platforms.map(p => ({ platform: p.platform, score: p.score.toFixed(2) }))
    });
    
      return {
        success: true,
        recommendations: {
          primary: recommended,
          all: platforms,
          reasoning: `Based on item analysis: ${itemAttributes.category}, condition: ${itemAttributes.condition}, price: ${suggestedPrice} NOK. User preference: ${userPreference}.`,
          summary: `Recommended platforms: ${recommended.join(', ')}. Top choice: ${platforms[0].platform} (score: ${platforms[0].score.toFixed(2)}).`
        }
      };
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface PlatformItemAttributes {
  brand?: string;
  model?: string;
  category: string;
  condition: string;
  title: string;
  color?: string;
}

export interface PlatformRecommendationInput {
  itemAttributes: PlatformItemAttributes;
  suggestedPrice: number;
  finnAnalysis?: unknown;
  amazonAnalysis?: unknown;
  userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
}

export interface PlatformScore {
  platform: 'finn' | 'facebook' | 'amazon';
  score: number;
  reasons: string[];
  estimatedTimeToSale: string;
  advantages: string[];
  disadvantages: string[];
}

export interface PlatformRecommendations {
  primary: string[];
  all: PlatformScore[] | Array<{
    platform: string;
    score: number;
    reasons: string[];
    estimatedTimeToSale: string;
    advantages: string[];
    disadvantages: string[];
  }>;
  reasoning: string;
  summary: string;
  analytics?: CrossPlatformAnalysis;
}

export interface PlatformRecommendationResult {
  success: boolean;
  recommendations?: PlatformRecommendations;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone platform recommendation function for use outside of agent tools
 */
export async function recommendOptimalPlatforms(input: PlatformRecommendationInput): Promise<PlatformRecommendationResult> {
  return recommendOptimalPlatformsTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

const platformRecommendationInputSchema = z.object({
  itemAttributes: platformItemAttributesSchema,
  suggestedPrice: numericConstraints.price,
  finnAnalysis: z.any().optional(),
  amazonAnalysis: z.any().optional(),
  userPreference: userPreferenceSchema.optional(),
});

/**
 * Validates platform recommendation input
 */
export function validatePlatformRecommendationInput(input: unknown): input is PlatformRecommendationInput {
  try {
    platformRecommendationInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe platform recommendation input with defaults
 */
export function createPlatformRecommendationInput(
  itemAttributes: PlatformItemAttributes,
  suggestedPrice: number,
  options: {
    finnAnalysis?: unknown;
    amazonAnalysis?: unknown;
    userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
  } = {}
): PlatformRecommendationInput {
  return {
    itemAttributes: {
      ...itemAttributes,
      category: itemAttributes.category.trim(),
      condition: itemAttributes.condition.trim(),
      title: itemAttributes.title.trim(),
      brand: itemAttributes.brand?.trim() || undefined,
      model: itemAttributes.model?.trim() || undefined,
      color: itemAttributes.color?.trim() || undefined,
    },
    suggestedPrice: Math.round(suggestedPrice),
    finnAnalysis: options.finnAnalysis,
    amazonAnalysis: options.amazonAnalysis,
    userPreference: options.userPreference || 'market_price'
  };
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Extracts platform item attributes from listing draft
 */
export function extractPlatformAttributesFromDraft(draft: {
  attributes: {
    brand?: string;
    model?: string;
    condition: string;
    color?: string;
  };
  category: {
    primary: string;
  };
  title: string;
}): PlatformItemAttributes {
  return {
    brand: draft.attributes.brand || 'Unknown',
    model: draft.attributes.model || 'Unknown',
    category: draft.category.primary,
    condition: draft.attributes.condition,
    title: draft.title,
    color: draft.attributes.color,
  };
}