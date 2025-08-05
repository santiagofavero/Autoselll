// FINN.no integration with AI price estimation
// TODO: Implement FINN.no web scraping when we have a solution for dynamic content
// The FINN API requires business partnership, so we'll use AI estimation for now

import * as cheerio from 'cheerio'; // Keeping for future scraping implementation
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export interface FinnSearchParams {
  query: string;
  category?: string;
  sort?: 'PUBLISHED_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'RELEVANCE';
  price_from?: number;
  price_to?: number;
  rows?: number;
  page?: number;
}

export interface FinnAd {
  id: string;
  title: string;
  price?: {
    amount: number;
    currency: string;
  };
  location?: string;
  published: string;
  url: string;
  description?: string;
  category: string;
  images?: string[];
}

export interface FinnSearchResult {
  ads: FinnAd[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface PriceAnalysis {
  averagePrice: number;
  medianPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  sampleSize: number;
  confidence: number;
  suggestions: {
    conservative: number;
    market: number;
    optimistic: number;
  };
  insights: string[];
  // Enhanced pricing data
  newPrice?: number;
  depreciation?: {
    rate: number;
    category: string;
    estimatedAge?: string;
  };
}

export interface DepreciationModel {
  category: string;
  initialDepreciation: number; // 0-1 (e.g., 0.3 = 30%)
  yearlyDepreciation: number;  // 0-1 per year
  conditionMultiplier: {
    mint: number;    // 0.9-1.0
    excellent: number; // 0.8-0.9
    good: number;    // 0.7-0.8
    fair: number;    // 0.5-0.7
    poor: number;    // 0.3-0.5
  };
  brandPremium?: number; // Additional multiplier for premium brands
}

class FinnAPI {
  private baseUrl = 'https://www.finn.no';
  private depreciationModels: Record<string, DepreciationModel>;
  
  constructor() {
    this.depreciationModels = this.initializeDepreciationModels();
  }
  
  private initializeDepreciationModels(): Record<string, DepreciationModel> {
    return {
      'electronics': {
        category: 'Electronics',
        initialDepreciation: 0.35, // 35% immediate depreciation
        yearlyDepreciation: 0.15,  // 15% per year
        conditionMultiplier: {
          mint: 0.95,
          excellent: 0.85,
          good: 0.75,
          fair: 0.60,
          poor: 0.40
        }
      },
      'luxury': {
        category: 'Luxury Items (watches, jewelry)',
        initialDepreciation: 0.20, // 20% immediate
        yearlyDepreciation: 0.08,  // 8% per year
        conditionMultiplier: {
          mint: 0.90,
          excellent: 0.80,
          good: 0.70,
          fair: 0.55,
          poor: 0.35
        },
        brandPremium: 1.2 // Premium brands hold value better
      },
      'fashion': {
        category: 'Fashion/Clothing',
        initialDepreciation: 0.60, // 60% immediate
        yearlyDepreciation: 0.10,  // 10% per year
        conditionMultiplier: {
          mint: 0.85,
          excellent: 0.70,
          good: 0.55,
          fair: 0.40,
          poor: 0.25
        }
      },
      'furniture': {
        category: 'Furniture',
        initialDepreciation: 0.40, // 40% immediate
        yearlyDepreciation: 0.08,  // 8% per year
        conditionMultiplier: {
          mint: 0.90,
          excellent: 0.80,
          good: 0.70,
          fair: 0.55,
          poor: 0.35
        }
      },
      'sports': {
        category: 'Sports Equipment',
        initialDepreciation: 0.30, // 30% immediate
        yearlyDepreciation: 0.12,  // 12% per year
        conditionMultiplier: {
          mint: 0.90,
          excellent: 0.80,
          good: 0.70,
          fair: 0.55,
          poor: 0.35
        }
      },
      'vehicles': {
        category: 'Vehicles',
        initialDepreciation: 0.20, // 20% first year
        yearlyDepreciation: 0.12,  // 12% per year
        conditionMultiplier: {
          mint: 0.95,
          excellent: 0.90,
          good: 0.80,
          fair: 0.65,
          poor: 0.45
        }
      },
      'default': {
        category: 'General Items',
        initialDepreciation: 0.30, // 30% immediate
        yearlyDepreciation: 0.10,  // 10% per year
        conditionMultiplier: {
          mint: 0.90,
          excellent: 0.80,
          good: 0.70,
          fair: 0.55,
          poor: 0.35
        }
      }
    };
  }
  
  private calculateDepreciation(
    _newPrice: number,
    category: 'electronics' | 'luxury' | 'fashion' | 'furniture' | 'sports' | 'vehicles' | 'default',
    condition: 'mint' | 'excellent' | 'good' | 'fair' | 'poor',
    estimatedAge?: string,
    isPremiumBrand?: boolean
  ): { totalDepreciation: number; breakdown: string[] } {
    console.log('🧮 [Depreciation] Starting calculation', {
      category,
      condition,
      estimatedAge,
      isPremiumBrand
    });
    
    const model = this.depreciationModels[category];
    console.log('📊 [Depreciation] Using model', {
      categoryModel: model.category,
      initialDepreciation: model.initialDepreciation,
      yearlyDepreciation: model.yearlyDepreciation
    });
    
    // Start with initial depreciation
    let totalDepreciation = model.initialDepreciation;
    const breakdown: string[] = [];
    breakdown.push(`Initielt verdifall: ${(model.initialDepreciation * 100).toFixed(0)}%`);
    
    // Apply yearly depreciation based on estimated age
    if (estimatedAge) {
      const ageYears = this.parseAgeToYears(estimatedAge);
      if (ageYears > 0) {
        const yearlyLoss = ageYears * model.yearlyDepreciation;
        totalDepreciation += yearlyLoss;
        breakdown.push(`Aldersverdifall: ${(yearlyLoss * 100).toFixed(0)}% (${ageYears} år)`);
      }
    }
    
    // Apply condition multiplier
    const conditionMultiplier = model.conditionMultiplier[condition];
    const conditionAdjustment = 1 - conditionMultiplier;
    totalDepreciation += conditionAdjustment;
    breakdown.push(`Tilstandsjustering: ${(conditionAdjustment * 100).toFixed(0)}% (${condition})`);
    
    // Apply brand premium if applicable
    if (isPremiumBrand && model.brandPremium) {
      const brandBonus = (model.brandPremium - 1) * 0.1; // Reduce depreciation for premium brands
      totalDepreciation -= brandBonus;
      breakdown.push(`Premium merke bonus: -${(brandBonus * 100).toFixed(0)}%`);
    }
    
    // Ensure depreciation doesn't exceed 90%
    const originalDepreciation = totalDepreciation;
    totalDepreciation = Math.min(totalDepreciation, 0.90);
    totalDepreciation = Math.max(totalDepreciation, 0.10); // Minimum 10% depreciation
    
    console.log('✅ [Depreciation] Final calculation', {
      originalDepreciation: `${(originalDepreciation * 100).toFixed(1)}%`,
      finalDepreciation: `${(totalDepreciation * 100).toFixed(1)}%`,
      wasCapped: originalDepreciation !== totalDepreciation,
      breakdown
    });
    
    return { totalDepreciation, breakdown };
  }
  
  private parseAgeToYears(estimatedAge: string): number {
    const lowerAge = estimatedAge.toLowerCase();
    
    // Try to extract years from various formats
    if (lowerAge.includes('ny') || lowerAge.includes('new')) return 0;
    if (lowerAge.includes('måneder') || lowerAge.includes('months')) {
      const months = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return months / 12;
    }
    if (lowerAge.includes('år') || lowerAge.includes('year')) {
      const years = parseInt(lowerAge.match(/\d+/)?.[0] || '0');
      return years;
    }
    if (lowerAge.includes('vintage') || lowerAge.includes('klassisk')) return 20; // Assume vintage = 20 years
    if (lowerAge.includes('retro')) return 15; // Assume retro = 15 years
    
    // Try to extract just numbers and assume years
    const numberMatch = lowerAge.match(/\d+/);
    if (numberMatch) {
      const num = parseInt(numberMatch[0]);
      // If it's a 4-digit year, calculate age from current year
      if (num > 1950 && num < new Date().getFullYear()) {
        return new Date().getFullYear() - num;
      }
      // Otherwise assume it's years
      if (num <= 50) return num; // Reasonable age limit
    }
    
    return 2; // Default to 2 years if can't parse
  }
  
  async search(params: FinnSearchParams): Promise<FinnSearchResult> {
    console.log('🔍 [FINN] Search called', params);
    
    // TODO: Implement web scraping when we have a solution for:
    // 1. Dynamic JavaScript content loading
    // 2. Anti-bot measures
    // 3. Proper HTML structure parsing
    
    // For now, return empty results to trigger AI estimation
    return {
      ads: [],
      totalCount: 0,
      page: params.page || 1,
      totalPages: 0
    };
    
    /* SCRAPING CODE - PRESERVED FOR FUTURE USE
    try {
      // Build search URL
      const searchParams = new URLSearchParams();
      if (params.query) searchParams.append('q', params.query);
      if (params.price_from) searchParams.append('price_from', params.price_from.toString());
      if (params.price_to) searchParams.append('price_to', params.price_to.toString());
      if (params.sort) {
        const sortMap: Record<string, string> = {
          'PUBLISHED_DESC': 'PUBLISHED_DESC',
          'PRICE_ASC': 'PRICE_ASC', 
          'PRICE_DESC': 'PRICE_DESC',
          'RELEVANCE': 'RELEVANCE'
        };
        searchParams.append('sort', sortMap[params.sort]);
      }
      if (params.page && params.page > 1) {
        searchParams.append('page', params.page.toString());
      }

      // Determine the search path based on category
      const searchPath = this.getSearchPath(params.category);
      const url = `${this.baseUrl}${searchPath}?${searchParams.toString()}`;
      
      console.log('🌐 [FINN Scraper] Fetching URL', { url });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'no,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch FINN.no: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseSearchResults(html, params);
      
    } catch (error) {
      console.error('❌ [FINN Scraper] Search failed', error);
      
      // Return empty results - let the price analysis handle the fallback
      return {
        ads: [],
        totalCount: 0,
        page: params.page || 1,
        totalPages: 0
      };
    }
    */
  }

  // TODO: This method is preserved for future FINN.no scraping implementation
  // Currently not used as we're using AI estimation instead
  private parseSearchResults(html: string, params: FinnSearchParams): FinnSearchResult {
    const $ = cheerio.load(html);
    const ads: FinnAd[] = [];
    
    // FINN.no uses different selectors, we'll try multiple approaches
    const adSelectors = [
      'article[data-testid="search-result"]',
      '.ads__unit',
      'article.ads__unit',
      '[data-testid="ads-list"] article'
    ];
    
    let adElements: cheerio.Cheerio<cheerio.Element> | null = null;
    for (const selector of adSelectors) {
      adElements = $(selector);
      if (adElements.length > 0) {
        console.log(`✅ [FINN Scraper] Found ${adElements.length} ads using selector: ${selector}`);
        break;
      }
    }

    if (!adElements || adElements.length === 0) {
      console.warn('⚠️ [FINN Scraper] No ads found with any selector');
      return {
        ads: [],
        totalCount: 0,
        page: params.page || 1,
        totalPages: 0
      };
    }

    adElements.each((index: number, element: cheerio.Element) => {
      try {
        const $ad = $(element);
        
        // Extract ID from various possible attributes
        const id = $ad.attr('id') || 
                  $ad.attr('data-finnkode') || 
                  $ad.find('a').first().attr('id') ||
                  `ad-${index}`;

        // Extract title
        const titleSelectors = [
          'h2 a',
          '.ads__unit__content__title a',
          '[data-testid="ad-title"]',
          'a[data-testid="search-result-link"]'
        ];
        let title = '';
        for (const selector of titleSelectors) {
          title = $ad.find(selector).first().text().trim();
          if (title) break;
        }

        // Extract URL
        const link = $ad.find('a').first().attr('href') || '';
        const url = link.startsWith('http') ? link : `${this.baseUrl}${link}`;

        // Extract price
        const priceSelectors = [
          '.ads__unit__content__price',
          '[data-testid="ad-price"]',
          '.price',
          'span:contains("kr")'
        ];
        let priceText = '';
        for (const selector of priceSelectors) {
          priceText = $ad.find(selector).first().text().trim();
          if (priceText) break;
        }
        
        let price: FinnAd['price'] | undefined;
        if (priceText) {
          const priceMatch = priceText.match(/[\d\s]+/);
          if (priceMatch) {
            const amount = parseInt(priceMatch[0].replace(/\s/g, ''));
            if (!isNaN(amount)) {
              price = { amount, currency: 'NOK' };
            }
          }
        }

        // Extract location
        const locationSelectors = [
          '.ads__unit__content__location',
          '[data-testid="ad-location"]',
          '.location',
          'span.text-xs'
        ];
        let location = '';
        for (const selector of locationSelectors) {
          location = $ad.find(selector).first().text().trim();
          if (location && !location.includes('kr')) break; // Avoid price text
        }

        // Extract image
        const imgSelectors = [
          'img',
          '[data-testid="ad-image"] img',
          '.ads__unit__img img'
        ];
        let imageSrc = '';
        for (const selector of imgSelectors) {
          imageSrc = $ad.find(selector).first().attr('src') || '';
          if (imageSrc) break;
        }

        if (title && url) {
          ads.push({
            id,
            title,
            url,
            price,
            location,
            published: new Date().toISOString(), // Not available in search results
            category: params.category || 'torget',
            images: imageSrc ? [imageSrc] : []
          });
        }
      } catch (err) {
        console.error('❌ [FINN Scraper] Error parsing ad', err);
      }
    });

    // Try to extract total count
    let totalCount = ads.length;
    const countSelectors = [
      '.results-heading span',
      '[data-testid="result-count"]',
      '.search-results__header'
    ];
    
    for (const selector of countSelectors) {
      const countText = $(selector).text();
      const countMatch = countText.match(/(\d[\d\s]*)/);
      if (countMatch) {
        totalCount = parseInt(countMatch[1].replace(/\s/g, ''));
        break;
      }
    }

    console.log(`📊 [FINN Scraper] Parsed ${ads.length} ads from HTML`);

    return {
      ads,
      totalCount,
      page: params.page || 1,
      totalPages: Math.ceil(totalCount / (params.rows || 50))
    };
  }

  async analyzePrices(searchParams: FinnSearchParams): Promise<PriceAnalysis> {
    console.log('📈 [FINN Price Analysis] Starting analysis');
    
    // TODO: Once FINN.no scraping is implemented, uncomment the code below
    // to try scraping first before falling back to AI estimation
    
    // For now, always use AI estimation
    console.log('🤖 [FINN Price Analysis] Using AI price estimation');
    return await this.estimatePricesWithGPT(searchParams);
    
    /* SCRAPING-FIRST APPROACH - FOR FUTURE USE
    try {
      // Try to scrape FINN.no first
      const searchResults = await this.search({
        ...searchParams,
        rows: 50,
        sort: 'PUBLISHED_DESC'
      });

      const prices = searchResults.ads
        .map(ad => ad.price?.amount)
        .filter((price): price is number => typeof price === 'number' && price > 0);

      console.log(`💰 [FINN Price Analysis] Found ${prices.length} prices from ${searchResults.ads.length} ads`);

      // If we have enough data from scraping, use it
      if (prices.length >= 3) {
        return this.calculatePriceAnalysis(prices, 'finn_scraping');
      }

      // Otherwise, fall back to GPT estimation
      console.log('🤖 [FINN Price Analysis] Insufficient data, using GPT estimation');
      return await this.estimatePricesWithGPT(searchParams);

    } catch (error) {
      console.error('❌ [FINN Price Analysis] Scraping failed, using GPT fallback', error);
      return await this.estimatePricesWithGPT(searchParams);
    }
    */
  }

  private async estimatePricesWithGPT(searchParams: FinnSearchParams): Promise<PriceAnalysis> {
    try {
      // Step 1: Research new price and item details
      const { object: priceResearch } = await generateObject({
        model: openai("gpt-4o"),
        schema: z.object({
          newPrice: z.number().positive().optional(),
          category: z.enum(['electronics', 'luxury', 'fashion', 'furniture', 'sports', 'vehicles', 'default']),
          condition: z.enum(['mint', 'excellent', 'good', 'fair', 'poor']).optional(),
          estimatedAge: z.string().optional(),
          brand: z.string().optional(),
          isPremiumBrand: z.boolean().optional(),
          confidence: z.number().min(0).max(1),
          insights: z.array(z.string()).max(5)
        }),
        prompt: `Research and analyze this item for pricing: "${searchParams.query}"
        
        Tasks:
        1. Find the current NEW/retail price in Norway (NOK) if possible
        2. Categorize the item: electronics, luxury, fashion, furniture, sports, vehicles, or default
        3. Estimate condition from context (if mentioned)
        4. Estimate age/era if relevant
        5. Identify if it's a premium brand
        
        Consider:
        - Norwegian retail prices are typically 10-20% higher than EU
        - Some items may not have current retail availability
        - Be realistic about condition assessment
        
        ${searchParams.price_from ? `User expects minimum price around ${searchParams.price_from} NOK` : ''}
        ${searchParams.price_to ? `User expects maximum price around ${searchParams.price_to} NOK` : ''}`
      });

      // Step 2: Calculate depreciated price if we found a new price
      let calculatedPrice: number;
      let depreciationInfo: PriceAnalysis['depreciation'] | undefined;
      
      console.log('🔍 [FINN Price Analysis] AI Research Results', {
        newPrice: priceResearch.newPrice,
        category: priceResearch.category,
        condition: priceResearch.condition,
        estimatedAge: priceResearch.estimatedAge,
        isPremiumBrand: priceResearch.isPremiumBrand
      });
      
      if (priceResearch.newPrice) {
        const depreciation = this.calculateDepreciation(
          priceResearch.newPrice,
          priceResearch.category,
          priceResearch.condition || 'good',
          priceResearch.estimatedAge,
          priceResearch.isPremiumBrand
        );
        
        console.log('📉 [FINN Price Analysis] Depreciation Calculation', {
          newPrice: priceResearch.newPrice,
          totalDepreciation: depreciation.totalDepreciation,
          depreciationPercent: `${(depreciation.totalDepreciation * 100).toFixed(1)}%`,
          breakdown: depreciation.breakdown
        });
        
        calculatedPrice = Math.round(priceResearch.newPrice * (1 - depreciation.totalDepreciation));
        
        console.log('💰 [FINN Price Analysis] Price Before Norwegian Adjustment', {
          calculatedPrice,
          calculation: `${priceResearch.newPrice} × ${(1 - depreciation.totalDepreciation).toFixed(3)} = ${calculatedPrice}`
        });
        
        depreciationInfo = {
          rate: depreciation.totalDepreciation,
          category: priceResearch.category,
          estimatedAge: priceResearch.estimatedAge
        };
        
        // Add depreciation breakdown to insights
        priceResearch.insights.push(...depreciation.breakdown);
      } else {
        // Step 3: Fall back to direct used price estimation
        const { object: directEstimate } = await generateObject({
          model: openai("gpt-4o"),
          schema: z.object({
            usedPrice: z.number().positive(),
            confidence: z.number().min(0).max(1),
            reasoning: z.string()
          }),
          prompt: `Estimate USED market price in Norway (NOK) for: "${searchParams.query}"
          
          Consider:
          - Norwegian second-hand market prices
          - Category: ${priceResearch.category}
          - Typical depreciation for this category
          - Local demand and availability
          
          Provide a realistic used price estimate.`
        });
        
        calculatedPrice = directEstimate.usedPrice;
        priceResearch.insights.push(directEstimate.reasoning);
      }

      // Apply Norwegian market adjustment (items typically cost more in Norway)
      const norwegianAdjustment = 1.1; // 10% higher for Norwegian market
      const finalPrice = Math.round(calculatedPrice * norwegianAdjustment);
      
      console.log('🇳🇴 [FINN Price Analysis] Final Price Calculation', {
        priceBeforeAdjustment: calculatedPrice,
        norwegianAdjustment,
        finalPrice,
        calculation: `${calculatedPrice} × ${norwegianAdjustment} = ${finalPrice}`
      });
      
      return {
        averagePrice: finalPrice,
        medianPrice: finalPrice,
        priceRange: {
          min: Math.round(finalPrice * 0.8),
          max: Math.round(finalPrice * 1.3)
        },
        sampleSize: 0, // Indicates AI estimation
        confidence: priceResearch.confidence,
        suggestions: {
          conservative: Math.round(finalPrice * 0.85),
          market: finalPrice,
          optimistic: Math.round(finalPrice * 1.15)
        },
        insights: [
          'Pris estimert med AI-analyse og verdifall-modell',
          priceResearch.newPrice ? 
            `Ny pris: ${priceResearch.newPrice} NOK → Brukt: ${finalPrice} NOK` :
            'Direkteestimering av bruktpris (ny pris ikke funnet)',
          ...priceResearch.insights
        ],
        newPrice: priceResearch.newPrice,
        depreciation: depreciationInfo
      };
    } catch (error) {
      console.error('❌ [FINN Price Analysis] GPT estimation failed', error);
      
      // Ultimate fallback
      return {
        averagePrice: 1000,
        medianPrice: 1000,
        priceRange: { min: 500, max: 2000 },
        sampleSize: 0,
        confidence: 0.1,
        suggestions: {
          conservative: 800,
          market: 1000,
          optimistic: 1200
        },
        insights: [
          'Kunne ikke estimere pris',
          'Anbefaler manuell markedssjekk'
        ]
      };
    }
  }

  private calculatePriceAnalysis(prices: number[], source: 'finn_scraping' | 'gpt_estimation'): PriceAnalysis {
    const sortedPrices = prices.sort((a, b) => a - b);
    const averagePrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Calculate confidence based on sample size and variance
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - averagePrice, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / averagePrice;
    const sampleConfidence = Math.min(prices.length / 20, 1);
    const varianceConfidence = Math.max(0, 1 - coefficientOfVariation);
    const confidence = (sampleConfidence + varianceConfidence) / 2;

    // Generate insights
    const insights: string[] = [];
    
    if (source === 'finn_scraping') {
      insights.push(`Basert på ${prices.length} annonser fra FINN.no`);
    }
    
    if (prices.length < 10) {
      insights.push(`Begrenset markedsdata (${prices.length} priser funnet)`);
    }
    
    if (coefficientOfVariation > 0.5) {
      insights.push('Stor prisvariasjon i markedet');
    }

    return {
      averagePrice,
      medianPrice,
      priceRange: { min: minPrice, max: maxPrice },
      sampleSize: prices.length,
      confidence: Math.round(confidence * 100) / 100,
      suggestions: {
        conservative: Math.round(averagePrice * 0.85),
        market: averagePrice,
        optimistic: Math.round(averagePrice * 1.15)
      },
      insights
    };
  }

  // TODO: This method is preserved for future FINN.no scraping implementation
  private getSearchPath(category?: string): string {
    // Map categories to FINN.no search paths
    const pathMap: Record<string, string> = {
      'torget': '/bap/forsale/search.html',
      'bil': '/car/used/search.html',
      'mc': '/mc/all/search.html',
      'bat': '/boat/all/search.html',
      'eiendom': '/realestate/homes/search.html',
      'job': '/job/search.html'
    };
    
    return pathMap[category || 'torget'] || pathMap.torget;
  }

  // Generate search query based on item attributes
  generateSearchQuery(attributes: {
    brand?: string;
    model?: string;
    model_number?: string;
    series?: string;
    color?: string;
    category?: string;
    condition?: string;
    technical_specs?: string[];
  }): string {
    const parts: string[] = [];
    
    if (attributes.brand) {
      parts.push(attributes.brand);
      
      if (attributes.series) {
        parts.push(attributes.series);
      } else if (attributes.model && !attributes.model.includes('Unspecified')) {
        parts.push(attributes.model);
      }
      
      if (attributes.model_number) {
        parts.push(attributes.model_number);
      }
    }
    
    // Add key technical specs
    if (attributes.technical_specs) {
      const importantSpecs = attributes.technical_specs
        .filter(spec => this.isImportantForSearch(spec))
        .slice(0, 2);
      parts.push(...importantSpecs);
    }
    
    // Add color only if we have brand/model
    if (attributes.color && (attributes.brand || attributes.model)) {
      parts.push(attributes.color);
    }
    
    const query = parts.join(' ').trim();
    
    // Fallback if no specific query
    if (!query || query.length < 3) {
      return attributes.category || 'brukt';
    }
    
    return query;
  }

  private isImportantForSearch(spec: string): boolean {
    const importantTerms = [
      'polarized', 'polarisert',
      'lens', 'linse',
      'titanium', 'titan',
      'carbon', 'karbon',
      'steel', 'stål',
      'automatic', 'automatisk',
      'chronograph', 'kronograf',
      'wireless', 'trådløs',
      'bluetooth', 'wifi',
      'leather', 'lær',
      'vintage', 'retro'
    ];
    
    return importantTerms.some(term => 
      spec.toLowerCase().includes(term.toLowerCase())
    );
  }

  // Map our categories to FINN.no categories
  mapCategoryToFinn(category: string): string {
    const categoryMap: Record<string, string> = {
      'Sport og friluft': 'torget',
      'Elektronikk': 'torget',
      'Møbler': 'torget',
      'Klær og sko': 'torget',
      'Biler': 'bil',
      'Motorsykler': 'mc',
      'Båter': 'bat',
      'Musikk': 'torget',
      'Bøker': 'torget',
      'Hobby': 'torget',
    };

    return categoryMap[category] || 'torget';
  }
}

export const finnAPI = new FinnAPI();