"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Send,
  DollarSign,
  Sparkles,
  Settings,
  RefreshCw,
  User,
  Bot,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DemoListing {
  title: string;
  price: number;
  minPrice: number;
  description: string;
  condition: string;
  category: string;
  location: string;
}

interface ChatSettings {
  maxDiscount: number;
  autoAcceptThreshold: number;
  quickResponses: boolean;
}

const defaultListing: DemoListing = {
  title: "iPhone 13 Pro 128GB Space Gray",
  price: 8500,
  minPrice: 7000,
  description:
    "Pen iPhone 13 Pro i god stand. Har vært i deksel siden kjøp. Følger med original ladekabel og eske.",
  condition: "used_good",
  category: "Elektronikk",
  location: "Oslo",
};

const defaultSettings: ChatSettings = {
  maxDiscount: 15,
  autoAcceptThreshold: 7500,
  quickResponses: true,
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [listing, setListing] = useState<DemoListing>(defaultListing);
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [isLiveListing, setIsLiveListing] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [showAIButton, setShowAIButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: Date;
    }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Parse listing data from URL parameters on page load
  useEffect(() => {
    const listingParam = searchParams.get("listing");
    if (listingParam) {
      try {
        const listingData = JSON.parse(decodeURIComponent(listingParam));
        console.log("📋 [Chat] Raw listing data:", listingData);
        
        // Extract data from nested structure
        const analysis = listingData.analysis;
        const draft = listingData.draft;
        
        // Use optimized draft data when available, fallback to analysis
        const title = draft?.title || analysis?.title || defaultListing.title;
        const description = draft?.description || analysis?.description || defaultListing.description;
        const price = listingData.price || draft?.price || analysis?.pricing?.suggested_price_nok || defaultListing.price;
        
        // Map condition from analysis attributes
        const condition = analysis?.attributes?.condition || defaultListing.condition;
        const category = analysis?.category?.primary || defaultListing.category;
        
        setListing({
          title,
          price,
          minPrice: listingData.minPrice || Math.round(price * 0.8),
          description,
          condition,
          category,
          location: listingData.location || defaultListing.location,
        });
        setIsLiveListing(true);
        console.log("📋 [Chat] Loaded live listing:", {
          title,
          price,
          condition,
          category,
          brand: analysis?.attributes?.brand,
          model: analysis?.attributes?.model
        });
      } catch (error) {
        console.error("📋 [Chat] Failed to parse listing data:", error);
        console.error("📋 [Chat] URL param content:", listingParam);
        // Fall back to default demo mode
      }
    }
  }, [searchParams]);

  // Generate realistic buyer opening message
  const generateBuyerMessage = (listing: DemoListing): string => {
    const lowOffer = Math.round(listing.price * (0.7 + Math.random() * 0.15)); // 70-85% of asking price

    const messages = [
      `Hi! Is the ${
        listing.title
      } still available? Would you take ${lowOffer.toLocaleString()} kr?`,
      `Hello! Interested in the ${
        listing.title
      }. Can you do ${lowOffer.toLocaleString()} kr cash?`,
      `Hi! How quickly can I pick up the ${
        listing.title
      }? Offering ${lowOffer.toLocaleString()} kr.`,
      `Hey! The ${
        listing.title
      } looks great. ${lowOffer.toLocaleString()} kr and I'll pick up today?`,
    ];

    // Always use English messages
    const messageArray = messages;

    return messageArray[Math.floor(Math.random() * messageArray.length)];
  };

  // Auto-start chat when listing is loaded
  useEffect(() => {
    // Wait a bit to ensure URL params are fully processed
    const timer = setTimeout(() => {
      if (listing && !chatStarted) {
        const buyerMessage = generateBuyerMessage(listing);

        setMessages([
          {
            id: "1",
            role: "user",
            content: buyerMessage,
            createdAt: new Date(),
          },
        ]);

        setChatStarted(true);
        setShowAIButton(true); // Show AI response button

        console.log("💬 [Chat] Auto-generated buyer message:", buyerMessage);
      }
    }, 100); // Small delay to ensure URL data is loaded

    return () => clearTimeout(timer);
  }, [listing, chatStarted, isLiveListing]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate AI response using the enhanced chat agent
  const generateAIResponse = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const latestUserMessage = messages[messages.length - 1];
      if (latestUserMessage.role !== "user") return;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          chatContext: {
            listingId: "demo-listing",
            buyerId: "demo-buyer",
            platform: "finn",
            listing,
            conversation: [],
            settings,
          },
          simulationMode: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI response");
      }

      const aiResponse = await response.text();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: aiResponse,
          createdAt: new Date(),
        },
      ]);

      setShowAIButton(false); // Hide AI button after response
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user sending a new message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setShowAIButton(true); // Show AI button after user message
  };

  const resetChat = () => {
    setChatStarted(false);
    setMessages([]);
    setShowAIButton(false);
    // Regenerate buyer message
    if (listing) {
      const buyerMessage = generateBuyerMessage(listing);
      setMessages([
        {
          id: "1",
          role: "user",
          content: buyerMessage,
          createdAt: new Date(),
        },
      ]);
      setChatStarted(true);
      setShowAIButton(true);
    }
  };

  const extractOfferFromMessage = (message: string): number | null => {
    // Extract Norwegian and English price patterns with support for thousand separators
    const patterns = [
      /(\d{1,3}(?:[.,]\d{3})*)\s*(kr|kroner|nok)/gi,
      /kan jeg få.*?(\d{1,3}(?:[.,]\d{3})*)/gi,
      /(\d{1,3}(?:[.,]\d{3})*)\s*er (mitt|vårt) (bud|tilbud)/gi,
      /take (\d{1,3}(?:[.,]\d{3})*)/gi,
      /(\d{1,3}(?:[.,]\d{3})*)\s*(dollars?|usd)/gi,
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(message);
      if (match) {
        // Remove thousand separators (commas and periods) before parsing
        const cleanNumber = match[1].replace(/[.,]/g, '');
        return parseInt(cleanNumber);
      }
    }
    return null;
  };

  const detectMessageLanguage = (message: string): "en" | "no" => {
    const englishWords =
      /\b(hello|hi|hey|buy|price|offer|deal|thanks|available|can|you|take|cash|pickup)\b/i;
    const norwegianWords =
      /\b(hei|hallo|kjøpe|pris|bud|takk|tilgjengelig|kr|kroner|kan|du|ta|kontanter|hente)\b/i;

    const englishMatches = (message.match(englishWords) || []).length;
    const norwegianMatches = (message.match(norwegianWords) || []).length;

    return norwegianMatches > englishMatches ? "no" : "en";
  };

  const getMessageIcon = (role: string) => {
    return role === "user" ? User : Bot;
  };

  const getOfferStatus = (offer: number) => {
    if (offer >= listing.price)
      return { status: "full", color: "text-green-600" };
    if (offer >= settings.autoAcceptThreshold)
      return { status: "excellent", color: "text-green-500" };
    if (offer >= listing.minPrice)
      return { status: "acceptable", color: "text-yellow-500" };
    return { status: "low", color: "text-red-500" };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:rotate-3">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="transform transition-all duration-300 hover:translate-x-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-slate-900">
                    AI Negotiation Agent
                  </h1>
                  {isLiveListing && (
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 border-green-200 animate-pulse"
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Live Demo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {isLiveListing
                    ? "Demonstrating negotiation with your published listing"
                    : "Intelligent buyer negotiation with AI agent"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-300 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900">
                      Listing & Agent Settings
                    </DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Customize the listing and agent&apos;s negotiation strategy
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                      <Label className="text-slate-700">Listing</Label>
                      <div className="space-y-2">
                        <Input
                          placeholder="Title"
                          value={listing.title}
                          onChange={(e) =>
                            setListing((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Price (kr)"
                            value={listing.price}
                            onChange={(e) =>
                              setListing((prev) => ({
                                ...prev,
                                price: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Minimum price (kr)"
                            value={listing.minPrice}
                            onChange={(e) =>
                              setListing((prev) => ({
                                ...prev,
                                minPrice: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-slate-700">
                        Agent Settings
                      </Label>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs text-slate-500">
                            Max discount (%)
                          </Label>
                          <Input
                            type="number"
                            value={settings.maxDiscount}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                maxDiscount: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">
                            Auto-accept above (kr)
                          </Label>
                          <Input
                            type="number"
                            value={settings.autoAcceptThreshold}
                            onChange={(e) =>
                              setSettings((prev) => ({
                                ...prev,
                                autoAcceptThreshold:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {chatStarted && (
                <Button
                  onClick={resetChat}
                  variant="outline"
                  size="sm"
                  className="text-slate-600 border-slate-300 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New chat
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {isLiveListing && (
          <Alert className="mb-6 border-green-200 bg-green-50 animate-in slide-in-from-top-2 duration-300">
            <Sparkles className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Live Demo:</strong> This is a demonstration of how the
              AI agent would negotiate with your actual published listing.
              The agent uses the real details from your listing for authentic
              negotiation scenarios.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-200 bg-red-50 animate-in slide-in-from-top-2 duration-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Horizontal Layout: Listing Preview + Buyer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Listing Preview Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 py-3">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <DollarSign className="h-4 w-4 text-slate-600" />
                {isLiveListing
                  ? "Your Published Listing"
                  : "Listing Being Negotiated"}
                {isLiveListing && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs border-green-300 text-green-700"
                  >
                    From Agent
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {listing.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {listing.description}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 text-xs"
                    >
                      {listing.condition === "used_good"
                        ? "Brukt"
                        : listing.condition}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-slate-600 text-xs"
                    >
                      {listing.location}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900">
                      {listing.price.toLocaleString()} kr
                    </div>
                    <div className="text-xs text-slate-500">
                      Min: {listing.minPrice.toLocaleString()} kr
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buyer Info Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 py-3">
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base">
                <User className="h-4 w-4 text-slate-600" />
                Interested Buyer
                {isLiveListing && (
                  <Badge
                    variant="secondary"
                    className="ml-2 text-xs bg-blue-100 text-blue-700"
                  >
                    Live Demo
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Potential Buyer</p>
                    <p className="text-sm text-slate-500">
                      {isLiveListing
                        ? "Negotiating for your listing"
                        : "Wants to buy the item"}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-sm text-slate-600">
                    Chat simulation shows how the AI agent handles buyer inquiries
                    professionally and efficiently.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {chatStarted && (
          /* Chat Interface */
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Chat Messages */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <ScrollArea className="h-96 p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const Icon = getMessageIcon(message.role);
                      const isUser = message.role === "user";
                      const offer = extractOfferFromMessage(message.content);
                      const offerStatus = offer ? getOfferStatus(offer) : null;
                      const messageLanguage = detectMessageLanguage(
                        message.content
                      );

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
                            isUser ? "justify-end" : "justify-start"
                          }`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div
                            className={`flex gap-3 max-w-[80%] ${
                              isUser ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                isUser ? "bg-slate-900" : "bg-slate-100"
                              }`}
                            >
                              <Icon
                                className={`h-4 w-4 ${
                                  isUser ? "text-white" : "text-slate-600"
                                }`}
                              />
                            </div>
                            <div
                              className={`p-3 rounded-lg relative ${
                                isUser
                                  ? "bg-slate-900 text-white"
                                  : "bg-slate-100 text-slate-900"
                              }`}
                            >
                              {/* Language indicator */}
                              <div className="absolute -top-1 -right-1">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs h-5 px-1 ${
                                    messageLanguage === "en"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {messageLanguage === "en" ? "🇬🇧" : "🇳🇴"}
                                </Badge>
                              </div>

                              <p className="text-sm leading-relaxed">
                                {message.content}
                              </p>
                              {offer && (
                                <div className="mt-2 pt-2 border-t border-slate-200/20">
                                  <div
                                    className={`flex items-center gap-2 text-xs ${offerStatus?.color}`}
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    <span className="font-medium">
                                      Offer: {offer.toLocaleString()} kr
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {offerStatus?.status === "full" &&
                                        "Full price"}
                                      {offerStatus?.status === "excellent" &&
                                        "Excellent"}
                                      {offerStatus?.status === "acceptable" &&
                                        "Acceptable"}
                                      {offerStatus?.status === "low" && "Low"}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex gap-3 justify-start animate-in slide-in-from-bottom-2 duration-300">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="bg-slate-100 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-slate-600">
                            <div className="flex space-x-1">
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                            <span className="text-xs">Agent is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* AI Response Button */}
            {showAIButton && !isLoading && (
              <Card className="border-slate-200 shadow-sm border-dashed animate-in slide-in-from-bottom-2 duration-300">
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-slate-600">
                      A buyer has sent you a message. Let the AI agent respond
                      for you:
                    </p>
                    <Button
                      onClick={generateAIResponse}
                      disabled={isLoading}
                      size="lg"
                      className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Let AI Respond for You
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Input */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <form onSubmit={handleSendMessage} className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Write your next offer or question..."
                      disabled={isLoading}
                      className="flex-1 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !input || !input.trim()}
                      className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Best results with clear messages</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Agent typically responds within 2-3 seconds</span>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
