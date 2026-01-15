import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { logger } from './logger';

interface DebugButtonProps {
  onPress: () => void;
  position?: { x: number; y: number };
  /** Custom icon - can be an image source (require/uri) or emoji string */
  icon?: ImageSourcePropType | string;
}

const BUTTON_SIZE = 56;
const BADGE_SIZE = 20;
const DISMISS_ZONE_SIZE = 56;

// Color palette from shubhanshubb.dev
const COLORS = {
  primary: '#00D4AA',
  primaryLight: '#33DDBB',
  bgDark: '#0A0A0A',
  bgSecondary: '#1E1E1E',
  accent: '#FF6B6B',
  white: '#FFFFFF',
};

export const DebugButton: React.FC<DebugButtonProps> = ({ onPress, position, icon }) => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const initialX = position?.x ?? screenWidth - BUTTON_SIZE - 16;
  const initialY = position?.y ?? screenHeight - BUTTON_SIZE - 120;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const dismissZoneOpacity = useRef(new Animated.Value(0)).current;
  const dismissZoneScale = useRef(new Animated.Value(0.5)).current;

  const [logCount, setLogCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);

  useEffect(() => {
    if (!__DEV__) return;

    const unsubscribe = logger.subscribe(() => {
      setLogCount(logger.getLogCount());
    });
    setLogCount(logger.getLogCount());

    return () => {
      unsubscribe();
    };
  }, []);

  const showDismissZone = useCallback(() => {
    setIsDragging(true);
    Animated.parallel([
      Animated.spring(dismissZoneOpacity, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.spring(dismissZoneScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 100,
      }),
    ]).start();
  }, [dismissZoneOpacity, dismissZoneScale]);

  const hideDismissZone = useCallback(() => {
    Animated.parallel([
      Animated.timing(dismissZoneOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dismissZoneScale, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDragging(false);
      setIsOverDismissZone(false);
    });
  }, [dismissZoneOpacity, dismissZoneScale]);

  const dismissButton = useCallback(() => {
    const dismissX = screenWidth / 2 - BUTTON_SIZE / 2;
    const dismissY = screenHeight - 80 - BUTTON_SIZE / 2;

    Animated.parallel([
      Animated.timing(pan, {
        toValue: { x: dismissX, y: dismissY },
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dismissZoneOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      scaleAnim.setValue(1);
      setIsDragging(false);
      setIsOverDismissZone(false);
    });
  }, [pan, scaleAnim, dismissZoneOpacity, screenWidth, screenHeight]);

  // Track dragging state for panResponder
  const isDraggingRef = useRef(false);
  const isOverDismissZoneRef = useRef(false);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    isOverDismissZoneRef.current = isOverDismissZone;
  }, [isOverDismissZone]);

  // Calculate dismiss zone center
  const dismissZoneCenter = useMemo(() => ({
    x: screenWidth / 2,
    y: screenHeight - 80,
  }), [screenWidth, screenHeight]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.setOffset({
            x: (pan.x as any)._value,
            y: (pan.y as any)._value,
          });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gesture) => {
          pan.setValue({ x: gesture.dx, y: gesture.dy });

          // Check if dragging started (moved more than 10px)
          if (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10) {
            if (!isDraggingRef.current) {
              showDismissZone();
            }
          }

          // Check if over dismiss zone (circular detection)
          const currentX = (pan.x as any)._offset + gesture.dx + BUTTON_SIZE / 2;
          const currentY = (pan.y as any)._offset + gesture.dy + BUTTON_SIZE / 2;

          const distanceFromDismissZone = Math.sqrt(
            Math.pow(currentX - dismissZoneCenter.x, 2) +
            Math.pow(currentY - dismissZoneCenter.y, 2)
          );

          const isOverZone = distanceFromDismissZone < DISMISS_ZONE_SIZE + 20;

          if (isOverZone && isDraggingRef.current) {
            if (!isOverDismissZoneRef.current) {
              setIsOverDismissZone(true);
              Animated.spring(dismissZoneScale, {
                toValue: 1.2,
                friction: 4,
                useNativeDriver: true,
              }).start();
            }
          } else {
            if (isOverDismissZoneRef.current) {
              setIsOverDismissZone(false);
              Animated.spring(dismissZoneScale, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
              }).start();
            }
          }
        },
        onPanResponderRelease: (_, gesture) => {
          pan.flattenOffset();

          // Check if over dismiss zone
          const currentX = (pan.x as any)._value + BUTTON_SIZE / 2;
          const currentY = (pan.y as any)._value + BUTTON_SIZE / 2;

          const distanceFromDismissZone = Math.sqrt(
            Math.pow(currentX - dismissZoneCenter.x, 2) +
            Math.pow(currentY - dismissZoneCenter.y, 2)
          );

          // If dropped in dismiss zone, dismiss
          if (distanceFromDismissZone < DISMISS_ZONE_SIZE + 20 && isDraggingRef.current) {
            dismissButton();
            return;
          }

          // Hide dismiss zone
          if (isDraggingRef.current) {
            hideDismissZone();
          }

          // If barely moved, treat as tap
          if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
            onPress();
            return;
          }

          // Snap to edge
          const snapX = (pan.x as any)._value;
          const snapToLeft = snapX < screenWidth / 2;
          const finalX = snapToLeft ? 16 : screenWidth - BUTTON_SIZE - 16;

          // Constrain Y position
          const minY = 60;
          const maxY = screenHeight - BUTTON_SIZE - 120;
          const currentYPos = (pan.y as any)._value;
          const finalY = Math.max(minY, Math.min(maxY, currentYPos));

          Animated.spring(pan, {
            toValue: { x: finalX, y: finalY },
            useNativeDriver: false,
            friction: 7,
          }).start();
        },
      }),
    [pan, onPress, screenWidth, screenHeight, showDismissZone, hideDismissZone, dismissButton, dismissZoneScale, dismissZoneCenter]
  );

  // Only render in DEV mode - AFTER all hooks
  if (!__DEV__ || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Dismiss Zone - Swiggy style circular */}
      {isDragging && (
        <Animated.View
          style={[
            styles.dismissZoneContainer,
            {
              opacity: dismissZoneOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.dismissZone,
              isOverDismissZone && styles.dismissZoneActive,
              {
                transform: [
                  { scale: dismissZoneScale },
                ],
              },
            ]}
          >
            <Text
              style={[
                styles.dismissIcon,
                isOverDismissZone && styles.dismissIconActive,
              ]}
            >
              ✕
            </Text>
          </Animated.View>
          {!isOverDismissZone && (
            <Text style={styles.dismissHint}>Drag here to dismiss</Text>
          )}
        </Animated.View>
      )}

      {/* Floating Button */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scaleAnim },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.button,
            isOverDismissZone && styles.buttonOverDismissZone,
          ]}
          activeOpacity={0.9}
          onPress={onPress}
        >
          <View style={styles.buttonInner}>
            {icon ? (
              typeof icon === 'string' ? (
                <Text style={styles.icon}>{icon}</Text>
              ) : (
                <Image source={icon} style={styles.iconImage} />
              )
            ) : (
              <Text style={styles.icon}>🐞</Text>
            )}
          </View>

          {logCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {logCount > 99 ? '99+' : logCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 16,
  },
  buttonOverDismissZone: {
    opacity: 0.5,
  },
  buttonInner: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  icon: {
    fontSize: 24,
  },
  iconImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: COLORS.accent,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.bgDark,
    shadowColor: COLORS.accent,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Swiggy-style Dismiss Zone
  dismissZoneContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9998,
  },
  dismissZone: {
    width: DISMISS_ZONE_SIZE,
    height: DISMISS_ZONE_SIZE,
    borderRadius: DISMISS_ZONE_SIZE / 2,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dismissZoneActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'transparent',
  },
  dismissIcon: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: 'bold',
  },
  dismissIconActive: {
    color: COLORS.white,
    fontSize: 24,
  },
  dismissHint: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
});
