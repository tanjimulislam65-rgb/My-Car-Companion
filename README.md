# My Car Companion

An offline-first personal vehicle logbook, initially configured for a Toyota Corolla Cross Hybrid (2021).

## Current features

- Responsive dashboard and bottom navigation
- Vehicle profile
- Maintenance history with mileage and cost
- Fuel fill-up log and basic full-to-full fuel economy calculation
- General vehicle expense tracking
- Date- and odometer-based reminders (in-app list)
- JSON backup and restore
- Dark/light theme preference
- Local IndexedDB storage; no account or server required

## Run locally

Because the app uses IndexedDB, serve the folder from a local web server rather than opening `index.html` as a `file://` URL.

For example, with Python installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## GitHub

1. Create a new GitHub repository named `my-car-companion`.
2. Upload the contents of this folder to the repository root, or use Git:

```bash
git init
git add .
git commit -m "Initial My Car Companion app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/my-car-companion.git
git push -u origin main
```

## Android APK integration

This repository currently contains the web application source. To package it as an Android APK, create an Android Studio **Empty Views Activity** project and place this repository's `index.html`, `css/`, `js/`, and `manifest.webmanifest` inside:

`app/src/main/assets/`

Then load the local page in a WebView. Native Android integration is still required for reliable scheduled notifications, Android file picker integration, and a production-grade backup/restore experience.

## Important notes

- Data is stored locally in the browser/WebView's IndexedDB. Clearing app data or uninstalling the app can erase it. Export backups regularly.
- Do not store sensitive personal or operational information in this app.
- Fuel economy is only calculated from consecutive full-tank entries and is a basic estimate. Keep odometer readings accurate.
- Maintenance intervals are user-configurable reminders, not manufacturer service recommendations.
- This is an early MVP. Test backup/restore before relying on it for long-term records.
