// Cross-platform marketplace analytics and intelligence
// Provides comprehensive market analysis across FINN.no, Facebook Marketplace, and Amazon

import { PriceAnalysis } from './finn-api';
import { AmazonListingEligibility } from './amazon-api';

export interface ItemAttributes {
  brand?: string;
  model?: string;
  category: string;
  condition: string;
  color?: string;
  title: string;
  description?: string;
}

export interface PlatformMetrics {
  platform: 'finn' | 'facebook' | 'amazon';
  averagePrice: number;
  priceRange: { min: number; max: number };
  estimatedTimeToSale: number; // days
  competitorCount: number;
  successRate: number; // 0-1
  fees: {
    listingFee: number;
    transactionFee: number;
    totalFeeRate: number; // percentage
  };
  marketSuitability: number; // 0-1 score
  insights: string[];
}

export interface CrossPlatformAnalysis {
  item: {
    category: string;
    condition: string;
    brand?: string;
    estimatedValue: number;
  };
  platforms: PlatformMetrics[];
  recommendations: {
    bestForQuickSale: 'finn' | 'facebook' | 'amazon';
    bestForMaxProfit: 'finn' | 'facebook' | 'amazon';
    bestOverall: 'finn' | 'facebook' | 'amazon';
    multiPlatformStrategy?: {
      primary: string;
      secondary: string[];
      reasoning: string;
    };
  };
  marketTrends: {
    demand: 'high' | 'medium' | 'low';
    competition: 'high' | 'medium' | 'low';
    priceStability: 'stable' | 'volatile' | 'declining';
    seasonality?: string;
  };
  profitAnalysis: {
    platform: string;
    grossRevenue: number;
    fees: number;
    netProfit: number;
    profitMargin: number;
  }[];
  confidence: number; // 0-1
  timestamp: string;
}

export interface MarketIntelligence {
  categoryTrends: Record<string, {
    avgPrice: number;
    salesVolume: 'high' | 'medium' | 'low';
    topPerformingPlatforms: string[];
  }>;
  platformPerformance: Record<string, {
    avgListingDuration: number;
    avgSuccessRate: number;
    userSatisfaction: number;
  }>;
  seasonalFactors: {
    currentSeason: string;
    impactFactor: number; // multiplier
    recommendations: string[];
  };
}

class CrossPlatformAnalytics {
  
  // Analyze item across all platforms
  async analyzeAcrossPlatforms(params: {
    itemAttributes: {
      category: string;
      condition: string;
      brand?: string;
      model?: string;
      title: string;
    };
    estimatedPrice: number;
    finnAnalysis?: PriceAnalysis;
    amazonAnalysis?: AmazonListingEligibility;
  }): Promise<CrossPlatformAnalysis> {
    console.log('📊 [CrossPlatformAnalytics] Starting comprehensive analysis');
    
    const { itemAttributes, estimatedPrice, finnAnalysis, amazonAnalysis } = params;
    
    // Analyze each platform
    const platforms: PlatformMetrics[] = [];
    
    // FINN.no Analysis
    const finnMetrics = await this.analyzeFinnPlatform(itemAttributes, estimatedPrice, finnAnalysis);
    platforms.push(finnMetrics);
    
    // Facebook Marketplace Analysis
    const facebookMetrics = await this.analyzeFacebookPlatform(itemAttributes, estimatedPrice);
    platforms.push(facebookMetrics);
    
    // Amazon Analysis (if available)
    if (amazonAPI.isConfigured()) {
      const amazonMetrics = await this.analyzeAmazonPlatform(itemAttributes, estimatedPrice, amazonAnalysis);
      platforms.push(amazonMetrics);
    }
    
    // Generate recommendations
    const recommendations = this.generatePlatformRecommendations(platforms, itemAttributes);
    
    // Analyze market trends
    const marketTrends = this.analyzeMarketTrends(itemAttributes, platforms);
    
    // Calculate profit analysis
    const profitAnalysis = this.calculateProfitAnalysis(platforms);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(platforms, finnAnalysis, amazonAnalysis);
    
    const analysis: CrossPlatformAnalysis = {
      item: {
        category: itemAttributes.category,
        condition: itemAttributes.condition,
        brand: itemAttributes.brand,
        estimatedValue: estimatedPrice,
      },
      platforms,
      recommendations,
      marketTrends,
      profitAnalysis,
      confidence,
      timestamp: new Date().toISOString(),
    };
    
    console.log('✅ [CrossPlatformAnalytics] Analysis complete', {
      platformsAnalyzed: platforms.length,
      bestOverall: recommendations.bestOverall,
      confidence: confidence.toFixed(2)
    });
    
    return analysis;
  }
  
