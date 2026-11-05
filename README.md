# Freelo – a free Arlo camera app (Expo Go)

```bash
npm install
npx expo start --tunnel   # scan the QR code with Expo Go (needs a free Expo login for --tunnel)
```

Features: sign-in with 2-step verification, camera list with battery/signal, snapshots, auto-refresh
picture, live video attempt, spotlight, privacy mode, motion sensitivity, arm/disarm modes, siren,
cloud library (if your account has one), and free local snapshot saving/sharing.

**Unofficial.** Arlo has no public API; this uses the same web endpoints the community has
reverse-engineered. It was type-checked but not tested against a real Arlo account, so some calls
may need tweaking in `src/arlo/client.ts`. Anything Arlo gates server-side (cloud recording
storage, AI detection) cannot be unlocked by an app.

## Free versions of paid features
- **Event history / cloud recording** → Settings → *Watch mode* saves every new motion image to your phone (Saved tab).
- **Motion alerts** → local notification + haptic on each event (app must stay open).
- Not possible: Arlo's server-side person/vehicle/package AI, and recording video clips in the background.

## TestFlight
Needs a paid Apple Developer account and a free Expo account.
```bash
npm i -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios --latest
```
