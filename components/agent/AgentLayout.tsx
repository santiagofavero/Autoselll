"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Removed unused import: StepIndicator

type WorkflowStep =
  | "upload"
  | "analysis"
  | "platform-selection"
  | "draft"
  | "review"
  | "publishing";

interface AgentLayoutProps {
  children: React.ReactNode;
  currentStep: WorkflowStep;
  error: string | null;
}

const steps = [
  {
    id: "upload",
    title: "Upload",
    shortTitle: "Upload",
    description: "Add product photo",
  },
  {
    id: "analysis",
    title: "Analyze",
    shortTitle: "Analyze",
    description: "AI analysis",
  },
  {
    id: "platform-selection",
    title: "Platforms & Pricing",
    shortTitle: "Platforms",
    description: "Choose platforms ",
  },
  {
    id: "draft",
    title: "Generate",
    shortTitle: "Generate",
    description: "Create listing",
  },
  {
    id: "review",
    title: "Review",
    shortTitle: "Review",
    description: "Final review",
  },
  {
    id: "publishing",
    title: "Publish",
    shortTitle: "Publish",
    description: "Go live",
  },
] as const;

export default function AgentLayout({
  children,
  currentStep,
  error,
}: AgentLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {/* Linear-style Progress Stepper */}
        <div className="relative mb-16 md:mb-24 animate-in fade-in-0 slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between relative px-2 sm:px-4">
            {/* Progress Line */}
            <div className="absolute top-6 left-8 right-8 sm:left-12 sm:right-12 h-0.5 bg-slate-200">
              <div
                className="h-full bg-slate-900 transition-all duration-1000 ease-out"
                style={{
                  width: `${
                    (steps.findIndex((step) => step.id === currentStep) /
                      (steps.length - 1)) *
                    100
                  }%`,
                }}
              />
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted =
                steps.findIndex((s) => s.id === currentStep) > index;
              // Removed unused variable: isPending

              return (
                <div
                  key={step.id}
                  className="relative flex flex-col items-center group"
                >
                  <div className="relative z-10">
                    {/* Step Circle */}
                    <div
                      className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-sm font-semibold transition-all duration-500 ${
                        isActive
                          ? "border-slate-900 bg-slate-900 text-white scale-110 shadow-lg"
                          : isCompleted
                          ? "border-slate-900 bg-slate-900 text-white hover:scale-105"
                          : "border-slate-300 bg-white text-slate-400 group-hover:border-slate-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                      {/* Active pulse effect */}
                      {isActive && (
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-slate-300 animate-ping" />
                      )}
                    </div>
                    {/* Step Label */}
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 text-center w-16 sm:w-20 md:w-24">
                      <div
                        className={`text-xs sm:text-sm font-medium transition-colors duration-300 leading-tight ${
                          isActive
                            ? "text-slate-900"
                            : isCompleted
                            ? "text-slate-700"
                            : "text-slate-500"
                        }`}
                      >
                        <span className="block sm:hidden">
                          {step.shortTitle}
                        </span>
                        <span className="hidden sm:block">{step.title}</span>
                      </div>
                      <div
                        className={`text-xs mt-1 transition-colors duration-300 leading-tight hidden md:block ${
                          isActive ? "text-slate-600" : "text-slate-400"
                        }`}
                      >
                        {step.description}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
