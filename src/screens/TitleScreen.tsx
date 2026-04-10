import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { colors, spacing, fontSize, fontMono } from '../theme';
import AudioManager from '../services/audioManager';
import { connectWallet, disconnectWallet, getWalletState } from '../services/solana';

interface Props {
  onPlay: () => void;
  onNavigate: (screen: string) => void;
}

export default function TitleScreen({ onPlay, onNavigate }: Props) {
  const { state, dispatch } = useGame();
  const accent = state?.accentColor || colors.neonGreen;

  // Wallet state
  const [walletConnected, setWalletConnected] = useState(!!state.connectedWalletAddress);
  const [walletAddress, setWalletAddress] = useState(state.connectedWalletAddress || null);
  const [connecting, setConnecting] = useState(false);

  // Pulse animation for the PLAY NOW button
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Sync wallet state from GameContext
  useEffect(() => {
    setWalletConnected(!!state.connectedWalletAddress);
    setWalletAddress(state.connectedWalletAddress || null);
  }, [state.connectedWalletAddress]);

  const handleConnectWallet = useCallback(async () => {
    if (walletConnected) {
      // Disconnect
      AudioManager.playSfx('ui_tap');
      AudioManager.vibrate('light');
      await disconnectWallet();
      dispatch({ type: 'SET_WALLET_ADDRESS', payload: null });
      setWalletConnected(false);
      setWalletAddress(null);
      return;
    }

    setConnecting(true);
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');

    try {
      const result = await connectWallet();
      if (result.connected && result.publicKey) {
        dispatch({ type: 'SET_WALLET_ADDRESS', payload: result.publicKey });
        setWalletConnected(true);
        setWalletAddress(result.publicKey);
      }
    } catch (err) {
      Alert.alert('Connection Failed', 'Could not connect wallet. Try again.');
    } finally {
      setConnecting(false);
    }
  }, [walletConnected, dispatch]);

  const handlePlay = useCallback(() => {
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
    onPlay();
  }, [onPlay]);

  const handleGridButton = useCallback((screen: string) => {
    AudioManager.playSfx('ui_tap');
    AudioManager.vibrate('light');
    onNavigate(screen);
  }, [onNavigate]);

  // Truncate wallet address for display
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <View style={styles.container}>
      {/* ─── Logo / Banner ─── */}
      <View style={styles.bannerWrap}>
        <Image
          source={require('../assets/splash_banner.jpg')}
          style={styles.banner}
          resizeMode="contain"
        />
      </View>

      {/* ─── Buttons ─── */}
      <View style={styles.buttonArea}>
        {/* PLAY NOW — primary CTA */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: accent }]}
            onPress={handlePlay}
            activeOpacity={0.8}
          >
            <Text style={styles.playButtonText}>PLAY NOW</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* CONNECT WALLET — hidden until MWA integration is live */}
        {/* TODO: Uncomment when real Solana wallet adapter is wired up */}

        {/* ─── 2x2 Grid ─── */}
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => handleGridButton('Codex')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="book-open-variant" size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
              <Text style={styles.gridButtonText}>INFO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => handleGridButton('Arcade')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="gamepad-variant" size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
              <Text style={styles.gridButtonText}>ARCADE</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => handleGridButton('Stats')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chart-bar" size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
              <Text style={styles.gridButtonText}>STATS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => handleGridButton('Settings')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog-outline" size={16} color={colors.textMuted} style={{ marginBottom: 4 }} />
              <Text style={styles.gridButtonText}>SETTINGS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Footer ─── */}
      <Text style={styles.versionText}>TRAIL SEEKER v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },

  // Banner / Logo
  bannerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 200,
  },
  banner: {
    width: '90%',
    height: undefined,
    aspectRatio: 3.5,
  },

  // Button area
  buttonArea: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },

  // PLAY NOW
  playButton: {
    width: 280,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    marginBottom: spacing.md,
  },
  playButtonText: {
    color: colors.background,
    fontSize: fontSize.xl,
    fontWeight: '800',
    fontFamily: fontMono,
    letterSpacing: 4,
  },

  // CONNECT WALLET
  walletButton: {
    width: 280,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    backgroundColor: 'transparent',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 2,
  },
  walletSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: spacing.lg,
  },

  // 2x2 Grid
  gridContainer: {
    width: 280,
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  gridButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
  },
  gridButtonText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 2,
  },

  // Footer
  versionText: {
    color: colors.textMuted,
    fontSize: 9,
    fontFamily: fontMono,
    letterSpacing: 2,
    opacity: 0.5,
  },
});
