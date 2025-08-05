"use client";

import React from "react";
import { Settings, Sparkles, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  type SupportedLanguage, 
  getSupportedLanguagesList 
} from "@/lib/config/languages";

interface AgentHeaderProps {
  // Settings dialog state
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  // Configuration values
  userPreference: "quick_sale" | "market_price" | "maximize_profit";
  setUserPreference: (
    pref: "quick_sale" | "market_price" | "maximize_profit"
  ) => void;
  targetPlatforms: string[];
  setTargetPlatforms: (platforms: string[]) => void;
  hints: string;
  setHints: (hints: string) => void;
  autoPublish: boolean;
  setAutoPublish: (auto: boolean) => void;
  
  // Language preference
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
}

export default function AgentHeader({
  showSettings,
  setShowSettings,
  userPreference,
  setUserPreference,
  targetPlatforms,
  setTargetPlatforms,
  hints,
  setHints,
  autoPublish,
  setAutoPublish,
  selectedLanguage,
  onLanguageChange,
}: AgentHeaderProps) {
  const supportedLanguages = getSupportedLanguagesList();
  return (
    <div className="bg-white border-b border-slate-200 transition-all duration-300">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center transform transition-all duration-300 hover:scale-105 hover:rotate-3">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="transform transition-all duration-300 hover:translate-x-1">
              <h1 className="text-xl font-semibold text-slate-900">
                Autosell
              </h1>
              <p className="text-sm text-slate-600">
                AI-powered marketplace automation for Facebook, FINN.no & Amazon
              </p>
            </div>
          </div>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-slate-600 border-slate-300 bg-transparent transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-slate-400"
              >
                <Settings className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:rotate-90" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  Configuration
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Customize the agent&apos;s behavior for your selling strategy
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  <Label className="text-slate-700 flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Language
                  </Label>
                  <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-slate-500">
                    AI-generated content will be created in the selected language
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700">Selling Strategy</Label>
                  <RadioGroup
                    value={userPreference}
                    onValueChange={(
                      value: "quick_sale" | "market_price" | "maximize_profit"
                    ) => setUserPreference(value)}
                  >
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <RadioGroupItem value="quick_sale" id="quick_sale" />
                      <Label
                        htmlFor="quick_sale"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Quick sale (lower price)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <RadioGroupItem value="market_price" id="market_price" />
                      <Label
                        htmlFor="market_price"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Market price (balanced)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <RadioGroupItem
                        value="maximize_profit"
                        id="maximize_profit"
                      />
                      <Label
                        htmlFor="maximize_profit"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Maximize profit (higher price)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700">Target Platforms</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <Checkbox
                        id="finn"
                        checked={targetPlatforms.includes("finn")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTargetPlatforms([...targetPlatforms, "finn"]);
                          } else {
                            setTargetPlatforms(
                              targetPlatforms.filter((p) => p !== "finn")
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor="finn"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        FINN.no
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <Checkbox
                        id="facebook"
                        checked={targetPlatforms.includes("facebook")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTargetPlatforms([
                              ...targetPlatforms,
                              "facebook",
                            ]);
                          } else {
                            setTargetPlatforms(
                              targetPlatforms.filter((p) => p !== "facebook")
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor="facebook"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Facebook Marketplace
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                      <Checkbox
                        id="amazon"
                        checked={targetPlatforms.includes("amazon")}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTargetPlatforms([...targetPlatforms, "amazon"]);
                          } else {
                            setTargetPlatforms(
                              targetPlatforms.filter((p) => p !== "amazon")
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor="amazon"
                        className="text-sm text-slate-600 cursor-pointer"
                      >
                        Amazon
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="hints" className="text-slate-700">
                    Additional Information (Optional)
                  </Label>
                  <Textarea
                    id="hints"
                    placeholder="Brand, model, condition, desired price, or other details..."
                    value={hints}
                    onChange={(e) => setHints(e.target.value)}
                    rows={3}
                    className="text-slate-600 transition-all duration-200 focus:scale-[1.02] focus:shadow-md"
                  />
                </div>

                <div className="flex items-center space-x-2 p-2 rounded-lg transition-colors duration-150 hover:bg-slate-50">
                  <Checkbox
                    id="auto-publish"
                    checked={autoPublish}
                    onCheckedChange={(checked) =>
                      setAutoPublish(Boolean(checked))
                    }
                  />
                  <Label
                    htmlFor="auto-publish"
                    className="text-sm text-slate-600 cursor-pointer"
                  >
                    Auto-publish (otherwise wait for confirmation)
                  </Label>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
