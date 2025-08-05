// TODO: Implement real marketplace API integrations
// import { validatePriceOnFinn } from './finn-api'
// import { analyzeAmazonEligibility } from './amazon-api'

export interface ProductAnalysis {
  title: string
  brand?: string
  model?: string
  category: string
  condition: string
  description: string
}

export interface MarketplaceResult {
  platform: string
  averagePrice: number
  priceRange: { min: number; max: number }
  listings: number
  confidence: number
  lastUpdated: string
  marketData?: {
    topListings?: Array<{
      title: string
      price: number
      url?: string
      condition?: string
      location?: string
    }>
    priceDistribution?: Array<{ range: string; count: number }>
    competitorAnalysis?: {
      totalListings: number
      averageDaysOnMarket: number
      priceVariation: number
    }
  }
}

export interface MarketplaceScanResult {
  scanId: string
  status: 'completed' | 'partial' | 'failed'
  platforms: Record<string, MarketplaceResult>
  summary: {
    totalListings: number
    averagePrice: number
    priceRange: { min: number; max: number }
    recommendedPlatforms: string[]
  }
  timestamp: string
}

export class MarketplaceScanner {
  private static instance: MarketplaceScanner
  private scanCache = new Map<string, MarketplaceScanResult>()
  private readonly CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  static getInstance(): MarketplaceScanner {
    if (!MarketplaceScanner.instance) {
      MarketplaceScanner.instance = new MarketplaceScanner()
    }
    return MarketplaceScanner.instance
  }

  async scanMarketplaces(
    productAnalysis: ProductAnalysis,
    platforms: string[] = ['finn', 'facebook', 'amazon'],
    maxResults: number = 50,
    basePrice?: number // User's selected price to base mock data on
  ): Promise<MarketplaceScanResult> {
    console.log('🔍 Starting marketplace scan for:', productAnalysis.title)
    
    const scanId = this.generateScanId(productAnalysis)
    
    // Check cache first
    const cached = this.scanCache.get(scanId)
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📦 Returning cached scan results')
      return cached
    }

    const scanStartTime = Date.now()
    const results: Record<string, MarketplaceResult> = {}
    const errors: Record<string, string> = {}

    // Run platform scans in parallel
    const scanPromises = platforms.map(async (platform) => {
      try {
        console.log(`🔍 Scanning ${platform}...`)
        const result = await this.scanPlatform(platform, productAnalysis, maxResults, basePrice)
        results[platform] = result
      } catch (error) {
        console.error(`❌ Failed to scan ${platform}:`, error)
        errors[platform] = error instanceof Error ? error.message : 'Unknown error'
      }
    })

    await Promise.allSettled(scanPromises)

    // Generate summary
    const summary = this.generateSummary(results)

    const scanResult: MarketplaceScanResult = {
      scanId,
      status: Object.keys(results).length > 0 ? 'completed' : 'failed',
      platforms: results,
      summary,
      timestamp: new Date().toISOString(),
    }

    // Cache the result
    this.scanCache.set(scanId, scanResult)

    console.log(`✅ Marketplace scan completed in ${Date.now() - scanStartTime}ms`)
    console.log(`📊 Found listings on ${Object.keys(results).length} platforms`)

