import { NextRequest, NextResponse } from "next/server";
import { queueMarketplacePublishing } from "@/lib/marketplace-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 [API] Starting listing publishing');
    
    const { listing, platforms } = await req.json();
    
    console.log('📋 [API] Publishing parameters', {
      hasListing: !!listing,
      platforms,
      title: listing?.title?.substring(0, 50) + '...',
      price: listing?.price
    });

    if (!listing || !platforms?.length) {
      return NextResponse.json(
        { error: "Missing listing data or target platforms" },
        { status: 400 }
      );
    }

    // Queue the listing for publishing using the refactored standalone function
    const result = await queueMarketplacePublishing({
      listing,
      platforms: platforms as Array<'finn' | 'facebook'>,
      schedule: 'immediate',
    });

    console.log('✅ [API] Publishing queued', {
      success: result.success,
      listingId: result.listingId,
      jobCount: result.queuedJobs?.length || 0
    });

    return NextResponse.json({
      success: true,
      listingId: result.listingId,
      queuedJobs: result.queuedJobs,
      summary: result.summary
    });

  } catch (error) {
    console.error('❌ [API] Publishing failed', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Publishing failed",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}