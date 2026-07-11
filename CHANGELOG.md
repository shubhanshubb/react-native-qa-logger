# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - Unreleased

### Added
- Export logs as JSON for easier bug reporting and QA handoff
- Share/copy actions for individual logs and the full console output
- Copy any network request as a ready-to-run `curl` command
- Optional log persistence so sessions can survive app restarts during debugging

### Changed
- Expanded network logging details with request duration and response metadata
- Improved console usability for larger log volumes and long-running QA sessions

### Planned
- Redesigned debug console UI
- More "copy as" formats for network requests (`fetch()` snippet, HAR entry)
- "Copy as cURL" for the full session (batch export all network calls)
- Opt-in raw (unredacted) cURL/headers for local debugging
- Screenshot capture from inside the debug console
- Lightweight performance metrics for key screens or requests

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
