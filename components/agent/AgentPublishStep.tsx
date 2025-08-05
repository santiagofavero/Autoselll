"use client";

import React from "react";
import { Send, CheckCircle, MessageCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentPublishStepProps {
  isPublishing: boolean;
  targetPlatforms: string[];
  resetWorkflow: () => void;
  createChatUrl: () => string;
}

export default function AgentPublishStep({
  isPublishing,
  targetPlatforms,
  resetWorkflow,
  createChatUrl,
}: AgentPublishStepProps) {
  return (
    <Card className="border-slate-200 shadow-sm animate-in fade-in-0 zoom-in-95 duration-500">
      <CardContent className="py-16">
        <div className="text-center space-y-6">
          <div className="relative">
            <div
              className={`w-20 h-20 mx-auto bg-slate-900 rounded-full flex items-center justify-center transition-all duration-500 ${
                !isPublishing ? "animate-bounce" : "animate-pulse"
              }`}
            >
              {isPublishing ? (
                <Send className="h-10 w-10 text-white animate-pulse" />
              ) : (
                <CheckCircle className="h-10 w-10 text-white animate-in zoom-in-50 duration-500" />
              )}
            </div>
            {isPublishing && (
              <>
                <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-slate-200 rounded-full animate-ping" />
                <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-slate-400 rounded-full animate-spin" />
              </>
            )}
            {!isPublishing && (
              <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-green-200 rounded-full animate-ping" />
            )}
          </div>
          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-200">
            <h3 className="text-xl font-semibold text-slate-900">
              {isPublishing
                ? "Publishing your listing..."
                : "Successfully Published!"}
            </h3>
            <p className="text-slate-600">
              {isPublishing
                ? "Uploading to selected marketplaces..."
                : "Your listing is now live on the selected platforms"}
            </p>
          </div>
          {isPublishing && (
            <div className="w-full max-w-xs mx-auto animate-in slide-in-from-bottom-2 duration-300 delay-400">
              <Progress
                value={90}
                className="h-2 transition-all duration-1000"
              />
            </div>
          )}
          {!isPublishing && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500 delay-300">
              <div className="flex justify-center gap-2">
                {targetPlatforms.map((platform, index) => (
                  <Badge
                    key={platform}
                    variant="default"
                    className="bg-slate-100 text-slate-800 hover:scale-105 transition-all duration-200 animate-in zoom-in-50 duration-300"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {platform === "finn"
                      ? "FINN.no"
                      : platform === "facebook"
                      ? "Facebook"
                      : "Amazon"}{" "}
                    ✓
                  </Badge>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => window.open(createChatUrl(), "_blank")}
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 animate-in slide-in-from-bottom-2 duration-300 delay-400"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Try Chat Agent
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
                <Button
                  onClick={resetWorkflow}
                  variant="outline"
                  size="lg"
                  className="border-slate-300 text-slate-600 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95 animate-in slide-in-from-bottom-2 duration-300 delay-500"
                >
                  Create Another Listing
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
