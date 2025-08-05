/**
 * Image Analysis Tool
 * Handles AI vision analysis of product images using OpenAI GPT-4o
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createListingDraftFromImage, type ListingDraft } from '@/lib/createListingDraftFromImage';
import { loggers } from '@/lib/agent-utils/logging';
import { textConstraints } from '@/lib/agent-utils/validation';

const logger = loggers.image;

// =================================
// TOOL DEFINITION
// =================================

export const analyzeImageTool = tool({
  description: "Analyze item photo, extract attributes",
  inputSchema: z.object({
    imageUrl: textConstraints.imageUrl, // Accept data URLs (don't validate as standard URL)
    hints: z.string().optional(),
  }),
  execute: async ({ imageUrl, hints }) => {
    logger.starting('image analysis', { 
      imageUrlPreview: imageUrl.substring(0, 50) + '...', 
      isDataUrl: imageUrl.startsWith('data:'),
      urlLength: imageUrl.length,
      hints 
    });
    
    try {
      const draft = await createListingDraftFromImage({
        image: { url: imageUrl },
      });
      
      logger.success('Analysis completed', {
        category: draft.category.primary,
        title: draft.title,
        condition: draft.attributes.condition,
        price: draft.pricing.suggested_price_nok
      });
      
      return { 
        success: true, 
        draft,
        summary: `Analyzed ${draft.category.primary} - ${draft.title}. Condition: ${draft.attributes.condition}. Suggested price: ${draft.pricing.suggested_price_nok} NOK.`
      };
    } catch (error) {
      logger.failed('Analysis', error instanceof Error ? error : String(error));
      throw error;
    }
  },
});

// =================================
// TYPED INTERFACES
// =================================

export interface ImageAnalysisInput {
  imageUrl: string;
  hints?: string;
}

export interface ImageAnalysisResult {
  success: boolean;
  draft?: ListingDraft;
  summary: string;
  error?: string;
}

// =================================
// STANDALONE FUNCTION
// =================================

/**
 * Standalone image analysis function for use outside of agent tools
 */
export async function analyzeImage(input: ImageAnalysisInput): Promise<ImageAnalysisResult> {
  return analyzeImageTool.execute(input);
}

// =================================
// VALIDATION HELPERS
// =================================

/**
 * Validates image analysis input
 */
const inputSchema = z.object({
  imageUrl: textConstraints.imageUrl,
  hints: z.string().optional(),
});

export function validateImageAnalysisInput(input: unknown): input is ImageAnalysisInput {
  try {
    inputSchema.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates safe image analysis input with defaults
 */
export function createImageAnalysisInput(
  imageUrl: string, 
  hints?: string
): ImageAnalysisInput {
  return {
    imageUrl: imageUrl.trim(),
    hints: hints?.trim() || undefined
  };
}