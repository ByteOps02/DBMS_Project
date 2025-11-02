/**
 * Logger utility for consistent logging across the application
 * In production, logs can be disabled or sent to a logging service
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: import.meta.env.DEV, // Only enable in development by default
      level: 'log',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    
    const levels: LogLevel[] = ['debug', 'log', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatMessage(prefix: string, message: string): string {
    return `[${prefix}] ${message}`;
  }

  log(prefix: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('log')) {
      console.log(this.formatMessage(prefix, message), ...args);
    }
  }

  info(prefix: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(prefix, message), ...args);
    }
  }

  warn(prefix: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(prefix, message), ...args);
    }
  }

  error(prefix: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(prefix, message), ...args);
    }
  }

  debug(prefix: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(prefix, message), ...args);
    }
  }
}

// Create and export a singleton instance
export const logger = new Logger({
  enabled: import.meta.env.DEV, // Automatically disabled in production
  level: 'log',
});

// Export the Logger class for custom instances if needed
export default Logger;
