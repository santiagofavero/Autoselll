import { NextRequest } from "next/server";
import { processBuyerMessage, type ChatContext } from "@/lib/chat-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // 30 seconds for chat responses

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('💬 [Chat API] Chat request started');
  
  try {
    const body = await req.json();
    const { 
      messages, 
      chatContext,
      simulationMode = false 
    } = body;

    console.log('📥 [Chat API] Request details', { 
      messageCount: messages?.length || 0,
      simulationMode,
      listingTitle: chatContext?.listing?.title
    });

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ [Chat API] Invalid messages format');
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Default chat context for simulation mode
    const defaultContext: ChatContext = {
      listingId: chatContext?.listingId || 'demo-listing',
      buyerId: chatContext?.buyerId || 'demo-buyer',
      platform: chatContext?.platform || 'finn',
      listing: {
        title: chatContext?.listing?.title || 'iPhone 13 Pro 128GB',
        price: chatContext?.listing?.price || 8500,
        minPrice: chatContext?.listing?.minPrice || 7000,
        description: chatContext?.listing?.description || 'Pen iPhone i god stand',
        condition: chatContext?.listing?.condition || 'used_good',
        location: chatContext?.listing?.location || 'Oslo',
        category: chatContext?.listing?.category || 'Elektronikk'
      },
      conversation: chatContext?.conversation || [],
      settings: {
        maxDiscount: chatContext?.settings?.maxDiscount || 15,
        autoAcceptThreshold: chatContext?.settings?.autoAcceptThreshold || 7500,
        requireSellerApproval: chatContext?.settings?.requireSellerApproval || true,
        quickResponses: chatContext?.settings?.quickResponses || true
      }
    };

    console.log('🎯 [Chat API] Using chat context', {
      listingTitle: defaultContext.listing.title,
      price: defaultContext.listing.price,
      minPrice: defaultContext.listing.minPrice,
      maxDiscount: defaultContext.settings.maxDiscount
    });

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    const userMessage = latestMessage?.content || '';

    console.log('💭 [Chat API] Processing user message', { 
      messageLength: userMessage.length,
      messagePreview: userMessage.substring(0, 50) + '...'
    });

    // Use the enhanced chat agent to process the message
    const chatResponse = await processBuyerMessage(defaultContext, userMessage);
    
    console.log('🤖 [Chat API] Agent response:', {
      action: chatResponse.action,
      confidence: chatResponse.confidence,
      shouldNotifySeller: chatResponse.shouldNotifySeller,
      replyLength: chatResponse.reply.length
    });

    // Create a simple text stream with the agent's response
    const responseStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chatResponse.reply));
        controller.close();
      }
    });

    const duration = Date.now() - startTime;
    console.log('✅ [Chat API] Chat response completed', {
      duration: `${duration}ms`,
      action: chatResponse.action,
      confidence: chatResponse.confidence
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Chat-Action': chatResponse.action,
        'X-Chat-Confidence': chatResponse.confidence.toString(),
        'X-Should-Notify-Seller': chatResponse.shouldNotifySeller.toString(),
      }
    });

  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('💥 [Chat API] Chat error', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    // Handle specific error types
    if (error.message?.includes("API key")) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "AI service configuration error",
          duration: `${duration}ms`
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    if (error.message?.includes("rate limit")) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Rate limit exceeded, please try again later",
          duration: `${duration}ms`
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message ?? "Chat service temporarily unavailable",
        duration: `${duration}ms`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}