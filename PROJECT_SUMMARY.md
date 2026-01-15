# React Native QA Logger - Project Summary

## Overview

A complete, production-ready React Native logging and debugging package designed for QA and development builds, inspired by Loggycian for Flutter.

## Package Structure

```
react-native-qa-logger/
├── src/
│   ├── types.ts              # TypeScript type definitions
│   ├── logger.ts             # Core logger with in-memory storage
│   ├── network.ts            # Axios interceptor for network logging
│   ├── errors.ts             # Global error handlers
│   ├── DebugButton.tsx       # Floating draggable button component
│   ├── DebugConsole.tsx      # Bottom sheet debug console UI
│   └── index.ts              # Main exports
├── example/
│   ├── App.tsx               # Example app demonstrating all features
│   ├── package.json          # Example dependencies
│   └── README.md             # Example documentation
├── README.md                 # Main documentation
├── QUICK_START.md            # Quick start guide
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT License
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
└── .npmignore                # NPM ignore rules

```

## Core Components

### 1. Logger Core (`logger.ts`)

**Purpose**: Central logging system with in-memory storage

**Key Features**:
- Singleton pattern for consistent state
- FIFO circular buffer (max 1000 logs)
- Multiple log levels: INFO, WARN, ERROR, NETWORK
- Subscribe/notify pattern for UI updates
- Automatic environment detection (`__DEV__`)
- Zero overhead in production

**Methods**:
- `info(message, data?)` - Log informational messages
- `warn(message, data?)` - Log warnings
- `error(message, error?, stackTrace?)` - Log errors
- `network(networkLog)` - Log network requests
- `getAllLogs()` - Get all logs
- `getFilteredLogs(filter)` - Get filtered logs
- `clearLogs()` - Clear all logs
- `subscribe(listener)` - Subscribe to log changes
- `configure(config)` - Configure logger settings

### 2. Network Logging (`network.ts`)

**Purpose**: Automatic capture of Axios requests and responses

**Key Features**:
- Request and response interceptors
- Duration tracking
- Sensitive header redaction
- Body truncation for large payloads
- Error capture

**Configuration**:
```typescript
setupNetworkLogger(axiosInstance, {
  sensitiveHeaders: ['authorization', 'api-key'],
  maxBodyLength: 10000,
});
```

**Default Sensitive Headers**:
- authorization
- cookie
- set-cookie
- x-api-key
- api-key
- access-token
- refresh-token

### 3. Error Handling (`errors.ts`)

**Purpose**: Global capture of JavaScript errors and promise rejections

**Key Features**:
- `ErrorUtils.setGlobalHandler()` integration
- Promise rejection tracking
- `console.error` override
- Stack trace extraction
- Fatal error detection

**Setup**:
```typescript
setupErrorHandlers();
```

### 4. Debug Button (`DebugButton.tsx`)

**Purpose**: Floating, draggable button to access debug console

**Key Features**:
- Draggable with `PanResponder`
- Snap-to-edge behavior
- Live log count badge
- Only visible in DEV mode
- Smooth animations

**Props**:
- `onPress: () => void` - Callback when tapped
- `position?: { x: number, y: number }` - Initial position

**Behavior**:
- Positioned at bottom-right by default
- Draggable to any position
- Snaps to left or right edge on release
- Badge shows log count (max 99+)
- Returns `null` in production

### 5. Debug Console (`DebugConsole.tsx`)

**Purpose**: Bottom sheet UI for viewing and filtering logs

**Key Features**:
- Bottom sheet modal (75% screen height)
- Animated slide-in/out
- Three tabs: All, Network, Errors
- Search functionality
- Expandable log items
- Color-coded by level
- Virtualized list (FlatList)
- Clear logs button

**Props**:
- `visible: boolean` - Show/hide console
- `onClose: () => void` - Close callback

**UI Elements**:
- Header with title and actions
- Search bar
- Tab navigation with counts
- Scrollable log list
- Expandable log details
- Empty state

