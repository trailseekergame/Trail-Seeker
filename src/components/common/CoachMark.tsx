import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const STORAGE_KEY = '@trail_seeker_coach_marks';

// ─── Global state: which marks have been shown ───
let shownMarks: Set<string> = new Set();
let loaded = false;

async function loadShownMarks() {
  if (loaded) return;
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (json) shownMarks = new Set(JSON.parse(json));
  } catch (_) {}
  loaded = true;
}

async function markAsShown(id: string) {
  shownMarks.add(id);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...shownMarks]));
  } catch (_) {}
}

export function hasBeenShown(id: string): boolean {
  return shownMarks.has(id);
}

// ─── Coach Mark IDs ───
export const COACH = {
  // Scan mechanics
  FIRST_TILE: 'first_tile',          // Tap a green tile to scan it
  SCAN_TYPES: 'scan_types',          // Choose your scan type below
  FIRST_WHIFF: 'first_whiff',        // Dead signal — it happens
  FIRST_RARE: 'first_rare',          // Rare pull — gear helps these
  GAMBIT_INTRO: 'gambit_intro',       // Gambit burns the scan for one shot
  GEAR_MATTERS: 'gear_matters',       // Your loadout shapes every read
  // Onboarding essentials (first 1-2 runs)
  CAMP_INTRO: 'onboard_camp',         // First time at camp
  FIRST_REWARD: 'onboard_reward',     // First successful scan with resources
  FIRST_DAMAGE: 'onboard_damage',     // First time taking damage
  CAMP_HEAL: 'onboard_heal',          // Return to camp while damaged
} as const;

interface Props {
  id: string;
  text: string;
  visible?: boolean; // external condition (e.g., only show on first session)
  delay?: number;    // ms before appearing
}

export default function CoachMark({ id, text, visible = true, delay = 500 }: Props) {
  const [show, setShow] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      await loadShownMarks();
      if (shownMarks.has(id) || !visible) return;

      timer = setTimeout(() => {
        setShow(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, delay);
    })();

    return () => { if (timer) clearTimeout(timer); };
  }, [id, visible]);

  const dismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShow(false);
      markAsShown(id);
    });
  };

  if (!show) return null;

  return (
    <TouchableOpacity onPress={dismiss} activeOpacity={0.9}>
      <Animated.View style={[styles.container, { opacity }]}>
        <Text style={styles.text}>{text}</Text>
        <Text style={styles.dismiss}>tap to dismiss</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neonAmber + '12',
    borderWidth: 1,
    borderColor: colors.neonAmber + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.neonAmber,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.neonAmber,
    lineHeight: 20,
  },
  dismiss: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
});
