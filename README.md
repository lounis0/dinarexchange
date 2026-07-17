# DinarExchange

Real-time official and parallel market exchange rates for the Algerian Dinar (DZD).

DinarExchange is a static Progressive Web App that displays side-by-side exchange rates from two sources: the official banking rate (European Central Bank via Frankfurter API) and the informal parallel market rate (Square Port-Saïd d'Alger estimates). It works fully offline once loaded and can be installed on any device.

---

## Features

- **Dual market rates** — Official and parallel rates displayed together for each currency
- **Currency converter** — Convert between any tracked currency and DZD using either rate source
- **Historical charts** — Canvas-rendered rate history over 7, 30, or 90 days
- **Favorites** — Pin frequently checked currencies for quick access
- **Offline support** — Service Worker caches the entire app shell; works without network
- **Installable PWA** — Add to home screen on mobile or desktop
- **OTA updates** — Built-in update checker that preserves user data across versions

## Tracked currencies

USD, EUR, GBP, CHF, CAD, AED, SAR, CNY, TRY, TND, MAD, JPY

## Data sources

| Source | Provider | Description |
|---|---|---|
| Official rates | [Frankfurter API](https://www.frankfurter.app/) | European Central Bank reference rates |
| Parallel rates | `parallel.json` | Manual estimates based on Square Port-Saïd d'Alger |

The official rates update automatically from the API. Parallel rates are maintained manually in `parallel.json` and follow a buy/sell/mid format.

---

## Project structure

```
DinarExchange/
├── index.html             # Entry point
├── app.js                 # SPA router, boot sequence, nav
├── render.js              # All view rendering (home, detail, converter, settings, etc.)
├── store.js               # State management backed by LocalStorage
├── api.js                 # API calls to Frankfurter, parallel data loading
├── config.js              # App constants, tracked currencies, i18n strings
├── charts.js              # Canvas chart rendering
├── icons.js               # Inline SVG icon library
├── dialog.js              # Modal dialog system
├── style.css              # Full design system (CSS custom properties)
├── fonts.css              # @font-face declarations for Inter
├── service-worker.js      # Offline caching (cache-first for shell, network-first for API)
├── manifest.json          # PWA manifest
├── version.json           # Current version metadata (used by update checker)
├── parallel.json          # Parallel market rate data
├── official-cache.json    # Fallback cache for official rates
├── vercel.json            # Vercel deployment config
├── robots.txt             # Search engine directives
├── sitemap.xml            # Sitemap
├── llms.txt               # AI crawler description
├── .well-known/
│   └── ai-plugin.json     # AI plugin manifest
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable.png
├── assets/
│   ├── logo.svg
│   ├── logo.png
│   └── flags/             # Country flag PNGs by currency code
├── fonts/                 # Inter font files (woff2)
├── fetch-flags.js         # Node script to download flag assets
└── fetch-fonts.js         # Node script to download font files
```

## Technical details

**No frameworks, no bundler, no npm dependencies.** The entire app is vanilla JavaScript using ES Modules, loaded directly by the browser. There is no build step.

### Routing

Hash-based SPA routing (`#/home`, `#/detail/USD`, `#/converter`, etc.) handled in `app.js`. All navigation goes through `window.location.hash`.

### State management

`store.js` provides a minimal reactive store backed by `localStorage`. Components subscribe to state changes and re-render when relevant data updates. User preferences (favorites, settings, onboarding status) persist across sessions.

### Caching strategy

The Service Worker (`service-worker.js`) uses three strategies:

| Resource | Strategy | Details |
|---|---|---|
| App shell (JS, CSS, HTML, icons) | Cache first | Cached on install, served from cache |
| Frankfurter API responses | Network first (8s timeout) | Falls back to cached response if network fails |
| `parallel.json` | Stale-while-revalidate | Serves cached copy immediately, updates in background |

### Update mechanism

The app checks `version.json` for new versions. When a newer version is detected, the user is prompted to update. The update clears the Service Worker cache and reloads the app without resetting user data (favorites, settings are in `localStorage`, not in the cache).

---

## Deployment

### Vercel (recommended)

1. Push this repo to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Deploy with default settings — no configuration needed

The included `vercel.json` handles:
- SPA fallback routing (all paths rewrite to `index.html`)
- Correct MIME types for JS and CSS files
- Service Worker cache headers

### Any static host

This is a static site. Copy all files to any web server (Netlify, GitHub Pages, Cloudflare Pages, nginx, Apache). The only requirement is that `index.html` is served for all routes (SPA fallback), or rely on the hash routing which works without server config.

For GitHub Pages specifically, hash routing works out of the box with no additional setup.

---

## Development

No install needed. Open `index.html` in a browser or run any local server:

```bash
# Python
python -m http.server 5500

# Node (npx)
npx serve .
```

### Utility scripts

These are one-time Node.js scripts to download assets. They are not part of the app runtime.

```bash
# Download country flag images
node fetch-flags.js

# Download Inter font files
node fetch-fonts.js
```

### Updating parallel rates

Edit `parallel.json` directly. Format:

```json
{
  "USD": { "buy": 228, "sell": 230, "mid": 229 },
  "EUR": { "buy": 248, "sell": 250, "mid": 249 }
}
```

### Releasing a new version

1. Make your changes
2. Update `version.json` with a higher version number
3. Update `CACHE_VERSION` in `service-worker.js` to match
4. Deploy — existing users will be prompted to update

---

## License

All rights reserved. LOUNIS NAIT BELKACEM.
