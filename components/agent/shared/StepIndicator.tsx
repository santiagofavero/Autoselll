/**
 * Step Indicator Component
 * Visual progress indicator for the agent workflow
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface WorkflowStep {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
}

interface StepIndicatorProps {
  steps: WorkflowStep[];
  currentStep: string;
  completedSteps: string[];
  className?: string;
}

export function StepIndicator({ steps, currentStep, completedSteps, className = "" }: StepIndicatorProps) {
  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  const getStepClasses = (status: 'completed' | 'current' | 'pending') => {
    const baseClasses = "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200";
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 border-green-500 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-500 border-blue-500 text-white animate-pulse`;
      case 'pending':
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-400`;
      default:
        return baseClasses;
    }
  };

  const getConnectorClasses = (index: number) => {
    const isCompleted = completedSteps.includes(steps[index].id);
    const isNext = steps[index + 1]?.id === currentStep;
    
    if (isCompleted || isNext) {
      return "h-0.5 bg-blue-500 transition-all duration-300";
    }
    return "h-0.5 bg-gray-300";
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={getStepClasses(status)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${
                    status === 'current' ? 'text-blue-600' : 
                    status === 'completed' ? 'text-green-600' : 
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={getConnectorClasses(index)} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default StepIndicator;