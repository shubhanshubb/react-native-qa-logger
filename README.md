# React Native QA Logger

A powerful in-app logging and debugging package for React Native, designed specifically for QA and development builds. Inspired by Loggycian for Flutter, this package provides a comprehensive logging solution with a beautiful UI for viewing logs, network requests, and errors directly in your app.

## Features

- **In-App Debug Console** - Beautiful bottom sheet UI with tabs and filters
- **Floating Debug Button** - Draggable button that snaps to screen edges
- **Network Logging** - Automatic capture of Axios requests/responses
- **Error Handling** - Global JS error and promise rejection handling
- **Color-Coded Logs** - Visual distinction between log levels
- **Expandable Log Items** - Tap to view full details, stack traces, and data
- **Search & Filter** - Search logs and filter by type (All, Network, Errors)
- **Zero Production Impact** - Completely disabled in production builds
- **TypeScript Support** - Full type definitions included
- **No Native Code** - Pure JavaScript/TypeScript implementation

## Installation

```bash
npm install react-native-qa-logger
# or
yarn add react-native-qa-logger
```

## Quick Start

### 1. Setup in Your App

```typescript
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import axios from 'axios';
import {
  logger,
  setupNetworkLogger,
  setupErrorHandlers,
  DebugButton,
  DebugConsole,
} from 'react-native-qa-logger';

// Create your axios instance
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

// Setup network logging
setupNetworkLogger(apiClient, {
  sensitiveHeaders: ['authorization', 'api-key'],
  maxBodyLength: 10000,
});

// Setup error handlers
setupErrorHandlers();

function App() {
  const [consoleVisible, setConsoleVisible] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Your app content */}

      {/* Debug Button - only visible in DEV mode */}
      <DebugButton onPress={() => setConsoleVisible(true)} />

      {/* Debug Console */}
      <DebugConsole
        visible={consoleVisible}
        onClose={() => setConsoleVisible(false)}
      />
    </SafeAreaView>
  );
}
```

### 2. Manual Logging

```typescript
import { logger } from 'react-native-qa-logger';

// Log info messages
logger.info('User logged in', { userId: 123, username: 'john' });

// Log warnings
logger.warn('API rate limit approaching', { remaining: 10 });

// Log errors
try {
  // some operation
} catch (error) {
  logger.error('Failed to load data', error);
}
```

## API Reference

### Logger Methods

#### `logger.info(message: string, data?: any): void`

Log an informational message.

```typescript
logger.info('App started');
logger.info('User action', { screen: 'Home', action: 'button_click' });
```

#### `logger.warn(message: string, data?: any): void`

Log a warning message.

```typescript
logger.warn('Deprecated API used');
logger.warn('Slow response time', { duration: 5000 });
```

#### `logger.error(message: string, error?: Error | any, stackTrace?: string): void`

Log an error message.

```typescript
logger.error('API request failed', error);
logger.error('Custom error', null, 'Stack trace here');
```

#### `logger.configure(config: QALoggerConfig): void`

Configure the logger.

```typescript
logger.configure({
  maxLogs: 500, // Maximum number of logs to store (default: 1000)
});
```

#### `logger.clearLogs(): void`

Clear all logs from memory.

```typescript
logger.clearLogs();
```

#### `logger.getAllLogs(): LogEntry[]`

Get all logs.

```typescript
const logs = logger.getAllLogs();
```

#### `logger.getFilteredLogs(filter: LogFilter): LogEntry[]`

Get filtered logs.

```typescript
const networkLogs = logger.getFilteredLogs('network');
const errorLogs = logger.getFilteredLogs('errors');
const allLogs = logger.getFilteredLogs('all');
```

### Network Logging

#### `setupNetworkLogger(axiosInstance, config?)`

Setup automatic network logging for an Axios instance.

```typescript
import axios from 'axios';
import { setupNetworkLogger } from 'react-native-qa-logger';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

setupNetworkLogger(apiClient, {
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key'], // Headers to redact
  maxBodyLength: 10000, // Maximum body length to log
});
```

**Options:**

- `sensitiveHeaders` (string[]): Headers to redact in logs (default: authorization, cookie, api-key, etc.)
- `maxBodyLength` (number): Maximum request/response body length to log (default: 10000)

### Error Handling

#### `setupErrorHandlers()`

Setup global error and promise rejection handlers.

```typescript
import { setupErrorHandlers } from 'react-native-qa-logger';

setupErrorHandlers();
```

This will automatically capture:
- Global JavaScript errors
- Unhandled promise rejections
- Console errors

#### `restoreErrorHandlers()`

Restore original error handlers (rarely needed).

```typescript
import { restoreErrorHandlers } from 'react-native-qa-logger';

restoreErrorHandlers();
```

### UI Components

#### `<DebugButton />`

Floating, draggable debug button.

