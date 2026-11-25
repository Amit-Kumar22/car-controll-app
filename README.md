# Robotics Trainer

Android app for robotics trainers and students. It does two things:

- **Robot Car Control** drives an HC-05 Bluetooth car with a hold-to-move D-pad and a big STOP button.
- **Home Automation** switches the appliances on the ESP32 "RoboHome-Box" over its Wi-Fi hotspot.

Stack: Expo SDK 58 (development build, so native modules work) · React Native 0.88 · TypeScript ·
React Navigation native stack · Zustand + AsyncStorage · `react-native-bluetooth-classic` ·
`react-native-wifi-reborn` · lucide icons.

---

## 1. Project layout

```
App.tsx                     Root: theme, navigation, toast host
app.json                    Expo config: Android package, permissions, plugins
plugins/withReleaseSigning.js  Adds release signing to the generated Gradle file
src/
  config/index.ts           ALL hardware values: commands, SSID, IP, appliances, MOCK_MODE
  theme/index.ts            Colours (light/dark), spacing, radius, font sizes
  services/
    bluetooth.ts            HC-05 link (real + mock): connect, send, disconnect events
    wifi.ts                 Join hotspot, force traffic over Wi-Fi, open settings (real + mock)
    homeApi.ts              ESP32 HTTP client with 3 s timeout (real + mock)
    permissions.ts          Explains each permission, then requests it
  store/                    Zustand stores: carStore, homeStore, toastStore
  hooks/useHoldToMove.ts    Hold-to-move timing, stop on release/blur/background
  components/               UI building blocks (DPad, ApplianceCard, Toast, ui.tsx)
  screens/                  Home, CarConnect, CarControl, HomeConnect, HomeControl
  navigation/               Stack navigator + route types
```

UI components never call Bluetooth, Wi-Fi or `fetch` directly. They go through the stores, and the
stores call `src/services`.

---

## 2. Setup

Requirements: Node 20+, JDK 17 or 21, Android Studio (SDK 36, platform-tools), and an Android phone
with **Developer options → USB debugging** turned on.

```bash
npm install
```

`android/` is generated from `app.json` (Expo "Continuous Native Generation") and is git-ignored.
Don't edit it by hand. Change `app.json` or `plugins/` and run `npm run prebuild`.

---

## 3. Running on a physical Android phone

Plug the phone in over USB and check that `adb devices` lists it. Then run:

```bash
npm run android          # builds + installs the dev build and starts Metro
```

Later runs only need `npm start`, then open the app on the phone.

**MOCK mode (no hardware):**

```bash
npm run android:mock     # dev build with simulated car + control box
# or, to try it in Expo Go:
npm run start:mock
```

Mock mode is controlled by `MOCK_MODE` in `src/config/index.ts`, or by the
`EXPO_PUBLIC_MOCK_MODE=true` environment variable. In mock mode:

- the "HC-05" device connects and other devices fail;
- the control screen shows the last command the car "received" and has a **Simulate connection loss** button;
- the control panel has a **Mock: toggle box reachable** button.

> **Testing the hotspot with a dev build:** once the phone joins `RoboHome-Box` it can no longer
> reach Metro on your laptop over Wi-Fi. Either keep USB connected and run
> `adb reverse tcp:8081 tcp:8081` before opening the app, or (more reliably) test home automation
> with a release APK (section 4).

---

## 4. Building a signed release APK

### 4.1 Create an upload keystore (once)

Keep it safe and never commit it.

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/keys/robotics-trainer-upload.keystore \
  -alias robotics-trainer -keyalg RSA -keysize 2048 -validity 10000
