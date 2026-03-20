import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameProvider } from './src/context/GameContext';
import AppNavigator from './src/navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GameProvider>
          <AppNavigator />
        </GameProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
