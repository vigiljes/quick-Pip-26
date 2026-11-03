# quick-Pip-26

A Pip-Boy–style quest planner PWA that turns mundane daily stuff into quests.
Landscape-first and scales across iPhone, iPad and Mac. Works offline once installed.

> Fan-made personal project. Not affiliated with Bethesda.

## How it plays

**STATS**
- **S.P.E.C.I.A.L.**: the quest board. Each attribute row has quest slots. Tap an empty slot to create a quest, starting from a template ("Choose default") or blank.
  Completing a quest earns XP, caps and ★ stars for that attribute (1-3, by difficulty).
  **15 stars rank an attribute up**, and every rank unlocks another quest slot (3 base → 8 max). Tap the attribute tile to see its star grid.
- **Status**: health *mock*. Six daily metrics (sleep, resting HR, water, exercise, steps, mindful) drive the limb conditions and the HP/AP readout. Values are entered by hand and reset each day. See `js/health.js` for the HealthKit v2 plan.
- **Skills / Perks / General**: skills derived from ranks and finished quests, achievement perks, lifetime stats and an event log.

**ITEMS**: Weapons (tools & gear), Apparel, Aid (consumables), Misc, Ammo (supplies). Items have qty, weight, value, a low-stock threshold (makes a "restock" quest) and a storage location. Quests can list required items.

**DATA**
- **Local / World Map**: OpenStreetMap tinted to the display color. Mark locations, search places, use GPS. Locations link to quests and items. Visited tiles are cached for offline use.
- **Quests**: the full quest log. Check off objectives, complete, edit, or export to Calendar (.ics with alarm and repeat).
- **Notes**: "holotapes" for free-form notes.
- **Radio**: import your own MP3 / AAC / M4A files into stations. Audio is stored on-device (IndexedDB) and plays offline, with lock-screen controls.

Settings (gear icon) cover display color (green / amber / blue / white / red), scanlines, flicker, sound FX, backup export/import and reset.
Keyboard on Mac: `1` `2` `3` switch tabs; `←` `→` (or `Q` `E`) switch sub-tabs; `Esc` closes dialogs.

## Tech

No build step. Plain ES modules + [Preact](https://preactjs.com) / [htm](https://github.com/developit/htm) and [Leaflet](https://leafletjs.com), all vendored in `app/vendor/`, so nothing needs installing and Netlify just serves the folder.

```
app/
  index.html, manifest.webmanifest, sw.js   PWA shell + service worker
  css/pipboy.css                            CRT theme, layout, responsive rules
  js/data.js                                S.P.E.C.I.A.L., quest templates, item categories, skills  <- customize here
  js/game.js                                ranks, slots, XP, perks, calendar export
  js/store.js                               state + localStorage persistence
  js/health.js                              health provider (mock today, HealthKit later)
  js/radio.js                               audio import/playback
  js/screens/*.js                           STATS / ITEMS / DATA screens and editors
netlify.toml                                publish = "app", cache headers, SPA fallback
```

All data lives on the device (localStorage + IndexedDB). Use **Export backup** in Settings to move between devices.

## Run locally

```bash
python3 -m http.server 5173 --directory app
```

Open http://localhost:5173. The service worker is skipped on localhost so edits show up right away; use http://localhost:5173/?sw to test offline mode.

## Deploy to Netlify from GitHub

1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project → GitHub** and pick the repo.
3. Leave the build command empty. `netlify.toml` already sets the publish directory to `app`.
4. Deploy. Every push to the main branch redeploys.

When you ship changes, bump `VERSION` in `app/sw.js` so installed copies refresh their offline cache promptly.

## Install

- **iPhone / iPad**: open the site in Safari → Share → **Add to Home Screen**.
- **Mac**: Safari → File → **Add to Dock** (or Chrome → Install).

## Known limits (v1)

- **Reminders**: web apps on iOS can't schedule local notifications in the background. In-app alerts fire while quick-Pip is open; use the **Calendar** button on a quest for a system reminder that always fires.
- **Health** is a mock. Real HealthKit data needs a native wrapper (e.g. Capacitor or a small SwiftUI WKWebView shell) that implements the provider in `js/health.js`.
- Map tiles come from the public OpenStreetMap servers, which is fine for personal use. For heavier use, switch `TILE_URL` in `js/screens/map.js` to a provider with an API key.
- Data is per-device and per-browser. Clearing Safari website data erases it, so export backups now and then.
