import { NextRequest, NextResponse } from "next/server";
import { createOptimizedListing } from "@/lib/marketplace-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 [API] Starting listing generation');
    
    const { analysis, selectedPrice, targetPlatforms, hints, language } = await req.json();
    
    console.log('📋 [API] Generation parameters', {
      hasAnalysis: !!analysis,
      selectedPrice,
      targetPlatforms,
      hints: hints || 'none',
      language: language || 'nb-NO'
    });

    if (!analysis || !selectedPrice) {
      return NextResponse.json(
        { error: "Missing analysis data or selected price" },
        { status: 400 }
      );
    }

    // Determine platform for optimization
    const platform = targetPlatforms.length === 1 ? targetPlatforms[0] : 'both';
    
    // Generate optimized listing using the refactored standalone function
    const result = await createOptimizedListing({
      originalDraft: analysis,
      finalPrice: selectedPrice,
      platform: platform as 'finn' | 'facebook' | 'both',
      marketInsights: [
        `Price selected: ${selectedPrice} NOK`,
        hints ? `User hints: ${hints}` : 'No additional hints provided'
      ],
      language: (language as any) || 'nb-NO',
    });

    console.log('✅ [API] Listing generation completed', {
      success: result.success,
      title: result.optimizedListing?.title?.substring(0, 50) + '...',
      price: result.optimizedListing?.price
    });

    return NextResponse.json({
      success: true,
      optimizedListing: result.optimizedListing,
      summary: result.summary
    });

  } catch (error) {
    console.error('❌ [API] Listing generation failed', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Listing generation failed",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}