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
  /** Response Content-Type, when available */
  contentType?: string;
  /** Approximate request body size in bytes */
  requestSize?: number;
  /** Approximate response body size in bytes */
  responseSize?: number;
}

/**
 * Minimal async key/value storage contract.
 *
 * Compatible with `@react-native-async-storage/async-storage` and any
 * storage that exposes `getItem`/`setItem`/`removeItem`, so the library
 * stays dependency-free while supporting log persistence.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Configuration options for QA Logger
 */
export interface QALoggerConfig {
  maxLogs?: number;
  enableNetworkLogging?: boolean;
  enableErrorLogging?: boolean;
  sensitiveHeaders?: string[];
  /**
   * Persist logs across app restarts. Requires a `storage` adapter.
   * Useful for long-running QA sessions and crash reproduction.
   */
  persist?: boolean;
  /** Storage adapter used when `persist` is enabled */
  storage?: StorageAdapter;
  /** Storage key used for persisted logs. Default: `@qa-logger/logs` */
  persistKey?: string;
}

/**
 * Serializable snapshot produced by `logger.exportLogs()`.
 */
export interface ExportedLogs {
  exportedAt: number;
  count: number;
  logs: LogEntry[];
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
