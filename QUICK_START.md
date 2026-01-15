# Quick Start Guide

Get up and running with React Native QA Logger in 5 minutes!

## Step 1: Install

```bash
npm install react-native-qa-logger
# or
yarn add react-native-qa-logger
```

## Step 2: Basic Setup

Add to your main App component:

```typescript
import React, { useState } from 'react';
import {
  setupErrorHandlers,
  DebugButton,
  DebugConsole,
} from 'react-native-qa-logger';

// Setup error handlers once
setupErrorHandlers();

function App() {
  const [consoleVisible, setConsoleVisible] = useState(false);

  return (
    <>
      {/* Your app content */}

      <DebugButton onPress={() => setConsoleVisible(true)} />
      <DebugConsole visible={consoleVisible} onClose={() => setConsoleVisible(false)} />
    </>
  );
}
```

## Step 3: Setup Network Logging (Optional)

If using Axios:

```typescript
import axios from 'axios';
import { setupNetworkLogger } from 'react-native-qa-logger';

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
});

setupNetworkLogger(apiClient);
```

## Step 4: Start Logging

```typescript
import { logger } from 'react-native-qa-logger';

logger.info('App started!');
logger.warn('This is a warning');
logger.error('Something went wrong', error);
```

## That's it!

- Tap the floating bug icon to open the debug console
- View logs organized by tabs: All, Network, Errors
- Tap any log to expand and see details
- Use the search bar to filter logs

## Next Steps

- Read the [full documentation](./README.md)
- Check out the [example app](./example)
- Learn about [configuration options](./README.md#configuration)

## Common Use Cases

### Log user actions
```typescript
logger.info('Button clicked', { screen: 'Home', button: 'Login' });
```

### Track API calls
```typescript
// Automatic with setupNetworkLogger()
const response = await apiClient.get('/users');
// Logged automatically with request/response details
```

### Debug errors
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  logger.error('Operation failed', error);
}
```

### Monitor performance
```typescript
const start = Date.now();
await heavyOperation();
logger.info('Operation completed', { duration: Date.now() - start });
```

Happy debugging!
