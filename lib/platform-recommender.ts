import type { MarketplaceScanResult } from './marketplace-scanner'
import type { CompetitiveAnalysis } from './competitive-analysis'
import { competitiveAnalyzer } from './competitive-analysis'

interface PlatformData {
  averagePrice: number;
  competitorCount: number;
  priceRange: { min: number; max: number };
  fees: {
    listing: number;
    transaction: number;
    total: number;
  };
}

interface PlatformComparison {
  profitMargin: number;
  timeToSale: number;
  successRate: number;
}

export interface PlatformRecommendation {
  platform: string
  score: number // 0-100
  reasoning: string
  pros: string[]
  cons: string[]
  expectedPrice: number
  expectedTimeToSale: string
  fees: {
    listing: number
    transaction: number
    total: number
  }
  netProfit: number
  riskLevel: 'low' | 'medium' | 'high'
  confidenceLevel: 'low' | 'medium' | 'high'
  marketInsights: {
    competition: string
    demand: string
    trend: string
  }
}

export interface PlatformRecommendationResult {
  recommendations: PlatformRecommendation[]
  summary: {
    topPlatform: string
    averageScore: number
    totalPotentialRevenue: number
    recommendedStrategy: string
  }
  analysis: CompetitiveAnalysis
  timestamp: string
}

export interface UserPreferences {
  strategy: 'quick_sale' | 'market_price' | 'maximize_profit'
  timeframe: 'urgent' | 'normal' | 'flexible'
  experience_level: 'beginner' | 'intermediate' | 'expert'
  risk_tolerance: 'low' | 'medium' | 'high'
}

export class PlatformRecommender {
  private static instance: PlatformRecommender

  static getInstance(): PlatformRecommender {
    if (!PlatformRecommender.instance) {
      PlatformRecommender.instance = new PlatformRecommender()
    }
    return PlatformRecommender.instance
  }

  async recommendPlatforms(
    scanResult: MarketplaceScanResult,
    userPreferences: UserPreferences
  ): Promise<PlatformRecommendationResult> {
    console.log('🎯 Generating platform recommendations...')

    // Get competitive analysis
    const analysis = await competitiveAnalyzer.analyzeMarket(scanResult, userPreferences.strategy)

    // Generate recommendations for each platform
    const recommendations = await this.generateRecommendations(scanResult, analysis, userPreferences)

    // Calculate summary
    const summary = this.generateSummary(recommendations, userPreferences)

    return {
      recommendations,
      summary,
      analysis,
      timestamp: new Date().toISOString(),
    }
  }

  private async generateRecommendations(
    scanResult: MarketplaceScanResult,
    analysis: CompetitiveAnalysis,
    userPreferences: UserPreferences
  ): Promise<PlatformRecommendation[]> {
    const recommendations: PlatformRecommendation[] = []

    for (const [platformName, platformData] of Object.entries(scanResult.platforms)) {
      const platformComparison = analysis.platformComparison.find(p => p.platform === platformName)
      if (!platformComparison) continue

      const recommendation = await this.scorePlatform(
        platformName,
        platformData,
        platformComparison,
        analysis,
        userPreferences
      )

      recommendations.push(recommendation)
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.score - a.score)
  }

  private async scorePlatform(
    platformName: string,
    platformData: PlatformData,
    platformComparison: PlatformComparison,
    analysis: CompetitiveAnalysis,
    userPreferences: UserPreferences
  ): Promise<PlatformRecommendation> {
    const weights = this.getScoreWeights(userPreferences)
    let score = 0
    const scoringFactors: string[] = []

    // Market data score (0-25 points)
    const marketScore = this.calculateMarketScore(platformData, platformComparison)
    score += marketScore * weights.market
    if (marketScore > 20) scoringFactors.push('Strong market presence')

    // Competition score (0-25 points) 
    const competitionScore = this.calculateCompetitionScore(platformComparison.competitionLevel)
    score += competitionScore * weights.competition
    if (competitionScore > 20) scoringFactors.push('Favorable competition level')

    // Fee structure score (0-20 points)
    const feeScore = this.calculateFeeScore(platformComparison.fees, platformData.averagePrice)
    score += feeScore * weights.fees
    if (feeScore > 15) scoringFactors.push('Low platform fees')

    // Time to sale score (0-15 points)
    const timeScore = this.calculateTimeScore(platformComparison.estimatedTimeToSale, userPreferences.timeframe)
    score += timeScore * weights.time
    if (timeScore > 12) scoringFactors.push('Fast selling platform')

    // Risk assessment score (0-15 points)
    const riskScore = this.calculateRiskScore(platformName, platformData.confidence, userPreferences.risk_tolerance)
    score += riskScore * weights.risk
    if (riskScore > 12) scoringFactors.push('Low risk platform')

    // User experience score (0-10 points based on experience level)
    const experienceScore = this.calculateExperienceScore(platformName, userPreferences.experience_level)
    score += experienceScore * weights.experience
    if (experienceScore > 8) scoringFactors.push('User-friendly platform')

    const finalScore = Math.min(100, Math.round(score))

    return {
      platform: platformName,
      score: finalScore,
      reasoning: this.generateReasoning(platformName, finalScore, scoringFactors, userPreferences),
      pros: this.getPlatformPros(platformName, platformComparison, platformData),
      cons: this.getPlatformCons(platformName, platformComparison, platformData),
      expectedPrice: platformData.averagePrice || analysis.priceAnalysis.recommendedPrice,
      expectedTimeToSale: platformComparison.estimatedTimeToSale,
      fees: platformComparison.fees,
      netProfit: Math.max(0, (platformData.averagePrice || 0) - platformComparison.fees.total),
      riskLevel: this.assessRiskLevel(platformData.confidence, platformComparison.competitionLevel),
      confidenceLevel: this.assessConfidenceLevel(platformData.confidence),
      marketInsights: {
        competition: this.getCompetitionInsight(platformComparison.competitionLevel, platformData.listings),
        demand: this.getDemandInsight(analysis.marketOverview.demandLevel),
        trend: this.getTrendInsight(analysis.trends.marketMomentum),
      },
    }
  }

