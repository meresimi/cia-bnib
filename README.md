# CIA Data App
## Bahá'í Centres of Intense Activity — Data Collection System

![CIA Logo](public/icon-192.png)

A cross-platform app (React + Capacitor + Electron) for collecting and reporting data from Bahá'í Centres of Intense Activity.

---

## Features

- 📋 **Data Collection Form** — Full CIA form with all required fields
- 📊 **Summary View** — Filter by National / Cluster / Localities
- ⬇️ **Excel Export** — Exports in the exact format of the official CIA template
- 🌍 **Cross-platform** — Android (via Capacitor), Desktop (via Electron), Web

---

## Quick Start

```bash
npm install
npm run dev           # Web dev server on :3000
```

## Build

```bash
npm run build         # Build Vite web app
npx cap sync android  # Sync to Android
npx cap open android  # Open in Android Studio → Build APK
```

## GitHub Actions

Push to `main` or `master` to trigger an automatic APK build.
The APK will be uploaded as a workflow artifact AND as a GitHub Release.

---

## Project Structure

```
cia-app/
├── src/
│   ├── main.tsx          # React entry point
│   └── App.tsx           # Full application
├── public/
│   ├── icon.png          # App icon (192px)
│   └── icon-*.png        # Various icon sizes
├── android/
│   └── app/src/main/
│       ├── java/com/cia/app/MainActivity.java
│       ├── res/mipmap-*/  # Android launcher icons
│       └── res/drawable/splash.png
├── electron/
│   └── main.js
├── .github/workflows/
│   └── build.yml         # APK build workflow
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

---

## Icon

The CIA globe icon is used:
- Android home screen launcher
- Android splash screen
- App header (top-right)
- Dashboard hero
- About page
