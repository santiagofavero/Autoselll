import { NextRequest, NextResponse } from "next/server";
import { createListingDraftFromImage } from "@/lib/createListingDraftFromImage";

export const runtime = "nodejs"; // vision needs Node, not edge
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for AI processing

export async function POST(req: NextRequest) {
  try {
    // Supports multipart/form-data (file) OR JSON with { imageUrl }
    const contentType = req.headers.get("content-type") || "";
    let draft;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "file is required" }, 
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are supported" },
          { status: 400 }
        );
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File size must be less than 10MB" },
          { status: 400 }
        );
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");
      
      draft = await createListingDraftFromImage({
        image: { base64, mime: file.type || "image/jpeg" },
      });
    } else {
      const { imageUrl } = (await req.json()) as { imageUrl?: string };
      if (!imageUrl) {
        return NextResponse.json(
          { error: "imageUrl is required" }, 
          { status: 400 }
        );
      }
      
      draft = await createListingDraftFromImage({ 
        image: { url: imageUrl } 
      });
    }

    return NextResponse.json(draft, { status: 200 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Draft generation error:", error);
    
    // Handle specific OpenAI errors
    if (error.message?.includes("API key")) {
      return NextResponse.json(
        { error: "OpenAI API configuration error" },
        { status: 500 }
      );
    }
    
    if (err?.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Failed to generate listing draft" },
      { status: 500 }
    );
  }
}