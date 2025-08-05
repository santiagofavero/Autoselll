// Chat agent for handling buyer inquiries and negotiations
import { z } from "zod";
import { tool, generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface ChatContext {
  listingId: string;
  buyerId: string;
  platform: 'finn' | 'facebook' | 'messenger';
  listing: {
    title: string;
    price: number;
    minPrice?: number; // Set by seller
    description: string;
    condition: string;
    location?: string;
    category: string;
  };
  conversation: Array<{
    role: 'buyer' | 'agent' | 'seller';
    message: string;
    timestamp: Date;
    offer?: number;
  }>;
  settings: {
    maxDiscount: number; // Percentage (e.g., 15 = 15%)
    autoAcceptThreshold?: number; // Auto-accept offers above this amount
    requireSellerApproval: boolean;
    quickResponses: boolean;
  };
}

interface BuyerAnalysis {
  buyerType?: 'serious' | 'casual' | 'bargain_hunter' | 'unknown';
  negotiationStyle?: 'direct' | 'polite' | 'aggressive' | 'unknown';
  urgency?: 'high' | 'medium' | 'low';
  communicationStyle?: 'formal' | 'casual' | 'brief';
  priceExpectation?: number;
}

export interface ChatResponse {
  reply: string;
  action: 'respond' | 'escalate' | 'accept_offer' | 'counter_offer' | 'decline';
  escalationReason?: string;
  offerAmount?: number;
  confidence: number;
  shouldNotifySeller: boolean;
}

// Tool: Analyze buyer message and determine response strategy
export const analyzeBuyerMessage = tool({
  description: "Analyze buyer message to understand intent and determine appropriate response.",
  parameters: z.object({
    message: z.string(),
    conversationHistory: z.array(z.string()).optional(),
    listingPrice: z.number(),
    minPrice: z.number().optional(),
    simulationMode: z.boolean().optional(),
  }),
  execute: async ({ message, conversationHistory = [], listingPrice, minPrice, simulationMode = false }) => {
    const analysis = {
      intent: 'unknown' as 'question' | 'offer' | 'bargain' | 'availability' | 'details' | 'scam' | 'spam' | 'greeting' | 'compliment',
      hasOffer: false,
      offerAmount: null as number | null,
      urgency: 'normal' as 'low' | 'normal' | 'high',
      sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
      riskFlags: [] as string[],
      buyerType: 'unknown' as 'serious' | 'bargainer' | 'lowballer' | 'time_waster' | 'scammer',
      negotiationStyle: 'direct' as 'direct' | 'polite' | 'aggressive' | 'hesitant',
    };

    const lowerMessage = message.toLowerCase();
    
    // Enhanced Norwegian price patterns
    const pricePatterns = [
      /(\d+)\s*(kr|kroner|nok)/gi,
      /kan du ta (\d+)/gi,
      /tar du (\d+)/gi,
      /(\d+)\s*er (mitt|vårt) (bud|tilbud)/gi,
      /jeg byr (\d+)/gi,
      /kan jeg få.*?(\d+)/gi,
      /hva med (\d+)/gi,
      /(\d+)\s*som sluttsum/gi,
      /(\d+)\s*i kontanter/gi,
      /(\d+)\s*kroner og vi har en deal/gi,
    ];

    for (const pattern of pricePatterns) {
      const match = pattern.exec(message);
      if (match) {
        analysis.hasOffer = true;
        analysis.offerAmount = parseInt(match[1]);
        analysis.intent = 'offer';
        break;
      }
    }

    // Detect greetings and politeness
    if (/^(hei|hallo|god (morgen|dag|kveld))/i.test(lowerMessage)) {
      analysis.intent = 'greeting';
      analysis.negotiationStyle = 'polite';
    }

    // Detect compliments about item
    if (/(fin|flott|pen|nice|bra) (telefon|dings|ting|vare|gjenstand)/i.test(lowerMessage)) {
      analysis.intent = 'compliment';
      analysis.sentiment = 'positive';
    }

    // Enhanced bargaining intent detection
    if ((/kan du gå ned|lavere pris|bedre pris|rabatt|prisen|litt billigere|kan ikke du/i.test(lowerMessage))) {
      analysis.intent = 'bargain';
      if ((/kan ikke du|må du/i.test(lowerMessage))) {
        analysis.negotiationStyle = 'aggressive';
      }
    }

    // Enhanced availability detection
    if ((/fortsatt tilgjengelig|fortsatt ledig|solgt|ledig|tilgjengelig|kan jeg få|er den ledig/i.test(lowerMessage))) {
      analysis.intent = 'availability';
    }

    // Enhanced detail questions with Norwegian patterns
    if (/(hvor|når|hvordan|hvorfor|hvilken|kan du (fortelle|si)|har den|fungerer|tilstand|skader|riper)/i.test(lowerMessage) && !analysis.hasOffer) {
      analysis.intent = 'details';
    }

    // Enhanced urgency detection
    if ((/raskt|haster|i dag|nå|umiddelbart|asap|i kveld|på mandag|denne uka/i.test(lowerMessage))) {
      analysis.urgency = 'high';
    }

    // Enhanced positive sentiment
    if ((/interessert|kjøpe|perfekt|bra|fin|flott|takk|tusen takk|supert|utmerket/i.test(lowerMessage))) {
      analysis.sentiment = 'positive';
    }

    // Detect buyer type based on offer amount and style
    if (analysis.hasOffer && analysis.offerAmount) {
      const offerRatio = analysis.offerAmount / listingPrice;
      if (offerRatio < 0.7) {
        analysis.buyerType = 'lowballer';
      } else if (offerRatio >= 0.9) {
        analysis.buyerType = 'serious';
      } else {
        analysis.buyerType = 'bargainer';
      }
    }

    // Detect negotiation style
    if ((/kontanter|cash|kan hente i dag|kommer i dag/i.test(lowerMessage))) {
      analysis.negotiationStyle = 'direct';
      analysis.urgency = 'high';
    }

    if ((/(unnskyld|beklager|kanskje|muligens|hvis det går an)/i.test(lowerMessage))) {
      analysis.negotiationStyle = 'hesitant';
    }

    // Risk detection
    if ((/western union|moneygram|overpay|more money|agent|shipping/i.test(lowerMessage))) {
      analysis.riskFlags.push('potential_scam');
    }
    
    if (message.length < 10 && !analysis.hasOffer) {
      analysis.riskFlags.push('low_effort');
    }

    // Enhanced simulation mode insights
    if (simulationMode && analysis.hasOffer) {
      const offerRatio = analysis.offerAmount! / listingPrice;
      analysis.riskFlags.push(`simulation_insight: ${(offerRatio * 100).toFixed(1)}% av listepris`);
    }

    return {
      success: true,
      analysis,
      summary: `Intent: ${analysis.intent}, Offer: ${analysis.hasOffer ? `${analysis.offerAmount} kr (${analysis.buyerType})` : 'none'}, Style: ${analysis.negotiationStyle}, Sentiment: ${analysis.sentiment}`
    };
  },
});

// Tool: Generate appropriate response to buyer
export const generateBuyerResponse = tool({
  description: "Generate contextual response to buyer message in Norwegian.",
  parameters: z.object({
    messageAnalysis: z.any(),
    listingContext: z.object({
      title: z.string(),
      price: z.number(),
      minPrice: z.number().optional(),
      condition: z.string(),
      category: z.string(),
    }),
    conversationLength: z.number(),
    sellerSettings: z.object({
      maxDiscount: z.number(),
      quickResponses: z.boolean(),
    }),
  }),
  execute: async ({ messageAnalysis, listingContext, conversationLength, sellerSettings }) => {
    const { analysis } = messageAnalysis;
    const { price, minPrice = Math.round(price * 0.8), title, condition } = listingContext;

    let response: ChatResponse = {
      reply: '',
      action: 'respond',
      confidence: 0.8,
      shouldNotifySeller: false,
    };

    // Handle different intents with enhanced Norwegian responses
    switch (analysis.intent) {
      case 'greeting':
        response.reply = `Hei! Takk for interesse i ${title}. Den er fortsatt tilgjengelig. Hva lurer du på?`;
        break;

      case 'compliment':
        response.reply = `Takk! Ja, det er virkelig en fin ${title.toLowerCase()}. Den er godt vedlikeholdt og klar for ny eier. Interessert i å kjøpe?`;
        response.confidence = 0.9;
        break;

      case 'availability':
        const availabilityResponses = [
          `Hei! Ja, ${title} er fortsatt tilgjengelig. Interessert i å kjøpe?`,
          `Hei! Den er ledig, ja! Når kunne du tenke deg å se på den?`,
          `Ja, fortsatt tilgjengelig! Har du noen spørsmål om ${title}?`
        ];
        response.reply = availabilityResponses[Math.floor(Math.random() * availabilityResponses.length)];
        break;

      case 'details':
        const conditionText = condition === 'used_good' ? 'god brukt tilstand' : 
                             condition === 'like_new' ? 'som ny tilstand' : condition;
        response.reply = `Takk for interesse i ${title}! Den er i ${conditionText}. ${
          Math.random() > 0.5 ? 'Har du noen spesifikke spørsmål?' : 'Hva vil du vite mer om?'
        }`;
        break;

      case 'offer':
        if (analysis.offerAmount) {
          response = await handleOfferEnhanced(analysis.offerAmount, price, minPrice, sellerSettings, analysis);
        }
        break;

      case 'bargain':
        const discountRange = Math.round(price * (sellerSettings.maxDiscount / 100));
        const lowestPrice = Math.max(minPrice, price - discountRange);
        
        if (analysis.negotiationStyle === 'aggressive') {
          response.reply = `Prisen er ${price} kr som avtalt. Jeg kan gå ned til ${lowestPrice} kr, men ikke lavere.`;
        } else {
          response.reply = `Jeg forstår at du vil forhandle. Jeg kan gå ned til ${lowestPrice} kr som laveste pris. Hva synes du?`;
        }
        response.action = 'counter_offer';
        response.offerAmount = lowestPrice;
        break;

      default:
        if (analysis.riskFlags.includes('potential_scam')) {
          response.reply = `Takk for meldingen. Jeg selger kun lokalt med kontant betaling ved henting. Er du interessert i dette?`;
          response.shouldNotifySeller = true;
          response.escalationReason = 'Mulig svindelforsøk oppdaget';
        } else {
          const genericResponses = [
            `Takk for interesse i ${title}! Hva kan jeg hjelpe deg med?`,
            `Hei! Hyggelig at du er interessert i ${title}. Hva lurer du på?`,
            `Takk for meldingen! Er det noe spesielt du vil vite om ${title}?`
          ];
          response.reply = genericResponses[Math.floor(Math.random() * genericResponses.length)];
        }
    }

    // Escalate if conversation is getting complex
    if (conversationLength > 5 && analysis.intent !== 'offer') {
      response.shouldNotifySeller = true;
      response.escalationReason = 'Lang samtale - kan trenge menneskelig oppfølging';
    }

    return {
      success: true,
      response,
      summary: `Generated ${response.action} response: "${response.reply.substring(0, 50)}..."`
    };
  },
});

// Enhanced helper function to handle offers with buyer analysis
async function handleOfferEnhanced(
  offerAmount: number, 
  listingPrice: number, 
  minPrice: number, 
  settings: ChatContext['settings'], 
  analysis: BuyerAnalysis
): Promise<ChatResponse> {
  const discountPercent = ((listingPrice - offerAmount) / listingPrice) * 100;
  const buyerType = analysis.buyerType || 'unknown';
  const negotiationStyle = analysis.negotiationStyle || 'direct';

  if (offerAmount >= listingPrice) {
    const responses = [
      `Perfekt! ${offerAmount} kr er riktig pris. Når passer det å hente?`,
      `Supert! ${offerAmount} kr er greit for meg. Kan du hente i dag?`,
      `Flott! ${offerAmount} kr - da har vi en deal! Hvor raskt kan du hente?`
    ];
    return {
      reply: responses[Math.floor(Math.random() * responses.length)],
      action: 'accept_offer',
      confidence: 0.95,
      shouldNotifySeller: true,
      offerAmount,
    };
  }

  if (offerAmount >= minPrice) {
    if (offerAmount >= settings.autoAcceptThreshold) {
      const quickAcceptResponses = [
        `${offerAmount} kr høres bra ut! Deal. Når kan du hente?`,
        `${offerAmount} kr - det går fint! Når passer det for deg å hente?`,
        `OK, ${offerAmount} kr da. Vi har en avtale! Hvor raskt kan du komme?`
      ];
      return {
        reply: quickAcceptResponses[Math.floor(Math.random() * quickAcceptResponses.length)],
        action: 'accept_offer',
        confidence: 0.9,
        shouldNotifySeller: true,
        offerAmount,
      };
    } else {
      // Handle different buyer types differently
      let responseText = '';
      if (buyerType === 'serious') {
        responseText = `Takk for det seriøse budet på ${offerAmount} kr. La meg tenke på det og kommer tilbake til deg snart.`;
      } else if (buyerType === 'bargainer') {
        responseText = `${offerAmount} kr er et greit bud. Jeg må bare sjekke med meg selv om det går an.`;
      } else {
        responseText = `Takk for budet på ${offerAmount} kr. La meg tenke på det og kommer tilbake til deg.`;
      }

      return {
        reply: responseText,
        action: 'escalate',
        confidence: 0.7,
        shouldNotifySeller: true,
        escalationReason: `Bud på ${offerAmount} kr (${discountPercent.toFixed(1)}% rabatt) fra ${buyerType} kjøper - trenger godkjenning`,
        offerAmount,
      };
    }
  }

  // Offer too low - sophisticated counter strategy
  const counterOffer = calculateCounterOffer(offerAmount, listingPrice, minPrice, buyerType, negotiationStyle);
  
  let replyText = '';
  if (buyerType === 'lowballer') {
    replyText = `${offerAmount} kr er dessverre for lavt. Jeg kan møte deg på ${counterOffer} kr - det er så lavt jeg kan gå.`;
  } else if (negotiationStyle === 'hesitant') {
    replyText = `Takk for budet! ${offerAmount} kr er litt lavt for meg. Kunne du tenke deg ${counterOffer} kr?`;
  } else {
    replyText = `Takk for budet! ${offerAmount} kr er litt lavt. Hva med ${counterOffer} kr?`;
  }

  return {
    reply: replyText,
    action: 'counter_offer',
    confidence: 0.8,
    shouldNotifySeller: false,
    offerAmount: counterOffer,
  };
}

// Helper function to calculate smart counter offers
function calculateCounterOffer(
  offerAmount: number, 
  listingPrice: number, 
  minPrice: number, 
  buyerType: string, 
  negotiationStyle: string
): number {
  const gap = listingPrice - offerAmount;
  
  if (buyerType === 'lowballer') {
    // Be firmer with lowballers - smaller concession
    return Math.max(minPrice, Math.round(offerAmount + gap * 0.6));
  } else if (buyerType === 'serious') {
    // Meet serious buyers more in the middle
    return Math.max(minPrice, Math.round(offerAmount + gap * 0.4));
  } else if (negotiationStyle === 'hesitant') {
    // Be gentler with hesitant buyers
    return Math.max(minPrice, Math.round(offerAmount + gap * 0.5));
  } else {
    // Standard counter for bargainers
    return Math.max(minPrice, Math.round(offerAmount + gap * 0.5));
  }
}

// Original helper function to handle offers (for backward compatibility)
async function handleOffer(offerAmount: number, listingPrice: number, minPrice: number, settings: ChatContext['settings']): Promise<ChatResponse> {
  const discountPercent = ((listingPrice - offerAmount) / listingPrice) * 100;

  if (offerAmount >= listingPrice) {
    return {
      reply: `Perfekt! ${offerAmount} kr er riktig pris. Når passer det å hente?`,
      action: 'accept_offer',
      confidence: 0.95,
      shouldNotifySeller: true,
      offerAmount,
    };
  }

  if (offerAmount >= minPrice) {
    if (offerAmount >= settings.autoAcceptThreshold) {
      return {
        reply: `${offerAmount} kr høres bra ut! Deal. Når kan du hente?`,
        action: 'accept_offer',
        confidence: 0.9,
        shouldNotifySeller: true,
        offerAmount,
      };
    } else {
      return {
        reply: `Takk for budet på ${offerAmount} kr. La meg tenke på det og kommer tilbake til deg.`,
        action: 'escalate',
        confidence: 0.7,
        shouldNotifySeller: true,
        escalationReason: `Bud på ${offerAmount} kr (${discountPercent.toFixed(1)}% rabatt) - trenger godkjenning`,
        offerAmount,
      };
    }
  }

  // Offer too low - counter
  const counterOffer = Math.max(minPrice, Math.round(offerAmount * 1.15));
  return {
    reply: `Takk for budet! ${offerAmount} kr er litt lavt. Kan du møte meg på ${counterOffer} kr?`,
    action: 'counter_offer',
    confidence: 0.8,
    shouldNotifySeller: false,
    offerAmount: counterOffer,
  };
}

// Language detection helper
function detectLanguage(message: string): 'en' | 'no' {
  const englishWords = /\b(hello|hi|hey|buy|price|offer|deal|thanks|available|can|you|take|dollars?|money|cash|pickup|delivery)\b/i;
  const norwegianWords = /\b(hei|hallo|kjøpe|pris|bud|takk|tilgjengelig|kr|kroner|kan|du|ta|penger|kontanter|hente|levering)\b/i;
  
  const englishMatches = (message.match(englishWords) || []).length;
  const norwegianMatches = (message.match(norwegianWords) || []).length;
  
  return norwegianMatches > englishMatches ? 'no' : 'en';
}

// Main chat agent function using AI generation
export async function processBuyerMessage(
  context: ChatContext,
  newMessage: string
): Promise<ChatResponse> {
  try {
    console.log('💬 [Chat Agent] Processing message:', newMessage.substring(0, 50) + '...');
    
    // Detect language
    const detectedLanguage = detectLanguage(newMessage);
    console.log('🌐 [Chat Agent] Detected language:', detectedLanguage);
    
    // Generate conversation history for context
    const conversationHistory = context.conversation
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.message}`)
      .join('\n');

    // Create system prompt based on detected language
    const systemPrompt = detectedLanguage === 'no' ? 
      `Du er en høflig og profesjonell salgsassistent for norske markedsplasser som FINN.no og Facebook Marketplace.

ANNONSE INFO:
- Tittel: ${context.listing.title}
- Annonsert pris: ${context.listing.price} kr
- Tilstand: ${context.listing.condition}
- Kategori: ${context.listing.category}
- Lokasjon: ${context.listing.location || 'Oslo'}

SALGSREGLER:
- Svar alltid på norsk (bokmål)
- Vær høflig, hjelpsom og profesjonell
- Beskytt selgers interesser men vær åpen for forhandling
- ALDRI avsløre den faktiske minsteprisen (${context.listing.minPrice || Math.round(context.listing.price * 0.8)} kr)
- Auto-aksepter bud over: ${context.settings.autoAcceptThreshold || context.listing.price * 0.9} kr
- Eskalér komplekse situasjoner til selger

FORHANDLINGSSTRATEGI:
- Analyser kjøperens stil (høflig, aggressiv, lavballer, seriøs)
- Start motbud ca 10-15% over den interne minsteprisen for å gi rom for forhandling
- Bruk naturlig forhandlingsspråk: "jeg kan gå ned til X kr" i stedet for "minsteprisen er X kr"
- Vær tydelig på produktets verdi og tilstand
- Møt seriøse kjøpere i midten, vær fast med lavballere
- Aldri tilby høyere pris enn det du nettopp sa var lavest mulig

FORHANDLINGSEKSEMPLER:
- Lavt bud: "Takk for budet! Det er dessverre litt lavt. Jeg kan gå ned til [pris over minstepris] kr - det er så lavt jeg kan gå."
- Rimelig bud: "Det er et greit bud! La meg tenke på det..."
- Godt bud: "Det høres bra ut! Vi har en deal."

VIKTIG: Svar BARE som selger. ALDRI inkluder din analyse, tanker eller resonementer. Kun det direkte svaret til kjøperen.` :

      `You are a polite and professional sales assistant for Norwegian marketplaces like FINN.no and Facebook Marketplace.

LISTING INFO:
- Title: ${context.listing.title}
- Listed price: ${context.listing.price} kr
- Condition: ${context.listing.condition}
- Category: ${context.listing.category}
- Location: ${context.listing.location || 'Oslo'}

SALES RULES:
- Always respond in English since the buyer is speaking English
- Be polite, helpful, and professional  
- Protect seller's interests while being open to negotiation
- NEVER reveal the actual minimum price (${context.listing.minPrice || Math.round(context.listing.price * 0.8)} kr)
- Auto-accept offers above: ${context.settings.autoAcceptThreshold || context.listing.price * 0.9} kr
- Escalate complex situations to seller

NEGOTIATION STRATEGY:
- Analyze buyer's style (polite, aggressive, lowballer, serious)
- Start counter-offers about 10-15% above the internal minimum price to allow negotiation room
- Use natural negotiation language: "I can go down to X kr" instead of "minimum price is X kr"
- Focus on value and product condition
- Meet serious buyers in the middle, be firm with lowballers
- Never offer a higher price than what you just said was the lowest possible

NEGOTIATION EXAMPLES:
- Low offer: "Thanks for the offer! That's a bit low. I can go down to [price above minimum] kr - that's as low as I can go."
- Fair offer: "That's a reasonable offer! Let me think about it..."
- Good offer: "That sounds good! We have a deal."

IMPORTANT: Respond ONLY as the seller. NEVER include your analysis, thoughts, or reasoning. Only the direct response to the buyer.`;

    const userPrompt = detectedLanguage === 'no' ?
      `Samtalehistorikk:
${conversationHistory}

Ny melding fra kjøper: "${newMessage}"

Svar direkte på kjøperens melding. Hvis det er et bud, vurder det mot minsteprisen. Vær naturlig og hjelpsom. IKKE inkluder din analyse eller tanker - kun svaret til kjøperen.` :

      `Conversation history:
${conversationHistory}

New message from buyer: "${newMessage}"

Respond directly to the buyer's message. If it's an offer, evaluate it against the minimum price. Be natural and helpful. DO NOT include your analysis or thoughts - only the response to the buyer.`;

    // Use AI to generate the response
    const result = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    console.log('🤖 [Chat Agent] AI response generated:', result.text.substring(0, 100) + '...');

    // Analyze the generated response to determine action type
    const responseText = result.text.trim();
    let action: ChatResponse['action'] = 'respond';
    let shouldNotifySeller = false;
    let offerAmount: number | undefined;
    let escalationReason: string | undefined;

    // Extract offer amounts from response if any
    const offerMatch = responseText.match(/(\d+)\s*(kr|kroner)/i);
    if (offerMatch) {
      offerAmount = parseInt(offerMatch[1]);
    }

    // Determine action based on response content
    const lowerResponse = responseText.toLowerCase();
    if (lowerResponse.includes('deal') || lowerResponse.includes('avtale') || lowerResponse.includes('kjøp')) {
      action = 'accept_offer';
      shouldNotifySeller = true;
    } else if (offerAmount && offerAmount > 0) {
      action = 'counter_offer';
    } else if (lowerResponse.includes('selger') || lowerResponse.includes('seller') || lowerResponse.includes('må tenke')) {
      action = 'escalate';
      shouldNotifySeller = true;
      escalationReason = 'AI suggested escalation to seller';
    }

    const response: ChatResponse = {
      reply: responseText,
      action,
      confidence: 0.85,
      shouldNotifySeller,
      offerAmount,
      escalationReason,
    };

    console.log('✅ [Chat Agent] Response prepared:', { action, shouldNotifySeller, offerAmount });

    return response;

  } catch (error) {
    console.error('💥 [Chat Agent] Error:', error);
    const errorMessage = detectLanguage(newMessage) === 'no' ? 
      'Beklager, jeg kunne ikke behandle meldingen din akkurat nå. Selger vil kontakte deg direkte.' :
      'Sorry, I couldn\'t process your message right now. The seller will contact you directly.';
      
    return {
      reply: errorMessage,
      action: 'escalate',
      confidence: 0.1,
      shouldNotifySeller: true,
      escalationReason: `Technical error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper function to create escalation notification for seller
export function createSellerNotification(
  context: ChatContext,
  response: ChatResponse,
  originalMessage: string
): {
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  actions: Array<{ label: string; action: string; }>;
} {
  const urgency = response.escalationReason?.includes('svindel') ? 'high' :
                  response.offerAmount ? 'medium' : 'low';

  return {
    title: `Ny melding om: ${context.listing.title}`,
    message: `Kjøper: "${originalMessage}"
Agent-svar: "${response.reply}"
Grunn for eskalering: ${response.escalationReason}`,
    urgency,
    actions: [
      { label: 'Se full samtale', action: 'view_conversation' },
      { label: 'Overta chat', action: 'take_over_chat' },
      ...(response.offerAmount ? [
        { label: `Aksepter ${response.offerAmount} kr`, action: 'accept_offer' },
        { label: 'Send motbud', action: 'counter_offer' }
      ] : [])
    ]
  };
}