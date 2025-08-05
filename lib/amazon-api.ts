// Amazon SP-API integration for marketplace listings
// Implements Amazon Selling Partner API v2021-08-01 for product listings
// Removed unused import: z from 'zod'

export interface AmazonCredentials {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string; // e.g., 'us-east-1', 'eu-west-1'
  marketplaceId: string; // e.g., 'ATVPDKIKX0DER' (US), 'A1PA6795UKMFR9' (DE)
}

export interface AmazonProductSearch {
  query: string;
  brand?: string;
  model?: string;
  category?: string;
  condition?: 'new' | 'used' | 'refurbished';
}

export interface AmazonCatalogItem {
  asin: string;
  title: string;
  brand?: string;
  model?: string;
  category: string;
  isEligibleForListing: boolean;
  requiresApproval: boolean;
  restrictions?: string[];
  productType: string;
  images?: string[];
}

export interface AmazonListingEligibility {
  canList: boolean;
  requiresApproval: boolean;
  restrictions: string[];
  recommendedCondition: string[];
  estimatedFees: {
    referralFee: number;
    closingFee: number;
    fbaFees?: number;
  };
  competitorCount: number;
  averagePrice?: number;
}

export interface AmazonListingData {
  sku: string;
  asin?: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: 'new' | 'used_like_new' | 'used_very_good' | 'used_good' | 'used_acceptable';
  images: string[];
  productType: string;
  attributes: Record<string, string | number | boolean | null>;
  fulfillmentChannel: 'MFN' | 'AFN'; // Merchant or Amazon fulfillment
}

export interface AmazonSubmissionResult {
  success: boolean;
  submissionId?: string;
  sku?: string;
  asin?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
}

class AmazonAPI {
  private credentials: AmazonCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  
  constructor() {
    this.loadCredentials();
  }
  
  private loadCredentials() {
    if (typeof process !== 'undefined') {
      const creds = {
        refreshToken: process.env.AMAZON_REFRESH_TOKEN,
        clientId: process.env.AMAZON_CLIENT_ID,
        clientSecret: process.env.AMAZON_CLIENT_SECRET,
        accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
        secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
        region: process.env.AMAZON_REGION || 'eu-west-1',
        marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'A1PA6795UKMFR9', // EU default
      };
      
      if (creds.refreshToken && creds.clientId && creds.clientSecret) {
        this.credentials = creds as AmazonCredentials;
      }
    }
  }
  
