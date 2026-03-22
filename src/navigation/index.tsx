import React, { useEffect } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../context/GameContext';
import { useNotifications } from '../hooks/useNotifications';
import AudioManager from '../services/audioManager';
import { colors, fontSize } from '../theme';

// Screens
import TrailScreen from '../screens/Trail/TrailScreen';
import SettlementScreen from '../screens/Settlement/SettlementScreen';
import WardrobeScreen from '../screens/Settlement/WardrobeScreen';
import CodexScreen from '../screens/Codex/CodexScreen';
import CodexEntryScreen from '../screens/Codex/CodexEntryScreen';
import ArcadeScreen from '../screens/Arcade/ArcadeScreen';
import MiniGameScreen from '../screens/Arcade/MiniGameScreen';
import RPSScreen from '../screens/Arcade/RPSScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
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
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  headerRight: () => <SettingsButton />,
};

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={tabIconStyles.container}>
      <MaterialCommunityIcons
        name={icon as any}
        size={focused ? 24 : 22}
        color={focused ? colors.tabActive : colors.tabInactive}
      />
      <Text
        style={[tabIconStyles.label, focused && tabIconStyles.labelActive]}
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
  label: { fontSize: 11, color: colors.tabInactive, marginTop: 2, textAlign: 'center' },
  labelActive: { color: colors.tabActive, fontWeight: '600' },
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
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: 65,
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
            <TabIcon icon="map-marker-path" label="Trail" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SettlementTab"
        component={SettlementStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-group" label="Camp" focused={focused} />
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

export default function AppNavigator() {
  const { state, isLoading } = useGame();
  useNotifications();

  useEffect(() => {
    AudioManager.init();
    return () => { AudioManager.cleanup(); };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.neonGreen, fontSize: fontSize.xl }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!state.onboardingComplete ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.textPrimary,
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
