import { AirVent, Fan, Lamp, Lightbulb, Plug, Tv, type LucideIcon } from 'lucide-react-native';
import type { ApplianceIconName } from '../config';

/** Maps the icon names used in src/config APPLIANCES to icon components. */
export const APPLIANCE_ICONS: Record<ApplianceIconName, LucideIcon> = {
  bulb: Lightbulb,
  fan: Fan,
  plug: Plug,
  tv: Tv,
  ac: AirVent,
  lamp: Lamp,
};