  private getScoreWeights(userPreferences: UserPreferences) {
    const baseWeights = {
      market: 1.0,
      competition: 1.0,
      fees: 1.0,
      time: 1.0,
      risk: 1.0,
      experience: 1.0,
    }

    // Adjust weights based on user preferences
    switch (userPreferences.strategy) {
      case 'quick_sale':
        baseWeights.time = 1.5
        baseWeights.competition = 1.3
        baseWeights.fees = 0.8
        break
      case 'maximize_profit':
        baseWeights.market = 1.4
        baseWeights.fees = 1.3
        baseWeights.time = 0.7
        break
    }

    if (userPreferences.timeframe === 'urgent') {
      baseWeights.time = 1.5
    }

    if (userPreferences.experience_level === 'beginner') {
      baseWeights.experience = 1.3
      baseWeights.risk = 1.2
    }

    return baseWeights
  }

  private calculateMarketScore(platformData: PlatformData, platformComparison: PlatformComparison): number {
    let score = 0
    
    // Market share (0-10 points)
    score += Math.min(10, platformComparison.marketShare / 2)
    
    // Average price (0-10 points)
    if (platformData.averagePrice > 0) {
      score += Math.min(10, platformData.averagePrice / 1000)
    }
    
    // Confidence level (0-5 points)
    score += platformData.confidence * 5

    return Math.min(25, score)
  }

  private calculateCompetitionScore(competitionLevel: string): number {
    switch (competitionLevel) {
      case 'low': return 25
      case 'medium': return 18
      case 'high': return 12
      default: return 15
    }
  }

  private calculateFeeScore(fees: PlatformData['fees'], averagePrice: number): number {
    if (averagePrice === 0) return 10

    const feePercentage = (fees.total / averagePrice) * 100
    
    if (feePercentage < 5) return 20
    if (feePercentage < 10) return 15
    if (feePercentage < 15) return 10
    return 5
  }

  private calculateTimeScore(timeToSale: string, timeframe: string): number {
    const days = this.parseTimeToSale(timeToSale)
    let score = Math.max(0, 15 - days)
    
    if (timeframe === 'urgent' && days <= 3) score += 5
    if (timeframe === 'flexible' && days <= 10) score += 2
    
    return Math.min(15, score)
  }

  private calculateRiskScore(platform: string, confidence: number, riskTolerance: string): number {
    const baseRisk = this.getPlatformBaseRisk(platform)
    const confidenceBonus = confidence * 5
    
    let score = Math.min(15, confidenceBonus + (10 - baseRisk))
    
    if (riskTolerance === 'low' && baseRisk <= 3) score += 3
    if (riskTolerance === 'high' && baseRisk >= 7) score += 2
    
    return Math.min(15, score)
  }

  private calculateExperienceScore(platform: string, experienceLevel: string): number {
    const platformDifficulty = {
      finn: 2, // Easy
      facebook: 3, // Medium
      amazon: 8, // Hard
    }

    const difficulty = platformDifficulty[platform as keyof typeof platformDifficulty] || 5

    switch (experienceLevel) {
      case 'beginner':
        return Math.max(0, 10 - difficulty)
      case 'intermediate':
        return difficulty <= 6 ? 8 : 5
      case 'expert':
        return 8 // Experts can handle any platform
      default:
        return 5
    }
  }

