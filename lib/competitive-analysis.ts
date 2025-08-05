import type { MarketplaceScanResult, MarketplaceResult } from './marketplace-scanner'

export interface CompetitiveAnalysis {
  marketOverview: {
    totalMarketSize: number
    averagePrice: number
    priceVolatility: number
    marketSaturation: 'low' | 'medium' | 'high'
    demandLevel: 'low' | 'medium' | 'high'
  }
  platformComparison: Array<{
    platform: string
    marketShare: number
    averagePrice: number
    competitionLevel: 'low' | 'medium' | 'high'
    sellerAdvantage: string
    estimatedTimeToSale: string
    fees: {
      listing: number
      transaction: number
      total: number
    }
  }>
  priceAnalysis: {
    recommendedPrice: number
    priceRange: { min: number; max: number }
    pricingStrategy: 'aggressive' | 'competitive' | 'premium'
    priceJustification: string
  }
  gapAnalysis: Array<{
    opportunity: string
    description: string
    impact: 'low' | 'medium' | 'high'
    actionable: boolean
  }>
  trends: {
    priceDirection: 'up' | 'down' | 'stable'
    seasonalFactors: string[]
    marketMomentum: 'growing' | 'stable' | 'declining'
  }
  competitorInsights: {
    mainCompetitors: number
    averageListingQuality: 'low' | 'medium' | 'high'
    pricingPatterns: string[]
    marketPositioning: string
  }
}

export class CompetitiveAnalyzer {
  private static instance: CompetitiveAnalyzer

  static getInstance(): CompetitiveAnalyzer {
    if (!CompetitiveAnalyzer.instance) {
      CompetitiveAnalyzer.instance = new CompetitiveAnalyzer()
    }
    return CompetitiveAnalyzer.instance
  }

  async analyzeMarket(
    scanResult: MarketplaceScanResult,
    userPreference: 'quick_sale' | 'market_price' | 'maximize_profit' = 'market_price'
  ): Promise<CompetitiveAnalysis> {
    console.log('📊 Starting competitive analysis...')

    const marketOverview = this.analyzeMarketOverview(scanResult)
    const platformComparison = this.comparePlatforms(scanResult)
    const priceAnalysis = this.analyzePricing(scanResult, userPreference)
    const gapAnalysis = this.identifyGaps(scanResult)
    const trends = this.analyzeTrends(scanResult)
    const competitorInsights = this.analyzeCompetitors(scanResult)

    return {
      marketOverview,
      platformComparison,
      priceAnalysis,
      gapAnalysis,
      trends,
      competitorInsights,
    }
  }

  private analyzeMarketOverview(scanResult: MarketplaceScanResult) {
    const platforms = Object.values(scanResult.platforms)
    const validPlatforms = platforms.filter(p => p.listings > 0)

    const totalListings = validPlatforms.reduce((sum, p) => sum + p.listings, 0)
    const averagePrice = scanResult.summary.averagePrice
    const priceRanges = validPlatforms.map(p => p.priceRange.max - p.priceRange.min)
    const priceVolatility = priceRanges.length > 0 
      ? priceRanges.reduce((sum, range) => sum + range, 0) / priceRanges.length / averagePrice
      : 0

    return {
      totalMarketSize: totalListings,
      averagePrice,
      priceVolatility: Math.round(priceVolatility * 100) / 100,
      marketSaturation: this.calculateMarketSaturation(totalListings),
      demandLevel: this.calculateDemandLevel(validPlatforms),
    }
  }

  private comparePlatforms(scanResult: MarketplaceScanResult) {
    const platforms = Object.entries(scanResult.platforms)
    const totalListings = scanResult.summary.totalListings

    return platforms.map(([platformName, data]) => {
      const marketShare = totalListings > 0 ? (data.listings / totalListings) * 100 : 0
      const competitionLevel = this.calculateCompetitionLevel(data.listings)
      const fees = this.getPlatformFees(platformName, data.averagePrice)

      return {
        platform: platformName,
        marketShare: Math.round(marketShare),
        averagePrice: data.averagePrice,
        competitionLevel,
        sellerAdvantage: this.getSellerAdvantage(platformName, data),
        estimatedTimeToSale: this.estimateTimeToSale(platformName, competitionLevel),
        fees,
      }
    }).sort((a, b) => b.marketShare - a.marketShare)
  }

  private analyzePricing(
    scanResult: MarketplaceScanResult,
    userPreference: string
  ) {
    const basePrice = scanResult.summary.averagePrice
    const { min, max } = scanResult.summary.priceRange

    let recommendedPrice = basePrice
    let pricingStrategy: 'aggressive' | 'competitive' | 'premium' = 'competitive'
    let priceJustification = 'Market-average pricing'

    switch (userPreference) {
      case 'quick_sale':
        recommendedPrice = Math.round(basePrice * 0.85)
        pricingStrategy = 'aggressive'
        priceJustification = 'Priced 15% below market average for quick sale'
        break
      case 'maximize_profit':
        recommendedPrice = Math.round(basePrice * 1.15)
        pricingStrategy = 'premium'
        priceJustification = 'Premium pricing for maximum profit potential'
        break
      default:
        recommendedPrice = basePrice
        pricingStrategy = 'competitive'
        priceJustification = 'Competitive market pricing'
    }

    return {
      recommendedPrice,
      priceRange: { 
        min: Math.max(min, Math.round(recommendedPrice * 0.8)), 
        max: Math.min(max, Math.round(recommendedPrice * 1.2)) 
      },
      pricingStrategy,
      priceJustification,
    }
  }

