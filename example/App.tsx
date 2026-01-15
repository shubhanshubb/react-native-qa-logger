import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

// Setup network logging
setupNetworkLogger(apiClient, {
  sensitiveHeaders: ['authorization', 'api-key'],
  maxBodyLength: 5000,
});

// Setup error handlers (captures JS errors and logs them to the debug console)
setupErrorHandlers();

const App: React.FC = () => {
  const [consoleVisible, setConsoleVisible] = useState(false);

  useEffect(() => {
    // Log app startup
    logger.info('App started successfully');
  }, []);

  const handleFetchUsers = async () => {
    try {
      logger.info('Fetching users from API...');
      const response = await apiClient.get('/users');
      logger.info(`Fetched ${response.data.length} users`, {
        count: response.data.length,
      });
    } catch (error) {
      logger.error('Failed to fetch users', error);
    }
  };

  const handleFetchPosts = async () => {
    try {
      logger.info('Fetching posts from API...');
      const response = await apiClient.get('/posts');
      logger.info(`Fetched ${response.data.length} posts`);
    } catch (error) {
      logger.error('Failed to fetch posts', error);
    }
  };

  const handleCreatePost = async () => {
    try {
      logger.info('Creating new post...');
      const newPost = {
        title: 'Test Post',
        body: 'This is a test post from QA Logger example',
        userId: 1,
      };
      const response = await apiClient.post('/posts', newPost);
      logger.info('Post created successfully', { postId: response.data.id });
    } catch (error) {
      logger.error('Failed to create post', error);
    }
  };

  const handleTriggerError = () => {
    logger.warn('Triggering intentional error...');
    // This will trigger the global error handler
    throw new Error('This is a test error!');
  };

  const handleLogWarning = () => {
    logger.warn('This is a warning message', {
      component: 'App',
      action: 'handleLogWarning',
    });
  };

  const handleLogInfo = () => {
    logger.info('This is an info message', {
      timestamp: new Date().toISOString(),
      data: { foo: 'bar', nested: { value: 123 } },
    });
  };

  const handlePromiseRejection = () => {
    logger.warn('Triggering promise rejection...');
    Promise.reject(new Error('Unhandled promise rejection test'));
  };

  const handleNetworkError = async () => {
    try {
      logger.info('Triggering network error...');
      await apiClient.get('/invalid-endpoint-404');
    } catch (error) {
      logger.info('Network error handled');
    }
  };

  return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>QA Logger Example</Text>
            <Text style={styles.subtitle}>
              Tap the floating debug button to view logs
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network Requests</Text>

            <TouchableOpacity style={styles.button} onPress={handleFetchUsers}>
              <Text style={styles.buttonText}>Fetch Users (GET)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleFetchPosts}>
              <Text style={styles.buttonText}>Fetch Posts (GET)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleCreatePost}>
              <Text style={styles.buttonText}>Create Post (POST)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleNetworkError}>
              <Text style={styles.buttonText}>Trigger Network Error</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manual Logging</Text>

            <TouchableOpacity style={styles.button} onPress={handleLogInfo}>
              <Text style={styles.buttonText}>Log Info Message</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleLogWarning}>
              <Text style={styles.buttonText}>Log Warning Message</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Testing</Text>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleTriggerError}
            >
              <Text style={styles.buttonText}>Trigger JS Error</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handlePromiseRejection}
            >
              <Text style={styles.buttonText}>Trigger Promise Rejection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Debug Button - with custom memoji icon */}
        <DebugButton
          onPress={() => setConsoleVisible(true)}
          icon="👨‍💻"
        />

        {/* Debug Console */}
        <DebugConsole
          visible={consoleVisible}
          onClose={() => setConsoleVisible(false)}
        />
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: 50,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00D4AA',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  dangerButton: {
    borderColor: '#FF6B6B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
