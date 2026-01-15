import { logger } from './logger';

/**
 * Original error handler reference
 */
let originalErrorHandler: ((error: any, isFatal?: boolean) => void) | null = null;
let isSetup = false;

/**
 * Patterns to ignore (React Native internal errors that shouldn't be logged)
 */
const IGNORE_PATTERNS = [
  'RCTEventEmitter',
  'registerCallableModule',
  'Module has not been registered',
  '[QALogger]',
  'RCTDeviceEventEmitter',
  'Callable JavaScript modules',
  'receiveEvent',
];

/**
 * Check if error should be ignored
 */
function shouldIgnoreError(message: string): boolean {
  if (!message) return true;
  return IGNORE_PATTERNS.some(pattern => message.includes(pattern));
}

/**
 * Format stack trace for better readability
 */
function formatStackTrace(error: Error): string {
  if (!error.stack) {
    return 'No stack trace available';
  }
  return error.stack;
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    return error.message || error.toString();
  }
  return String(error);
}

/**
 * Get ErrorUtils safely (may not exist in all RN versions/architectures)
 */
function getErrorUtils(): any {
  try {
    if (typeof (global as any).ErrorUtils !== 'undefined') {
      return (global as any).ErrorUtils;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Setup global error handlers
 * Note: This only sets up the global error handler, not console.error override
 * to avoid conflicts with React Native's new architecture
 */
export function setupErrorHandlers(): void {
  if (!logger.isEnabled() || isSetup) {
    return;
  }

  isSetup = true;

  // Delay setup to avoid initialization race conditions
  setTimeout(() => {
    const ErrorUtils = getErrorUtils();

    if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
      try {
        originalErrorHandler = ErrorUtils.getGlobalHandler();

        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          // Always call original handler first
          if (originalErrorHandler) {
            try {
              originalErrorHandler(error, isFatal);
            } catch {
              // Ignore errors in original handler
            }
          }

          // Then try to log to QA Logger
          try {
            const message = extractErrorMessage(error);

            // Skip React Native internal errors
            if (!shouldIgnoreError(message)) {
              const stackTrace = error instanceof Error ? formatStackTrace(error) : undefined;
              logger.error(
                isFatal ? `[FATAL] ${message}` : message,
                error,
                stackTrace
              );
            }
          } catch {
            // Silently fail
          }
        });
      } catch {
        // ErrorUtils setup failed
      }
    }
  }, 100);
}

/**
 * Restore original error handlers
 */
export function restoreErrorHandlers(): void {
  const ErrorUtils = getErrorUtils();

  if (originalErrorHandler && ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function') {
    try {
      ErrorUtils.setGlobalHandler(originalErrorHandler);
      originalErrorHandler = null;
    } catch {
      // Ignore
    }
  }

  isSetup = false;
}
