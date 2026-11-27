import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from './src/components/Toast';
import { usePushNavigation } from './src/hooks/usePushNavigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppConfigStore } from './src/store/appConfigStore';
import { useTheme } from './src/theme';

export default function App() {
  const t = useTheme();
  usePushNavigation();
  // Download the latest appliance list from the website (cached for offline use).
  useEffect(() => {
    useAppConfigStore.getState().refresh({ force: true });
  }, []);
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: t.colors.background }}>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <RootNavigator />
        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
