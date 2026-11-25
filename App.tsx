import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from './src/components/Toast';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useTheme } from './src/theme';

export default function App() {
  const t = useTheme();
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
