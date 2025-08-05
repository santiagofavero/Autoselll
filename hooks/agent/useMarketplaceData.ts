/**
 * Marketplace Data Hook
 * Manages API calls to the agent and marketplace data
 */

'use client';

import { useState, useCallback } from 'react';
import type { AgentResult } from './useAgentWorkflow';

export interface MarketplaceApiState {
  isLoading: boolean;
  error: string | null;
  lastRequest: any;
  lastResponse: AgentResult | null;
}

const initialState: MarketplaceApiState = {
  isLoading: false,
  error: null,
  lastRequest: null,
  lastResponse: null,
};

export function useMarketplaceData() {
  const [state, setState] = useState<MarketplaceApiState>(initialState);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Submit images to agent for analysis
  const submitToAgent = useCallback(async (
    imageUrl: string,
    options: {
      hints?: string;
      userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
      targetPlatforms?: string[];
      autoPublish?: boolean;
    } = {}
  ): Promise<AgentResult | null> => {
    setLoading(true);
    setError(null);

    const requestData = {
      imageUrl,
      hints: options.hints || '',
      userPreference: options.userPreference || 'market_price',
      targetPlatforms: options.targetPlatforms || ['finn', 'facebook'],
      autoPublish: options.autoPublish || false,
    };

    setState(prev => ({ ...prev, lastRequest: requestData }));

    try {
      const response = await fetch('/api/agent/create-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AgentResult = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        lastResponse: result,
        isLoading: false,
        error: null 
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit to agent';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        lastResponse: null,
      }));

      return null;
    }
  }, [setLoading, setError]);

  // Submit file directly (for form data)
  const submitFileToAgent = useCallback(async (
    file: File,
    options: {
      hints?: string;
      userPreference?: 'quick_sale' | 'market_price' | 'maximize_profit';
      targetPlatforms?: string[];
      autoPublish?: boolean;
    } = {}
  ): Promise<AgentResult | null> => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    
    if (options.hints) formData.append('hints', options.hints);
    if (options.userPreference) formData.append('userPreference', options.userPreference);
    if (options.targetPlatforms) formData.append('targetPlatforms', options.targetPlatforms.join(','));
    if (options.autoPublish !== undefined) formData.append('autoPublish', String(options.autoPublish));

    const requestData = { file: file.name, ...options };
    setState(prev => ({ ...prev, lastRequest: requestData }));

    try {
      const response = await fetch('/api/agent/create-listing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AgentResult = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        lastResponse: result,
        isLoading: false,
        error: null 
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit file to agent';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        lastResponse: null,
      }));

      return null;
    }
  }, [setLoading, setError]);

  // Get agent capabilities
  const getAgentCapabilities = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/create-listing?action=capabilities');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get agent capabilities:', error);
      return null;
    }
  }, []);

  // Analyze single image (quick analysis without full workflow)
  const analyzeImage = useCallback(async (imageUrl: string): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      setState(prev => ({ 
        ...prev,
        isLoading: false,
        error: null 
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [setLoading, setError]);

  // Retry last request
  const retryLastRequest = useCallback(async (): Promise<AgentResult | null> => {
    if (!state.lastRequest) {
      setError('No previous request to retry');
      return null;
    }

    if (state.lastRequest.file) {
      // This was a file upload, we can't retry without the file
      setError('Cannot retry file upload requests');
      return null;
    }

    return submitToAgent(state.lastRequest.imageUrl, {
      hints: state.lastRequest.hints,
      userPreference: state.lastRequest.userPreference,
      targetPlatforms: state.lastRequest.targetPlatforms,
      autoPublish: state.lastRequest.autoPublish,
    });
  }, [state.lastRequest, submitToAgent, setError]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Check if we can retry
  const canRetry = useCallback(() => {
    return state.lastRequest && !state.lastRequest.file && !state.isLoading;
  }, [state.lastRequest, state.isLoading]);

  // Get error details
  const getErrorDetails = useCallback(() => {
    if (!state.error) return null;

    // Parse common error patterns
    if (state.error.includes('rate limit')) {
      return {
        type: 'rate_limit',
        message: 'Too many requests. Please wait a moment before trying again.',
        canRetry: true,
        retryDelay: 5000,
      };
    }

    if (state.error.includes('API key')) {
      return {
        type: 'configuration',
        message: 'AI service configuration error. Please check your setup.',
        canRetry: false,
      };
    }

    if (state.error.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out. The image may be too complex or the service is busy.',
        canRetry: true,
        retryDelay: 1000,
      };
    }

    if (state.error.includes('File too large')) {
      return {
        type: 'file_size',
        message: 'Image file is too large. Please try with a smaller image.',
        canRetry: false,
      };
    }

    return {
      type: 'unknown',
      message: state.error,
      canRetry: true,
    };
  }, [state.error]);

  return {
    // State
    ...state,
    
    // Actions
    submitToAgent,
    submitFileToAgent,
    analyzeImage,
    getAgentCapabilities,
    retryLastRequest,
    reset,
    
    // Error handling
    setError,
    clearError,
    getErrorDetails,
    
    // Helpers
    canRetry,
  };
}