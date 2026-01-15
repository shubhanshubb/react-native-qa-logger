# QA Logger Example App

This example demonstrates how to integrate and use `react-native-qa-logger` in a React Native application.

## Tech Stack

- **React Native**: 0.83.1
- **React**: 19.2.0
- **TypeScript**: 5.7.x
- **Axios**: 1.7.x

## Features Demonstrated

1. **Network Logging** - Automatic logging of Axios requests and responses
2. **Manual Logging** - Using logger methods to log info and warnings
3. **Error Handling** - Automatic capture of JS errors and promise rejections
4. **Debug UI** - Floating debug button and bottom sheet console

## Prerequisites

- Node.js 18+
- React Native development environment set up ([React Native Environment Setup](https://reactnative.dev/docs/environment-setup))
- For iOS: Xcode 15+ and CocoaPods
- For Android: Android Studio and JDK 17+

## Installation

```bash
# Navigate to example directory
cd example

# Install dependencies
npm install

# For iOS, install CocoaPods dependencies
cd ios && pod install && cd ..
```

## Running the App

### iOS

```bash
npm run ios
```

Or open `ios/QALoggerExample.xcworkspace` in Xcode and run from there.

### Android

```bash
npm run android
```

Or open the `android` folder in Android Studio and run from there.

### Start Metro Bundler (if not started automatically)

```bash
npm start

# With cache reset (if you encounter issues)
npm run start:reset
```

## Usage in the Example

### 1. Setup (in App.tsx)

```typescript
import axios from 'axios';
import {
  logger,
  setupNetworkLogger,
  setupErrorHandlers,
  DebugButton,
  DebugConsole,
} from 'react-native-qa-logger';

// Create axios instance
const apiClient = axios.create({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
});

// Setup network logging with options
setupNetworkLogger(apiClient, {
  sensitiveHeaders: ['authorization', 'api-key'],
  maxBodyLength: 5000,
});

// Setup global error handlers
setupErrorHandlers();
```

### 2. Manual Logging

```typescript
logger.info('User logged in', { userId: 123 });
logger.warn('Low memory warning');
logger.error('Failed to load data', error);
```

### 3. UI Components

```tsx
const [consoleVisible, setConsoleVisible] = useState(false);

// In your render:
<DebugButton onPress={() => setConsoleVisible(true)} />

<DebugConsole
  visible={consoleVisible}
  onClose={() => setConsoleVisible(false)}
/>
```

## Testing Features

Use the buttons in the example app to test different logging scenarios:

| Button | Action |
|--------|--------|
| **Fetch Users (GET)** | Makes a GET request to `/users` |
| **Fetch Posts (GET)** | Makes a GET request to `/posts` |
| **Create Post (POST)** | Makes a POST request to `/posts` |
| **Trigger Network Error** | Makes a request to invalid endpoint |
| **Log Info Message** | Logs an info message with data |
| **Log Warning Message** | Logs a warning message |
| **Trigger JS Error** | Throws a JavaScript error |
| **Trigger Promise Rejection** | Creates an unhandled promise rejection |

## What to Look For

1. **Floating Debug Button** - Appears in bottom-right, shows badge with log count
2. **Draggable** - The debug button can be dragged and snaps to screen edges
3. **Bottom Sheet Console** - Slides up from bottom when button is tapped
4. **Tabs** - Switch between All, Network, and Errors
5. **Expandable Logs** - Tap any log to see full details
6. **Search** - Use search bar to filter logs
7. **Color Coding** - Logs are color-coded by level:
   - Blue: Info
   - Orange: Warning
   - Red: Error
   - Green: Network

## Troubleshooting

### Metro bundler issues

```bash
npm run start:reset
```

### iOS build issues

```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android build issues

```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Production Build

The debug UI and logging are completely disabled in production builds. The floating button will not appear when `__DEV__` is `false`.

```bash
# iOS release build
npm run ios -- --mode Release

# Android release build
npm run android -- --mode release
```
