const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Watch the parent directory for the library source
const watchFolders = [path.resolve(__dirname, '..')];

// Block react/react-native from the parent node_modules to prevent duplicate React
const blockList = [
  new RegExp(path.resolve(__dirname, '..', 'node_modules', 'react') + '/.*'),
  new RegExp(path.resolve(__dirname, '..', 'node_modules', 'react-native') + '/.*'),
];

const config = {
  watchFolders,
  resolver: {
    // Block duplicate React from parent folder
    blockList: blockList,
    // Make sure Metro can resolve the library
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
    // Alias the library to the source
    extraNodeModules: {
      'react-native-qa-logger': path.resolve(__dirname, '../src'),
      // IMPORTANT: Ensure React is resolved from the example app's node_modules
      // This prevents "hooks called from different React instance" error
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
