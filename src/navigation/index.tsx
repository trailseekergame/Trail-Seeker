import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { useNotifications } from '../hooks/useNotifications';
import AudioManager from '../services/audioManager';
import { colors, fontSize, fontMono } from '../theme';

// Screens
import TrailScreen from '../screens/Trail/TrailScreen';
import SettlementScreen from '../screens/Settlement/SettlementScreen';
import WardrobeScreen from '../screens/Settlement/WardrobeScreen';
import CodexScreen from '../screens/Codex/CodexScreen';
import CodexEntryScreen from '../screens/Codex/CodexEntryScreen';
import ArcadeScreen from '../screens/Arcade/ArcadeScreen';
import MiniGameScreen from '../screens/Arcade/MiniGameScreen';
import RPSScreen from '../screens/Arcade/RPSScreen';
import DroneScreen from '../screens/Arcade/DroneScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import TitleScreen from '../screens/TitleScreen';
import DailyPlanScreen from '../screens/Scans/DailyPlanScreen';
import MissionSelectScreen from '../screens/Scans/MissionSelectScreen';
import ScanScreen from '../screens/Scans/ScanScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();
const TrailStack = createNativeStackNavigator();
const SettlementStack = createNativeStackNavigator();
const CodexStack = createNativeStackNavigator();
const ArcadeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function SettingsButton() {
  const nav = useNavigation<any>();
  return (
    <TouchableOpacity onPress={() => nav.navigate('Settings')} style={{ marginRight: 12 }}>
      <MaterialCommunityIcons name="cog-outline" size={22} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.neonGreen,
  headerTitleStyle: {
    fontWeight: '600' as const,
    letterSpacing: 2,
    fontFamily: 'monospace' as const,
    fontSize: 14,
  },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  headerRight: () => <SettingsButton />,
};

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const { state } = useGame();
  const accent = state?.accentColor || colors.tabActive;
  return (
    <View style={tabIconStyles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={focused ? 24 : 22}
        color={focused ? accent : colors.tabInactive}
      />
      <Text
        style={[tabIconStyles.label, focused && { ...tabIconStyles.labelActive, color: accent }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingTop: 4, minWidth: 60 },
  icon: { fontSize: 22 },
  iconActive: { fontSize: 24 },
  label: { fontSize: 10, color: colors.tabInactive, marginTop: 2, textAlign: 'center', fontFamily: 'monospace' as const, letterSpacing: 1 },
  labelActive: { color: colors.tabActive, fontWeight: '700' },
});

// ─── Stack Navigators ───

function TrailStackNavigator() {
  return (
    <TrailStack.Navigator screenOptions={screenOptions}>
      <TrailStack.Screen
        name="DailyPlan"
        component={DailyPlanScreen}
        options={{ title: 'Camp' }}
      />
      <TrailStack.Screen
        name="MissionSelect"
        component={MissionSelectScreen}
        options={{ title: 'Mission Board' }}
      />
      <TrailStack.Screen
        name="ScanMain"
        component={ScanScreen}
        options={{ title: 'Scanning' }}
      />
      <TrailStack.Screen
        name="TrailMain"
        component={TrailScreen}
        options={{ title: 'The Trail' }}
      />
    </TrailStack.Navigator>
  );
}

function SettlementStackNavigator() {
  return (
    <SettlementStack.Navigator screenOptions={screenOptions}>
      <SettlementStack.Screen
        name="SettlementMain"
        component={SettlementScreen}
        options={{ title: 'Settlement' }}
      />
      <SettlementStack.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{ title: 'Equipment' }}
      />
    </SettlementStack.Navigator>
  );
}

function CodexStackNavigator() {
  return (
    <CodexStack.Navigator screenOptions={screenOptions}>
      <CodexStack.Screen
        name="CodexMain"
        component={CodexScreen}
        options={{ title: 'Codex' }}
      />
      <CodexStack.Screen
        name="CodexEntry"
        component={CodexEntryScreen}
        options={({ route }: any) => ({ title: route.params?.title || 'Entry' })}
      />
    </CodexStack.Navigator>
  );
}

function ArcadeStackNavigator() {
  return (
    <ArcadeStack.Navigator screenOptions={screenOptions}>
      <ArcadeStack.Screen
        name="ArcadeMain"
        component={ArcadeScreen}
        options={{ title: 'Arcade' }}
      />
      <ArcadeStack.Screen
        name="MiniGame"
        component={MiniGameScreen}
        options={{ title: 'Trail Flier', headerShown: false }}
      />
      <ArcadeStack.Screen
        name="RPSDuel"
        component={RPSScreen}
        options={{ title: 'Trail Standoff' }}
      />
      <ArcadeStack.Screen
        name="DroneCompanion"
        component={DroneScreen}
        options={{ title: 'Companion Drone' }}
      />
    </ArcadeStack.Navigator>
  );
}

// ─── Tab Navigator ───

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.panelBorder,
          borderTopWidth: 1.5,
          height: 56,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tab.Screen
        name="TrailTab"
        component={TrailStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="radar" label="Scans" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SettlementTab"
        component={SettlementStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-group" label="Base" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="CodexTab"
        component={CodexStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="book-open-variant" label="Codex" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ArcadeTab"
        component={ArcadeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="gamepad-variant" label="Arcade" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───

// ─── Title Screen Wrapper (connects navigation) ───

function TitleScreenWrapper() {
  const nav = useNavigation<any>();
  return (
    <TitleScreen
      onPlay={() => nav.navigate('Main')}
      onNavigate={(screen: string) => {
        if (screen === 'Settings') {
          nav.navigate('Settings');
        } else if (screen === 'Codex') {
          nav.navigate('Main', { screen: 'CodexTab' });
        } else if (screen === 'Arcade') {
          nav.navigate('Main', { screen: 'ArcadeTab' });
        } else if (screen === 'Stats') {
          nav.navigate('Main', { screen: 'SettlementTab' });
        }
      }}
    />
  );
}

export default function AppNavigator() {
  const { state, isLoading } = useGame();
  const [splashDone, setSplashDone] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(0.4));
  useNotifications();

  useEffect(() => {
    AudioManager.init();
    return () => { AudioManager.cleanup(); };
  }, []);

  // Minimum 2s before the splash can be dismissed
  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Pulse animation for "TAP TO CONTINUE"
  useEffect(() => {
    if (!splashReady) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [splashReady]);

  if (isLoading || !splashDone) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => { if (splashReady) setSplashDone(true); }}
        style={splashStyles.container}
      >
        <Image
          source={require('../assets/splash_banner.jpg')}
          style={splashStyles.banner}
          resizeMode="contain"
        />
        {!splashReady ? (
          <View style={splashStyles.statusRow}>
            <View style={splashStyles.dot} />
            <Text style={splashStyles.statusText}>INITIALIZING</Text>
            <View style={splashStyles.dot} />
          </View>
        ) : (
          <Animated.Text style={[splashStyles.tapText, { opacity: pulseAnim }]}>
            TAP TO CONTINUE
          </Animated.Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!state.onboardingComplete ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <RootStack.Screen name="Title" component={TitleScreenWrapper} />
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.neonGreen,
                headerShadowVisible: false,
                title: '',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060A0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    width: '90%',
    height: undefined,
    aspectRatio: 3.5,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: colors.neonGreen,
    opacity: 0.6,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontMono,
    letterSpacing: 3,
  },
  tapText: {
    color: colors.neonGreen,
    fontSize: 12,
    fontFamily: fontMono,
    letterSpacing: 4,
    fontWeight: '600',
  },
});
