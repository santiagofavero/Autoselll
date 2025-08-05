/**
 * Shared validation schemas and utilities for AI Marketplace Agent
 * Centralizes all Zod schemas and validation patterns
 */

import { z } from 'zod';

// =================================
// COMMON FIELD VALIDATIONS
// =================================

// Text field constraints
export const textConstraints = {
  title: z.string().min(5).max(120),
  shortTitle: z.string().min(2).max(50),
  description: z.string().min(30).max(2000),
  shortDescription: z.string().min(10).max(300),
  brand: z.string().max(60),
  model: z.string().max(80),
  modelNumber: z.string().max(50),
  series: z.string().max(60),
  color: z.string().max(40),
  material: z.string().max(60),
  size: z.string().max(40),
  url: z.string().url(),
  dataUrl: z.string().startsWith('data:'),
  // Flexible string that can be either URL or data URL
  imageUrl: z.string().min(1)
} as const;

// Numeric constraints
export const numericConstraints = {
  confidence: z.number().min(0).max(1),
  price: z.number().int().positive(),
  priceOptional: z.number().int().positive().optional(),
  percentage: z.number().min(0).max(100),
  weight: z.number().nonnegative(),
  dimension: z.number().nonnegative(),
  positiveInt: z.number().int().positive(),
  nonNegativeInt: z.number().int().nonnegative()
} as const;

// =================================
// ENUM VALIDATIONS
// =================================

// Item condition states
export const conditionSchema = z.enum([
  'new', 
  'like_new', 
  'used_good', 
  'used_fair', 
  'for_parts'
]);

export type ItemCondition = z.infer<typeof conditionSchema>;

// User preferences for selling strategy
export const userPreferenceSchema = z.enum([
  'quick_sale', 
  'market_price', 
  'maximize_profit'
]);

export type UserPreference = z.infer<typeof userPreferenceSchema>;

// Supported platforms
export const platformSchema = z.enum([
  'finn', 
  'facebook', 
  'amazon'
]);

export type Platform = z.infer<typeof platformSchema>;

// Supported languages
export const languageSchema = z.enum([
  'nb-NO', 
  'en-US'
]);

export type SupportedLanguage = z.infer<typeof languageSchema>;

// Publishing schedule options
export const scheduleSchema = z.enum([
  'immediate', 
  'optimal_time'
]);

export type Schedule = z.infer<typeof scheduleSchema>;

// Agent workflow phases
export const workflowPhaseSchema = z.enum([
  'analysis', 
  'pricing', 
  'platform_selection', 
  'optimization', 
  'publishing', 
  'completed', 
  'error'
]);

export type WorkflowPhase = z.infer<typeof workflowPhaseSchema>;

// File types
export const imageTypeSchema = z.enum([
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',
  'image/heif'
]);

export type ImageType = z.infer<typeof imageTypeSchema>;

// =================================
// COMPLEX OBJECT SCHEMAS
// =================================

// Dimensions schema
export const dimensionsSchema = z.object({
  width: numericConstraints.dimension.optional(),
  height: numericConstraints.dimension.optional(),
  depth: numericConstraints.dimension.optional()
}).optional();

export type Dimensions = z.infer<typeof dimensionsSchema>;

// Price range schema
export const priceRangeSchema = z.object({
  min: numericConstraints.price,
  max: numericConstraints.price,
  recommended: numericConstraints.price
});

export type PriceRange = z.infer<typeof priceRangeSchema>;

// Category schema
export const categorySchema = z.object({
  primary: textConstraints.shortTitle,
  secondary: textConstraints.shortTitle.optional(),
  confidence: numericConstraints.confidence
});

export type Category = z.infer<typeof categorySchema>;

// Item attributes schema
export const itemAttributesSchema = z.object({
  condition: conditionSchema,
  brand: textConstraints.brand.optional(),
  model: textConstraints.model.optional(),
  model_number: textConstraints.modelNumber.optional(),
  series: textConstraints.series.optional(),
  color: textConstraints.color.optional(),
  material: textConstraints.material.optional(),
  size: textConstraints.size.optional(),
  dimensions_cm: dimensionsSchema,
  weight_kg: numericConstraints.weight.optional(),
  technical_specs: z.array(z.string()).optional(),
  visible_text: z.array(z.string()).optional(),
  defects: z.array(z.string()).optional(),
  included_items: z.array(z.string()).optional(),
  serials_visible: z.boolean().optional(),
  brand_confidence: numericConstraints.confidence.optional(),
  model_confidence: numericConstraints.confidence.optional()
});

export type ItemAttributes = z.infer<typeof itemAttributesSchema>;

// Pricing schema
export const pricingSchema = z.object({
  suggested_price_nok: numericConstraints.price,
  confidence: numericConstraints.confidence,
  basis: z.array(z.string()).min(1).max(5)
});

export type Pricing = z.infer<typeof pricingSchema>;

// Media info schema
export const mediaSchema = z.object({
  image_count: numericConstraints.positiveInt,
  main_image_summary: textConstraints.shortDescription,
  quality_score: numericConstraints.confidence,
  issues: z.array(z.string()).optional(),
  multiple_angles: z.boolean().optional(),
  analysis_completeness: numericConstraints.confidence.optional()
});

export type Media = z.infer<typeof mediaSchema>;

// =================================
// API REQUEST/RESPONSE SCHEMAS
// =================================