  private async getAccessToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Amazon SP-API credentials not configured');
    }
    
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    
    console.log('🔑 [Amazon API] Refreshing access token');
    
    const tokenUrl = 'https://api.amazon.com/auth/o2/token';
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refreshToken,
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
    });
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
      
      console.log('✅ [Amazon API] Access token refreshed successfully');
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ [Amazon API] Token refresh failed', error);
      throw new Error('Failed to refresh Amazon access token');
    }
  }
  
  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: Record<string, unknown>): Promise<unknown> {
    if (!this.credentials) {
      throw new Error('Amazon SP-API credentials not configured');
    }
    
    const accessToken = await this.getAccessToken();
    const baseUrl = `https://sellingpartnerapi-${this.credentials.region}.amazon.com`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    };
    
    const config: RequestInit = {
      method,
      headers,
    };
    
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }
    
    console.log(`📡 [Amazon API] Making ${method} request to ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Amazon API] Request failed: ${response.status}`, errorText);
        throw new Error(`Amazon API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ [Amazon API] Request successful');
      return data;
      
    } catch (error) {
      console.error('❌ [Amazon API] Request error', error);
      throw error;
    }
  }
  
  // Search Amazon catalog for existing products
  async searchCatalogItems(searchParams: AmazonProductSearch): Promise<AmazonCatalogItem[]> {
    console.log('🔍 [Amazon API] Searching catalog', searchParams);
    
    const queryParams = new URLSearchParams({
      marketplaceIds: this.credentials!.marketplaceId,
      keywords: searchParams.query,
    });
    
    if (searchParams.brand) {
      queryParams.append('brandNames', searchParams.brand);
    }
    
    try {
      const response = await this.makeRequest(`/catalog/2022-04-01/items?${queryParams}`);
      
      const items: AmazonCatalogItem[] = response.items?.map((item: Record<string, unknown>) => ({
        asin: item.asin,
        title: item.summaries?.[0]?.itemName || 'Unknown',
        brand: item.attributes?.brand?.[0]?.value,
        model: item.attributes?.model?.[0]?.value,
        category: item.summaries?.[0]?.browseNode?.name || 'Unknown',
        isEligibleForListing: true, // Will be validated separately
        requiresApproval: false, // Will be checked in eligibility
        restrictions: [],
        productType: item.summaries?.[0]?.productType || 'PRODUCT',
        images: Array.isArray(item.images) ? item.images.map((img: Record<string, unknown>) => img.link as string) : [],
      })) || [];
      
      console.log(`📊 [Amazon API] Found ${items.length} catalog items`);
      return items;
      
    } catch (error) {
      console.error('❌ [Amazon API] Catalog search failed', error);
      return [];
    }
  }
  
  // Check listing eligibility and restrictions for a specific ASIN
  async checkListingEligibility(asin: string): Promise<AmazonListingEligibility> {
    console.log(`🔒 [Amazon API] Checking listing eligibility for ASIN: ${asin}`);
    
    try {
      const response = await this.makeRequest(
        `/listings/2021-08-01/restrictions?asin=${asin}&marketplaceIds=${this.credentials!.marketplaceId}&sellerId=${this.credentials!.clientId}`
      );
      
      const restrictions = response.restrictions || [];
      const canList = restrictions.length === 0 || restrictions.every((r: Record<string, unknown>) => r.conditionType !== 'new_new');
      
      return {
        canList,
        requiresApproval: restrictions.some((r: Record<string, unknown>) => Array.isArray(r.reasons) && r.reasons.includes('APPROVAL_REQUIRED')),
        restrictions: restrictions.map((r: Record<string, unknown>) => (typeof r.message === 'string' ? r.message : 'Unknown restriction')),
        recommendedCondition: canList ? ['new', 'used_like_new', 'used_very_good'] : ['used_good', 'used_acceptable'],
        estimatedFees: {
          referralFee: 0.15, // Default 15% - would need Fee API for exact calculation
          closingFee: 0,
          fbaFees: 3.00, // Estimate
        },
        competitorCount: 0, // Would need additional API call
      };
      
    } catch (error) {
      console.warn('⚠️ [Amazon API] Eligibility check failed, assuming eligible', error);
      return {
        canList: true,
        requiresApproval: false,
        restrictions: [],
        recommendedCondition: ['used_good', 'used_acceptable'],
        estimatedFees: {
          referralFee: 0.15,
          closingFee: 0,
        },
        competitorCount: 0,
      };
    }
  }
  
  // Get product type definition and required attributes
  async getProductTypeDefinition(productType: string): Promise<Record<string, unknown>> {
    console.log(`📋 [Amazon API] Getting product type definition for: ${productType}`);
    
    try {
      const response = await this.makeRequest(
        `/definitions/2020-09-01/productTypes/${productType}?marketplaceIds=${this.credentials!.marketplaceId}`
      );
      
      return response;
      
    } catch (error) {
      console.error('❌ [Amazon API] Product type definition failed', error);
      throw error;
    }
  }
  
  // Submit a new listing to Amazon
  async submitListing(listingData: AmazonListingData): Promise<AmazonSubmissionResult> {
    console.log(`📤 [Amazon API] Submitting listing for SKU: ${listingData.sku}`);
    
    const submissionData = {
      productType: listingData.productType,
      requirements: 'LISTING',
      attributes: {
        condition_type: [{ value: listingData.condition }],
        item_name: [{ value: listingData.title }],
        description: [{ value: listingData.description }],
        list_price: [{ 
          value: {
            Amount: listingData.price,
            CurrencyCode: 'NOK' // Adjust based on marketplace
          }
        }],
        quantity: [{ value: listingData.quantity }],
        fulfillment_channel: [{ value: listingData.fulfillmentChannel }],
        main_image_url: [{ value: listingData.images[0] }],
        ...listingData.attributes,
      },
    };
    
    try {
      const response = await this.makeRequest(
        `/listings/2021-08-01/items/${this.credentials!.clientId}/${listingData.sku}`,
        'PATCH',
        {
          productType: listingData.productType,
          patches: [{
            op: 'replace',
            path: '/',
            value: submissionData,
          }],
        }
      );
      
      return {
        success: true,
        submissionId: response.submissionId,
        sku: listingData.sku,
        asin: listingData.asin,
      };
      
    } catch (error) {
      console.error('❌ [Amazon API] Listing submission failed', error);
      return {
        success: false,
        errors: [{
          code: 'SUBMISSION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }
  
  // Get submission status
  async getSubmissionStatus(submissionId: string): Promise<Record<string, unknown>> {
    console.log(`📊 [Amazon API] Getting submission status: ${submissionId}`);
    
    try {
      const response = await this.makeRequest(
        `/listings/2021-08-01/submissions/${submissionId}`
      );
      
      return response;
      
    } catch (error) {
      console.error('❌ [Amazon API] Status check failed', error);
      throw error;
    }
  }
  
  // Generate Amazon-compatible SKU
  generateSKU(prefix: string = 'AIAGENT'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }
  
  // Validate product data against Amazon requirements
  validateProductData(listingData: AmazonListingData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!listingData.sku || listingData.sku.length < 3) {
      errors.push('SKU must be at least 3 characters long');
    }
    
    if (!listingData.title || listingData.title.length < 5) {
      errors.push('Title must be at least 5 characters long');
    }
    
    if (listingData.title && listingData.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
    
    if (!listingData.description || listingData.description.length < 50) {
      errors.push('Description must be at least 50 characters long');
    }
    
    if (listingData.price <= 0) {
      errors.push('Price must be greater than 0');
    }
    
    if (listingData.quantity < 1) {
      errors.push('Quantity must be at least 1');
    }
    
    if (!listingData.images || listingData.images.length === 0) {
      errors.push('At least one image is required');
    }
    
    if (listingData.images && listingData.images.some(img => !img.startsWith('http'))) {
      errors.push('All images must be valid HTTP URLs');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  
  // Check if Amazon integration is properly configured
  isConfigured(): boolean {
    return this.credentials !== null;
  }
  
  // Get marketplace information
  getMarketplaceInfo(): { region: string; marketplaceId: string; currency: string } | null {
    if (!this.credentials) return null;
    
    const marketplaceMap: Record<string, { region: string; currency: string }> = {
      'ATVPDKIKX0DER': { region: 'US', currency: 'USD' },
      'A2EUQ1WTGCTBG2': { region: 'CA', currency: 'CAD' },
      'A1PA6795UKMFR9': { region: 'DE', currency: 'EUR' },
      'A1RKKUPIHCS9HS': { region: 'ES', currency: 'EUR' },
      'A13V1IB3VIYZZH': { region: 'FR', currency: 'EUR' },
      'A21TJRUUN4KGV': { region: 'IN', currency: 'INR' },
      'APJ6JRA9NG5V4': { region: 'IT', currency: 'EUR' },
      'A1F83G8C2ARO7P': { region: 'UK', currency: 'GBP' },
    };
    
    const info = marketplaceMap[this.credentials.marketplaceId];
    return info ? {
      region: info.region,
      marketplaceId: this.credentials.marketplaceId,
      currency: info.currency,
    } : null;
  }
}

export const amazonAPI = new AmazonAPI();

// Helper functions for common Amazon operations
export function mapConditionToAmazon(condition: string): AmazonListingData['condition'] {
  const conditionMap: Record<string, AmazonListingData['condition']> = {
    'new': 'new',
    'like_new': 'used_like_new',
    'used_good': 'used_very_good',
    'used_fair': 'used_good',
    'for_parts': 'used_acceptable',
  };
  
  return conditionMap[condition] || 'used_good';
}

export function mapCategoryToAmazonProductType(category: string): string {
  const categoryMap: Record<string, string> = {
    'Sport og friluft': 'SPORTING_GOODS',
    'Elektronikk': 'CE_DISPLAY_TYPE_1',
    'Møbler': 'FURNITURE',
    'Klær og sko': 'CLOTHING',
    'Musikk': 'MUSICAL_INSTRUMENTS',
    'Bøker': 'ABIS_BOOK',
    'Hobby': 'TOY_FIGURE',
  };
  
  return categoryMap[category] || 'PRODUCT';
}

export function calculateAmazonFees(price: number, category: string): {
  referralFee: number;
  closingFee: number;
  totalFees: number;
} {
  // Simplified fee calculation - actual fees vary by category and marketplace
  const referralFeeRate = category === 'ABIS_BOOK' ? 0.15 : 
                         category === 'CE_DISPLAY_TYPE_1' ? 0.08 : 0.15;
  
  const referralFee = price * referralFeeRate;
  const closingFee = category === 'ABIS_BOOK' ? 1.80 : 0; // Books have closing fee
  
  return {
    referralFee,
    closingFee,
    totalFees: referralFee + closingFee,
  };
}