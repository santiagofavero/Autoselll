import { NextRequest, NextResponse } from "next/server";
import { getPublishingStatus } from "@/lib/publishing-queue";

export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  try {
    const { listingId } = params;
    
    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    const status = await getPublishingStatus(listingId);
    
    return NextResponse.json({
      success: true,
      listingId,
      ...status,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Publishing status error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to get publishing status"
      },
      { status: 500 }
    );
  }
}