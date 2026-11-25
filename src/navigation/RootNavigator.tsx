import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CarConnectScreen } from '../screens/CarConnectScreen';
import { CarControlScreen } from '../screens/CarControlScreen';
import { HomeConnectScreen } from '../screens/HomeConnectScreen';
import { HomeControlScreen } from '../screens/HomeControlScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { useTheme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const t = useTheme();
  const base = t.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: t.colors.primary,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.text,
      border: t.colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.primaryText,
          headerTitleStyle: { fontWeight: '800', color: t.colors.text },
          contentStyle: { backgroundColor: t.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="CarConnect" component={CarConnectScreen} options={{ title: 'Connect to car' }} />
        <Stack.Screen name="CarControl" component={CarControlScreen} options={{ title: 'Robot Car Control' }} />
        <Stack.Screen name="HomeConnect" component={HomeConnectScreen} options={{ title: 'Control box' }} />
        <Stack.Screen name="HomeControl" component={HomeControlScreen} options={{ title: 'Home Automation' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
