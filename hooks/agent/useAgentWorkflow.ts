/**
 * Agent Workflow Hook
 * Manages the state and flow of the marketplace agent workflow
 */

"use client";

import { useState, useCallback } from "react";

export type WorkflowStep =
  | "upload"
  | "analysis"
  | "platform-selection"
  | "draft"
  | "review"
  | "publishing";

export interface AgentStep {
  tool: string;
  result: unknown;
  summary: string;
}

export interface AgentResult {
  success: boolean;
  phase:
    | "analysis"
    | "pricing"
    | "optimization"
    | "publishing"
    | "completed"
    | "error";
  summary: string;
  needsUserInput?: boolean;
  nextAction?: string;
  data: {
    workflowText: string;
    steps: AgentStep[];
    fullResult?: unknown;
  };
  timestamp: string;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  isLoading: boolean;
  error: string | null;
  agentResult: AgentResult | null;
  userPreference: "quick_sale" | "market_price" | "maximize_profit";
  selectedPlatforms: string[];
  autoPublish: boolean;
}

const initialState: WorkflowState = {
  currentStep: "upload",
  completedSteps: [],
  isLoading: false,
  error: null,
  agentResult: null,
  userPreference: "market_price",
  selectedPlatforms: ["finn", "facebook"],
  autoPublish: false,
};

export function useAgentWorkflow() {
  const [state, setState] = useState<WorkflowState>(initialState);

  const setCurrentStep = useCallback((step: WorkflowStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const addCompletedStep = useCallback((step: WorkflowStep) => {
    setState((prev) => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter((s) => s !== step), step],
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setAgentResult = useCallback((result: AgentResult | null) => {
    setState((prev) => ({ ...prev, agentResult: result }));
  }, []);

  const setUserPreference = useCallback(
    (preference: "quick_sale" | "market_price" | "maximize_profit") => {
      setState((prev) => ({ ...prev, userPreference: preference }));
    },
    []
  );

  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    setState((prev) => ({ ...prev, selectedPlatforms: platforms }));
  }, []);

  const setAutoPublish = useCallback((autoPublish: boolean) => {
    setState((prev) => ({ ...prev, autoPublish }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const canProceedToNextStep = useCallback(() => {
    switch (state.currentStep) {
      case "upload":
        return state.completedSteps.includes("upload");
      case "analysis":
        return state.completedSteps.includes("analysis");
      case "platform-selection":
        return state.completedSteps.includes("platform-selection");
      case "draft":
        return state.completedSteps.includes("draft");
      case "review":
        return state.completedSteps.includes("review");
      case "publishing":
        return state.completedSteps.includes("publishing");
      default:
        return false;
    }
  }, [state.currentStep, state.completedSteps]);

  const getNextStep = useCallback(
    (currentStep: WorkflowStep): WorkflowStep | null => {
      const stepOrder: WorkflowStep[] = [
        "upload",
        "analysis",
        "platform-selection",
        "draft",
        "review",
        "publishing",
      ];
      const currentIndex = stepOrder.indexOf(currentStep);
      return currentIndex < stepOrder.length - 1
        ? stepOrder[currentIndex + 1]
        : null;
    },
    []
  );

  const proceedToNextStep = useCallback(() => {
    const nextStep = getNextStep(state.currentStep);
    if (nextStep && canProceedToNextStep()) {
      setCurrentStep(nextStep);
    }
  }, [state.currentStep, canProceedToNextStep, getNextStep, setCurrentStep]);

  const goToPreviousStep = useCallback(() => {
    const stepOrder: WorkflowStep[] = [
      "upload",
      "analysis",
      "platform-selection",
      "draft",
      "review",
      "publishing",
    ];
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  }, [state.currentStep, setCurrentStep]);

  const isStepCompleted = useCallback(
    (step: WorkflowStep) => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps]
  );

  const isStepCurrent = useCallback(
    (step: WorkflowStep) => {
      return state.currentStep === step;
    },
    [state.currentStep]
  );

  const getStepStatus = useCallback(
    (step: WorkflowStep) => {
      if (isStepCompleted(step)) return "completed";
      if (isStepCurrent(step)) return "current";
      return "pending";
    },
    [isStepCompleted, isStepCurrent]
  );

  // Helper to parse agent result and update workflow state
  const handleAgentResult = useCallback(
    (result: AgentResult) => {
      setAgentResult(result);
      setError(null);

      // Update workflow state based on agent result
      switch (result.phase) {
        case "analysis":
          addCompletedStep("analysis");
          if (result.success) {
            setCurrentStep("platform-selection");
          }
          break;
        case "pricing":
          // Pricing is part of platform selection
          break;
        case "optimization":
          addCompletedStep("platform-selection");
          addCompletedStep("draft");
          if (result.success) {
            setCurrentStep("review");
          }
          break;
        case "publishing":
          addCompletedStep("review");
          if (result.success) {
            setCurrentStep("publishing");
          }
          break;
        case "completed":
          addCompletedStep("publishing");
          break;
        case "error":
          setError(result.summary);
          break;
      }
    },
    [setAgentResult, setError, addCompletedStep, setCurrentStep]
  );

  return {
    // State
    ...state,

    // Actions
    setCurrentStep,
    addCompletedStep,
    setLoading,
    setError,
    setAgentResult,
    setUserPreference,
    setSelectedPlatforms,
    setAutoPublish,
    reset,

    // Navigation
    proceedToNextStep,
    goToPreviousStep,
    canProceedToNextStep,
    getNextStep,

    // Status helpers
    isStepCompleted,
    isStepCurrent,
    getStepStatus,

    // Agent result handler
    handleAgentResult,
  };
}
