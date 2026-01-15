import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from './logger';

/**
 * Default sensitive headers to filter
 */
const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'access-token',
  'refresh-token',
];

/**
 * Configuration for network logger
 */
interface NetworkLoggerConfig {
  sensitiveHeaders?: string[];
  maxBodyLength?: number;
}

/**
 * Store request start times
 */
const requestTimings = new Map<string, number>();

/**
 * Filter sensitive headers from headers object
 */
function filterSensitiveHeaders(
  headers: Record<string, any> | undefined,
  sensitiveHeaders: string[]
): Record<string, string> {
  if (!headers) return {};

  const filtered: Record<string, string> = {};
  const sensitiveSet = new Set(sensitiveHeaders.map(h => h.toLowerCase()));

  Object.keys(headers).forEach(key => {
    if (sensitiveSet.has(key.toLowerCase())) {
      filtered[key] = '[REDACTED]';
    } else {
      filtered[key] = String(headers[key]);
    }
  });

  return filtered;
}

/**
 * Truncate body if too large
 */
function truncateBody(body: any, maxLength: number = 10000): any {
  if (!body) return body;

  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

  if (bodyStr.length > maxLength) {
    return `${bodyStr.substring(0, maxLength)}... [truncated]`;
  }

  return body;
}

/**
 * Generate unique request ID
 */
function generateRequestId(config: AxiosRequestConfig): string {
  return `${config.method}-${config.url}-${Date.now()}`;
}

/**
 * Setup network logging for Axios instance
 */
export function setupNetworkLogger(
  axiosInstance: AxiosInstance,
  config: NetworkLoggerConfig = {}
): void {
  if (!logger.isEnabled()) {
    return;
  }

  const sensitiveHeaders = [
    ...DEFAULT_SENSITIVE_HEADERS,
    ...(config.sensitiveHeaders || []),
  ];

  // Request interceptor
  axiosInstance.interceptors.request.use(
    (requestConfig) => {
      const requestId = generateRequestId(requestConfig);

      // Store start time
      requestTimings.set(requestId, Date.now());

      // Store request ID in config for later retrieval
      (requestConfig as any).__requestId = requestId;

      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: AxiosResponse) => {
      const requestConfig = response.config;
      const requestId = (requestConfig as any).__requestId;

      // Calculate duration
      const startTime = requestTimings.get(requestId);
      const duration = startTime ? Date.now() - startTime : undefined;

      // Clean up timing
      if (requestId) {
        requestTimings.delete(requestId);
      }

      // Log the network request
      logger.network({
        message: `${requestConfig.method?.toUpperCase()} ${response.status} ${requestConfig.url}`,
        url: requestConfig.url || '',
        method: requestConfig.method?.toUpperCase() || 'GET',
        statusCode: response.status,
        duration,
        requestHeaders: filterSensitiveHeaders(requestConfig.headers as any, sensitiveHeaders),
        requestBody: truncateBody(requestConfig.data, config.maxBodyLength),
        responseHeaders: filterSensitiveHeaders(response.headers as any, sensitiveHeaders),
        responseBody: truncateBody(response.data, config.maxBodyLength),
      });

      return response;
    },
    (error: AxiosError) => {
      const requestConfig = error.config;

      if (requestConfig) {
        const requestId = (requestConfig as any).__requestId;

        // Calculate duration
        const startTime = requestTimings.get(requestId);
        const duration = startTime ? Date.now() - startTime : undefined;

        // Clean up timing
        if (requestId) {
          requestTimings.delete(requestId);
        }

        // Log the failed network request
        logger.network({
          message: `${requestConfig.method?.toUpperCase()} ${error.response?.status || 'ERROR'} ${requestConfig.url}`,
          url: requestConfig.url || '',
          method: requestConfig.method?.toUpperCase() || 'GET',
          statusCode: error.response?.status,
          duration,
          requestHeaders: filterSensitiveHeaders(requestConfig.headers as any, sensitiveHeaders),
          requestBody: truncateBody(requestConfig.data, config.maxBodyLength),
          responseHeaders: error.response
            ? filterSensitiveHeaders(error.response.headers as any, sensitiveHeaders)
            : undefined,
          responseBody: error.response
            ? truncateBody(error.response.data, config.maxBodyLength)
            : undefined,
          error: error.message,
        });
      }

      return Promise.reject(error);
    }
  );
}