  // Analyze FINN.no platform metrics
  private async analyzeFinnPlatform(
    itemAttributes: ItemAttributes, 
    estimatedPrice: number, 
    finnAnalysis?: PriceAnalysis
  ): Promise<PlatformMetrics> {
    
    const baseMetrics: PlatformMetrics = {
      platform: 'finn',
      averagePrice: estimatedPrice,
      priceRange: { min: estimatedPrice * 0.8, max: estimatedPrice * 1.2 },
      estimatedTimeToSale: 7, // default 7 days
      competitorCount: 10, // default estimate
      successRate: 0.75, // 75% success rate
      fees: {
        listingFee: 0, // Free for personal
        transactionFee: 0,
        totalFeeRate: 0,
      },
      marketSuitability: 0.8, // High for Norwegian market
      insights: ['Market leader in Norway', 'Strong for all categories'],
    };
    
    // Enhance with FINN analysis data if available
    if (finnAnalysis && finnAnalysis.sampleSize > 0) {
      baseMetrics.averagePrice = finnAnalysis.averagePrice;
      baseMetrics.priceRange = finnAnalysis.priceRange;
      baseMetrics.competitorCount = finnAnalysis.sampleSize || 10;
      baseMetrics.insights = finnAnalysis.insights || baseMetrics.insights;
      
      // Adjust success rate based on price competitiveness
      if (estimatedPrice <= finnAnalysis.suggestions.conservative) {
        baseMetrics.successRate = 0.85;
        baseMetrics.estimatedTimeToSale = 5;
      } else if (estimatedPrice <= finnAnalysis.suggestions.market) {
        baseMetrics.successRate = 0.75;
        baseMetrics.estimatedTimeToSale = 7;
      } else {
        baseMetrics.successRate = 0.60;
        baseMetrics.estimatedTimeToSale = 14;
      }
    }
    
    // Category-specific adjustments
    if (itemAttributes.category === 'Elektronikk') {
      baseMetrics.marketSuitability += 0.1;
      baseMetrics.estimatedTimeToSale *= 0.8; // Electronics sell faster
    } else if (itemAttributes.category === 'Møbler') {
      baseMetrics.estimatedTimeToSale *= 1.3; // Furniture takes longer
    }
    
    return baseMetrics;
  }
  
  // Analyze Facebook Marketplace metrics
  private async analyzeFacebookPlatform(
    itemAttributes: ItemAttributes, 
    estimatedPrice: number
  ): Promise<PlatformMetrics> {
    
    return {
      platform: 'facebook',
      averagePrice: estimatedPrice * 0.9, // Usually 10% lower than FINN
      priceRange: { min: estimatedPrice * 0.6, max: estimatedPrice * 1.1 },
      estimatedTimeToSale: itemAttributes.category === 'Møbler' ? 3 : 5, // Faster for local items
      competitorCount: 15, // Higher competition
      successRate: itemAttributes.category === 'Møbler' ? 0.8 : 0.7,
      fees: {
        listingFee: 0,
        transactionFee: 0,
        totalFeeRate: 0,
      },
      marketSuitability: this.calculateFacebookSuitability(itemAttributes, estimatedPrice),
      insights: [
        'Free listings',
        'Great for local pickup items',
        'Large user base',
        'Quick sales for furniture/large items'
      ],
    };
  }
  
