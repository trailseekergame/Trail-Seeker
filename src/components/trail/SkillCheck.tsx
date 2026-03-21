import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface Props {
  /** 'moderate' speed for risky, 'fast' for reckless */
  speed: 'moderate' | 'fast';
  onResult: (success: boolean) => void;
}

const BAR_WIDTH = 260;
// Target zone width varies by speed: moderate = 15%, fast = 12%
const MARKER_WIDTH = 6;
const AUTO_TIMEOUT = 4000;

export default function SkillCheck({ speed, onResult }: Props) {
  const TARGET_WIDTH_PCT = speed === 'fast' ? 0.12 : 0.15;
  const TARGET_WIDTH = BAR_WIDTH * TARGET_WIDTH_PCT;

  const [resolved, setResolved] = useState(false);
  const [hitResult, setHitResult] = useState<boolean | null>(null);
  const [flashText, setFlashText] = useState('');
  const markerPos = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Random target zone position (left edge, in px)
  const targetLeft = useRef(
    Math.floor(Math.random() * (BAR_WIDTH - TARGET_WIDTH))
  ).current;

  // Bounce speed: moderate ~1200ms per sweep, fast ~700ms
  const sweepDuration = speed === 'fast' ? 700 : 1200;

  useEffect(() => {
    // Start bouncing animation
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(markerPos, {
          toValue: BAR_WIDTH - MARKER_WIDTH,
          duration: sweepDuration,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: false,
        }),
        Animated.timing(markerPos, {
          toValue: 0,
          duration: sweepDuration,
          easing: Easing.inOut(Easing.linear),
          useNativeDriver: false,
        }),
      ])
    );
    animRef.current = bounce;
    bounce.start();

    // Auto-resolve after timeout (counts as miss)
    autoTimerRef.current = setTimeout(() => {
      if (!resolved) {
        resolve(false);
      }
    }, AUTO_TIMEOUT);

    return () => {
      bounce.stop();
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const resolve = useCallback((success: boolean) => {
    if (resolved) return;
    setResolved(true);
    setHitResult(success);

    // Stop animation
    animRef.current?.stop();
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    // Flash text
    setFlashText(success ? 'LOCKED IN' : 'MISSED');
    flashOpacity.setValue(1);
    Animated.timing(flashOpacity, {
      toValue: 0,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();

    // Notify parent after brief pause
    setTimeout(() => onResult(success), 1200);
  }, [resolved, onResult]);

  const handleTap = () => {
    if (resolved) return;
    // Check if marker is within target zone
    // @ts-ignore — __getValue exists at runtime on Animated.Value
    const currentPos = (markerPos as any).__getValue?.() ?? 0;
    const inZone = currentPos >= targetLeft && currentPos <= targetLeft + TARGET_WIDTH - MARKER_WIDTH;
    resolve(inZone);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={1}
      disabled={resolved}
    >
      <Text style={styles.instruction}>TAP TO LOCK SIGNAL</Text>

      {/* Bar */}
      <View style={styles.bar}>
        {/* Target zone */}
        <View
          style={[
            styles.targetZone,
            {
              left: targetLeft,
              width: TARGET_WIDTH,
              backgroundColor: hitResult === true
                ? colors.neonGreen + '50'
                : hitResult === false
                ? colors.neonRed + '30'
                : colors.neonGreen + '30',
              borderColor: hitResult === true
                ? colors.neonGreen
                : hitResult === false
                ? colors.neonRed + '60'
                : colors.neonGreen + '80',
            },
          ]}
        />
        {/* Marker */}
        <Animated.View
          style={[
            styles.marker,
            {
              left: markerPos,
              backgroundColor: resolved
                ? hitResult
                  ? colors.neonGreen
                  : colors.neonRed
                : colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Flash text */}
      <Animated.Text
        style={[
          styles.flashText,
          {
            opacity: flashOpacity,
            color: hitResult ? colors.neonGreen : colors.neonRed,
          },
        ]}
      >
        {flashText}
      </Animated.Text>

      {!resolved && (
        <Text style={styles.hint}>
          {speed === 'fast' ? 'Signal unstable — act fast!' : 'Time your tap carefully'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  instruction: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  bar: {
    width: BAR_WIDTH,
    height: 32,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    position: 'relative',
    overflow: 'hidden',
  },
  targetZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MARKER_WIDTH,
    borderRadius: 2,
  },
  flashText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: spacing.md,
    height: 28,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
