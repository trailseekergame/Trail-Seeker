import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface Props {
  title?: string;
  subtitle?: string;
  icon?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accentColor?: string;
}

export default function Card({
  title,
  subtitle,
  icon,
  children,
  onPress,
  style,
  accentColor,
}: Props) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        accentColor && { borderLeftWidth: 3, borderLeftColor: accentColor },
        style,
      ]}
    >
      {(title || icon) && (
        <View style={styles.header}>
          {icon && (
            <MaterialCommunityIcons
              name={icon as any}
              size={24}
              color={accentColor || colors.textPrimary}
              style={styles.icon}
            />
          )}
          <View style={styles.titleGroup}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    marginRight: spacing.sm,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
