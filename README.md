# CIA Data App
## Bahá'í Centres of Intense Activity — Data Collection System

![CIA Logo](public/icon-192.png)

A cross-platform Android app (React + Capacitor) for collecting, viewing, and exporting data from Bahá'í **Centres of Intense Activity** in the Solomon Islands.

---

## Features

- 📋 **Data Collection Form** — Collects CIA data per cycle: region, cluster, CIA name, rural/urban, population, households, individuals/households connected, and all core activity numbers
- 📊 **Summary View** — Browse all submitted CIA records; search by CIA name, cluster, or region; expand each card for full details
- ⬇️ **Excel Export** — Export all records to a `.xlsx` spreadsheet that pixel-perfectly matches the official CIA template: exact fills, fonts (Times New Roman headers, Calibri notes), borders on every cell, merged header regions, column widths, and row heights. Shared directly from the device via the native Android share sheet (Gmail, WhatsApp, Drive, etc.)
- 📚 **Resources** — Browse UHJ messages referencing Centres of Intense Activity, with in-app document reader that jumps directly to the relevant paragraph
- ⚙️ **Settings** — Switch between Daylight and Night themes
- ℹ️ **About** — App info and version
- 🌍 **Android** — Built with Capacitor for Android; APK auto-built via GitHub Actions

---

## Pages

| Page | Description |
|------|-------------|
| Dashboard | Home screen with navigation tiles and CIA globe hero |
| Data Collection Form | Multi-field form to record CIA cycle data; supports multiple entries |
| Summary | Searchable list of all submitted records with expandable detail cards |
| Cycle Report | *(Under development)* |
| Resources | UHJ messages with highlighted CIA references; tap to read full document |
| Settings | Theme toggle (Daylight / Night) |
| About | Developer info and version |

---

## Data Fields Collected

**General Information:** Region · Cluster · CIA Name · Rural/Urban · Population · Households · Individuals Connected · Households Connected

**Core Activities (No. / Attendance / FoF per activity type):** Children's Classes · Junior Youth Groups · Study Circles · Devotional Meetings · *(Total auto-calculated)*

**Human Resource Development:** Book 1 Completions · Total Ruhi Completions · New Human Resources · Total Human Resources · Individuals who Accompany

**Community Life & Indicators:** No. of Pockets · Regular Community Undertakings · Local Assembly Support · Social Action · Local Leaders/Chiefs Involvement · Efforts to Foster Spiritual Health · Comments

> ⚠️ *The field list above reflects the actual exported template columns. Earlier versions of this README listed different fields — those have been corrected.*

---

## Quick Start

```bash
npm install
npm run dev           # Web dev server on :5173
```

## Build

```bash
npm run build         # Build Vite web app
npx cap sync android  # Sync to Android
npx cap open android  # Open in Android Studio → Build APK
```

## GitHub Actions (Manual)

Go to **Actions → Build CIA APK → Run workflow** to manually trigger an APK build.  
The APK is uploaded as a workflow artifact and published as a GitHub Release.

> **CI note:** The workflow uses the Gradle wrapper already committed in `android/gradle/wrapper/gradle-wrapper.properties` (Gradle 8.7). There is no separate "Set up Gradle" step — `./gradlew` handles its own distribution download automatically.

---

## Project Structure

```
cia-bnib/
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Full application (all pages, components, logic)
│   └── documents.ts      # UHJ message HTML documents + shared CSS
├── public/
│   ├── icon.png          # App icon
│   └── icon-*.png        # Various icon sizes
├── android/
│   └── app/src/main/
│       ├── java/com/cia/app/MainActivity.java
│       ├── res/mipmap-*/  # Android launcher icons
│       └── res/drawable/splash.png
├── .github/workflows/
│   └── build.yml         # Manual APK build workflow
├── capacitor.config.ts
├── vite.config.ts
└── package.json
```

---

## Icon & Branding

The CIA globe icon appears on:
- Android home screen launcher (adaptive icon, 70% of frame)
- Android splash screen (centered on white background)
- App header (top-right, 43×43px)
- Dashboard hero (background watermark)

---

## Tech Stack

- **React + TypeScript** — UI
- **Vite** — Build tool
- **Capacitor 6** — Android wrapper
- **jszip** — Excel export (hand-built OOXML; full style support without Node.js dependencies)
- **Firebase** — *(not yet integrated)*
- **GitHub Actions** — APK CI/CD

---

## About

Created on **3 June 2026** by **Simiona Bobai**, a full stack developer and member of the Bahá'í community in Honiara, Solomon Islands.  
Built to assist the **National Institute Board Admin** in gathering CIA data for the Counsellors.

Version 1.0.0 · CIA Data System · 2026
