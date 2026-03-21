import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export default function NeonButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  icon,
}: Props) {
  const variantStyles = {
    primary: {
      bg: colors.neonGreen,
      text: colors.background,
      border: colors.neonGreen,
    },
    secondary: {
      bg: 'transparent',
      text: colors.neonCyan,
      border: colors.neonCyan,
    },
    danger: {
      bg: 'transparent',
      text: colors.neonRed,
      border: colors.neonRed,
    },
    ghost: {
      bg: 'transparent',
      text: colors.textSecondary,
      border: colors.surfaceLight,
    },
  };

  const sizeStyles = {
    sm: { paddingH: spacing.sm, paddingV: spacing.xs, font: fontSize.sm },
    md: { paddingH: spacing.md, paddingV: spacing.sm + 2, font: fontSize.md },
    lg: { paddingH: spacing.lg, paddingV: spacing.md, font: fontSize.lg },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.surfaceLight : v.bg,
          borderColor: disabled ? colors.textMuted : v.border,
          paddingHorizontal: s.paddingH,
          paddingVertical: s.paddingV,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={s.font}
            color={disabled ? colors.textMuted : v.text}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={[
            styles.text,
            {
              color: disabled ? colors.textMuted : v.text,
              fontSize: s.font,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