    return scanResult
  }

  private async scanPlatform(
    platform: string,
    productAnalysis: ProductAnalysis,
    maxResults: number,
    basePrice?: number
  ): Promise<MarketplaceResult> {
    switch (platform) {
      case 'finn':
        return await this.scanFinn(productAnalysis, maxResults, basePrice)
      case 'facebook':
        return await this.scanFacebook(productAnalysis, maxResults, basePrice)
      case 'amazon':
        return await this.scanAmazon(productAnalysis, maxResults, basePrice)
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  private async scanFinn(
    productAnalysis: ProductAnalysis,
    maxResults: number,
    basePrice?: number
  ): Promise<MarketplaceResult> {
    // TODO: Implement real FINN.no API integration
    // For now, generate mock data based on basePrice
    
    const price = basePrice || 1000
    return this.generateMockMarketData('finn', price, productAnalysis)
  }

  private async scanFacebook(
    productAnalysis: ProductAnalysis,
    maxResults: number,
    basePrice?: number
  ): Promise<MarketplaceResult> {
    // TODO: Implement Facebook Marketplace API integration
    // For now, generate mock data based on basePrice
    
    const price = basePrice || 1000
    return this.generateMockMarketData('facebook', price, productAnalysis)
  }

  private async scanAmazon(
    productAnalysis: ProductAnalysis,
    maxResults: number,
    basePrice?: number
  ): Promise<MarketplaceResult> {
    // TODO: Implement Amazon SP-API integration
    // For now, generate mock data based on basePrice
    
    const price = basePrice || 1000
    return this.generateMockMarketData('amazon', price, productAnalysis)
  }

  private generateMockMarketData(platform: string, basePrice: number, productAnalysis: ProductAnalysis): MarketplaceResult {
    // Generate realistic variations around the base price
    const priceVariation = 0.2 // ±20%
    const minPrice = Math.round(basePrice * (1 - priceVariation))
    const maxPrice = Math.round(basePrice * (1 + priceVariation))
    
    // Platform-specific adjustments
    let adjustedPrice = basePrice
    let listings = 0
    let confidence = 0.5
    
    switch (platform) {
      case 'finn':
        // FINN typically has good market data
        adjustedPrice = Math.round(basePrice * (0.95 + Math.random() * 0.1)) // ±5%
        listings = Math.floor(Math.random() * 15) + 5 // 5-20 listings
        confidence = 0.6 + Math.random() * 0.3 // 0.6-0.9
        break
      case 'facebook':
        // Facebook often has lower prices but more variation
        adjustedPrice = Math.round(basePrice * (0.85 + Math.random() * 0.2)) // -15% to +5%
        listings = Math.floor(Math.random() * 25) + 8 // 8-33 listings
        confidence = 0.4 + Math.random() * 0.4 // 0.4-0.8
        break
      case 'amazon':
        // Amazon typically has higher prices but fewer used items
        adjustedPrice = Math.round(basePrice * (1.0 + Math.random() * 0.3)) // 0% to +30%
        listings = Math.floor(Math.random() * 8) + 2 // 2-10 listings
        confidence = 0.3 + Math.random() * 0.5 // 0.3-0.8
        break
    }

    // Generate mock top listings
    const topListings = []
    const listingCount = Math.min(5, listings)
    for (let i = 0; i < listingCount; i++) {
      const priceVar = 0.8 + Math.random() * 0.4 // ±20% from adjusted price
      topListings.push({
        title: `${productAnalysis.brand || 'Similar'} ${productAnalysis.model || 'Item'} ${i + 1}`,
        price: Math.round(adjustedPrice * priceVar),
        condition: ['new', 'like_new', 'used_good', 'used_fair'][Math.floor(Math.random() * 4)],
        location: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'][Math.floor(Math.random() * 4)],
      })
    }

    return {
      platform,
      averagePrice: adjustedPrice,
      priceRange: {
        min: Math.min(minPrice, adjustedPrice - Math.round(adjustedPrice * 0.15)),
        max: Math.max(maxPrice, adjustedPrice + Math.round(adjustedPrice * 0.15)),
      },
      listings,
      confidence: Math.round(confidence * 100) / 100,
      lastUpdated: new Date().toISOString(),
      marketData: {
        topListings,
        priceDistribution: [
          { range: `${minPrice}-${Math.round((minPrice + adjustedPrice) / 2)}`, count: Math.floor(listings * 0.3) },
          { range: `${Math.round((minPrice + adjustedPrice) / 2)}-${Math.round((adjustedPrice + maxPrice) / 2)}`, count: Math.floor(listings * 0.4) },
          { range: `${Math.round((adjustedPrice + maxPrice) / 2)}-${maxPrice}`, count: Math.floor(listings * 0.3) },
        ],
        competitorAnalysis: {
          totalListings: listings,
          averageDaysOnMarket: Math.floor(Math.random() * 20) + 5, // 5-25 days
          priceVariation: Math.round((maxPrice - minPrice) / adjustedPrice * 100), // percentage
        },
      },
    }
  }

  private generateSummary(results: Record<string, MarketplaceResult>) {
    const validResults = Object.values(results).filter(r => r.listings > 0)
    
    if (validResults.length === 0) {
      return {
        totalListings: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        recommendedPlatforms: [],
      }
    }

    const totalListings = validResults.reduce((sum, r) => sum + r.listings, 0)
    const averagePrice = validResults.reduce((sum, r) => sum + (r.averagePrice * r.listings), 0) / totalListings
    const allPrices = validResults.flatMap(r => [r.priceRange.min, r.priceRange.max])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)

    // Recommend platforms based on confidence and listing count
    const recommendedPlatforms = validResults
      .sort((a, b) => (b.confidence * b.listings) - (a.confidence * a.listings))
      .slice(0, 3)
      .map(r => r.platform)

    return {
      totalListings,
      averagePrice: Math.round(averagePrice),
      priceRange: { min: Math.round(minPrice), max: Math.round(maxPrice) },
      recommendedPlatforms,
    }
  }

  private generateScanId(productAnalysis: ProductAnalysis): string {
    const key = `${productAnalysis.title}-${productAnalysis.brand}-${productAnalysis.model}-${productAnalysis.category}-${productAnalysis.condition}`
    return Buffer.from(key).toString('base64').slice(0, 16)
  }

  private isCacheValid(timestamp: string): boolean {
    const cacheTime = new Date(timestamp).getTime()
    return Date.now() - cacheTime < this.CACHE_DURATION
  }

  clearCache(): void {
    this.scanCache.clear()
  }
}

// Singleton instance
export const marketplaceScanner = MarketplaceScanner.getInstance()