import { NextRequest, NextResponse } from "next/server";
import { createListingDraftFromImage } from "@/lib/createListingDraftFromImage";
import { isSupportedLanguage, type SupportedLanguage } from "@/lib/config/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute for image analysis only

// Separate endpoint for just image analysis to reduce context window usage
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('📸 [API] Image analysis request started');
  
  try {
    const contentType = req.headers.get("content-type") || "";
    console.log('📥 [API] Request content type', { contentType });
    
    let imageUrl: string;
    let language = "en-US"; // Default language

    // Handle file upload(s)
    if (contentType.includes("multipart/form-data")) {
      console.log('📁 [API] Processing file upload(s) for analysis');
      const form = await req.formData();
      
      // Check for multiple files
      const fileCount = parseInt(form.get("fileCount") as string || "1");
      const primaryImageIndex = parseInt(form.get("primaryImageIndex") as string || "0");
      const hints = form.get("hints") as string;
      language = (form.get("language") as string) || "en-US";
      
      console.log('📋 [API] Upload details', { fileCount, primaryImageIndex, hints, language });
      
      if (fileCount === 1) {
        // Single file handling (backward compatibility)
        const file = (form.get("file") as File) || (form.get("file_0") as File) || null;
        
        if (!file) {
          console.error('❌ [API] No file provided');
          return NextResponse.json(
            { error: "file is required" }, 
            { status: 400 }
          );
        }

        console.log('📋 [API] Single file details', { 
          name: file.name, 
          type: file.type, 
          size: file.size 
        });

        // Validate file
        if (!file.type.startsWith("image/")) {
          console.error('❌ [API] Invalid file type', { type: file.type });
          return NextResponse.json(
            { error: "Only image files are supported" },
            { status: 400 }
          );
        }

        if (file.size > 10 * 1024 * 1024) {
          console.error('❌ [API] File too large', { size: file.size });
          return NextResponse.json(
            { error: "File size must be less than 10MB" },
            { status: 400 }
          );
        }

        // Convert to data URL
        console.log('🔄 [API] Converting single file to base64');
        const buf = Buffer.from(await file.arrayBuffer());
        const base64 = buf.toString("base64");
        imageUrl = `data:${file.type};base64,${base64}`;
        
        // Check if the base64 image is too large
        const estimatedTokens = Math.ceil(base64.length / 4);
        console.log('📊 [API] Single image size analysis', {
          fileSize: file.size,
          base64Length: base64.length,
          estimatedTokens
        });
        
        if (estimatedTokens > 80000) {
          console.warn('⚠️ [API] Image too large for analysis', { estimatedTokens });
          return NextResponse.json(
            { 
              error: "Image too large for processing",
              details: `Image is estimated to use ${estimatedTokens} tokens. Please upload a smaller image.`,
              suggestion: "Try compressing the image or uploading a smaller version."
            },
            { status: 413 }
          );
        }
      } else {
        // Multiple files handling
        const files: File[] = [];
        let totalEstimatedTokens = 0;
        
        for (let i = 0; i < fileCount; i++) {
          const file = form.get(`file_${i}`) as File | null;
          if (!file) {
            console.error(`❌ [API] Missing file at index ${i}`);
            return NextResponse.json(
              { error: `Missing file at index ${i}` },
              { status: 400 }
            );
          }
          
          // Validate file
          if (!file.type.startsWith("image/")) {
            console.error('❌ [API] Invalid file type', { type: file.type, index: i });
            return NextResponse.json(
              { error: `File ${i + 1}: Only image files are supported` },
              { status: 400 }
            );
          }

          if (file.size > 10 * 1024 * 1024) {
            console.error('❌ [API] File too large', { size: file.size, index: i });
            return NextResponse.json(
              { error: `File ${i + 1}: File size must be less than 10MB` },
              { status: 400 }
            );
          }
          
          files.push(file);
          
          // Estimate tokens for each file
          const buf = Buffer.from(await file.arrayBuffer());
          const estimatedTokens = Math.ceil(buf.length * 1.33 / 4); // base64 expansion
          totalEstimatedTokens += estimatedTokens;
        }
        
        console.log('📊 [API] Multiple images size analysis', {
          fileCount,
          totalEstimatedTokens,
          primaryImageIndex
        });
        
        // Check total token limit for multiple images
        if (totalEstimatedTokens > 100000) { // Conservative limit for multiple images
          console.warn('⚠️ [API] Multiple images too large for analysis', { totalEstimatedTokens });
          return NextResponse.json(
            { 
              error: "Combined images too large for processing",
              details: `${fileCount} images are estimated to use ${totalEstimatedTokens} tokens. Please upload smaller or fewer images.`,
              suggestion: "Try compressing the images or uploading fewer images."
            },
            { status: 413 }
          );
        }
        
        // Convert all images to data URLs for comprehensive analysis
        console.log('🔄 [API] Converting all files to base64 for multi-image analysis');
        const imageUrls: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const buf = Buffer.from(await file.arrayBuffer());
          const base64 = buf.toString("base64");
          const dataUrl = `data:${file.type};base64,${base64}`;
          imageUrls.push(dataUrl);
          console.log(`🖼️ [API] Converted image ${i + 1}/${files.length}`, { 
            size: file.size, 
            base64Length: base64.length 
          });
        }
        
        // For multi-image analysis, we'll pass all URLs to the vision model
        // Store as a JSON string for now, we'll update the vision function to handle arrays
        imageUrl = JSON.stringify({
          type: 'multiple',
          images: imageUrls,
          primaryIndex: primaryImageIndex,
          count: files.length
        });
      }
    } else {
      const body = await req.json();
      imageUrl = body.imageUrl;
      language = body.language || "en-US";
      console.log('📋 [API] JSON request details', { imageUrl: imageUrl?.substring(0, 50) + '...', language });
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl or file is required" },
        { status: 400 }
      );
    }

    console.log('🧠 [API] Starting image analysis');
    
    // Validate and use language parameter
    const validLanguage: SupportedLanguage = isSupportedLanguage(language) ? language : "en-US";
    
    console.log('🌐 [API] Using language', { language, validLanguage });
    
    // Run image analysis only
    const draft = await createListingDraftFromImage({
      image: { url: imageUrl },
      language: validLanguage,
    });

    const duration = Date.now() - startTime;
    console.log('✅ [API] Image analysis completed', { 
      duration: `${duration}ms`,
      title: draft.title,
      category: draft.category.primary,
      price: draft.pricing.suggested_price_nok
    });

    return NextResponse.json({
      success: true,
      draft,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('💥 [API] Image analysis error', {
      error: error.message ?? "Unknown error",
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    // Handle specific error types
    if (error.message?.includes("API key")) {
      return NextResponse.json(
        { 
          success: false,
          error: "AI service configuration error",
          duration: `${duration}ms`
        },
        { status: 500 }
      );
    }
    
    if (err?.message?.includes("rate limit")) {
      return NextResponse.json(
        { 
          success: false,
          error: "Rate limit exceeded",
          duration: `${duration}ms`
        },
        { status: 429 }
      );
    }

    if (err?.message?.includes("context window")) {
      return NextResponse.json(
        { 
          success: false,
          error: "Image too large for processing",
          suggestion: "Try uploading a smaller image",
          duration: `${duration}ms`
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: err?.message ?? "Image analysis failed",
        duration: `${duration}ms`,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      },
      { status: 500 }
    );
  }
}