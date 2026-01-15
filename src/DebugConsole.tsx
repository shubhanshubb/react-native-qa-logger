import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { logger } from './logger';
import { LogEntry, LogFilter, LogLevel, isNetworkLog } from './types';

interface DebugConsoleProps {
  visible: boolean;
  onClose: () => void;
  /** Enable in production builds. Default: only shows in __DEV__ mode */
  enabled?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// Color palette from shubhanshubb.dev
const COLORS = {
  // Backgrounds
  bgPrimary: '#0A0A0A',      // Near black (main background)
  bgSecondary: '#1E1E1E',    // Dark gray
  bgTertiary: '#2A2A2A',     // Medium dark gray
  bgCard: '#1E1E1E',

  // Accents - Teal theme
  primary: '#00D4AA',        // Teal - main brand color
  primaryLight: '#33DDBB',   // Lighter teal
  secondary: '#00D4AA',      // Teal

  // Status colors
  info: '#00D4AA',           // Teal for info
  success: '#00D4AA',        // Teal for success
  warning: '#FFB547',        // Warm amber
  error: '#FF6B6B',          // Coral red
  network: '#00D4AA',        // Teal for network

  // Text
  textPrimary: '#FFFFFF',    // White
  textSecondary: '#B0B0B0',  // Light gray
  textMuted: '#808080',      // Medium gray

  // Borders
  border: '#2A2A2A',         // Dark gray
  borderLight: '#3A3A3A',    // Medium gray
};

export const DebugConsole: React.FC<DebugConsoleProps> = ({ visible, onClose, enabled }) => {
  // Check if should be enabled (either in DEV mode or explicitly enabled)
  const isEnabled = enabled ?? __DEV__;

  // Return null early if not enabled
  if (!isEnabled) {
    return null;
  }
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [slideAnim] = useState(new Animated.Value(BOTTOM_SHEET_HEIGHT));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  useEffect(() => {
    const updateLogs = () => {
      const filteredLogs = logger.getFilteredLogs(activeFilter);

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchFiltered = filteredLogs.filter(log => {
          const message = log.message.toLowerCase();
          const data = JSON.stringify(log.data || {}).toLowerCase();
          return message.includes(query) || data.includes(query);
        });
        setLogs(searchFiltered.reverse());
      } else {
        setLogs(filteredLogs.reverse());
      }
    };

    updateLogs();
    const unsubscribe = logger.subscribe(updateLogs);
    return unsubscribe;
  }, [activeFilter, searchQuery]);

  const toggleExpanded = useCallback((logId: string) => {
    setExpandedLogIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  }, []);

  const handleClearLogs = useCallback(() => {
    logger.clearLogs();
    setExpandedLogIds(new Set());
  }, []);

