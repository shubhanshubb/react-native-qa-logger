import {
  LogEntry,
  LogLevel,
  NetworkLogEntry,
  QALoggerConfig,
  LogFilter,
  StorageAdapter,
  ExportedLogs,
} from './types';
import { safeStringify } from './serialize';

const DEFAULT_PERSIST_KEY = '@qa-logger/logs';
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Core logger class with in-memory storage
 */
class QALogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private enabled: boolean = false;
  private listeners: Set<() => void> = new Set();

  // Persistence
  private storage: StorageAdapter | null = null;
  private persistKey: string = DEFAULT_PERSIST_KEY;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated: boolean = false;
  // Serializes storage writes/removes so they can't reorder against each other
  private persistChain: Promise<void> = Promise.resolve();

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

    if (config.persistKey) {
      this.persistKey = config.persistKey;
    }

    // Enable persistence when both `persist` and a storage adapter are provided
    if (config.persist && config.storage) {
      this.storage = config.storage;
      // Hydrate previously persisted logs (fire-and-forget)
      void this.hydrate();
    } else if (config.persist && !config.storage && this.enabled) {
      console.warn(
        '[qa-logger] `persist` is enabled but no `storage` adapter was provided. Logs will not survive restarts.'
      );
    }
  }

  /**
   * Load persisted logs from storage into memory.
   */
  private async hydrate(): Promise<void> {
    if (!this.storage || this.hydrated) return;

    try {
      const raw = await this.storage.getItem(this.persistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LogEntry[];
        if (Array.isArray(parsed)) {
          // Merge: restored (older) logs first, then any logs recorded during
          // the async gap, so nothing logged at startup is clobbered.
          const liveIds = new Set(this.logs.map(log => log.id));
          const restored = parsed.filter(log => log && !liveIds.has(log.id));
          this.logs = [...restored, ...this.logs].slice(-this.maxLogs);
          this.notifyListeners();
        }
      }
    } catch (err) {
      if (this.enabled) {
        console.warn('[qa-logger] Failed to hydrate persisted logs:', err);
      }
    } finally {
      this.hydrated = true;
    }
  }

  /**
   * Queue a storage operation so writes and removes execute in order.
   */
  private enqueuePersist(op: () => Promise<void>): void {
    this.persistChain = this.persistChain.then(op).catch(err => {
      if (this.enabled) {
        console.warn('[qa-logger] Storage operation failed:', err);
      }
    });
  }

  /**
   * Schedule a debounced persist to storage.
   */
  private schedulePersist(): void {
    if (!this.storage) return;

    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flush();
    }, PERSIST_DEBOUNCE_MS);
  }

  /**
   * Write current logs to storage (queued to preserve write ordering).
   */
  private flush(): void {
    if (!this.storage) return;

    // Snapshot at enqueue time so the write reflects this moment's state
    const snapshot = safeStringify(this.logs);
    this.enqueuePersist(async () => {
      if (this.storage) {
        await this.storage.setItem(this.persistKey, snapshot);
      }
    });
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

    // Persist (debounced) if storage is configured
    this.schedulePersist();

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

    // Clear persisted copy as well
    if (this.storage) {
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      // Queued so it runs after any in-flight write, preventing cleared logs
      // from reappearing on the next restart.
      const storage = this.storage;
      this.enqueuePersist(() => storage.removeItem(this.persistKey));
    }

    this.notifyListeners();
  }

  /**
   * Build a serializable snapshot of the logs, optionally filtered.
   */
  getExport(filter: LogFilter = 'all'): ExportedLogs {
    const logs = this.getFilteredLogs(filter);
    return {
      exportedAt: Date.now(),
      count: logs.length,
      logs,
    };
  }

  /**
   * Export logs as a pretty-printed JSON string for bug reports / QA handoff.
   */
  exportLogs(filter: LogFilter = 'all'): string {
    return safeStringify(this.getExport(filter), 2);
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
