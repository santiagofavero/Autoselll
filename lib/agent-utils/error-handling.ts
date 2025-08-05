/**
 * Standardized error handling utilities for AI Marketplace Agent
 * Provides consistent error responses and handling patterns
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createLogger } from './logging';

const logger = createLogger('ErrorHandler');

// =================================
// ERROR TYPES
// =================================

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'MISSING_REQUIRED_FIELD'
  | 'API_KEY_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'NETWORK_ERROR'
  | 'PROCESSING_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'WORKFLOW_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: string;
  suggestion?: string;
  field?: string;
  statusCode: number;
}

export interface StandardErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: string;
  suggestion?: string;
  field?: string;
  timestamp: string;
  requestId?: string;
}

// =================================
// ERROR DEFINITIONS
// =================================

export const ERROR_DEFINITIONS: Record<ErrorCode, Omit<ErrorDetails, 'message'>> = {
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    statusCode: 400,
    suggestion: 'Please check your input and try again'
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    statusCode: 413,
    suggestion: 'Please upload a smaller file (max 10MB)'
  },
  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    statusCode: 400,
    suggestion: 'Please upload a valid image file (JPEG, PNG, WebP)'
  },
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    statusCode: 400,
    suggestion: 'Please provide all required fields'
  },
  API_KEY_ERROR: {
    code: 'API_KEY_ERROR',
    statusCode: 500,
    details: 'AI service configuration error',
    suggestion: 'Please check API configuration'
  },
  RATE_LIMIT_ERROR: {
    code: 'RATE_LIMIT_ERROR',
    statusCode: 429,
    details: 'Too many requests',
    suggestion: 'Please try again later'
  },
  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    statusCode: 408,
    details: 'Request timed out',
    suggestion: 'Please try again with a simpler request'
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    statusCode: 503,
    details: 'Network connectivity issue',
    suggestion: 'Please check your connection and try again'
  },
  PROCESSING_ERROR: {
    code: 'PROCESSING_ERROR',  
    statusCode: 500,
    details: 'Processing failed',
    suggestion: 'Please try again or contact support'
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    statusCode: 500,
    details: 'System configuration error',
    suggestion: 'Please contact support'
  },
  WORKFLOW_ERROR: {
    code: 'WORKFLOW_ERROR',
    statusCode: 500,
    details: 'Workflow execution failed',
    suggestion: 'Please try again with different parameters'
  },
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: 'An unexpected error occurred',
    suggestion: 'Please try again or contact support'
  }
};

// =================================
// ERROR CREATION UTILITIES
// =================================

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  options: {
    details?: string;
    suggestion?: string;
    field?: string;
    requestId?: string;
  } = {}
): StandardErrorResponse {
  const definition = ERROR_DEFINITIONS[code];
  
  return {
    success: false,
    error: message,
    code,
    details: options.details || definition.details,
    suggestion: options.suggestion || definition.suggestion,
    field: options.field,
    timestamp: new Date().toISOString(),
    requestId: options.requestId
  };
}

/**
 * Creates a NextResponse with standardized error
 */
export function createErrorNextResponse(
  code: ErrorCode,
  message: string,
  options: {
    details?: string;
    suggestion?: string;
    field?: string;
    requestId?: string;
  } = {}
): NextResponse {
  const definition = ERROR_DEFINITIONS[code];
  const errorResponse = createErrorResponse(code, message, options);
  
  // Log the error
  logger.error(`API Error: ${code}`, {
    message,
    statusCode: definition.statusCode,
    details: options.details,
    field: options.field,
    requestId: options.requestId
  });
  
  return NextResponse.json(errorResponse, { 
    status: definition.statusCode 
  });
}

// =================================
// SPECIFIC ERROR CREATORS
// =================================

export function createValidationError(
  field: string,
  message: string,
  requestId?: string
): NextResponse {
  return createErrorNextResponse(
    'VALIDATION_ERROR',
    `Validation failed for ${field}`,
    {
      details: message,
      field,
      requestId
    }
  );
}

export function createFileUploadError(
  type: 'size' | 'type' | 'missing',
  message: string,
  requestId?: string
): NextResponse {
  const codeMap = {
    size: 'FILE_TOO_LARGE' as ErrorCode,
    type: 'INVALID_FILE_TYPE' as ErrorCode,
    missing: 'MISSING_REQUIRED_FIELD' as ErrorCode
  };
  
  return createErrorNextResponse(codeMap[type], message, { requestId });
}

