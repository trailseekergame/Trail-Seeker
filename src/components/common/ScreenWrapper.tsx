import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

interface Props {
  children: React.ReactNode;
  padded?: boolean;
}

export default function ScreenWrapper({ children, padded = true }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={[styles.container, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: 16,
  },
});