**Log Colors**:
- INFO: Blue (#3b82f6)
- WARN: Orange (#f59e0b)
- ERROR: Red (#ef4444)
- NETWORK: Green (#10b981)

### 6. Type Definitions (`types.ts`)

**Key Types**:
```typescript
enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  NETWORK = 'network',
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stackTrace?: string;
}

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

type LogFilter = 'all' | 'network' | 'errors';
```

## Architecture Decisions

### 1. Environment Detection
Uses `__DEV__` constant (React Native built-in) to detect development vs production. All logging and UI is completely disabled when `__DEV__ === false`.

### 2. In-Memory Storage
Logs stored in memory only (no AsyncStorage) for:
- Better performance
- Simplicity
- Automatic cleanup on app restart
- No persistence overhead

### 3. FIFO Strategy
Circular buffer with maximum capacity:
- Default: 1000 logs
- Configurable via `configure({ maxLogs })`
- Oldest logs automatically removed
- Prevents memory issues

### 4. Singleton Pattern
Logger uses singleton pattern:
- Single source of truth
- Consistent state across app
- Easy to import and use
- Subscribe/notify for updates

### 5. Bottom Sheet UI
Chose bottom sheet over full modal:
- Better UX on mobile
- Partial screen coverage
- Easy to dismiss
- Smooth animations
- Modern design pattern

### 6. Pure JavaScript/TypeScript
No native code required:
- Easy installation
- Cross-platform compatible
- No linking needed
- Works with Expo

## Usage Flow

### 1. Installation
```bash
npm install react-native-qa-logger
```

### 2. Setup (App.tsx)
```typescript
import { setupErrorHandlers, setupNetworkLogger } from 'react-native-qa-logger';

setupErrorHandlers();
setupNetworkLogger(axiosInstance);
```

### 3. Add UI Components
```typescript
<DebugButton onPress={() => setConsoleVisible(true)} />
<DebugConsole visible={consoleVisible} onClose={() => setConsoleVisible(false)} />
```

### 4. Log Events
```typescript
logger.info('Event occurred', { data });
```

### 5. View Logs
- Tap floating debug button
- View logs in bottom sheet
- Filter by tab (All/Network/Errors)
- Search logs
- Tap to expand details

## Performance Considerations

### Memory
- Max 1000 logs by default (configurable)
- FIFO removes oldest logs
- Body truncation for large payloads
- No persistence to disk

### Rendering
- FlatList for virtualization
- Only expanded logs render full details
- Memoization for callbacks
- Efficient re-renders

### Production
- Zero overhead (completely disabled)
- No bundle size impact
- No runtime cost
- Tree-shaking friendly

## Security

### Sensitive Data
- Automatic header redaction
- Configurable sensitive headers
- No password logging
- Token masking

### Best Practices
- Don't log PII
- Redact custom sensitive fields
- Review logs before sharing
- Use appropriate log levels

## Testing

### Manual Testing Checklist
- [ ] Floating button appears in DEV
- [ ] Button is draggable
- [ ] Button snaps to edges
- [ ] Badge shows correct count
- [ ] Console opens on tap
- [ ] Tabs switch correctly
- [ ] Search filters logs
- [ ] Logs expand/collapse
- [ ] Network logs captured
- [ ] Errors captured
- [ ] Clear logs works
- [ ] No UI in production

### Example App
Complete example in `/example`:
- Network requests (GET/POST)
- Manual logging
- Error triggering
- Promise rejections
- All features demonstrated

## Future Enhancements

Potential roadmap:
1. Fetch API support (in addition to Axios)
2. Export logs to file
3. Share logs via email
4. Log persistence (AsyncStorage)
5. Custom log levels
6. Performance metrics
7. Screenshot on error
8. Remote logging endpoint
9. Advanced filtering
10. Log statistics

## Dependencies

### Peer Dependencies
- `react`: >=16.8.0
- `react-native`: >=0.60.0

### Dev Dependencies
- `typescript`: ^5.0.0
- `@types/react`: ^18.0.0
- `@types/react-native`: ^0.72.0

### No Runtime Dependencies
Pure implementation with zero runtime dependencies!

## Build & Publish

### Build
```bash
npm run build
```

Compiles TypeScript to JavaScript in `/lib` directory.

### Publish
```bash
npm publish
```

Publishes to NPM registry.

## Comparison with Alternatives

### vs Reactotron
- **Pros**: In-app UI, no external app needed, simpler setup
- **Cons**: Less features, no timeline view

### vs Flipper
- **Pros**: No native setup, works with Expo, lighter weight
- **Cons**: Less powerful, dev-only features

### vs Custom Console Logs
- **Pros**: Persistent logs, searchable, network tracking, better UX
- **Cons**: Slightly more setup

## Key Differentiators

1. **In-App UI** - No external tools needed
2. **Bottom Sheet** - Modern, mobile-friendly UI
3. **Zero Production Impact** - Completely disabled in prod
4. **No Native Code** - Pure JS/TS, works everywhere
5. **QA Focused** - Designed for QA testing workflows
6. **Beautiful UI** - Color-coded, searchable, expandable
7. **Network Logging** - Built-in Axios support
8. **Error Handling** - Automatic global error capture

## Success Metrics

Package is successful if:
- Easy to install (< 5 minutes)
- Zero production impact
- Helpful for QA testing
- Reduces debugging time
- Good developer experience
- Clear documentation

## Conclusion

React Native QA Logger provides a complete, production-ready solution for in-app logging and debugging in React Native applications. With its beautiful UI, comprehensive features, and zero production impact, it's an essential tool for QA and development workflows.

**Built for QA, designed for developers, optimized for React Native.**