```

### 4.2 Tell Gradle where it is

Add these lines to `~/.gradle/gradle.properties` (your user folder, not the repo):

```properties
ROBO_UPLOAD_STORE_FILE=/Users/<you>/keys/robotics-trainer-upload.keystore
ROBO_UPLOAD_STORE_PASSWORD=your-store-password
ROBO_UPLOAD_KEY_ALIAS=robotics-trainer
ROBO_UPLOAD_KEY_PASSWORD=your-key-password
```

`plugins/withReleaseSigning.js` inserts a `release` signing config that reads these properties. If
they are missing, the release build is signed with the debug key. That's fine for classroom
installs, but don't use it for Play Store uploads.

### 4.3 Build

```bash
npm run build:apk          # → android/app/build/outputs/apk/release/app-release.apk
npm run build:apk:mock     # same, but with MOCK mode baked in (demo APK)
```

Install it on a connected phone:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

To share it, send the `.apk` file to students. They need to allow "Install unknown apps" for the app
they open it from. Before each new release, bump `android.versionCode` in `app.json`.

Cloud alternative: `npx eas-cli@latest build -p android --profile preview`. You need an Expo account
for this, and EAS manages the keystore.

---

## 5. Pairing the HC-05

1. Power the car. The HC-05 LED blinks fast, which means it isn't connected.
2. On the phone, open **Settings → Bluetooth → Pair new device**.
3. Choose **HC-05** (it may show up as a MAC address at first), then enter PIN **1234**. If that
   fails, try **0000**.
4. Open the app → **Robot Car Control**. HC-05 is listed under *Paired devices*, highlighted as a
   likely robot car. Tap it to connect.
5. When it connects, the LED blinks slowly (about every 2 s) and the status bar turns green.

Next time, use **Reconnect to HC-05** at the top of the connect screen.

You can also tap **Scan for new devices** in the app. When you connect to an unpaired device,
Android asks for the PIN.

Wiring reminder: HC-05 TX → Arduino RX, HC-05 RX → Arduino TX through a voltage divider (the
HC-05 RX pin is 3.3 V). Serial speed is 9600 baud by default.

The Arduino sketch should read single characters:

```cpp
void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    switch (c) {
      case 'F': forward();  break;
      case 'B': backward(); break;
      case 'L': left();     break;
      case 'R': right();    break;
      case 'S': stopCar();  break;
    }
  }
}
```

Tip: the app re-sends the held direction every 150 ms. Add a failsafe to the sketch that stops the
motors if nothing arrives for about 500 ms. Then the car stops even if the phone dies mid-drive.

---

## 6. Changing commands, network settings and appliances

Everything lives in **`src/config/index.ts`**.

### Car commands

```ts
export const CAR_COMMANDS = { forward: 'F', backward: 'B', left: 'L', right: 'R', stop: 'S' };
export const HOLD_REPEAT_INTERVAL_MS = 150;
```

Change the characters to match your Arduino sketch.

### Control box defaults

```ts
export const HOME_BOX_DEFAULTS = { ssid: 'RoboHome-Box', password: 'robohome123', ip: '192.168.4.1' };
export const HTTP_TIMEOUT_MS = 3000;
```

Users can also change SSID, password and IP in the app (gear icon on the control panel). Those
values are saved on the phone, and **Defaults** restores the values from the config file.

### Adding an appliance (for example a socket)

1. On the ESP32, add `/socket/on` and `/socket/off` routes, and include `"socket": 0|1` in the
   `/status` reply.
2. In `src/config/index.ts`, add:
   ```ts
   { id: 'socket', name: 'Socket', icon: 'plug' },
   ```
   The `id` must match the URL path and the `/status` key. Available icons: `bulb`, `fan`, `plug`,
   `tv`, `ac`, `lamp`. To add another icon, map it in `src/components/ApplianceIcon.tsx` and add the
   name to `ApplianceIconName`.

No other changes are needed. The grid builds itself from the `APPLIANCES` array.

---

## 7. How the tricky parts work

- **Hold-to-move** (`useHoldToMove`): on press-in the app sends the direction straight away and then
  every 150 ms. On press-out it sends `S`. It also sends `S` when the screen loses focus, when the
  app goes to the background, and on disconnect. The STOP button reacts on *press-in*, so it fires
  as soon as your finger touches it.
- **Write queue** (`bluetooth.ts`): writes go out one at a time. If a repeated movement write is
  still in flight, the next repeat is dropped. `S` is never dropped.
- **Connection loss:** the app listens for the library's disconnect, Bluetooth-off and error events.
  A failed write also counts as a disconnect. On loss the controls are disabled and an alert offers
  **Reconnect**.
- **No-internet hotspot:** after joining, the app calls
  `forceWifiUsageWithOptions(true, { noInternet: true })`. That binds the app's traffic to Wi-Fi, so
  Android doesn't send it over mobile data. The binding is released on the Home screen.
- **Cleartext HTTP:** the ESP32 serves plain `http://`, so `usesCleartextTraffic` is enabled through
  `expo-build-properties`.

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| HC-05 not in the paired list | Pair it in Android Bluetooth settings first, then tap *Refresh paired list*. |
| "Connection timed out" | The car is off or out of range, or another phone is connected to it. An HC-05 accepts only one connection at a time. |
| Scan finds nothing | Turn on Location (GPS). Some phones need it for scanning. |
| Wi-Fi name shows "unknown" | Grant Location permission and turn Location on. Android hides the SSID otherwise. |
| Joined the hotspot but box not reachable | When Android asks about "No internet", tap *Stay connected*. Check the IP in settings, then tap *Check again*. |
| Automatic join fails | Use **Open Wi-Fi settings**, join manually, come back and tap **Check again**. |

Manual test steps are in [TEST_CHECKLIST.md](./TEST_CHECKLIST.md).
# car-controll-app
