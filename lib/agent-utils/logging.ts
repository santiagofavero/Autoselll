/**
 * Standardized logging utility for AI Marketplace Agent
 * Provides consistent logging patterns with emoji indicators
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  success(message: string, context?: LogContext): void;
  step(step: string, message: string, context?: LogContext): void;
  workflow(phase: string, message: string, context?: LogContext): void;
  timing(operation: string, startTime: number, context?: LogContext): void;
  starting(operation: string, context?: LogContext): void;
  completed(operation: string, context?: LogContext): void;
  failed(operation: string, error: Error | string, context?: LogContext): void;
}

const LOG_EMOJIS = {
  info: '📋',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
  success: '✅',
  step: '📋',
  workflow: '🚀',
  // Specialized emojis for different components
  image: '🖼️',
  vision: '🧠',
  compress: '🗜️',
  upload: '📁',
  api: '📄',
  config: '⚙️',
  timing: '⏱️',
  crash: '💥',
  auth: '🔑',
  rate: '⏰',
  amazon: '🛒',
  finn: '📊',
  facebook: '📘',
  analysis: '🔍',
  pricing: '💰',
  platform: '🎯',
  publish: '🚀',
  marketplace: '🏪'
} as const;

export type EmojiType = keyof typeof LOG_EMOJIS;

class AgentLogger implements Logger {
  private component: string;
  private isDevelopment: boolean;

  constructor(component: string) {
    this.component = component;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(level: LogLevel, emoji: string, message: string, context?: LogContext): void {
    const prefix = `${emoji} [${this.component}]`;
    
    if (context && Object.keys(context).length > 0) {
      console.log(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`);
    }

    // In production, you might want to send logs to a service
    if (!this.isDevelopment && level === 'error') {
      // TODO: Send to error tracking service
    }
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', LOG_EMOJIS.info, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', LOG_EMOJIS.warn, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', LOG_EMOJIS.error, message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.formatMessage('debug', LOG_EMOJIS.debug, message, context);
    }
  }

  success(message: string, context?: LogContext): void {
    this.formatMessage('success', LOG_EMOJIS.success, message, context);
  }

  step(step: string, message: string, context?: LogContext): void {
    this.formatMessage('info', LOG_EMOJIS.step, `${step}: ${message}`, context);
  }

  workflow(phase: string, message: string, context?: LogContext): void {
    this.formatMessage('info', LOG_EMOJIS.workflow, `${phase} - ${message}`, context);
  }

  // Specialized logging methods for common patterns
  starting(operation: string, context?: LogContext): void {
    this.info(`Starting ${operation}`, context);
  }

  completed(operation: string, context?: LogContext): void {
    this.success(`${operation} completed`, context);
  }

  failed(operation: string, error: Error | string, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.error(`${operation} failed: ${errorMessage}`, {
      ...context,
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  timing(operation: string, startTime: number, context?: LogContext): void {
    const duration = Date.now() - startTime;
    this.info(`${operation} completed in ${duration}ms`, context);
  }
}

// Factory function to create loggers for different components
export function createLogger(component: string): Logger {
  return new AgentLogger(component);
}

// Specialized loggers for different parts of the system
export const loggers = {
  agent: createLogger('Agent'),
  api: createLogger('API'),
  image: createLogger('Image'),
  vision: createLogger('Vision'),
  marketplace: createLogger('Marketplace'),
  amazon: createLogger('Amazon'),
  finn: createLogger('FINN'),
  facebook: createLogger('Facebook'),
  workflow: createLogger('Workflow'),
  publisher: createLogger('Publisher'),
  analytics: createLogger('Analytics'),
  compression: createLogger('Compression'),
  upload: createLogger('Upload')
} as const;

// Convenience functions for one-off logging
export function logWithEmoji(emoji: EmojiType, component: string, message: string, context?: LogContext): void {
  const emojiSymbol = LOG_EMOJIS[emoji];
  const prefix = `${emojiSymbol} [${component}]`;
  
  if (context && Object.keys(context).length > 0) {
    console.log(`${prefix} ${message}`, context);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// Migration helpers for existing code patterns
export function migrateConsoleLog(originalLog: string): string {
  // Helper function to convert existing console.log patterns
  // This can be used in a script to help with migration
  
  const patterns = [
    { regex: /console\.log\('🖼️ \[([^\]]+)\] ([^']+)'/, replacement: "loggers.image.info('$2')" },
    { regex: /console\.log\('🧠 \[([^\]]+)\] ([^']+)'/, replacement: "loggers.vision.info('$2')" },
    { regex: /console\.log\('✅ \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.success('$2')" },
    { regex: /console\.log\('❌ \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.error('$2')" },
    { regex: /console\.log\('⚠️ \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.warn('$2')" },
    { regex: /console\.log\('🔍 \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.debug('$2')" },
    { regex: /console\.log\('📋 \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.step('$2')" },
    { regex: /console\.log\('🚀 \[([^\]]+)\] ([^']+)'/, replacement: "loggers.$1.workflow('$2')" }
  ];

  let result = originalLog;
  patterns.forEach(pattern => {
    result = result.replace(pattern.regex, pattern.replacement);
  });

  return result;
}

// Performance logging utility
export class PerformanceLogger {
  private startTimes: Map<string, number> = new Map();
  private logger: Logger;

  constructor(component: string) {
    this.logger = createLogger(component);
  }

  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
    this.logger.debug(`Started timing: ${operation}`);
  }

  end(operation: string, context?: LogContext): void {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.logger.timing(operation, startTime, { ...context, duration: `${duration}ms` });
      this.startTimes.delete(operation);
    } else {
      this.logger.warn(`No start time found for operation: ${operation}`);
    }
  }

  measure<T>(operation: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.start(operation);
      try {
        const result = await fn();
        this.end(operation, context);
        resolve(result);
      } catch (error) {
        this.end(operation, { ...context, error: error instanceof Error ? error.message : error });
        reject(error);
      }
    });
  }
}

export function createPerformanceLogger(component: string): PerformanceLogger {
  return new PerformanceLogger(component);
}