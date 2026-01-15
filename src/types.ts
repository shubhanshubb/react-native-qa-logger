/**
 * Log level enumeration
 */
export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NETWORK = 'network',
}

/**
 * Log filter type for filtering logs in the UI
 */
export type LogFilter = 'all' | 'network' | 'errors';

/**
 * Base log entry structure
 */
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stackTrace?: string;
}

/**
 * Network-specific log entry with request/response details
 */
export interface NetworkLogEntry extends LogEntry {
  level: LogLevel.NETWORK;
  url: string;
  method: string;
  statusCode?: number;
  duration?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  error?: string;
}

/**
 * Configuration options for QA Logger
 */
export interface QALoggerConfig {
  maxLogs?: number;
  enableNetworkLogging?: boolean;
  enableErrorLogging?: boolean;
  sensitiveHeaders?: string[];
}

/**
 * Type guard to check if a log entry is a network log
 */
export function isNetworkLog(log: LogEntry): log is NetworkLogEntry {
  return log.level === LogLevel.NETWORK;
}

/**
 * Type guard to check if a log entry is an error log
 */
export function isErrorLog(log: LogEntry): boolean {
  return log.level === LogLevel.ERROR;
}