// File upload validation
export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  hints: z.string().optional(),
  userPreference: userPreferenceSchema.optional(),
  targetPlatforms: z.array(platformSchema).min(1).optional(),
  autoPublish: z.boolean().optional()
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Multi-image data validation
export const multiImageDataSchema = z.object({
  type: z.literal('multiple'),
  images: z.array(textConstraints.imageUrl).min(1).max(5),
  primaryIndex: numericConstraints.nonNegativeInt,
  count: numericConstraints.positiveInt.max(5)
});

export type MultiImageData = z.infer<typeof multiImageDataSchema>;

// Agent workflow input validation
export const agentWorkflowInputSchema = z.object({
  imageUrl: textConstraints.imageUrl,
  hints: z.string().optional(),
  userPreference: userPreferenceSchema.default('market_price'),
  targetPlatforms: z.array(platformSchema).default(['finn', 'facebook', 'amazon']),
  autoPublish: z.boolean().default(false),
  language: languageSchema.default('nb-NO')
});

export type AgentWorkflowInput = z.infer<typeof agentWorkflowInputSchema>;

// API error response schema
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.string().optional(),
  suggestion: z.string().optional(),
  code: z.string().optional(),
  timestamp: z.string().optional()
});

export type ApiError = z.infer<typeof apiErrorSchema>;

// API success response schema
export const apiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.string().optional()
});

export type ApiSuccess = z.infer<typeof apiSuccessSchema>;

// =================================
// VALIDATION UTILITIES
// =================================

/**
 * Validates file upload constraints
 */
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  // Size validation (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }

  // Type validation
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Only image files are supported' };
  }

  // Specific image type validation
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: `Unsupported image type: ${file.type}` };
  }

  return { valid: true };
}

/**
 * Validates multiple file uploads
 */
export function validateMultipleFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length === 0) {
    return { valid: false, error: 'At least one file is required' };
  }

  if (files.length > 5) {
    return { valid: false, error: 'Maximum 5 files allowed' };
  }

  // Validate each file individually
  for (const file of files) {
    const fileValidation = validateFileUpload(file);
    if (!fileValidation.valid) {
      return fileValidation;
    }
  }

  return { valid: true };
}

/**
 * Validates URL (both HTTP and data URLs)
 */
export function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.length === 0) {
    return { valid: false, error: 'URL is required' };
  }

  // Data URL validation
  if (url.startsWith('data:')) {
    if (!url.match(/^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,/)) {
      return { valid: false, error: 'Invalid data URL format' };
    }
    return { valid: true };
  }

  // HTTP URL validation
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP(S) URLs are supported' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates platform array
 */
export function validatePlatforms(platforms: string[]): { valid: boolean; error?: string; platforms?: Platform[] } {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return { valid: false, error: 'At least one platform is required' };
  }

  const validPlatforms: Platform[] = [];
  const supportedPlatforms = ['finn', 'facebook', 'amazon'];

  for (const platform of platforms) {
    if (!supportedPlatforms.includes(platform)) {
      return { valid: false, error: `Unsupported platform: ${platform}` };
    }
    validPlatforms.push(platform as Platform);
  }

  return { valid: true, platforms: validPlatforms };
}

/**
 * Sanitizes and validates text input
 */
export function sanitizeText(text: string, maxLength: number = 1000): string {
  return text
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validates price value
 */
export function validatePrice(price: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(price)) {
    return { valid: false, error: 'Price must be a whole number' };
  }

  if (price <= 0) {
    return { valid: false, error: 'Price must be positive' };
  }

  if (price > 1000000) {
    return { valid: false, error: 'Price cannot exceed 1,000,000 NOK' };
  }

  return { valid: true };
}

/**
 * Creates a standardized validation error response
 */
export function createValidationError(field: string, message: string): ApiError {
  return {
    success: false,
    error: `Validation failed for ${field}`,
    details: message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString()
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiSuccess & { data: T } {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// =================================
// DEPRECIATION & FINN-SPECIFIC
// =================================

// FINN.no specific schemas (extracted from finn-api.ts)
export const finnCategorySchema = z.enum([
  'electronics', 
  'luxury', 
  'fashion', 
  'furniture', 
  'sports', 
  'vehicles', 
  'default'
]);

export const finnConditionSchema = z.enum([
  'mint', 
  'excellent', 
  'good', 
  'fair', 
  'poor'
]);

export const depreciationModelSchema = z.object({
  category: finnCategorySchema,
  condition: finnConditionSchema.optional(),
  brand: z.string().optional(),
  ageYears: z.number().nonnegative().optional(),
  originalPrice: numericConstraints.price.optional()
});

export type DepreciationModel = z.infer<typeof depreciationModelSchema>;

// =================================
// AMAZON-SPECIFIC SCHEMAS
// =================================

export const amazonConditionSchema = z.enum([
  'new',
  'used_like_new', 
  'used_very_good',
  'used_good',
  'used_acceptable'
]);

export const amazonProductTypeSchema = z.enum([
  'CONSUMER_ELECTRONICS',
  'CLOTHING',
  'SHOES', 
  'BOOKS',
  'SPORTS',
  'HOME_AND_GARDEN',
  'TOYS_AND_GAMES'
]);

export type AmazonCondition = z.infer<typeof amazonConditionSchema>;
export type AmazonProductType = z.infer<typeof amazonProductTypeSchema>;

// Note: All schemas are already exported individually above