  private generateReasoning(
    platform: string,
    score: number,
    factors: string[],
    userPreferences: UserPreferences
  ): string {
    const scoreCategory = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'
    const strategy = userPreferences.strategy.replace('_', ' ')
    
    let reasoning = `${scoreCategory} choice for ${strategy} strategy. `
    
    if (factors.length > 0) {
      reasoning += factors.slice(0, 2).join(' and ') + '.'
    }
    
    // Add platform-specific insights
    switch (platform) {
      case 'finn':
        reasoning += ' FINN.no is Norway\'s leading marketplace with high trust and local reach.'
        break
      case 'facebook':
        reasoning += ' Facebook Marketplace offers large audience and social proof benefits.'
        break
      case 'amazon':
        reasoning += ' Amazon provides global reach but requires more complex setup.'
        break
    }

    return reasoning
  }

  private getPlatformPros(platform: string, comparison: PlatformComparison, data: PlatformData): string[] {
    const pros: string[] = []
    
    // Generic pros based on data
    if (comparison.marketShare > 30) pros.push('High market share')
    if (comparison.competitionLevel === 'low') pros.push('Low competition')
    if (comparison.fees.total < data.averagePrice * 0.1) pros.push('Low fees')
    if (data.confidence > 0.7) pros.push('High price confidence')

    // Platform-specific pros
    switch (platform) {
      case 'finn':
        pros.push('Trusted Norwegian platform', 'Local buyer preference', 'Easy to use')
        break
      case 'facebook':
        pros.push('Large user base', 'Social proof', 'Quick communication')
        break
      case 'amazon':
        pros.push('Global reach', 'Professional marketplace', 'Logistics support')
        break
    }

    return pros.slice(0, 4) // Limit to 4 pros
  }

  private getPlatformCons(platform: string, comparison: PlatformComparison, data: PlatformData): string[] {
    const cons: string[] = []
    
    // Generic cons based on data
    if (comparison.competitionLevel === 'high') cons.push('High competition')
    if (comparison.fees.total > data.averagePrice * 0.15) cons.push('High fees')
    if (data.confidence < 0.4) cons.push('Low price confidence')
    if (data.listings === 0) cons.push('No similar listings found')

    // Platform-specific cons
    switch (platform) {
      case 'finn':
        cons.push('Listing fees required', 'Norway-only market')
        break
      case 'facebook':
        cons.push('No seller protection', 'Casual buyer base')
        break
      case 'amazon':
        cons.push('Complex setup', 'Strict requirements', 'High competition')
        break
    }

    return cons.slice(0, 3) // Limit to 3 cons
  }

  private generateSummary(
    recommendations: PlatformRecommendation[],
    userPreferences: UserPreferences
  ) {
    const topPlatform = recommendations[0]?.platform || 'none'
    const averageScore = recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length
    const totalRevenue = recommendations.reduce((sum, r) => sum + r.netProfit, 0)
    
    let recommendedStrategy = 'Multi-platform approach'
    if (userPreferences.strategy === 'quick_sale') {
      recommendedStrategy = 'Focus on fast-selling platforms'
    } else if (userPreferences.strategy === 'maximize_profit') {
      recommendedStrategy = 'Target high-value platforms'
    }

    return {
      topPlatform,
      averageScore: Math.round(averageScore),
      totalPotentialRevenue: Math.round(totalRevenue),
      recommendedStrategy,
    }
  }

  // Helper methods
  private parseTimeToSale(timeStr: string): number {
    const match = timeStr.match(/(\d+)-(\d+)/)
    if (match) {
      return (parseInt(match[1]) + parseInt(match[2])) / 2
    }
    return 7 // Default to 7 days
  }

  private getPlatformBaseRisk(platform: string): number {
    const riskLevels = {
      finn: 2, // Low risk
      facebook: 5, // Medium risk
      amazon: 7, // Higher risk
    }
    return riskLevels[platform as keyof typeof riskLevels] || 5
  }

  private assessRiskLevel(confidence: number, competition: string): 'low' | 'medium' | 'high' {
    if (confidence > 0.7 && competition === 'low') return 'low'
    if (confidence > 0.5 && competition !== 'high') return 'medium'
    return 'high'
  }

  private assessConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence > 0.7) return 'high'
    if (confidence > 0.4) return 'medium'
    return 'low'
  }

  private getCompetitionInsight(level: string, listings: number): string {
    return `${level} competition with ${listings} similar listings`
  }

  private getDemandInsight(level: string): string {
    return `${level} market demand`
  }

  private getTrendInsight(momentum: string): string {
    return `Market is ${momentum}`
  }
}

// Singleton instance
export const platformRecommender = PlatformRecommender.getInstance()