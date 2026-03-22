import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export interface ToastData {
  id: number;
  icon: string;
  text: string;
  color: string;
}

interface Props {
  toast: ToastData | null;
}

/**
 * Lightweight animated toast for instant feedback.
 * Fades in, holds, fades out. Self-contained — no dismiss needed.
 */
export default function FeedbackToast({ toast }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(-20);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Hold, then fade out
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -10, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 1200);
    });
  }, [toast?.id]);

  if (!toast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }], borderColor: toast.color + '40' },
      ]}
      pointerEvents="none"
    >
      <MaterialCommunityIcons name={toast.icon as any} size={16} color={toast.color} />
      <Text style={[styles.text, { color: toast.color }]}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface + 'F0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    zIndex: 100,
    elevation: 10,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