// ============================================
// FETCH INTERCEPTOR - Works with global fetch
// ============================================

let originalFetch: typeof fetch | null = null;

/**
 * Setup network logging for global fetch
 * Call this once at app startup to intercept all fetch calls
 */
export function setupFetchLogger(config: NetworkLoggerConfig = {}): void {
  if (!logger.isEnabled()) {
    return;
  }

  // Avoid double-wrapping
  if (originalFetch) {
    return;
  }

  const sensitiveHeaders = [
    ...DEFAULT_SENSITIVE_HEADERS,
    ...(config.sensitiveHeaders || []),
  ];

  // Store original fetch
  originalFetch = global.fetch;

  // Replace global fetch
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = init?.method || 'GET';

    let requestBody: any = null;
    if (init?.body) {
      try {
        requestBody = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch {
        requestBody = init.body;
      }
    }

    try {
      const response = await originalFetch!(input, init);
      const duration = Date.now() - startTime;

      // Clone response to read body without consuming it
      const clonedResponse = response.clone();
      let responseBody: any = null;

      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          responseBody = await clonedResponse.json();
        } else {
          responseBody = await clonedResponse.text();
        }
      } catch {
        responseBody = '[Unable to parse response body]';
      }

      // Convert Headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Log the network request
      logger.network({
        message: `${method.toUpperCase()} ${response.status} ${url}`,
        url,
        method: method.toUpperCase(),
        statusCode: response.status,
        duration,
        requestHeaders: filterSensitiveHeaders(init?.headers as any, sensitiveHeaders),
        requestBody: truncateBody(requestBody, config.maxBodyLength),
        responseHeaders: filterSensitiveHeaders(responseHeaders, sensitiveHeaders),
        responseBody: truncateBody(responseBody, config.maxBodyLength),
      });

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log the failed request
      logger.network({
        message: `${method.toUpperCase()} ERROR ${url}`,
        url,
        method: method.toUpperCase(),
        duration,
        requestHeaders: filterSensitiveHeaders(init?.headers as any, sensitiveHeaders),
        requestBody: truncateBody(requestBody, config.maxBodyLength),
        error: error.message || 'Network request failed',
      });

      throw error;
    }
  };
}

/**
 * Restore original fetch
 */
export function restoreFetchLogger(): void {
  if (originalFetch) {
    global.fetch = originalFetch;
    originalFetch = null;
  }
}

// ============================================
// XMLHttpRequest INTERCEPTOR - Works with any XHR-based library
// ============================================

let originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

/**
 * Setup network logging for XMLHttpRequest
 * This will intercept any library using XHR (jQuery.ajax, superagent, etc.)
 */
