import { NextRequest, NextResponse } from "next/server";
import { runMarketplaceAgent } from "@/lib/marketplace-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for full agent workflow

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🎯 [API] Agent create-listing request started');
  
  try {
    const contentType = req.headers.get("content-type") || "";
    console.log('📥 [API] Request content type', { contentType });
    
    let imageUrl: string;
    let requestData: Record<string, unknown> = {};

    // Handle both file upload and URL input
    if (contentType.includes("multipart/form-data")) {
      console.log('📁 [API] Processing file upload');
      const form = await req.formData();
      const file = form.get("file") as File | null;
      
      if (!file) {
        console.error('❌ [API] No file provided');
        return NextResponse.json(
          { error: "file is required" }, 
          { status: 400 }
        );
      }

      console.log('📋 [API] File details', { 
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

      // Convert to data URL for processing with size optimization
      console.log('🔄 [API] Converting file to base64');
      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");
      const originalImageUrl = `data:${file.type};base64,${base64}`;
      
      // Check if the base64 image is too large for context window
      const estimatedTokens = Math.ceil(base64.length / 4); // Rough token estimate
      console.log('📊 [API] Image size analysis', {
        fileSize: file.size,
        base64Length: base64.length,
        estimatedTokens
      });
      
      if (estimatedTokens > 75000) { // Increased limit since we now have compression
        console.warn('⚠️ [API] Image too large for context window', { estimatedTokens });
        return NextResponse.json(
          { 
            error: "Image too large for processing",
            details: `Image is estimated to use ${estimatedTokens} tokens. The image should have been automatically compressed.`,
            suggestion: "The image is unusually large. Please try uploading a different image."
          },
          { status: 413 }
        );
      }
      
      imageUrl = originalImageUrl;

      // Extract other form data
      requestData = {
        hints: form.get("hints") as string | null,
        userPreference: form.get("userPreference") as string | null,
        targetPlatforms: form.get("targetPlatforms") ? 
          (form.get("targetPlatforms") as string).split(',') : undefined,
        autoPublish: form.get("autoPublish") === "true",
      };
    } else {
      console.log('📄 [API] Processing JSON request');
      const body = await req.json();
      imageUrl = body.imageUrl;
      requestData = body;
    }

    console.log('⚙️ [API] Request parameters', {
      hasImageUrl: !!imageUrl,
      imageUrlType: imageUrl?.startsWith('data:') ? 'base64' : 'url',
      hints: requestData.hints || 'none',
      userPreference: requestData.userPreference,
      targetPlatforms: requestData.targetPlatforms,
      autoPublish: requestData.autoPublish
    });

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl or file is required" },
        { status: 400 }
      );
    }

    // Validate optional parameters
    const userPreference = requestData.userPreference && 
      ['quick_sale', 'market_price', 'maximize_profit'].includes(requestData.userPreference) 
      ? requestData.userPreference : 'market_price';

    const targetPlatforms = Array.isArray(requestData.targetPlatforms) 
      ? requestData.targetPlatforms.filter((p: string) => ['finn', 'facebook', 'amazon'].includes(p))
      : ['finn', 'facebook', 'amazon'];

    if (targetPlatforms.length === 0) {
      return NextResponse.json(
        { error: "At least one valid target platform (finn, facebook, amazon) is required" },
        { status: 400 }
      );
    }

    // Run the marketplace agent workflow
    console.log('🚀 [API] Starting agent workflow');
    const agentResult = await runMarketplaceAgent({
      imageUrl,
      hints: requestData.hints || undefined,
      userPreference,
      targetPlatforms,
      autoPublish: Boolean(requestData.autoPublish),
    });

    const duration = Date.now() - startTime;
    console.log('⏱️ [API] Agent workflow completed', { 
      duration: `${duration}ms`,
      phase: agentResult.phase,
      success: agentResult.phase !== 'error'
    });

    // Return structured response based on workflow phase
    const response = {
      success: agentResult.phase !== 'error',
      phase: agentResult.phase,
      summary: agentResult.summary,
      needsUserInput: agentResult.needsUserInput,
      nextAction: agentResult.nextAction,
      data: agentResult.data,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
    };

    // Set appropriate status code
    const statusCode = agentResult.phase === 'error' ? 500 : 200;

    console.log('✅ [API] Sending response', { statusCode, phase: agentResult.phase });
    return NextResponse.json(response, { status: statusCode });

  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('💥 [API] Agent workflow error', {
      error: error.message ?? "Unknown error",
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    // Handle specific error types
    if (error.message?.includes("API key")) {
      console.error('🔑 [API] API key configuration error');
      return NextResponse.json(
        { 
          success: false,
          phase: 'error',
          error: "AI service configuration error",
          summary: "Please check API configuration",
          duration: `${duration}ms`
        },
        { status: 500 }
      );
    }
    
    if (err?.message?.includes("rate limit")) {
      console.error('⏰ [API] Rate limit exceeded');
      return NextResponse.json(
        { 
          success: false,
          phase: 'error',
          error: "Rate limit exceeded",
          summary: "Too many requests. Please try again later.",
          duration: `${duration}ms`
        },
        { status: 429 }
      );
    }

    if (err?.message?.includes("timeout")) {
      console.error('⏱️ [API] Workflow timeout');
      return NextResponse.json(
        { 
          success: false,
          phase: 'error',
          error: "Workflow timeout",
          summary: "The agent workflow took too long. Please try again.",
          duration: `${duration}ms`
        },
        { status: 408 }
      );
    }

    // Generic error
    console.error('❌ [API] Generic workflow error');
    return NextResponse.json(
      { 
        success: false,
        phase: 'error',
        error: err?.message ?? "Agent workflow failed",
        summary: "An unexpected error occurred during the listing creation process",
        duration: `${duration}ms`,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for checking agent status or retrieving workflow info
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "capabilities") {
    return NextResponse.json({
      supportedPlatforms: ["finn", "facebook", "amazon"],
      userPreferences: ["quick_sale", "market_price", "maximize_profit"],
      maxFileSize: "10MB",
      supportedFormats: ["JPEG", "PNG", "WebP"],
      features: [
        "AI image analysis with brand/model detection",
        "Multi-platform price research (FINN.no, Amazon)", 
        "Amazon SP-API integration for catalog matching",
        "Intelligent platform recommendation engine",
        "Cross-platform pricing optimization",
        "Platform-specific content optimization",
        "Multi-marketplace publishing queue"
      ],
      workflow: [
        "Step 1: Advanced image analysis and item extraction",
        "Step 2: Multi-platform price research (FINN.no)",
        "Step 3: Amazon eligibility and catalog analysis",
        "Step 4: AI-powered platform recommendations",
        "Step 5: Optimized price range calculation",
        "Step 6: Platform-specific content optimization",
        "Step 7: Intelligent multi-marketplace publishing"
      ],
      amazonIntegration: {
        enabled: process.env.AMAZON_REFRESH_TOKEN ? true : false,
        features: [
          "Catalog search and ASIN matching",
          "Listing eligibility validation",
          "SP-API automated submission",
          "Real-time status monitoring"
        ]
      }
    });
  }

  return NextResponse.json(
    { error: "Invalid action. Use ?action=capabilities for agent info." },
    { status: 400 }
  );
}