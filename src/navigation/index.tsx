import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';
import { colors, fontSize } from '../theme';

// Screens
import TrailScreen from '../screens/Trail/TrailScreen';
import SettlementScreen from '../screens/Settlement/SettlementScreen';
import WardrobeScreen from '../screens/Settlement/WardrobeScreen';
import CodexScreen from '../screens/Codex/CodexScreen';
import CodexEntryScreen from '../screens/Codex/CodexEntryScreen';
import ArcadeScreen from '../screens/Arcade/ArcadeScreen';
import MiniGameScreen from '../screens/Arcade/MiniGameScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const TrailStack = createNativeStackNavigator();
const SettlementStack = createNativeStackNavigator();
const CodexStack = createNativeStackNavigator();
const ArcadeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.icon, focused && tabIconStyles.iconActive]}>{icon}</Text>
      <Text style={[tabIconStyles.label, focused && tabIconStyles.labelActive]}>{label}</Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  icon: { fontSize: 22 },
  iconActive: { fontSize: 24 },
  label: { fontSize: 10, color: colors.tabInactive, marginTop: 2 },
  labelActive: { color: colors.tabActive, fontWeight: '600' },
});

// ─── Stack Navigators ───

function TrailStackNavigator() {
  return (
    <TrailStack.Navigator screenOptions={screenOptions}>
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
        options={{ title: 'Wardrobe' }}
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
            <TabIcon icon="🛤️" label="Trail" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="SettlementTab"
        component={SettlementStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏘️" label="Settlement" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="CodexTab"
        component={CodexStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📖" label="Codex" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="ArcadeTab"
        component={ArcadeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🕹️" label="Arcade" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───

export default function AppNavigator() {
  const { state, isLoading } = useGame();

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
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
