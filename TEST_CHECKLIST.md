# Manual Test Checklist – Robotics Trainer

Device: ____________  Android version: ______  Build: debug / release  Tester: ______  Date: ______

Run on a **physical Android phone**. Do one pass with a fresh install (clear app data first), then
one pass after a restart. Tick each item; write the issue next to anything that fails.

## A. Install and general

- [ ] A1 The app installs and opens on the Home screen with the title and two cards (car icon, house icon).
- [ ] A2 Dark mode: switch the system theme. All screens are readable and nothing is white-on-white.
- [ ] A3 Rotate the phone on the car control screen. The layout adapts to landscape (D-pad left, STOP right) and back.

## B. Permissions

- [ ] B1 Android 12+: Open *Robot Car Control*. An in-app explanation of "Nearby devices" appears **before** the system dialog.
- [ ] B2 Android 11 or lower: The explanation mentions Location (needed for Bluetooth discovery).
- [ ] B3 Tap *Not now*. The app shows a clear error and doesn't crash.
- [ ] B4 Deny twice ("Don't ask again"). The app offers *Open settings*, and it opens the app's settings page.
- [ ] B5 Open *Home Automation*. The Location explanation appears before the system dialog (needed for the Wi-Fi name).
- [ ] B6 Grant all permissions. The flows continue without restarting the app.

## C. Pairing and connecting the HC-05

- [ ] C0 Tapping *Robot Car Control* opens the control screen (D-pad visible but disabled). A "Car not connected" panel with **Connect to Bluetooth** is at the top, and the red bar has a **Connect** button.
- [ ] C0b **Connect to Bluetooth** opens the device list. After connecting, the app returns to the control screen automatically.
- [ ] C1 The connect screen shows the hint "PIN is usually 1234 or 0000".
- [ ] C2 Turn Bluetooth off, then open the screen. The app asks to turn it on. Decline: a clear message appears.
- [ ] C3 The paired HC-05 is listed first and highlighted as a robot car.
- [ ] C4 *Scan for new devices* shows a loading state, and nearby unpaired devices appear under "New devices".
- [ ] C5 Tap HC-05. A spinner shows on the row, the screen changes to controls, and a green bar reads "Connected to HC-05". The HC-05 LED switches to slow blink.
- [ ] C6 Car switched off, tap HC-05. A clear timeout or failure message appears within about 15 s.
- [ ] C7 Go back, then reopen *Robot Car Control*. "Reconnect to HC-05" is shown and works.
- [ ] C8 Kill and restart the app. "Reconnect to HC-05" is still shown (remembered).

## D. Driving – each direction

Lift the car's wheels off the table, or use a Serial monitor on the Arduino.

- [ ] D1 Tap **Forward**: the car moves forward and stops when released. Serial shows `F…S`.
- [ ] D2 Tap **Backward**: `B…S`.
- [ ] D3 Tap **Left**: `L…S`.
- [ ] D4 Tap **Right**: `R…S`.
- [ ] D5 Each press gives a light vibration (haptic).
- [ ] D6 Commands are single characters with no newline (check the Serial monitor in HEX mode).

## E. Hold-to-move

- [ ] E1 Hold Forward for 3 s. The car drives continuously and the Serial monitor shows about 6–7 `F` per second.
- [ ] E2 Release. The car stops immediately (`S` arrives within about 150 ms).
- [ ] E3 Hold Forward and slide your finger off the button. The car stops.
- [ ] E4 Hold Left, then put a second finger on Right and lift the first. The car turns right, then stops when all fingers are lifted.
- [ ] E5 While holding, the screen doesn't scroll or bounce.

## F. STOP and safety

- [ ] F1 The big red **STOP** sends `S` as soon as it is touched.
- [ ] F2 Hold Forward and press the Home button (app to background). The car stops.
- [ ] F3 Hold Forward and press Back (screen loses focus). The car stops.
- [ ] F4 Lock the screen while driving. The car stops.
- [ ] F5 On connect and on reconnect, the car stays stopped (an `S` is sent).

## G. Connection loss