  private identifyGaps(scanResult: MarketplaceScanResult) {
    const gaps = []
    const platforms = Object.values(scanResult.platforms)
    const validPlatforms = platforms.filter(p => p.listings > 0)

    // Low competition opportunity
    const lowCompetitionPlatforms = validPlatforms.filter(p => p.listings < 5)
    if (lowCompetitionPlatforms.length > 0) {
      gaps.push({
        opportunity: 'Low Competition Platforms',
        description: `${lowCompetitionPlatforms.map(p => p.platform).join(', ')} have minimal competition`,
        impact: 'high' as const,
        actionable: true,
      })
    }

    // Price gap opportunity
    const priceDiffs = validPlatforms.map(p => p.averagePrice)
    const maxPrice = Math.max(...priceDiffs)
    const minPrice = Math.min(...priceDiffs)
    if (maxPrice > minPrice * 1.5) {
      gaps.push({
        opportunity: 'Price Arbitrage',
        description: `Significant price differences between platforms (${maxPrice - minPrice} NOK gap)`,
        impact: 'medium' as const,
        actionable: true,
      })
    }

    // Market entry opportunity
    const missingPlatforms = ['finn', 'facebook', 'amazon'].filter(
      platform => !scanResult.platforms[platform] || scanResult.platforms[platform].listings === 0
    )
    if (missingPlatforms.length > 0) {
      gaps.push({
        opportunity: 'Untapped Platforms',
        description: `Consider listing on ${missingPlatforms.join(', ')} for broader reach`,
        impact: 'medium' as const,
        actionable: true,
      })
    }

    return gaps
  }

  private analyzeTrends(scanResult: MarketplaceScanResult) {
    // This would normally use historical data
    // For now, provide general trend analysis based on current data
    const platforms = Object.values(scanResult.platforms)
    const avgConfidence = platforms.reduce((sum, p) => sum + p.confidence, 0) / platforms.length

    return {
      priceDirection: 'stable' as const,
      seasonalFactors: this.getSeasonalFactors(),
      marketMomentum: avgConfidence > 0.7 ? 'growing' as const : 'stable' as const,
    }
  }

  private analyzeCompetitors(scanResult: MarketplaceScanResult) {
    const platforms = Object.values(scanResult.platforms)
    const totalListings = platforms.reduce((sum, p) => sum + p.listings, 0)
    const avgListings = totalListings / platforms.length

    return {
      mainCompetitors: totalListings,
      averageListingQuality: avgListings > 10 ? 'high' as const : 'medium' as const,
      pricingPatterns: [
        'Most listings priced near market average',
        'Some premium-priced items available',
        'Competitive pricing environment',
      ],
      marketPositioning: this.getMarketPositioning(scanResult),
    }
  }

  // Helper methods
  private calculateMarketSaturation(totalListings: number): 'low' | 'medium' | 'high' {
    if (totalListings < 5) return 'low'
    if (totalListings < 20) return 'medium'
    return 'high'
  }

  private calculateDemandLevel(platforms: MarketplaceResult[]): 'low' | 'medium' | 'high' {
    const avgConfidence = platforms.reduce((sum, p) => sum + p.confidence, 0) / platforms.length
    if (avgConfidence < 0.4) return 'low'
    if (avgConfidence < 0.7) return 'medium'
    return 'high'
  }

  private calculateCompetitionLevel(listings: number): 'low' | 'medium' | 'high' {
    if (listings < 5) return 'low'
    if (listings < 15) return 'medium'
    return 'high'
  }

  private getPlatformFees(platform: string, price: number) {
    const fees = {
      listing: 0,
      transaction: 0,
      total: 0,
    }

    switch (platform) {
      case 'finn':
        fees.listing = 49 // FINN.no listing fee
        fees.total = 49
        break
      case 'facebook':
        fees.transaction = Math.round(price * 0.05) // 5% transaction fee
        fees.total = fees.transaction
        break
      case 'amazon':
        fees.transaction = Math.round(price * 0.15) // ~15% Amazon fees
        fees.total = fees.transaction
        break
    }

    return fees
  }

  private getSellerAdvantage(platform: string, data: MarketplaceResult): string {
    switch (platform) {
      case 'finn':
        return 'Norwegian market leader, high trust'
      case 'facebook':
        return 'Large user base, social proof'
      case 'amazon':
        return 'Global reach, logistics support'
      default:
        return 'Platform-specific advantages'
    }
  }

  private estimateTimeToSale(platform: string, competition: string): string {
    const baseTime = {
      finn: { low: '2-5 days', medium: '5-10 days', high: '10-20 days' },
      facebook: { low: '1-3 days', medium: '3-7 days', high: '7-14 days' },
      amazon: { low: '3-7 days', medium: '7-14 days', high: '14-30 days' },
    }

    return baseTime[platform as keyof typeof baseTime]?.[competition as keyof typeof baseTime.finn] || '5-10 days'
  }

  private getSeasonalFactors(): string[] {
    const currentMonth = new Date().getMonth()
    const seasonalFactors = []

    if (currentMonth >= 10 || currentMonth <= 1) {
      seasonalFactors.push('Holiday season demand')
    }
    if (currentMonth >= 4 && currentMonth <= 6) {
      seasonalFactors.push('Spring cleaning season')
    }
    if (currentMonth >= 7 && currentMonth <= 8) {
      seasonalFactors.push('Summer vacation period')
    }

    return seasonalFactors.length > 0 ? seasonalFactors : ['Normal seasonal patterns']
  }

  private getMarketPositioning(scanResult: MarketplaceScanResult): string {
    const avgPrice = scanResult.summary.averagePrice
    if (avgPrice > 5000) return 'Premium market segment'
    if (avgPrice > 1000) return 'Mid-market segment'
    return 'Budget-friendly segment'
  }
}

// Singleton instance
export const competitiveAnalyzer = CompetitiveAnalyzer.getInstance()