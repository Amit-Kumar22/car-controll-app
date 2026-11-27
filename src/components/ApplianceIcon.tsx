import {
  AirVent, Bell, Blinds, Camera, CookingPot, Cog, Cpu, DoorOpen, Droplets, Fan, Flame, Gauge, Heater, Lamp,
  LampCeiling, LampDesk, Lightbulb, Lock, Microwave, Monitor, Moon, Plug, PlugZap, Power, Refrigerator, Router,
  ShowerHead, Siren, Speaker, Sprout, Sun, Thermometer, Tv, WashingMachine, Waves, Wifi, Wind, Zap,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react-native';

/**
 * Icon names an appliance can use. The website's App config editor offers the
 * same names (iot-platform/src/lib/appliance-icons.ts). Keep both lists in sync;
 * an unknown name shows the Power icon.
 */
export const APPLIANCE_ICONS: Record<string, LucideIcon> = {
  bulb: Lightbulb,
  lamp: Lamp,
  'lamp-desk': LampDesk,
  'lamp-ceiling': LampCeiling,
  fan: Fan,
  ac: AirVent,
  heater: Heater,
  tv: Tv,
  monitor: Monitor,
  speaker: Speaker,
  plug: Plug,
  socket: PlugZap,
  power: Power,
  fridge: Refrigerator,
  washer: WashingMachine,
  microwave: Microwave,
  cooker: CookingPot,
  water: Droplets,
  geyser: ShowerHead,
  pump: Waves,
  door: DoorOpen,
  lock: Lock,
  bell: Bell,
  alarm: Siren,
  camera: Camera,
  router: Router,
  wifi: Wifi,
  blinds: Blinds,
  sun: Sun,
  moon: Moon,
  plant: Sprout,
  motor: Cog,
  cpu: Cpu,
  gauge: Gauge,
  thermometer: Thermometer,
  wind: Wind,
  flame: Flame,
  zap: Zap,
};

/** Renders the icon for an appliance's icon name (unknown names → Power). */
export function ApplianceGlyph({ name, ...props }: { name: string } & LucideProps) {
  const Icon = APPLIANCE_ICONS[name] ?? Power;
  return <Icon {...props} />;
}
