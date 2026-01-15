import { LogEntry, LogLevel, NetworkLogEntry, QALoggerConfig, LogFilter } from './types';

/**
 * Core logger class with in-memory storage
 */
class QALogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private enabled: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Enable only in DEV mode
    this.enabled = __DEV__;
  }

  /**
   * Configure the logger
   */
  configure(config: QALoggerConfig): void {
    if (config.maxLogs !== undefined) {
      this.maxLogs = config.maxLogs;
    }
  }

  /**
   * Check if logger is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Add a log entry to the store
   */
  private addLog(log: LogEntry): void {
    if (!this.enabled) return;

    this.logs.push(log);

    // Implement FIFO - remove oldest if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Generate unique ID for log entries
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any): void {
    if (!this.enabled) return;

    const log: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: LogLevel.INFO,
      message,
      data,
    };

    this.addLog(log);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: any): void {
    if (!this.enabled) return;

    const log: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: LogLevel.WARN,
      message,
      data,
    };

    this.addLog(log);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | any, stackTrace?: string): void {
    if (!this.enabled) return;

    const log: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      message,
      data: error,
      stackTrace: stackTrace || (error instanceof Error ? error.stack : undefined),
    };

    this.addLog(log);
  }

  /**
   * Log a network request
   */
  network(networkLog: Omit<NetworkLogEntry, 'id' | 'timestamp' | 'level'>): void {
    if (!this.enabled) return;

    const log: NetworkLogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level: LogLevel.NETWORK,
      ...networkLog,
    };

    this.addLog(log);
  }

  /**
   * Get all logs
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get filtered logs based on filter type
   */
  getFilteredLogs(filter: LogFilter): LogEntry[] {
    if (filter === 'all') {
      return this.getAllLogs();
    }

    if (filter === 'network') {
      return this.logs.filter(log => log.level === LogLevel.NETWORK);
    }

    if (filter === 'errors') {
      return this.logs.filter(log => log.level === LogLevel.ERROR);
    }

    return [];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Subscribe to log changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of log changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Export singleton instance
export const logger = new QALogger();