  // Analyze Amazon platform metrics
  private async analyzeAmazonPlatform(
    itemAttributes: ItemAttributes, 
    estimatedPrice: number,
    amazonAnalysis?: AmazonListingEligibility
  ): Promise<PlatformMetrics> {
    
    const baseFeeRate = this.calculateAmazonFees(itemAttributes.category);
    const baseMetrics: PlatformMetrics = {
      platform: 'amazon',
      averagePrice: estimatedPrice * 1.1, // Premium pricing
      priceRange: { min: estimatedPrice * 0.9, max: estimatedPrice * 1.4 },
      estimatedTimeToSale: 14, // Longer for used items
      competitorCount: 25, // High competition
      successRate: 0.6, // Lower for used items
      fees: {
        listingFee: 0,
        transactionFee: estimatedPrice * baseFeeRate,
        totalFeeRate: baseFeeRate * 100,
      },
      marketSuitability: 0.4, // Lower base suitability
      insights: ['Global reach', 'Professional platform', 'Higher fees'],
    };
    
    // Enhance with Amazon analysis if available
    if (amazonAnalysis && amazonAnalysis.canList) {
      // Using Amazon analysis for enhanced metrics
      
      baseMetrics.marketSuitability = 0.6;
      
      if (amazonAnalysis.averagePrice) {
        baseMetrics.averagePrice = amazonAnalysis.averagePrice;
        baseMetrics.insights.push('Amazon pricing data available');
      }
      
      if (!amazonAnalysis.requiresApproval) {
        baseMetrics.successRate += 0.1;
        baseMetrics.insights.push('Eligible for listing');
      } else {
        baseMetrics.successRate -= 0.2;
        baseMetrics.insights.push('May have listing restrictions');
      }
      
      // Condition-based adjustments
      if (amazonAnalysis.recommendedCondition.includes('new') || amazonAnalysis.recommendedCondition.includes('used_like_new')) {
        baseMetrics.successRate += 0.15;
        baseMetrics.marketSuitability += 0.2;
        baseMetrics.insights.push('Good condition for Amazon');
      }
    }
    
    return baseMetrics;
  }
  
  // Calculate Facebook platform suitability
  private calculateFacebookSuitability(itemAttributes: ItemAttributes, price: number): number {
    let score = 0.7; // Base score
    
    // Local pickup items perform better
    if (['Møbler', 'Sport og friluft'].includes(itemAttributes.category)) {
      score += 0.2;
    }
    
    // Lower prices work well
    if (price < 2000) {
      score += 0.1;
    } else if (price > 10000) {
      score -= 0.1;
    }
    
    // Condition affects suitability
    if (itemAttributes.condition === 'used_fair') {
      score += 0.1; // More forgiving of condition
    }
    
    return Math.min(score, 1.0);
  }
  
  // Calculate Amazon fee rates by category
  private calculateAmazonFees(category: string): number {
    const feeMap: Record<string, number> = {
      'Elektronikk': 0.08,
      'Bøker': 0.15,
      'Klær og sko': 0.17,
      'Sport og friluft': 0.15,
      'Musikk': 0.15,
      'Hobby': 0.15,
      'Møbler': 0.15,
    };
    
    return feeMap[category] || 0.15; // Default 15%
  }
  
  // Generate platform recommendations
  private generatePlatformRecommendations(
    platforms: PlatformMetrics[], 
    itemAttributes: ItemAttributes
  ): CrossPlatformAnalysis['recommendations'] {
    
    // Best for quick sale (fastest time to sale)
    const quickSale = platforms.reduce((best, current) => 
      current.estimatedTimeToSale < best.estimatedTimeToSale ? current : best
    );
    
    // Best for max profit (highest net after fees)
    const maxProfit = platforms.reduce((best, current) => {
      const currentNet = current.averagePrice * (1 - current.fees.totalFeeRate / 100);
      const bestNet = best.averagePrice * (1 - best.fees.totalFeeRate / 100);
      return currentNet > bestNet ? current : best;
    });
    
    // Best overall (weighted score)
    const bestOverall = platforms.reduce((best, current) => {
      const currentScore = this.calculateOverallScore(current);
      const bestScore = this.calculateOverallScore(best);
      return currentScore > bestScore ? current : best;
    });
    
    // Multi-platform strategy
    const multiPlatformStrategy = this.determineMultiPlatformStrategy(platforms, itemAttributes);
    
    return {
      bestForQuickSale: quickSale.platform,
      bestForMaxProfit: maxProfit.platform,
      bestOverall: bestOverall.platform,
      multiPlatformStrategy,
    };
  }
  
