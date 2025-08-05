// createListingDraftFromImage.ts
//
// npm i ai @ai-sdk/openai zod
// env: OPENAI_API_KEY=sk-...

import { z } from "zod";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { 
  type SupportedLanguage, 
  DEFAULT_LANGUAGE, 
  getAIPrompts, 
  isSupportedLanguage 
} from "@/lib/config/languages";

// -----------------------------
// 1) JSON schema (strict)
// -----------------------------
export const ListingDraftSchema = z.object({
  version: z.literal("1.0"),
  language: z.enum(["nb-NO", "en-US"]),
  title: z.string().min(5).max(120),
  description: z.string().min(30).max(2000),
  category: z.object({
    primary: z.string().min(2).max(50),
    secondary: z.string().min(0).max(50).optional(),
    confidence: z.number().min(0).max(1),
  }),
  attributes: z.object({
    condition: z.enum(["new", "like_new", "used_good", "used_fair", "for_parts"]),
    brand: z.string().max(60).optional(),
    model: z.string().max(80).optional(), 
    model_number: z.string().max(50).optional(), // Specific model code if visible
    series: z.string().max(60).optional(), // Product line (e.g. "Holbrook", "Radar EV")
    color: z.string().max(40).optional(),
    material: z.string().max(60).optional(),
    size: z.string().max(40).optional(),
    dimensions_cm: z
      .object({
        width: z.number().nonnegative().optional(),
        height: z.number().nonnegative().optional(),
        depth: z.number().nonnegative().optional(),
      })
      .optional(),
    weight_kg: z.number().nonnegative().optional(),
    technical_specs: z.array(z.string()).optional(), // Key features affecting value
    visible_text: z.array(z.string()).optional(), // Any readable text on item
    defects: z.array(z.string()).optional(),
    included_items: z.array(z.string()).optional(),
    serials_visible: z.boolean().optional(),
    brand_confidence: z.number().min(0).max(1).optional(), // How certain about brand ID
    model_confidence: z.number().min(0).max(1).optional(), // How certain about model ID
  }),
  pricing: z.object({
    suggested_price_nok: z.number().int().positive(),
    confidence: z.number().min(0).max(1),
    basis: z.array(z.string()).min(1).max(5), // short bullet reasons
  }),
  media: z.object({
    image_count: z.number().int().positive(),
    main_image_summary: z.string().min(10).max(300),
    quality_score: z.number().min(0).max(1),
    issues: z.array(z.string()).optional(),
    multiple_angles: z.boolean().optional(), // Whether multiple images were analyzed
    analysis_completeness: z.number().min(0).max(1).optional(), // How complete the analysis is with available images
  }),
  moderation: z.object({
    flags: z.array(z.string()).default([]),
    uncertainties: z.array(z.string()).default([]),
  }),
  tags: z.array(z.string()).max(15).default([]),
});

export type ListingDraft = z.infer<typeof ListingDraftSchema>;

// -----------------------------
// 2) Function: image(s) -> JSON
// -----------------------------
type InputImage =
  | { url: string }               // http(s) or data: URL
  | { base64: string; mime?: string }; // raw base64 (no prefix)

type MultipleImagesData = {
  type: 'multiple';
  images: string[];
  primaryIndex: number;
  count: number;
};