- [ ] G1 While connected, switch off the car's power. Within a few seconds an alert appears: "Connection lost – car stopped", and the bar turns red.
- [ ] G2 The D-pad and STOP are greyed out and do nothing.
- [ ] G3 Power the car back on, then tap **Reconnect** in the alert. It reconnects and the controls work again.
- [ ] G4 Walk out of range while holding Forward. The alert appears and the controls are disabled.
- [ ] G5 Turn off phone Bluetooth while connected. The alert appears.
- [ ] G6 Mock mode only: *Simulate connection loss* triggers the same alert.

## H. Joining the ESP32 hotspot

- [ ] H0 Tapping *Home Automation* opens the appliance panel. If the box isn't connected, a **Connect to control box** button is shown at the top.
- [ ] H1 **Connect to control box** opens the "Control box" screen. Defaults are filled in: `RoboHome-Box`, `robohome123`, `192.168.4.1`.
- [ ] H2 The current Wi-Fi name is shown (for example the school Wi-Fi).
- [ ] H3 Tap *Connect to control box*. Android shows its "connect to device" dialog, then the phone joins RoboHome-Box, then the pills show "Wi-Fi: RoboHome-Box" (green) and "Box reachable" (green), then the app returns to the appliance panel.
- [ ] H4 Wrong password in settings: a clear "Wrong password" message appears with the *Open Wi-Fi settings* fallback.
- [ ] H5 *Open Wi-Fi settings* opens Android Wi-Fi settings. Join manually, come back and tap *Check again*: reachable.
- [ ] H6 Change the IP and save, then kill and restart the app. The value is kept. *Defaults* restores the original values.
- [ ] H7 An invalid IP (for example `192.168.4`) shows a field error and Save is refused.

## I. Box reachable while the hotspot has no internet

- [ ] I1 Turn **mobile data ON** and join RoboHome-Box. The box is still reachable, so requests aren't going over mobile data.
- [ ] I2 Android shows "No internet" on the Wi-Fi. The app still controls the box.
- [ ] I3 Leave the phone on the hotspot for 2 minutes. Android doesn't switch back to mobile data, and toggles still work.
- [ ] I4 Go back to the Home screen. Other apps (for example a browser) use mobile data again.

## J. Appliances ON/OFF

- [ ] J1 The control panel shows Bulb and Fan cards with icon, name and an ON/OFF label.
- [ ] J2 On open, the cards show the real state from `/status`. Set the bulb ON at the box first, then open the app: it shows ON.
- [ ] J3 Tap **Bulb**: a spinner shows on the card, the bulb turns on, and the card turns teal with "ON".
- [ ] J4 Tap **Bulb** again: the bulb turns off, and the card turns grey with "OFF".
- [ ] J5 Tap **Fan** ON and then OFF: same behaviour.
- [ ] J6 Pull down to refresh: the state reloads from `/status`.
- [ ] J7 Change state outside the app (browser to `192.168.4.1/fan/on`), then pull to refresh: the card updates.
- [ ] J8 Tapping fast several times doesn't send overlapping requests for the same card (it is locked while loading).
- [ ] J9 The top indicator shows "Control box online · 192.168.4.1".

## K. Box unreachable

- [ ] K1 Switch off the ESP32 while on the control panel. Within about 5 s the indicator turns red: "Control box not reachable".
- [ ] K2 Tap a card while the box is off. The spinner shows for at most about 3 s, then the card **reverts** and a toast appears: "…did not answer in time – switch not changed".
- [ ] K3 Pull to refresh while the box is off. An error toast appears and the app doesn't freeze.
- [ ] K4 Switch the ESP32 back on. The indicator turns green on its own (or after *Reconnect to box*).
- [ ] K5 Mock mode only: *Mock: toggle box reachable* reproduces K1–K4.

## L. Release build

- [ ] L1 `npm run build:apk` produces `app-release.apk`. It installs and runs without Metro.
- [ ] L2 Repeat C5, E1, F1, H3 and J3 on the release build.

---
Result: ☐ PASS ☐ FAIL  Notes: ___________________________________________