  // Calculate overall platform score
  private calculateOverallScore(platform: PlatformMetrics): number {
    const timeScore = Math.max(0, (30 - platform.estimatedTimeToSale) / 30); // Faster is better
    const priceScore = platform.averagePrice / 10000; // Higher price is better (normalized)
    const successScore = platform.successRate;
    const feeScore = Math.max(0, (20 - platform.fees.totalFeeRate) / 20); // Lower fees better
    const suitabilityScore = platform.marketSuitability;
    
    return (timeScore * 0.2) + (priceScore * 0.2) + (successScore * 0.3) + 
           (feeScore * 0.1) + (suitabilityScore * 0.2);
  }
  
  // Determine multi-platform strategy
  private determineMultiPlatformStrategy(
    platforms: PlatformMetrics[], 
    itemAttributes: ItemAttributes
  ): CrossPlatformAnalysis['recommendations']['multiPlatformStrategy'] {
    
    // High-value items benefit from multi-platform
    if (platforms[0]?.averagePrice > 5000) {
      const primary = platforms.reduce((best, current) => 
        this.calculateOverallScore(current) > this.calculateOverallScore(best) ? current : best
      );
      
      const secondary = platforms
        .filter(p => p.platform !== primary.platform)
        .sort((a, b) => this.calculateOverallScore(b) - this.calculateOverallScore(a))
        .slice(0, 2)
        .map(p => p.platform);
      
      return {
        primary: primary.platform,
        secondary,
        reasoning: 'High-value item benefits from maximum exposure across platforms'
      };
    }
    
    // Local items: Facebook + FINN
    if (['Møbler', 'Sport og friluft'].includes(itemAttributes.category)) {
      return {
        primary: 'facebook',
        secondary: ['finn'],
        reasoning: 'Local pickup items perform well on Facebook and FINN.no'
      };
    }
    
    return undefined;
  }
  
  // Analyze market trends
  private analyzeMarketTrends(
    itemAttributes: ItemAttributes, 
    platforms: PlatformMetrics[]
  ): CrossPlatformAnalysis['marketTrends'] {
    
    const avgCompetitors = platforms.reduce((sum, p) => sum + p.competitorCount, 0) / platforms.length;
    const avgSuccessRate = platforms.reduce((sum, p) => sum + p.successRate, 0) / platforms.length;
    
    return {
      demand: avgSuccessRate > 0.8 ? 'high' : avgSuccessRate > 0.6 ? 'medium' : 'low',
      competition: avgCompetitors > 20 ? 'high' : avgCompetitors > 10 ? 'medium' : 'low',
      priceStability: 'stable', // Would need historical data for real analysis
      seasonality: this.getSeasonalityInsight(itemAttributes.category),
    };
  }
  
  // Get seasonality insights
  private getSeasonalityInsight(category: string): string | undefined {
    const month = new Date().getMonth();
    
    if (category === 'Sport og friluft') {
      if (month >= 4 && month <= 8) return 'Summer sports equipment in high demand';
      if (month >= 10 || month <= 2) return 'Winter sports equipment peak season';
    }
    
    if (category === 'Elektronikk') {
      if (month === 10 || month === 11) return 'Pre-holiday electronics demand increase';
    }
    
    return undefined;
  }
  
  // Calculate profit analysis for each platform
  private calculateProfitAnalysis(
    platforms: PlatformMetrics[]
  ): CrossPlatformAnalysis['profitAnalysis'] {
    
    return platforms.map(platform => {
      const grossRevenue = platform.averagePrice;
      const fees = grossRevenue * (platform.fees.totalFeeRate / 100);
      const netProfit = grossRevenue - fees;
      const profitMargin = (netProfit / grossRevenue) * 100;
      
      return {
        platform: platform.platform,
        grossRevenue,
        fees,
        netProfit,
        profitMargin,
      };
    });
  }
  