export function setupXHRLogger(config: NetworkLoggerConfig = {}): void {
  if (!logger.isEnabled()) {
    return;
  }

  // Avoid double-wrapping
  if (originalXHROpen) {
    return;
  }

  const sensitiveHeaders = [
    ...DEFAULT_SENSITIVE_HEADERS,
    ...(config.sensitiveHeaders || []),
  ];

  // Store original methods
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;

  // Override open
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ): void {
    (this as any).__qaLogger = {
      method,
      url: url.toString(),
      startTime: 0,
      requestHeaders: {},
    };

    return originalXHROpen!.call(this, method, url.toString(), async, username, password);
  };

  // Override setRequestHeader to capture headers
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(name: string, value: string): void {
    if ((this as any).__qaLogger) {
      (this as any).__qaLogger.requestHeaders[name] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  // Override send
  XMLHttpRequest.prototype.send = function(body?: any): void {
    const qaLogger = (this as any).__qaLogger;

    if (qaLogger) {
      qaLogger.startTime = Date.now();
      qaLogger.requestBody = body;

      // Add load listener
      this.addEventListener('load', function() {
        const duration = Date.now() - qaLogger.startTime;

        let responseBody: any = null;
        try {
          const contentType = this.getResponseHeader('content-type') || '';
          if (contentType.includes('application/json')) {
            responseBody = JSON.parse(this.responseText);
          } else {
            responseBody = this.responseText;
          }
        } catch {
          responseBody = this.responseText;
        }

        // Parse response headers
        const responseHeaders: Record<string, string> = {};
        const headerStr = this.getAllResponseHeaders();
        headerStr.split('\r\n').forEach(line => {
          const parts = line.split(': ');
          if (parts.length === 2) {
            responseHeaders[parts[0]] = parts[1];
          }
        });

        logger.network({
          message: `${qaLogger.method.toUpperCase()} ${this.status} ${qaLogger.url}`,
          url: qaLogger.url,
          method: qaLogger.method.toUpperCase(),
          statusCode: this.status,
          duration,
          requestHeaders: filterSensitiveHeaders(qaLogger.requestHeaders, sensitiveHeaders),
          requestBody: truncateBody(qaLogger.requestBody, config.maxBodyLength),
          responseHeaders: filterSensitiveHeaders(responseHeaders, sensitiveHeaders),
          responseBody: truncateBody(responseBody, config.maxBodyLength),
        });
      });

      // Add error listener
      this.addEventListener('error', function() {
        const duration = Date.now() - qaLogger.startTime;

        logger.network({
          message: `${qaLogger.method.toUpperCase()} ERROR ${qaLogger.url}`,
          url: qaLogger.url,
          method: qaLogger.method.toUpperCase(),
          duration,
          requestHeaders: filterSensitiveHeaders(qaLogger.requestHeaders, sensitiveHeaders),
          requestBody: truncateBody(qaLogger.requestBody, config.maxBodyLength),
          error: 'Network request failed',
        });
      });
    }

    return originalXHRSend!.call(this, body);
  };
}

/**
 * Restore original XMLHttpRequest
 */
export function restoreXHRLogger(): void {
  if (originalXHROpen) {
    XMLHttpRequest.prototype.open = originalXHROpen;
    originalXHROpen = null;
  }
  if (originalXHRSend) {
    XMLHttpRequest.prototype.send = originalXHRSend;
    originalXHRSend = null;
  }
}

// ============================================
// UNIVERSAL SETUP - Setup all network loggers
// ============================================

/**
 * Setup all network loggers (Fetch + XHR)
 * This will capture requests from fetch, axios (when not using interceptor),
 * superagent, jQuery.ajax, and any other HTTP client
 */
export function setupAllNetworkLoggers(config: NetworkLoggerConfig = {}): void {
  setupFetchLogger(config);
  setupXHRLogger(config);
}

/**
 * Restore all network loggers
 */
export function restoreAllNetworkLoggers(): void {
  restoreFetchLogger();
  restoreXHRLogger();
}

// ============================================
// MANUAL LOGGING - For custom HTTP clients
// ============================================

interface ManualNetworkLogParams {
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
 * Manually log a network request
 * Use this for custom HTTP clients or when automatic interception isn't possible
 */
export function logNetworkRequest(params: ManualNetworkLogParams): void {
  if (!logger.isEnabled()) {
    return;
  }

  logger.network({
    message: `${params.method.toUpperCase()} ${params.statusCode || 'PENDING'} ${params.url}`,
    ...params,
  });
}

/**
 * Create a wrapper for timing network requests manually
 */
export function createNetworkTimer(): {
  start: () => void;
  end: () => number;
} {
  let startTime = 0;

  return {
    start: () => {
      startTime = Date.now();
    },
    end: () => {
      return Date.now() - startTime;
    },
  };
}
