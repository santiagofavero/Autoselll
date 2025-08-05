// Publishing queue system for marketplace listings
// In production, this would integrate with Redis/BullMQ for reliability

import { amazonAPI, AmazonListingData, mapConditionToAmazon, mapCategoryToAmazonProductType } from './amazon-api';

export interface PublishingJob {
  id: string;
  listingId: string;
  platform: 'finn' | 'facebook' | 'amazon';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  content: {
    title: string;
    description: string;
    price: number;
    images: string[];
    category?: string;
    tags?: string[];
    // Amazon-specific fields
    condition?: string;
    brand?: string;
    model?: string;
    asin?: string;
    sku?: string;
  };
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  platformId?: string; // External platform listing ID
  platformUrl?: string; // URL to the published listing
}

export interface PublishingResult {
  success: boolean;
  platformId?: string;
  platformUrl?: string;
  error?: string;
}

class PublishingQueue {
  private jobs: Map<string, PublishingJob> = new Map();

  // Add a publishing job to the queue
  async enqueue(job: Omit<PublishingJob, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const id = `${job.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const publishingJob: PublishingJob = {
      id,
      status: 'queued',
      createdAt: new Date(),
      ...job,
    };

    this.jobs.set(id, publishingJob);
    
    // Process immediately in this simple implementation
    // In production, this would be handled by background workers
    this.processJob(id);
    
    return id;
  }

  // Get job status
  async getJob(id: string): Promise<PublishingJob | null> {
    return this.jobs.get(id) || null;
  }

  // Get all jobs for a listing
  async getJobsForListing(listingId: string): Promise<PublishingJob[]> {
    return Array.from(this.jobs.values()).filter(job => job.listingId === listingId);
  }

  // Process a publishing job (simulate platform publishing)
  private async processJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    // Update status to processing
    job.status = 'processing';
    job.processedAt = new Date();

    try {
      let result: PublishingResult;

      if (job.platform === 'finn') {
        result = await this.publishToFinn(job);
      } else if (job.platform === 'facebook') {
        result = await this.publishToFacebook(job);
      } else if (job.platform === 'amazon') {
        result = await this.publishToAmazon(job);
      } else {
        throw new Error(`Unsupported platform: ${job.platform}`);
      }

      if (result.success) {
        job.status = 'completed';
        job.platformId = result.platformId;
        job.platformUrl = result.platformUrl;
      } else {
        job.status = 'failed';
        job.error = result.error;
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.jobs.set(id, job);
  }

  // Simulate publishing to FINN.no
  private async publishToFinn(job: PublishingJob): Promise<PublishingResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    // For demo purposes, simulate success/failure
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      const mockFinnId = `finn_${Date.now()}`;
      return {
        success: true,
        platformId: mockFinnId,
        platformUrl: `https://www.finn.no/torget/tilsalgs/ad.html?finnkode=${mockFinnId}`,
      };
    } else {
      return {
        success: false,
        error: 'FINN.no publishing failed: Rate limit exceeded or invalid category',
      };
    }
  }

  // Simulate publishing to Facebook Marketplace
  private async publishToFacebook(job: PublishingJob): Promise<PublishingResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // For demo purposes, simulate success/failure
    const success = Math.random() > 0.15; // 85% success rate

    if (success) {
      const mockFbId = `fb_${Date.now()}`;
      return {
        success: true,
        platformId: mockFbId,
        platformUrl: `https://www.facebook.com/marketplace/item/${mockFbId}`,
      };
    } else {
      return {
        success: false,
        error: 'Facebook Marketplace publishing failed: Image quality too low or policy violation',
      };
    }
  }

  // Publish to Amazon Marketplace
  private async publishToAmazon(job: PublishingJob): Promise<PublishingResult> {
    console.log('🛒 [Amazon Publisher] Starting Amazon listing submission');
    
    if (!amazonAPI.isConfigured()) {
      return {
        success: false,
        error: 'Amazon SP-API not configured',
      };
    }
    
    try {
      // Prepare Amazon listing data
      const content = job.content;
      const sku = content.sku || amazonAPI.generateSKU('AIAGENT');
      const condition = mapConditionToAmazon(content.condition || 'used_good');
      const productType = mapCategoryToAmazonProductType(content.category || '');
      
      const amazonListing: AmazonListingData = {
        sku,
        asin: content.asin,
        title: content.title,
        description: content.description,
        price: content.price,
        quantity: 1,
        condition,
        images: content.images.filter(img => img.startsWith('http')), // Amazon requires HTTP URLs
        productType,
        attributes: {
          brand: content.brand ? [{ value: content.brand }] : undefined,
          model: content.model ? [{ value: content.model }] : undefined,
        },
        fulfillmentChannel: 'MFN', // Merchant fulfilled by default
      };
      
      // Validate the listing data
      const validation = amazonAPI.validateProductData(amazonListing);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Amazon validation failed: ${validation.errors.join(', ')}`,
        };
      }
      
      // Submit to Amazon
      console.log('📤 [Amazon Publisher] Submitting listing to Amazon SP-API');
      const submissionResult = await amazonAPI.submitListing(amazonListing);
      
      if (submissionResult.success) {
        // In real implementation, we'd monitor the submission status
        // For now, simulate success
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        
        const mockAsin = submissionResult.asin || `B0${Date.now().toString().slice(-8)}`;
        const amazonUrl = `https://www.amazon.${amazonAPI.getMarketplaceInfo()?.region.toLowerCase() || 'com'}/dp/${mockAsin}`;
        
        console.log('✅ [Amazon Publisher] Listing submitted successfully', { sku, asin: mockAsin });
        
        return {
          success: true,
          platformId: sku,
          platformUrl: amazonUrl,
        };
      } else {
        const errorMessage = submissionResult.errors?.map(e => e.message).join(', ') || 'Unknown Amazon error';
        console.error('❌ [Amazon Publisher] Submission failed', { errors: submissionResult.errors });
        
        return {
          success: false,
          error: `Amazon submission failed: ${errorMessage}`,
        };
      }
      
    } catch (error) {
      console.error('❌ [Amazon Publisher] Publishing error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Amazon publishing failed',
      };
    }
  }

  // Get queue statistics
  async getStats(): Promise<{
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }

  // Retry failed job
  async retryJob(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'failed') return false;

    job.status = 'queued';
    job.error = undefined;
    job.processedAt = undefined;

    this.processJob(id);
    return true;
  }
}

// Singleton instance
export const publishingQueue = new PublishingQueue();

// Helper functions for marketplace publishing
export async function publishListing(
  listingId: string,
  platforms: Array<'finn' | 'facebook' | 'amazon'>,
  content: {
    title: string;
    description: string;
    price: number;
    images: string[];
    category?: string;
    tags?: string[];
    // Amazon-specific optional fields
    condition?: string;
    brand?: string;
    model?: string;
    asin?: string;
    sku?: string;
  }
): Promise<{ [platform: string]: string }> {
  const jobIds: { [platform: string]: string } = {};

  for (const platform of platforms) {
    const jobId = await publishingQueue.enqueue({
      listingId,
      platform,
      content,
    });
    jobIds[platform] = jobId;
  }

  return jobIds;
}

export async function getPublishingStatus(listingId: string): Promise<{
  jobs: PublishingJob[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}> {
  const jobs = await publishingQueue.getJobsForListing(listingId);
  
  return {
    jobs,
    summary: {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      pending: jobs.filter(j => j.status === 'queued' || j.status === 'processing').length,
    },
  };
}