  // Calculate overall confidence score
  private calculateConfidence(
    platforms: PlatformMetrics[], 
    finnAnalysis?: PriceAnalysis,
    amazonAnalysis?: AmazonListingEligibility
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence with more data
    if (finnAnalysis?.success && finnAnalysis.sampleSize > 5) {
      confidence += 0.2;
    }
    
    if (amazonAnalysis && amazonAnalysis.canList) {
      confidence += 0.1;
    }
    
    // Confidence in platform analysis
    const avgSuitability = platforms.reduce((sum, p) => sum + p.marketSuitability, 0) / platforms.length;
    confidence += avgSuitability * 0.3;
    
    return Math.min(confidence, 1.0);
  }
  
  // Get market intelligence insights
  async getMarketIntelligence(): Promise<MarketIntelligence> {
    // Market intelligence data would be fetched from external sources
    const season = this.getCurrentSeason();
    
    return {
      categoryTrends: {
        'Elektronikk': {
          avgPrice: 2500,
          salesVolume: 'high',
          topPerformingPlatforms: ['finn', 'amazon']
        },
        'Møbler': {
          avgPrice: 1800,
          salesVolume: 'medium',
          topPerformingPlatforms: ['facebook', 'finn']
        },
        'Sport og friluft': {
          avgPrice: 1200,
          salesVolume: season === 'summer' ? 'high' : 'medium',
          topPerformingPlatforms: ['finn', 'facebook']
        }
      },
      platformPerformance: {
        'finn': {
          avgListingDuration: 7,
          avgSuccessRate: 0.75,
          userSatisfaction: 0.85
        },
        'facebook': {
          avgListingDuration: 5,
          avgSuccessRate: 0.7,
          userSatisfaction: 0.8
        },
        'amazon': {
          avgListingDuration: 14,
          avgSuccessRate: 0.6,
          userSatisfaction: 0.9
        }
      },
      seasonalFactors: {
        currentSeason: season,
        impactFactor: this.getSeasonalImpact(season),
        recommendations: this.getSeasonalRecommendations(season)
      }
    };
  }
  
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }
  
  private getSeasonalImpact(season: string): number {
    // Seasonal multipliers for different times of year
    const impacts = {
      'spring': 1.1, // Spring cleaning boost
      'summer': 1.0, // Normal
      'autumn': 1.2, // Back-to-school, pre-holiday
      'winter': 0.9, // Post-holiday slowdown
    };
    return impacts[season as keyof typeof impacts] || 1.0;
  }
  
  private getSeasonalRecommendations(season: string): string[] {
    const recommendations = {
      'spring': [
        'Spring cleaning items in high demand',
        'Outdoor furniture and sports equipment trending',
        'Electronics sales remain steady'
      ],
      'summer': [
        'Outdoor and sports equipment peak season',
        'Travel accessories in demand',
        'Indoor items may take longer to sell'
      ],
      'autumn': [
        'Back-to-school electronics surge',
        'Winter clothing preparation',
        'Holiday shopping preparation begins'
      ],
      'winter': [
        'Post-holiday market slowdown',
        'Winter sports equipment in demand',
        'Indoor entertainment items trending'
      ]
    };
    
    return recommendations[season as keyof typeof recommendations] || [];
  }
}

export const crossPlatformAnalytics = new CrossPlatformAnalytics();

// Utility functions for analytics integration
export function formatCrossPlatformAnalysis(analysis: CrossPlatformAnalysis): string {
  const best = analysis.recommendations.bestOverall;
  const profit = analysis.profitAnalysis.find(p => p.platform === best);
  
  return `Best platform: ${best.toUpperCase()}. Expected profit: ${profit?.netProfit.toFixed(0)} NOK (${profit?.profitMargin.toFixed(1)}% margin). Confidence: ${(analysis.confidence * 100).toFixed(0)}%`;
}

export function getPlatformInsights(analysis: CrossPlatformAnalysis, platform: string): string[] {
  const platformData = analysis.platforms.find(p => p.platform === platform);
  return platformData?.insights || [];
}

export function comparePlatformFees(analysis: CrossPlatformAnalysis): { platform: string; totalFees: number }[] {
  return analysis.profitAnalysis
    .map(p => ({ platform: p.platform, totalFees: p.fees }))
    .sort((a, b) => a.totalFees - b.totalFees);
}