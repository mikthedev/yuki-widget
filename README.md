# Waifu Widget

An AI voice companion you can drop onto any website. One line in DevTools and Yuki appears — she talks, listens, reacts to what's on screen, and expresses emotions.

---

## Add to any page

Open DevTools (`F12`) → Console, paste:

```js
(function(){var s=document.createElement("script");s.src="https://yuki-widget.vercel.app/yuki.js";document.head.appendChild(s)})();
```

That's it. No install, no config.

---

## Run locally

```bash
npm install
cp .env.example .env     # paste your INWORLD_API_KEY
npm start                 # http://localhost:8787
```

**Local DevTools embed:**
```js
(function(){var s=document.createElement("script");s.src="http://localhost:8787/yuki.js";document.head.appendChild(s)})();
```

---

## What Yuki does

| Feature | Details |
|---------|---------|
| Voice | Speech-to-speech via Inworld Realtime (WebRTC on Vercel, WebSocket locally) |
| Emotions | 8 sprites — idle, happy, excited, sad, talking, thinking, listening, worried |
| Sentiment | Detects tone of her own responses and switches sprite accordingly (laughs → excited, sad topic → worried) |
| Game reactions | Reacts to wins and losses on casino sites — reads DOM, iframes, postMessage, canvas vision |
| Win cooldown | Same win amount won't be repeated within 10 s; resets when a new spin starts |
| Mobile | Stays visible and tappable above fullscreen game iframes |
| Screen context | Detects SPA navigation, resets stale game context automatically |

---

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `INWORLD_API_KEY` | `.env` / Vercel | Base64 credential from Inworld Portal |
| `PORT` | `.env` | Local server port (default `8787`) |

---

## Project structure

```
yuki-widget.js        ← built bundle (paste or <script src>)
yuki.js               ← tiny loader, auto-detects origin
index.html            ← minimal host page (just loads yuki.js)

js/
  widget.js           ← UI, emotion state machine, drag, toasts
  voice.js            ← Inworld Realtime client, WebRTC / WebSocket
  screen.js           ← screen capture, DOM scan, game event detection
  character.js        ← reaction lines, emotion mapping
  sessionConfig.js    ← Yuki's personality & voice preset
  config.js           ← client config, asset/API URL resolution
  runtime.js          ← mode detection (local vs Vercel)

lib/
  describe-screen.mjs ← analyzes screen data, detects game events
  inworld-router.mjs  ← Vision API proxy
  inworld-jwt.mjs     ← JWT helper for Inworld auth

api/
  webrtc-config.js    ← Vercel: mints WebRTC token
  describe-screen.js  ← Vercel: screen analysis endpoint
  voice-config.js     ← Vercel: exposes runtime config to client
  health.js           ← Vercel: health check

server/
  index.js            ← local static server + WebSocket proxy
  sessionConfig.js    ← local session config

scripts/
  bundle-yuki.mjs     ← builds yuki-widget.js from source
  vercel-build.mjs    ← Vercel build step (writes runtime, rebuilds bundle)

assets/               ← 8 PNG emotion sprites
```

---

## Rebuild the bundle

After editing any source file:

```bash
npm run bundle
```

The bundle bakes in CSS, all JS modules, and resolves asset URLs from `__YUKI_ORIGIN__` so sprites load from wherever `yuki.js` is served.

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Import on [vercel.com](https://vercel.com) — **Framework: Other**
3. Add `INWORLD_API_KEY` under Settings → Environment Variables
4. Redeploy

Vercel runs `node scripts/vercel-build.mjs` which writes the correct runtime config and rebuilds the bundle before deploying.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No voice locally | `npm start` must be running; check `INWORLD_API_KEY` in `.env` |
| Sprites missing on paste | Use the hosted `yuki.js` URL — it sets the asset origin automatically |
| Voice not working on paste | Same — use the hosted URL, not a local file path |
| Yuki reacts on non-game pages | `isGameActive()` in `screen.js` filters static pages; add URL pattern if needed |
| Same win announced twice | 10 s cooldown is active; different amounts still go through immediately |

```bash
npm run test:greeting   # quick API connectivity check → should print SUCCESS
```