export function createProcessingError(
  operation: string,
  error: Error | string,
  requestId?: string
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return createErrorNextResponse(
    'PROCESSING_ERROR',
    `${operation} failed`,
    {
      details: errorMessage,
      requestId
    }
  );
}

// =================================
// ERROR DETECTION UTILITIES
// =================================

/**
 * Detects error type from error message/stack
 */
export function detectErrorType(error: Error | string): ErrorCode {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : '';
  
  // API key errors
  if (message.includes('API key') || message.includes('authentication')) {
    return 'API_KEY_ERROR';
  }
  
  // Rate limit errors
  if (message.includes('rate limit') || message.includes('quota')) {
    return 'RATE_LIMIT_ERROR';
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    return 'TIMEOUT_ERROR';
  }
  
  // Network errors
  if (message.includes('network') || message.includes('ENOTFOUND') || 
      message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
    return 'NETWORK_ERROR';
  }
  
  // Configuration errors
  if (message.includes('configuration') || message.includes('config')) {
    return 'CONFIGURATION_ERROR';
  }
  
  // Workflow errors
  if (message.includes('workflow') || message.includes('agent')) {
    return 'WORKFLOW_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Creates error response from caught error
 */
export function handleCaughtError(
  error: unknown,
  operation: string,
  requestId?: string
): NextResponse {
  if (error instanceof ZodError) {
    const field = error.errors[0]?.path.join('.') || 'unknown';
    const message = error.errors[0]?.message || 'Validation failed';
    
    return createValidationError(field, message, requestId);
  }
  
  if (error instanceof Error) {
    const errorType = detectErrorType(error);
    
    return createErrorNextResponse(
      errorType,
      `${operation} failed`,
      {
        details: error.message,
        requestId
      }
    );
  }
  
  // Unknown error type
  return createErrorNextResponse(
    'UNKNOWN_ERROR',
    `${operation} failed`,
    {
      details: String(error),
      requestId
    }
  );
}

// =================================
// REQUEST ID UTILITIES
// =================================

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extracts request ID from headers or generates new one
 */
export function getOrCreateRequestId(headers: Headers): string {
  return headers.get('x-request-id') || generateRequestId();
}

// =================================
// ERROR BOUNDARY UTILITIES
// =================================

/**
 * Wraps API route handler with error boundary
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  operation: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    const requestId = generateRequestId();
    
    try {
      logger.debug(`Starting ${operation}`, { requestId });
      const result = await handler(...args);
      logger.debug(`Completed ${operation}`, { requestId });
      return result;
    } catch (error) {
      logger.error(`${operation} failed`, { 
        error: error instanceof Error ? error.message : String(error),
        requestId 
      });
      
      return handleCaughtError(error, operation, requestId);
    }
  };
}

/**
 * Wraps async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  operation: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Safe async operation failed: ${operation}`, {
      error: error instanceof Error ? error.message : String(error)
    });
    return fallback;
  }
}

// =================================
// LOGGING INTEGRATION
// =================================

/**
 * Logs error with context
 */
export function logError(
  operation: string,
  error: Error | string,
  context: Record<string, unknown> = {}
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  
  logger.error(`${operation} failed: ${errorMessage}`, {
    ...context,
    stack
  });
}

/**
 * Logs warning with context
 */
export function logWarning(
  operation: string,
  message: string,
  context: Record<string, unknown> = {}
): void {
  logger.warn(`${operation}: ${message}`, context);
}

// =================================
// DEVELOPMENT HELPERS
// =================================

/**
 * Enhanced error details for development
 */
export function createDevelopmentError(
  error: Error,
  operation: string,
  requestId?: string
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return NextResponse.json({
      success: false,
      error: `${operation} failed`,
      code: detectErrorType(error),
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      requestId,
      development: true
    }, { status: 500 });
  }
  
  return handleCaughtError(error, operation, requestId);
}

// =================================
// MIGRATION HELPERS
// =================================

/**
 * Converts legacy error responses to new format
 */
export function migrateLegacyError(legacyResponse: {
  error: string;
  details?: string;
  status?: number;
}): StandardErrorResponse {
  return createErrorResponse(
    'UNKNOWN_ERROR',
    legacyResponse.error,
    {
      details: legacyResponse.details
    }
  );
}