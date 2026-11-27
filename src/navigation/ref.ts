import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/** Lets non-screen code (e.g. a tapped push notification) navigate. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
