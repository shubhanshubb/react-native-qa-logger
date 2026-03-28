# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6] - 2026-03-28

### Changed
- `setupNetworkLogger()` now enables universal network logging for `fetch` and `XMLHttpRequest` by default
- Added `setupAxiosLogger()` as the explicit Axios instance helper
- Kept backward compatibility for existing `setupNetworkLogger(axiosInstance)` usage

### Fixed
- Removed runtime Axios coupling by switching to type-only Axios imports
- Improved `fetch` header normalization for more request shapes
- Restored `XMLHttpRequest.setRequestHeader` correctly when disabling XHR logging

## [1.0.0] - 2026-01-15

### Added
- Initial release
- In-app debug console with bottom sheet UI
- Floating draggable debug button
- Automatic network logging for Axios
- Global error and promise rejection handling
- Color-coded log levels (info, warn, error, network)
- Expandable log items with detailed view
- Search and filter functionality
- Tab-based navigation (All, Network, Errors)
- TypeScript support with full type definitions
- Automatic environment detection (DEV/Production)
- FIFO in-memory log storage
- Sensitive header redaction
- Example app demonstrating all features
- Comprehensive documentation

### Features
- Zero native code - pure JavaScript/TypeScript
- Completely disabled in production builds
- Supports React Native 0.60+
- Axios v1.x support
- Maximum 1000 logs by default (configurable)
- Automatic request/response body truncation
- Stack trace capture for errors
- Request duration tracking