export async function createListingDraftFromImage(input: {
  image: InputImage;
  language?: SupportedLanguage;   // configurable language
  maxTokens?: number;             // escape hatch
}): Promise<ListingDraft> {
  const { image, language = DEFAULT_LANGUAGE, maxTokens = 1200 } = input;
  
  // Validate language
  if (!isSupportedLanguage(language)) {
    throw new Error(`Unsupported language: ${language}. Supported languages: nb-NO, en-US`);
  }

  console.log('🖼️ [createListingDraftFromImage] Starting image analysis', { language, maxTokens });

  try {
    // Handle both single and multiple images
    let imageContent: Array<{ type: "image"; image: string }> = [];
    let isMultipleImages = false;
    let imageCount = 1;

    if ('url' in image && image.url.startsWith('{')) {
      // Multiple images case - the URL contains JSON data
      try {
        const multiImageData: MultipleImagesData = JSON.parse(image.url);
        if (multiImageData.type === 'multiple' && multiImageData.images) {
          isMultipleImages = true;
          imageCount = multiImageData.count;
          
          console.log('📷 [createListingDraftFromImage] Processing multiple images', { 
            imageCount: multiImageData.count,
            primaryIndex: multiImageData.primaryIndex
          });
          
          // Add all images to the content array
          imageContent = multiImageData.images.map((imageUrl) => ({
            type: "image" as const,
            image: imageUrl
          }));
        }
      } catch (parseError) {
        console.warn('⚠️ [createListingDraftFromImage] Failed to parse multiple image data, falling back to single image');
        // Fall back to single image processing
      }
    }
    
    if (!isMultipleImages) {
      // Single image case (backward compatibility)
      const dataUrl = await toDataUrl(image);
      console.log('📷 [createListingDraftFromImage] Single image converted to data URL', { 
        dataUrlLength: dataUrl.length,
        isDataUrl: dataUrl.startsWith('data:'),
        urlPreview: dataUrl.substring(0, 100) + '...'
      });
      
      imageContent = [{ type: "image" as const, image: dataUrl }];
    }

    // Get language-specific prompts
    const prompts = getAIPrompts(language);
    
    // Dynamic system prompt based on number of images
    const system = isMultipleImages 
      ? prompts.imageAnalysis.multiple(imageCount)
      : prompts.imageAnalysis.single;

    // Dynamic user message based on number of images
    const userText = isMultipleImages
      ? prompts.userMessage.multiple(imageCount)
      : prompts.userMessage.single;

    const userMessages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const, 
            text: userText,
          },
          ...imageContent,
        ],
      },
    ];

    const model = openai("gpt-4o"); // Vision-capable model
    
    console.log('🧠 [createListingDraftFromImage] Calling OpenAI vision model', {
      isMultipleImages,
      imageCount,
      systemPromptLength: system.length,
      userTextLength: userText.length
    });

    const { object } = await generateObject({
      model,
      messages: [
        { role: "system" as const, content: system },
        ...userMessages,
      ],
      schema: ListingDraftSchema,
      maxRetries: 3,
    });

    console.log('✅ [createListingDraftFromImage] Vision analysis completed', {
      isMultipleImages,
      imageCount,
      language,
      title: object.title,
      category: object.category.primary,
      price: object.pricing.suggested_price_nok,
      condition: object.attributes.condition,
      brand: object.attributes.brand,
      model: object.attributes.model,
      brandConfidence: object.attributes.brand_confidence,
      modelConfidence: object.attributes.model_confidence
    });

    // Ensure the language field is set correctly
    return {
      ...object,
      language
    };
  } catch (error) {
    console.error('❌ [createListingDraftFromImage] Vision analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// -----------------------------
// 3) Helpers
// -----------------------------
async function toDataUrl(image: InputImage): Promise<string> {
  if ("url" in image) {
    // pass through http(s) or already data: URL
    if (image.url.startsWith("data:")) return image.url;
    if (!/^https?:\/\//.test(image.url)) {
      throw new Error("Only http(s) or data: URLs are supported in 'url'.");
    }
    // Many providers accept remote HTTP URLs directly as image_url.
    // If you prefer embedding, uncomment the fetch+base64 conversion below.
    return image.url;

    // --- If you want to inline as data URL (optional):
    // const res = await fetch(image.url);
    // if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
    // const buf = Buffer.from(await res.arrayBuffer());
    // const mime = res.headers.get("content-type") || "image/jpeg";
    // return `data:${mime};base64,${buf.toString("base64")}`;
  } else {
    const mime = image.mime ?? "image/jpeg";
    if (!/^(image\/(jpeg|png|webp|heic|heif))$/.test(mime)) {
      throw new Error("Unsupported image mime type for base64 input.");
    }
    return `data:${mime};base64,${image.base64}`;
  }
}