```typescript
<DebugButton
  onPress={() => setConsoleVisible(true)}
  position={{ x: 20, y: 100 }} // Optional initial position
/>
```

**Props:**
- `onPress` (required): Callback when button is tapped
- `position` (optional): Initial position `{ x: number, y: number }`

**Features:**
- Only renders in DEV mode (`__DEV__ === true`)
- Draggable with snap-to-edge behavior
- Swiggy-style dismiss zone (drag to bottom to dismiss)
- Shows badge with log count
- Custom icon support (emoji or image)

#### `<DebugConsole />`

Bottom sheet debug console.

```typescript
<DebugConsole
  visible={consoleVisible}
  onClose={() => setConsoleVisible(false)}
/>
```

**Props:**
- `visible` (required): Whether console is visible
- `onClose` (required): Callback when console is closed

**Features:**
- Bottom sheet with smooth animations
- Tabs: All, Network, Errors
- Search functionality
- Expandable log items
- Color-coded logs
- Clear logs button

## TypeScript Types

```typescript
import {
  LogLevel,
  LogEntry,
  NetworkLogEntry,
  LogFilter,
  QALoggerConfig,
} from 'react-native-qa-logger';

// Log levels
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NETWORK = 'network',
}

// Log entry structure
interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stackTrace?: string;
}

// Network log entry
interface NetworkLogEntry extends LogEntry {
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

// Log filter types
type LogFilter = 'all' | 'network' | 'errors';

// Configuration
interface QALoggerConfig {
  maxLogs?: number;
}
```

## Configuration

### Environment Detection

The logger automatically detects the environment using React Native's `__DEV__` constant:

- **Development**: Logging enabled, UI visible
- **Production**: Logging disabled, UI hidden, zero overhead

### Maximum Logs

By default, the logger stores up to 1000 logs in memory using a FIFO (First In, First Out) strategy. Configure this:

```typescript
logger.configure({ maxLogs: 500 });
```

### Sensitive Data

Network logging automatically redacts common sensitive headers:

- authorization
- cookie
- set-cookie
- x-api-key
- api-key
- access-token
- refresh-token

Add custom sensitive headers:

```typescript
setupNetworkLogger(apiClient, {
  sensitiveHeaders: ['x-custom-token', 'x-session-id'],
});
```

## Best Practices

### 1. Setup Early

Initialize error handlers and network logging as early as possible in your app:

```typescript
// App.tsx
import { setupErrorHandlers, setupNetworkLogger } from 'react-native-qa-logger';

// Setup immediately
setupErrorHandlers();
setupNetworkLogger(yourAxiosInstance);
```

### 2. Meaningful Messages

Use descriptive log messages:

```typescript
// Good
logger.info('User profile loaded', { userId, loadTime: 250 });

// Less helpful
logger.info('Done');
```

### 3. Include Context

Add relevant data to help with debugging:

```typescript
logger.error('Payment failed', {
  amount,
  currency,
  paymentMethod,
  errorCode: error.code,
});
```

### 4. Use Appropriate Levels

- `info`: General information, user actions
- `warn`: Potential issues, deprecations
- `error`: Actual errors, exceptions

### 5. Don't Log Sensitive Data

Avoid logging passwords, tokens, or personal information:

```typescript
// Bad
logger.info('User logged in', { password: userPassword });

// Good
logger.info('User logged in', { userId: user.id });
```

## Example Project

See the `/example` directory for a complete working example demonstrating all features.

```bash
cd example
npm install
npm run ios # or npm run android
```

## Troubleshooting

### Logs not appearing

- Ensure you're running in DEV mode (`__DEV__ === true`)
- Check that `setupErrorHandlers()` is called
- Verify `setupNetworkLogger()` is called with your axios instance

### Debug button not visible

- Only visible when `__DEV__ === true`
- Check that `<DebugButton />` is rendered in your component tree
- Verify it's not hidden behind other components (check z-index)

### Network requests not logged

- Ensure you call `setupNetworkLogger()` with your axios instance
- Only Axios v1.x is supported
- Requests must go through the configured axios instance

### Performance issues

- Reduce `maxLogs` if experiencing memory issues
- Reduce `maxBodyLength` in network logger config
- Logger is automatically disabled in production

## Limitations

- **In-memory only**: Logs are not persisted between app restarts
- **DEV mode only**: Completely disabled in production builds

## Roadmap

Future enhancements:

- [x] Support for Fetch API network logging
- [ ] Export logs to file
- [ ] Share logs via email/messaging
- [ ] Custom log levels
- [ ] Log persistence (AsyncStorage)
- [ ] Performance metrics tracking
- [ ] Screenshot capture on errors

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Credits

Inspired by [Loggycian](https://pub.dev/packages/loggy) for Flutter.

---

Made with ❤️ by [Shubhanshu](https://shubhanshubb.dev)
