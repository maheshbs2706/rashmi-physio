# Clinic Patient Manager (PWA)

This is a **Progressive Web App (PWA)** for maintaining clinic patients, visits, and payments.

## Features
- Patient management (photo, details, notes, per-visit charge)
- Visit & payment tracking with balance calculation
- Overall reports (with filters, CSV export, print)
- Backup/Restore JSON
- Works offline (PWA with service worker)
- Installable on Android/iOS/desktop

## Hosting on GitHub Pages
1. Fork or clone this repo, or upload files into a new GitHub repo.
2. Go to **Settings > Pages**.
3. Select **Branch: main** and root folder `/`.
4. Save — GitHub Pages will give you a live URL like:
   ```
   https://your-username.github.io/clinic-app/
   ```

Open that URL in Chrome → "Add to Home Screen" → app is installed.

## Development (Local)
Run a simple server:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080`
