/**
 * Publishing Queue Tool
 * Handles marketplace publishing and job queue management
 */

import { tool } from 'ai';
import { z } from 'zod';
import { loggers } from '@/lib/agent-utils/logging';
import { platformSchema, scheduleSchema } from '@/lib/agent-utils/validation';

const logger = loggers.publisher;

// =================================
// SCHEMAS
// =================================

const listingDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  price: z.number().positive(),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Amazon-specific fields
  condition: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  asin: z.string().optional(),
  sku: z.string().optional(),
});

// =================================
// TOOL DEFINITION
// =================================

export const queueMarketplacePublishingTool = tool({
  description: "Queue listing for publishing",
  inputSchema: z.object({
    listing: listingDataSchema,
    platforms: z.array(platformSchema),
    schedule: scheduleSchema.optional(),
  }),
  execute: async ({ listing, platforms, schedule = 'immediate' }) => {
    logger.starting('marketplace publishing queue', { platforms, schedule });
    
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Import here to avoid circular dependencies
      const { publishListing } = await import('@/lib/publishing-queue');
      
      const jobIds = await publishListing(listingId, platforms, {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        images: listing.images || [],
        category: listing.category,
        tags: listing.tags,
        // Amazon-specific fields
        condition: listing.condition,
        brand: listing.brand,
        model: listing.model,
        asin: listing.asin,
        sku: listing.sku,
      });

      logger.success('Publishing queue completed', {
        listingId,
        platforms: platforms.join(', '),
        jobCount: Object.keys(jobIds).length
      });

      return {
        success: true,
        listingId,
        jobIds,
        queuedJobs: Object.entries(jobIds).map(([platform, id]) => ({
          id,
          platform,
          status: 'queued',
          estimatedTime: platform === 'finn' ? '2-5 minutes' : '1-3 minutes',
          scheduledFor: schedule === 'optimal_time' ? 'Evening (18:00-20:00)' : 'Immediate'
        })),
        summary: `Successfully queued for ${platforms.join(' and ')}: ${Object.keys(jobIds).length} publishing jobs created. Listing ID: ${listingId}`
      };
    } catch (error) {
      logger.failed('Publishing queue', error instanceof Error ? error : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Publishing queue failed',
        summary: `Failed to queue for publishing: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface ListingData {
  title: string;
  description: string;
  price: number;
  images?: string[];
  category?: string;
  tags?: string[];
  // Amazon-specific fields
  condition?: string;
  brand?: string;
  model?: string;
  asin?: string;
  sku?: string;
}

export interface PublishingInput {
  listing: ListingData;
  platforms: Array<'finn' | 'facebook' | 'amazon'>;
  schedule?: 'immediate' | 'optimal_time';
}

export interface QueuedJob {
  id: string;
  platform: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedTime: string;
  scheduledFor: string;
}

export interface PublishingResult {
  success: boolean;
  listingId?: string;
  jobIds?: Record<string, string>;
  queuedJobs?: QueuedJob[];
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone publishing function for use outside of agent tools
 */
export async function queueMarketplacePublishing(input: PublishingInput): Promise<PublishingResult> {
  return queueMarketplacePublishingTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

const publishingInputSchema = z.object({
  listing: listingDataSchema,
  platforms: z.array(platformSchema),
  schedule: scheduleSchema.optional(),
});

/**
 * Validates publishing input
 */
export function validatePublishingInput(input: unknown): input is PublishingInput {
  try {
    publishingInputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe publishing input with defaults
 */
export function createPublishingInput(
  listing: ListingData,
  platforms: Array<'finn' | 'facebook' | 'amazon'>,
  schedule: 'immediate' | 'optimal_time' = 'immediate'
): PublishingInput {
  return {
    listing: {
      ...listing,
      title: listing.title.trim(),
      description: listing.description.trim(),
      price: Math.round(listing.price),
      images: listing.images || [],
      tags: listing.tags || [],
    },
    platforms: [...new Set(platforms)], // Remove duplicates
    schedule
  };
}

// =================================
// UTILITY FUNCTIONS
// =================================

/**
 * Prepares listing data from optimized listing
 */
export function prepareListingDataFromOptimized(
  optimizedListing: {
    title: string;
    description: string;
    price: number;
    tags: string[];
    originalDraft: {
      images?: string[];
      category: { primary: string };
      attributes: {
        condition: string;
        brand?: string;
        model?: string;
      };
    };
  },
  amazonAnalysis?: {
    analysis?: {
      catalogMatch?: {
        asin: string;
      };
    };
  }
): ListingData {
  return {
    title: optimizedListing.title,
    description: optimizedListing.description,
    price: optimizedListing.price,
    images: optimizedListing.originalDraft.images || [],
    category: optimizedListing.originalDraft.category.primary,
    tags: optimizedListing.tags,
    // Amazon-specific data
    condition: optimizedListing.originalDraft.attributes.condition,
    brand: optimizedListing.originalDraft.attributes.brand,
    model: optimizedListing.originalDraft.attributes.model,
    asin: amazonAnalysis?.analysis?.catalogMatch?.asin,
  };
}

/**
 * Estimates publishing time for platforms
 */
export function estimatePublishingTime(platforms: string[]): { total: string; breakdown: Record<string, string> } {
  const times = {
    finn: '2-5 minutes',
    facebook: '1-3 minutes', 
    amazon: '3-10 minutes'
  };
  
  const breakdown: Record<string, string> = {};
  let maxMinutes = 0;
  
  platforms.forEach(platform => {
    const time = times[platform as keyof typeof times] || '1-3 minutes';
    breakdown[platform] = time;
    
    // Extract max minutes for total estimate
    const match = time.match(/(\d+)-(\d+)/);
    if (match) {
      maxMinutes = Math.max(maxMinutes, parseInt(match[2]));
    }
  });
  
  return {
    total: `${Math.max(1, maxMinutes - 2)}-${maxMinutes} minutes`,
    breakdown
  };
}

/**
 * Generates unique listing ID
 */
export function generateListingId(): string {
  return `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates listing data completeness
 */
export function validateListingData(listing: ListingData): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!listing.title || listing.title.trim().length === 0) {
    issues.push('Title is required');
  }
  
  if (!listing.description || listing.description.trim().length === 0) {
    issues.push('Description is required');
  }
  
  if (!listing.price || listing.price <= 0) {
    issues.push('Valid price is required');
  }
  
  if (listing.title && listing.title.length > 100) {
    issues.push('Title too long (max 100 characters)');
  }
  
  if (listing.description && listing.description.length > 2000) {
    issues.push('Description too long (max 2000 characters)');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}