  const getLogColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.INFO:
        return COLORS.info;
      case LogLevel.WARN:
        return COLORS.warning;
      case LogLevel.ERROR:
        return COLORS.error;
      case LogLevel.NETWORK:
        return COLORS.network;
      default:
        return COLORS.textMuted;
    }
  };

  const getLogIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      case LogLevel.NETWORK:
        return '🌐';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  const getStatusColor = (statusCode?: number): string => {
    if (!statusCode) return COLORS.textMuted;
    if (statusCode >= 200 && statusCode < 300) return COLORS.success;
    if (statusCode >= 400 && statusCode < 500) return COLORS.warning;
    if (statusCode >= 500) return COLORS.error;
    return COLORS.info;
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const isExpanded = expandedLogIds.has(item.id);
    const logColor = getLogColor(item.level);
    const logIcon = getLogIcon(item.level);

    return (
      <TouchableOpacity
        style={styles.logItem}
        onPress={() => toggleExpanded(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={[styles.levelIndicator, { backgroundColor: logColor }]} />
          <Text style={styles.logIcon}>{logIcon}</Text>
          <View style={styles.logHeaderContent}>
            <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
            <View style={[styles.levelBadge, { backgroundColor: logColor + '20' }]}>
              <Text style={[styles.levelText, { color: logColor }]}>
                {item.level.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </View>

        <Text style={styles.message} numberOfLines={isExpanded ? undefined : 2}>
          {item.message}
        </Text>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {isNetworkLog(item) && (
              <>
                <View style={styles.networkHeader}>
                  <View style={[styles.methodBadge, {
                    backgroundColor: item.method === 'GET' ? COLORS.info + '20' :
                                    item.method === 'POST' ? COLORS.success + '20' :
                                    item.method === 'DELETE' ? COLORS.error + '20' : COLORS.warning + '20'
                  }]}>
                    <Text style={[styles.methodText, {
                      color: item.method === 'GET' ? COLORS.info :
                             item.method === 'POST' ? COLORS.success :
                             item.method === 'DELETE' ? COLORS.error : COLORS.warning
                    }]}>{item.method}</Text>
                  </View>
                  {item.statusCode && (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.statusCode) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(item.statusCode) }]}>
                        {item.statusCode}
                      </Text>
                    </View>
                  )}
                  {item.duration && (
                    <Text style={styles.duration}>{item.duration}ms</Text>
                  )}
                </View>
                <DetailRow label="URL" value={item.url} />
                {item.requestBody && (
                  <DetailRow
                    label="Request"
                    value={JSON.stringify(item.requestBody, null, 2)}
                    monospace
                  />
                )}
                {item.responseBody && (
                  <DetailRow
                    label="Response"
                    value={JSON.stringify(item.responseBody, null, 2)}
                    monospace
                  />
                )}
                {item.error && <DetailRow label="Error" value={item.error} isError />}
              </>
            )}

            {item.data && !isNetworkLog(item) && (
              <DetailRow
                label="Data"
                value={JSON.stringify(item.data, null, 2)}
                monospace
              />
            )}

            {item.stackTrace && (
              <DetailRow label="Stack Trace" value={item.stackTrace} monospace isError />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>🔍 Debug Console</Text>
              <Text style={styles.subtitle}>{logs.length} logs</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearLogs}
              >
                <Text style={styles.clearButtonText}>🗑️ Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔎</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search logs..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            <Tab
              label="All"
              icon="📋"
              count={logger.getFilteredLogs('all').length}
              active={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
            />
            <Tab
              label="Network"
              icon="🌐"
              count={logger.getFilteredLogs('network').length}
              active={activeFilter === 'network'}
              onPress={() => setActiveFilter('network')}
              color={COLORS.network}
            />
            <Tab
              label="Errors"
              icon="❌"
              count={logger.getFilteredLogs('errors').length}
              active={activeFilter === 'errors'}
              onPress={() => setActiveFilter('errors')}
              color={COLORS.error}
            />
          </View>

          {/* Logs List */}
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            renderItem={renderLogItem}
            style={styles.logsList}
            contentContainerStyle={styles.logsContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={styles.emptyStateText}>No logs to display</Text>
                <Text style={styles.emptyStateSubtext}>
                  Logs will appear here as your app runs
                </Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

interface TabProps {
  label: string;
  icon: string;
  count: number;
  active: boolean;
  onPress: () => void;
  color?: string;
}

const Tab: React.FC<TabProps> = ({ label, icon, count, active, onPress, color }) => (
  <TouchableOpacity
    style={[
      styles.tab,
      active && styles.tabActive,
      active && color && { backgroundColor: color + '20', borderColor: color }
    ]}
    onPress={onPress}
  >
    <Text style={styles.tabIcon}>{icon}</Text>
    <Text style={[styles.tabLabel, active && styles.tabLabelActive, active && color && { color }]}>
      {label}
    </Text>
    <View style={[
      styles.tabBadge,
      active && styles.tabBadgeActive,
      active && color && { backgroundColor: color }
    ]}>
      <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
        {count}
      </Text>
    </View>
  </TouchableOpacity>
);

interface DetailRowProps {
  label: string;
  value: string;
  monospace?: boolean;
  isError?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, monospace, isError }) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, isError && { color: COLORS.error }]}>{label}</Text>
    <ScrollView
      horizontal
      style={styles.detailValueContainer}
      showsHorizontalScrollIndicator={false}
    >
      <Text style={[
        styles.detailValue,
        monospace && styles.monospace,
        isError && { color: COLORS.error }
      ]}>
        {value}
      </Text>
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: COLORS.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    // Shadow
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.error + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  clearButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 18,
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  clearSearchIcon: {
    color: COLORS.textMuted,
    fontSize: 16,
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    padding: 20,
    paddingTop: 8,
  },
  logItem: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelIndicator: {
    width: 3,
    height: 24,
    borderRadius: 2,
    marginRight: 10,
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timestamp: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  expandIcon: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginLeft: 8,
  },
  message: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 13,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginLeft: 13,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  duration: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValueContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 8,
    padding: 10,
  },
  detailValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 18,
  },
  monospace: {
    fontFamily: 'monospace',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
