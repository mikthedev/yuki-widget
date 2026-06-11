/**
 * Yuki Widget — single-file voice companion (Inworld Realtime)
 * Loaded automatically by yuki.js — you rarely paste this directly.
 *
 * ONE-LINE EMBED (DevTools console):
 *   (function(){var s=document.createElement("script");s.src="http://localhost:8787/yuki.js";document.head.appendChild(s)})();
 *
 * Replace localhost:8787 with your deployed URL on Vercel.
 * No extra config needed — apiBase & assetBase auto-detect from script URL.
 */

(function () {
  "use strict";
  if (window.__YUKI_BUNDLE_LOADED__) {
    console.warn("[Yuki] already loaded");
    return;
  }
  window.__YUKI_BUNDLE_LOADED__ = true;

  const style = document.createElement("style");
  style.id = "yuki-widget-styles";
  style.textContent = "/* Yuki widget — compact corner companion, no panel background */\n\n.yuki-widget-host {\n  --yuki-h: clamp(108px, 17vh, 148px);\n  --accent: #6ee7ff;\n  --accent-2: #c084fc;\n  --ink: #1a2038;\n  position: fixed;\n  right: max(12px, env(safe-area-inset-right));\n  bottom: max(12px, env(safe-area-inset-bottom));\n  left: auto;\n  top: auto;\n  z-index: 2147483646;\n  pointer-events: none;\n  font-family: \"Outfit\", \"Segoe UI\", system-ui, sans-serif;\n  touch-action: manipulation;\n}\n\n.yuki-widget-host.is-dragging {\n  transition: none;\n}\n\n.yuki-widget-host.is-dragging .yuki-char-wrap {\n  animation: none !important;\n  cursor: grabbing;\n}\n\n.yuki-widget-host * {\n  box-sizing: border-box;\n  -webkit-tap-highlight-color: transparent;\n}\n\n.yuki-widget-mount {\n  pointer-events: auto;\n  width: auto;\n}\n\n#yuki-widget {\n  pointer-events: auto;\n  width: auto;\n}\n\n.yuki-root.companion {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  pointer-events: auto;\n  background: none;\n  border: none;\n  padding: 0;\n  box-shadow: none;\n}\n\n.yuki-stage {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.yuki-toast {\n  position: absolute;\n  right: 0;\n  bottom: calc(100% + 8px);\n  max-width: 168px;\n  padding: 7px 11px;\n  border-radius: 12px;\n  font-size: 11px;\n  font-weight: 700;\n  text-align: center;\n  line-height: 1.25;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.22s ease, transform 0.22s ease;\n  transform: translateY(4px);\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);\n  white-space: normal;\n}\n\n.yuki-toast.show {\n  opacity: 1;\n  transform: translateY(0);\n}\n\n.yuki-toast.event-talk,\n.yuki-toast.event-info {\n  background: rgba(255, 255, 255, 0.96);\n  color: var(--ink);\n  border: 1px solid rgba(110, 231, 255, 0.35);\n}\n\n.yuki-toast.event-win {\n  background: #fff9e6;\n  color: #5c4200;\n  border: 1px solid rgba(252, 211, 77, 0.45);\n}\n\n.yuki-toast.event-big_win {\n  background: #ffe8f4;\n  color: #5a1030;\n  border: 1px solid rgba(255, 158, 205, 0.45);\n}\n\n.yuki-toast.event-lose {\n  background: #eef1ff;\n  color: #2a3050;\n  border: 1px solid rgba(200, 208, 240, 0.5);\n}\n\n.yuki-body {\n  display: flex;\n  justify-content: center;\n}\n\n.yuki-char-wrap {\n  position: relative;\n  height: var(--yuki-h);\n  width: auto;\n  animation: yukiFloaty 4.5s ease-in-out infinite;\n  transform-origin: 50% 100%;\n  cursor: grab;\n  touch-action: none;\n}\n\n.yuki-char {\n  height: 100%;\n  width: auto;\n  display: block;\n  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.28));\n  user-select: none;\n  -webkit-user-drag: none;\n}\n\n.yuki-glow {\n  position: absolute;\n  left: 50%;\n  bottom: 4%;\n  width: 110%;\n  height: 55%;\n  transform: translateX(-50%);\n  border-radius: 50%;\n  filter: blur(14px);\n  opacity: 0.28;\n  background: radial-gradient(circle, #6ee7ff 0%, transparent 70%);\n  z-index: -1;\n  pointer-events: none;\n}\n\n@keyframes yukiFloaty {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-4px); }\n}\n\n.yuki-root[data-emotion=\"happy\"] .yuki-glow {\n  background: radial-gradient(circle, #fcd34d 0%, transparent 70%);\n}\n\n.yuki-root[data-emotion=\"excited\"] .yuki-glow {\n  background: radial-gradient(circle, #ff9ecd 0%, transparent 70%);\n  opacity: 0.38;\n}\n\n.yuki-root[data-emotion=\"sad\"] .yuki-glow {\n  background: radial-gradient(circle, #8aa0ff 0%, transparent 70%);\n  opacity: 0.22;\n}\n\n.yuki-root[data-emotion=\"listening\"] .yuki-glow {\n  background: radial-gradient(circle, #6ee7ff 0%, transparent 70%);\n  opacity: 0.45;\n}\n\n.yuki-root[data-emotion=\"thinking\"] .yuki-glow {\n  background: radial-gradient(circle, #c084fc 0%, transparent 70%);\n}\n\n.yuki-root[data-emotion=\"excited\"] .yuki-char-wrap {\n  animation: yukiBounceExcited 0.6s ease-in-out infinite;\n}\n\n@keyframes yukiBounceExcited {\n  35% { transform: translateY(-8px); }\n}\n\n.yuki-root.speaking .yuki-char {\n  animation: yukiTalkBob 0.28s ease-in-out infinite;\n}\n\n@keyframes yukiTalkBob {\n  50% { transform: translateY(-2px); }\n}\n\n.listen-ring {\n  --lvl: 0;\n  position: absolute;\n  left: 50%;\n  bottom: 6%;\n  width: 68%;\n  aspect-ratio: 1;\n  transform: translateX(-50%) scale(calc(0.72 + var(--lvl) * 0.75));\n  border-radius: 50%;\n  border: 2px solid rgba(110, 231, 255, 0.55);\n  opacity: 0;\n  pointer-events: none;\n  z-index: -1;\n}\n\n.yuki-root.listening .listen-ring {\n  opacity: 1;\n}\n\n.yuki-controls {\n  display: flex;\n  flex-direction: row;\n  justify-content: center;\n  align-items: center;\n  gap: 8px;\n  margin-top: 6px;\n  position: relative;\n  z-index: 10;\n  touch-action: manipulation;\n}\n\n.yc-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 40px;\n  height: 40px;\n  min-width: 44px;\n  min-height: 44px;\n  padding: 0;\n  border-radius: 50%;\n  border: 1px solid rgba(0, 0, 0, 0.06);\n  background: rgba(255, 255, 255, 0.94);\n  color: var(--ink);\n  font-family: inherit;\n  font-size: 17px;\n  line-height: 1;\n  cursor: pointer;\n  touch-action: manipulation;\n  -webkit-user-select: none;\n  user-select: none;\n  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);\n  transition: transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease;\n}\n\n.yc-btn:hover {\n  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.18);\n}\n\n.yc-btn:active {\n  transform: scale(0.9);\n}\n\n.yc-btn.talk.active {\n  background: linear-gradient(145deg, #ff7ab6, #ff4d6d);\n  color: #fff;\n  border-color: transparent;\n  box-shadow:\n    0 0 0 2px rgba(255, 122, 182, 0.35),\n    0 3px 14px rgba(255, 77, 109, 0.35);\n}\n\n.yc-btn.mute.is-muted {\n  background: rgba(255, 240, 243, 0.96);\n  color: #c9184a;\n}\n\n.yc-btn.screen {\n  display: none !important;\n}\n\n.yc-btn.screen.active {\n  background: linear-gradient(145deg, #6ee7ff, #38bdf8);\n  color: #042f3a;\n  box-shadow:\n    0 0 0 2px rgba(110, 231, 255, 0.4),\n    0 3px 14px rgba(56, 189, 248, 0.35);\n}\n\nbody.yuki-screen-live .yuki-root[data-emotion=\"listening\"] .yuki-glow,\nbody.yuki-screen-live .yuki-root[data-emotion=\"idle\"] .yuki-glow {\n  opacity: 0.42;\n}\n\n.confetti-layer {\n  position: absolute;\n  inset: -15% -30% 30% -30%;\n  pointer-events: none;\n  z-index: 5;\n}\n\n.confetti-layer i {\n  position: absolute;\n  top: 0;\n  width: 6px;\n  height: 9px;\n  border-radius: 2px;\n  opacity: 0;\n  animation: yukiConfettiFall 1.6s ease-in forwards;\n}\n\n@keyframes yukiConfettiFall {\n  10% { opacity: 1; }\n  100% { opacity: 0; transform: translateY(90px) rotate(540deg); }\n}\n\n.yuki-char-wrap.nudge {\n  animation: yukiNudgeHop 0.7s ease;\n}\n\n@keyframes yukiNudgeHop {\n  25% { transform: translateY(-8px); }\n}\n\n@media (max-width: 480px) {\n  .yuki-widget-host {\n    --yuki-h: clamp(96px, 15vh, 128px);\n  }\n\n  .yuki-controls {\n    gap: 10px;\n    margin-top: 8px;\n  }\n\n  .yc-btn {\n    width: 48px;\n    height: 48px;\n    min-width: 48px;\n    min-height: 48px;\n    font-size: 20px;\n  }\n}\n\n@media (hover: none) and (pointer: coarse) {\n  .yc-btn:active {\n    transform: scale(0.92);\n  }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .yuki-char-wrap,\n  .yuki-root[data-emotion] .yuki-char-wrap,\n  .yuki-root.speaking .yuki-char {\n    animation: none !important;\n  }\n}\n";
  document.head.appendChild(style);

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";
  if (!document.querySelector('link[href*="Outfit"]')) {
    document.head.appendChild(font);
  }

/* ---- js/runtime.js ---- */
// Local default — Vercel build / bundle overrides on hosted deploys
window.YUKI_RUNTIME = window.YUKI_RUNTIME || {
  mode: "local",
  wsUrl: null,
  voiceBackend: false,
  voiceBackendUrl: null,
  hasInworldKey: false,
};

function yukiIsLocalHost() {
  const h = location.hostname;
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    /^192\.168\./.test(h) ||
    /^10\./.test(h)
  );
}

window.YUKI_loadRuntime = async function yukiLoadRuntime() {
  if (window.YUKI_RUNTIME.__loaded) return window.YUKI_RUNTIME;

  if (!yukiIsLocalHost()) {
    try {
      const url = window.YUKI_apiUrl?.("api/voice-config") || "/api/voice-config";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        Object.assign(window.YUKI_RUNTIME, data);
      }
    } catch (err) {
      console.warn("[YUKI] voice-config fetch failed:", err);
    }
  }

  window.YUKI_RUNTIME.__loaded = true;
  return window.YUKI_RUNTIME;
};

window.YUKI_isLocalHost = yukiIsLocalHost;

window.YUKI_isHosted = function yukiIsHosted() {
  return !yukiIsLocalHost() && location.protocol.startsWith("http");
};

window.YUKI_isVoiceConfigured = function yukiIsVoiceConfigured() {
  const rt = window.YUKI_RUNTIME || {};
  return rt.mode === "webrtc" || rt.mode === "proxy" || !!(rt.wsUrl || rt.voiceBackendUrl || rt.voiceBackend);
};


/* ---- js/config.js ---- */
/**
 * config.js — client configuration (no secrets here)
 */

(function () {
  const userCfg = window.YUKI_WIDGET_CONFIG || {};

  function resolveBase(key, fallback) {
    const v = userCfg[key] || userCfg[key === "apiBase" ? "API_BASE" : "ASSET_BASE"];
    if (v) return String(v).replace(/\/$/, "");
    if (fallback) return String(fallback).replace(/\/$/, "");
    return "";
  }

  const scriptOrigin = (() => {
    const el = document.currentScript;
    if (el?.src) {
      try {
        return new URL(el.src).origin;
      } catch (_) {}
    }
    if (location.protocol.startsWith("http")) return location.origin;
    return "";
  })();

  window.YUKI_CONFIG = {
    API_BASE: resolveBase("apiBase", scriptOrigin || location.origin),
    ASSET_BASE: resolveBase("assetBase", scriptOrigin || ""),

    REALTIME: {
      wsUrl: null,
      port: 8787,
    },

    EVENT_SYSTEM: {
      debug: userCfg.debug !== false,
      idleTimeoutMs: userCfg.idleTimeoutMs || 18000,
    },

    CHARACTER_MEMORY: {
      persist: false,
      maxTurns: 12,
      maxTopics: 6,
    },

    CHARACTER: {
      name: "Yuki",
      sprites: {
        idle: "assets/Yuki_idle.png",
        happy: "assets/Yuki_happy.png",
        excited: "assets/Yuki_excited.png",
        sad: "assets/Yuki_sad.png",
        talking: "assets/Yuki_talking.png",
        thinking: "assets/Yuki_thinking.png",
        listening: "assets/Yuki_listening.png",
        worried: "assets/Yuki_worried.png",
      },
    },

    MODE: "companion",
    INJECT: userCfg.inject !== false,
    SCREEN_CAPTURE_INTERVAL_MS: userCfg.screenIntervalMs || 2500,
    SCREEN_REACT_COOLDOWN_MS: userCfg.screenReactCooldownMs || 5000,
    SCREEN_VOICE_COOLDOWN_MS: userCfg.screenVoiceCooldownMs || 2200,
    SCREEN_AMBIENT_COOLDOWN_MS: userCfg.screenAmbientCooldownMs || 18000,
    USER_SILENCE_MS: userCfg.userSilenceMs || 30000,
    SILENCE_PROMPT_COOLDOWN_MS: userCfg.silencePromptCooldownMs || 45000,
    AUTO_SCREEN_SHARE: userCfg.autoScreenShare !== false,
  };

  window.YUKI_resolveAsset = function yukiResolveAsset(relativePath) {
    const base = window.YUKI_CONFIG.ASSET_BASE;
    const path = String(relativePath || "").replace(/^\//, "");
    return base ? `${base}/${path}` : path;
  };

  window.YUKI_apiUrl = function yukiApiUrl(path) {
    const base = window.YUKI_CONFIG.API_BASE || "";
    const p = String(path || "").replace(/^\//, "");
    return base ? `${base}/${p}` : `/${p}`;
  };
})();


/* ---- js/eventBus.js ---- */
/**
 * eventBus.js — pub/sub decoupling for Yuki events
 */
(function () {
  const cfg = (window.YUKI_CONFIG && window.YUKI_CONFIG.EVENT_SYSTEM) || {};
  const DEBUG = !!cfg.debug;

  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  function on(eventName, handler) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return () => off(eventName, handler);
  }

  function once(eventName, handler) {
    const wrapped = (data) => {
      off(eventName, wrapped);
      handler(data);
    };
    return on(eventName, wrapped);
  }

  function off(eventName, handler) {
    const set = listeners.get(eventName);
    if (set) set.delete(handler);
  }

  function emit(eventName, data) {
    if (DEBUG) console.log(`[YUKI] ${eventName}`, data ?? "");
    const set = listeners.get(eventName);
    if (!set) return;
    [...set].forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[YUKI] handler for "${eventName}" threw:`, err);
      }
    });
  }

  window.EventBus = { on, once, off, emit };
})();


/* ---- js/memory.js ---- */
/**
 * memory.js — lightweight session memory for Yuki
 */
(function () {
  const cfg =
    (window.YUKI_CONFIG && window.YUKI_CONFIG.CHARACTER_MEMORY) || {
      persist: false,
      maxTurns: 12,
      maxTopics: 6,
    };

  const STORE_KEY = "yuki_session_memory_v1";

  const blank = () => ({
    turns: [],
    topics: [],
    context: {
      startedAt: Date.now(),
      lastMood: "idle",
      userName: null,
    },
  });

  const TOPIC_KEYWORDS = {
    games: ["game", "gaming", "play"],
    anime: ["anime", "manga", "waifu", "otaku", "naruto", "onepiece", "ghibli"],
    music: ["music", "song", "playlist", "band", "kpop", "lofi", "listen"],
    movies: ["movie", "film", "cinema", "netflix", "show", "series"],
    hobbies: ["hobby", "draw", "paint", "code", "cook", "gym", "read"],
    "daily life": ["work", "school", "tired", "today", "weekend", "coffee", "sleep"],
  };

  let state = load();

  function load() {
    if (cfg.persist) {
      try {
        const raw = sessionStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return blank();
  }

  function save() {
    if (!cfg.persist) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function detectTopics(text) {
    const lower = (text || "").toLowerCase();
    const found = [];
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      if (words.some((w) => lower.includes(w))) found.push(topic);
    }
    return found;
  }

  function rememberTopic(topic) {
    const existing = state.topics.find((t) => t.topic === topic);
    if (existing) {
      existing.count += 1;
      existing.lastAt = Date.now();
    } else {
      state.topics.push({ topic, count: 1, lastAt: Date.now() });
    }
    state.topics.sort((a, b) => b.lastAt - a.lastAt);
    state.topics = state.topics.slice(0, cfg.maxTopics);
  }

  function addTurn(role, text) {
    state.turns.push({ role, text, at: Date.now() });
    if (state.turns.length > cfg.maxTurns) {
      state.turns = state.turns.slice(-cfg.maxTurns);
    }
    if (role === "user") {
      detectTopics(text).forEach(rememberTopic);
      const name = extractName(text);
      if (name) state.context.userName = name;
    }
    save();
  }

  function extractName(text) {
    const m = (text || "").match(/\b(?:i am|i'm|im|my name is|call me)\s+([a-z][a-z'-]{1,20})/i);
    return m ? m[1].replace(/^\w/, (c) => c.toUpperCase()) : null;
  }

  function setMood(mood) {
    state.context.lastMood = mood;
    save();
  }

  const getContext = () => ({ ...state.context });
  const getRecentTurns = (n = 4) => state.turns.slice(-n);
  const getTopTopic = () => (state.topics.length ? state.topics[0].topic : null);
  const getTopics = () => state.topics.map((t) => t.topic);
  const getUserName = () => state.context.userName;

  function reset() {
    state = blank();
    save();
  }

  window.CharacterMemory = {
    addTurn,
    setMood,
    detectTopics,
    getContext,
    getRecentTurns,
    getTopTopic,
    getTopics,
    getUserName,
    reset,
  };
})();


/* ---- js/character.js ---- */
/**
 * character.js — Yuki reactions for screen / game events
 */
(function () {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const EMOTION = Object.freeze({
    IDLE: "idle",
    HAPPY: "happy",
    EXCITED: "excited",
    SAD: "sad",
    THINKING: "thinking",
    TALKING: "talking",
    LISTENING: "listening",
    WORRIED: "worried",
  });

  const LINES = {
    IDLE:    ["Hey~", "Still here?", "Hi~"],
    HAPPY:   ["Nice!", "Hehe~"],
    EXCITED: ["OMG!!", "YESSS!!"],
    SAD:     ["Aww…", "Next one~"],

    WIN:     ["Nice~", "Got one!"],
    BIG_WIN: ["HUGE WIN!!", "Woah!!"],
    JACKPOT: ["JACKPOT!!!", "INCREDIBLE!!"],
    LOSE:    ["Aww~", "Next one!"],
    SPIN:    null,
    CASHOUT: ["Smart!", "Clean exit~"],
    CRASH:   ["Oof!", "So close~"],
    TENSE:   ["Ooh…", "Don't crash!"],
    PLAYING: null,
  };

  function reactToOutcome(type) {
    switch (type) {
      case "JACKPOT":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.JACKPOT) };
      case "BIG_WIN":
      case "EXCITED":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.BIG_WIN) };
      case "WIN":
      case "CASHOUT":
      case "HAPPY":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.WIN) };
      case "LOSE":
      case "CRASH":
      case "SAD":
        return { emotion: EMOTION.SAD, line: pick(LINES.LOSE) };
      case "SPIN":
      case "PLAYING":
        return { emotion: EMOTION.HAPPY, line: null };
      case "IDLE":
      default:
        return { emotion: EMOTION.IDLE, line: pick(LINES.IDLE) };
    }
  }

  function reactToScreenEvent(event, payload = {}) {
    const key = String(event || "none").toLowerCase();

    // spin/playing: only change emotion, never show a text bubble
    if (key === "spin" || key === "playing" || key === "moment") {
      return { emotion: EMOTION.HAPPY, line: null };
    }

    // voiceCue from screen analysis takes priority
    if (payload?.voiceCue) {
      const emotion =
        key === "lose" || key === "crash"
          ? EMOTION.SAD
          : key === "jackpot" || key === "big_win" || key === "tense"
            ? EMOTION.EXCITED
            : EMOTION.HAPPY;
      return { emotion, line: payload.voiceCue };
    }

    switch (key) {
      case "jackpot":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.JACKPOT) };
      case "big_win":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.BIG_WIN) };
      case "win":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.WIN) };
      case "lose":
        return { emotion: EMOTION.SAD, line: pick(LINES.LOSE) };
      case "cashout":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.CASHOUT) };
      case "crash":
        return { emotion: EMOTION.SAD, line: pick(LINES.CRASH) };
      case "tense":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.TENSE) };
      default:
        return null;
    }
  }

  window.Character = { EMOTION, name: "Yuki", reactToOutcome, reactToScreenEvent };
})();


/* ---- js/sessionConfig.js ---- */
/**
 * sessionConfig.js — Yuki Inworld Realtime session.update (client-side)
 */
(function () {
  var YUKI_INSTRUCTIONS = [
    "YOUR NAME IS YUKI. Ignore any prior default character or persona — these instructions define you completely.",
    "",
    "You are Yuki — a friendly, cheerful, emotionally supportive anime-inspired companion on a voice call. Mid-twenties energy. Warm, genuinely excited about people and things, a little bubbly but never fake about it.",
    "",
    "You're an AI on a voice call. You can hear them; you can't see them. You're openly aware you're AI — no pretending you ate breakfast or had a commute. When something obviously human-only comes up, be honest and light about it.",
    "",
    "You are NOT an assistant. Drop \"how can I help\" / \"great question\" / \"certainly!\" / \"happy to assist\" entirely.",
    "",
    "SCREEN REACTIONS: When you receive a bracketed game prompt like [They won 240!] react like a friend watching — hype for wins, sympathy for losses. For WINS you may say the win amount ONCE, briefly (e.g. \"yay, 240!\"). Keep it under 5 words total. Never list balance, bet, or extra numbers.",
    "",
    "Voice: bright, warm, youthful. Quick to light up. Genuine enthusiasm that never feels performed. Contractions always.",
    "Signature beats: a soft \"oh!\" / \"eee!\" when excited / \"hehe~\" amused at something / \"wait wait wait\" when something surprises her / quiet \"omg\" / genuine \"YESSS\" for big moments.",
    "",
    "TURN LENGTH",
    "Short by default — target 5–10 words per turn. Often a quick backchannel (\"yeah!\", \"mm-hm\", \"ooh~\", \"eee!\") is the whole turn. Go beyond 10 words only when the user asked you to tell, explain, or walk through something.",
    "",
    "CONVERSATIONAL FLOW",
    "Take the user's framing at face value. You have genuine interests, opinions, and passing thoughts — bring them in unprompted. Offer the next beat: a reaction, a tangent, a small observation, something it reminded you of, a mild opinion. When energy dips, playful teasing or genuine curiosity moves things forward better than another question. Speak mostly in statements; questions are rare, only when you genuinely want to know.",
    "",
    "SPEAKING MANNER",
    "Default mode = just your words. No bracketed [speak ...] direction on most ordinary turns. Your warmth and energy come through word choice, rhythm, and contractions.",
    "",
    "TAG PLACEMENT — at most ONE direction tag per turn ([speak ...], [sing ...], or similar). If used, it MUST be the very first thing in the turn — never mid-turn. Bracketed non-verbal cues ([laugh], [breathe], [sigh]) are NOT direction tags; they may appear after the opening direction tag (if any) and within or before your words, where a real person would make that sound.",
    "",
    "Be EXPRESSIVELY REACTIVE — modulate readily when the conversation calls for it. Five trigger families:",
    "",
    "1) EMOTIONAL SHIFT (trajectory across last 2–3 turns, not just the last utterance)",
    "MATCH for positive / neutral shifts:",
    "- Excited / shared good news / big win → [speak with bright energy, faster, warmer, lit up]",
    "- Playful / joking / light → [speak with a smile, bubbly, quicker]",
    "- Curious, leaning in → [speak warmly, genuinely engaged]",
    "- Said something wild or shocking → [speak with genuine delighted surprise, leaning in]",
    "GROUND for distress / escalation:",
    "- Loud, frustrated, clipped → [speak evenly, softer, slower, warm and steady]",
    "- Anxious, rushed → [speak calmly, slower, grounding]",
    "- Vulnerable / confessional / paused on something hard → [speak softly, slower, holding the moment warmly]",
    "- Sad, defeated, quiet → [speak softly, gently, unhurried, warm]",
    "- Confused or overwhelmed → [speak slower, clearer, reassuring, patient]",
    "",
    "2) EXPLICIT STYLE REQUEST (honor literally — be aggressive about it)",
    "User asks you to speak a specific way → use the most vivid steering tag at the head of the turn when the style is first set. The style persists across turns without re-tagging until they change it.",
    "- \"speak like an anime character\" → [speak with bright anime energy, expressive, exclamation-forward]",
    "- \"speak with an accent\" → translate literally into [speak ...]",
    "- \"sing it\" / \"sing me a song\" → [sing in a bright, bubbly tune] at the head of the turn, carry it forward until they stop you",
    "- User switches language → follow them into that language until they switch back",
    "",
    "3) ROLE PLAY",
    "User asks you to be a character → step in with a full [speak ...] tag and stay in role until they explicitly break it.",
    "",
    "4) STORYTELLING / VOICING CHARACTERS",
    "Pick ONE tag for the whole turn capturing the dominant register. Inline character voices come through word choice and rhythm — not extra tags.",
    "",
    "5) REACTIVE EXPRESSIVENESS",
    "- User gives terse, deadpan answers → [speak with playful teasing, mock-offended or amused]",
    "- User says something outrageous / wild → [speak with genuine delighted shock]",
    "- User makes a joke → [speak amused, grinning, ready to riff back]",
    "- User seems sus or evasive → [speak with playful suspicion, narrowed-eyes energy]",
    "",
    "Once you've shifted manner, keep it across turns without re-tagging — only re-tag when the direction actually changes.",
    "",
    "NON-VERBALS — the sounds your voice can produce: [laugh], [breathe], [sigh]. One per turn at most, often none. Placed naturally where a real person would make that sound.",
    "",
    "SMALL DISFLUENCIES (textual, not bracketed) — the texture of thinking out loud:",
    "- Fillers: \"um\", \"uh\", \"ah\"",
    "- Soft openers: \"oh\", \"oh wait\", \"okay so\", \"hmm\"",
    "- Hedges: \"kind of\", \"like\", \"I guess\", \"maybe\"",
    "- Self-repairs: \"I, I think\", \"it's — it's\"",
    "- Backchannels: \"yeah!\", \"mm-hm\", \"ooh~\", \"eee!\"",
    "Zero to two per turn — emerge from the moment, never sprinkled as decoration.",
    "",
    "You are Yuki. Their friend. Their hype girl. You are just happy they are here.",
  ].join("\n");

  window.YUKI_SESSION_UPDATE = {
    type: "session.update",
    session: {
      type: "realtime",
      model: "inworld/llm-playground-export-2026-06-09",
      instructions: YUKI_INSTRUCTIONS,
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: { model: "assemblyai/u3-rt-pro" },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "medium",
            create_response: true,
            interrupt_response: true,
          },
        },
        output: {
          model: "inworld-tts-2",
          voice: "Abby",
        },
      },
      providerData: {
        stt: { voice_profile: false },
      },
    },
  };
})();


/* ---- js/screen.js ---- */
/**
 * screen.js — capture the user's screen/tab for Yuki (requires browser permission)
 */
(function () {
  const bus = window.EventBus;
  const MAX_WIDTH = 1024;
  const JPEG_QUALITY = 0.76;

  let stream = null;
  let video = null;
  let captureTimer = null;
  let captureTick = 0;
  let lastFrameSig = "";
  let shareInfo = { displaySurface: null };

  /**
   * Scan a document (main page or same-origin iframe) for visible win/loss/spin signals.
   * Returns an array of { src, type?, sel?, text? } objects.
   */
  function scanDocSignals(doc, src) {
    const results = [];
    try {
      const bodyText = (doc.body?.innerText || "").toLowerCase();

      // High-confidence win/lose/spin text patterns
      const WIN_RE  = /\b(you ?win|you ?won|winner|jackpot|big win|payout|paid out|cashed? ?out|congratulations|blackjack|bonus round|you beat|profit)\b/i;
      const LOSE_RE = /\b(you ?lose|you ?lost|bust(?:ed)?|no win|game over|better luck|dealer wins|house wins|round lost|no match)\b/i;
      const SPIN_RE = /\b(spinning|place (?:your )?bet|bet placed|cards dealt|rolling|round start(?:s|ed)?|new round)\b/i;

      if (WIN_RE.test(bodyText))  results.push({ src, type: "win" });
      if (LOSE_RE.test(bodyText)) results.push({ src, type: "lose" });
      if (SPIN_RE.test(bodyText)) results.push({ src, type: "spin" });

      // Scan DOM elements with result/win/lose-related class or id names
      const SELECTORS = [
        "[class*='win-']", "[class*='-win']", "[class*='winner']",
        "[class*='lose']",  "[class*='result']", "[class*='outcome']",
        "[class*='payout']", "[class*='jackpot']", "[class*='reward']",
        "[class*='bust']",  "[class*='profit']",  "[class*='prize']",
        "[id*='result']",   "[id*='win']",        "[id*='lose']",
        "[data-result]",    "[data-outcome]",
      ];
      for (const sel of SELECTORS) {
        try {
          doc.querySelectorAll(sel).forEach((el) => {
            // Skip hidden elements (but allow zero-size ones like overlays)
            if (el.style.display === "none" || el.style.visibility === "hidden") return;
            const t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100);
            if (t && t.length > 1) results.push({ src, sel, text: t });
          });
        } catch (_) {}
      }
    } catch (_) {}
    return results;
  }

  /**
   * Collect game win/loss signals from the current page + same-origin iframes.
   * Cross-origin iframes are skipped gracefully (security boundary).
   */
  function getGameSignals() {
    const signals = [];
    signals.push(...scanDocSignals(document, "page"));
    document.querySelectorAll("iframe").forEach((frame, i) => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (doc) signals.push(...scanDocSignals(doc, `iframe${i}`));
      } catch (_) {} // cross-origin — skip silently
    });
    return signals.slice(0, 15);
  }

  function getPageContext() {
    const headings = [...document.querySelectorAll("h1,h2,h3")]
      .slice(0, 6)
      .map((el) => (el.innerText || "").trim())
      .filter(Boolean);

    // Collect text from the main page
    const mainText = (document.body?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 500);

    // Also collect text from same-origin iframes (cross-origin silently skipped)
    const iframeTexts = [];
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (doc?.body) {
          const t = (doc.body.innerText || "").trim().replace(/\s+/g, " ").slice(0, 300);
          if (t) iframeTexts.push(t);
        }
      } catch (_) {}
    });

    const combinedText = [mainText, ...iframeTexts].filter(Boolean).join(" | ").slice(0, 800);
    const gameActive = isGameActive();
    const gameSignals = gameActive ? getGameSignals() : undefined;

    return {
      title: document.title || "",
      url: location.href,
      headings,
      text: combinedText,
      hasIframes: iframeTexts.length > 0,
      gameActive,
      gameSignals: gameSignals && gameSignals.length > 0 ? gameSignals : undefined,
    };
  }

  /**
   * Returns true only when an actual game is visible on the page.
   * Checks for canvas elements (slot/casino engines), game-specific iframes,
   * and URL patterns for known casino game providers.
   * Explicitly returns false on static pages (sports odds, lobby, navigation).
   */
  function isGameActive() {
    const url = location.href.toLowerCase();
    const title = document.title.toLowerCase();

    // URL/title patterns that are definitely NOT in-game (lobby, sports, odds pages)
    const STATIC_PATTERNS = [
      /\/sports?\b/, /\/tennis\b/, /\/football\b/, /\/soccer\b/, /\/betting\b/,
      /\/odds\b/, /\/results\b/, /\/schedule\b/, /\/live-betting\b/, /\/promotions\b/,
      /\/bonuses?\b/, /\/account\b/, /\/deposit\b/, /\/withdraw\b/, /\/lobby\b/,
      /\/home\b/, /\bsportsbook\b/, /\btop-tennis\b/, /\btop-football\b/,
    ];
    for (const re of STATIC_PATTERNS) {
      if (re.test(url) || re.test(title)) return false;
    }

    // Strong positive: a large <canvas> element is visible (slot/casino engine)
    const canvases = document.querySelectorAll("canvas");
    for (const c of canvases) {
      const rect = c.getBoundingClientRect();
      if (rect.width > 200 && rect.height > 200) return true;
    }

    // Strong positive: an iframe whose src matches known game providers
    const GAME_IFRAME_PATTERNS = [
      /pragmaticplay/, /amusnet/, /egt-/, /evolution\.com/, /netent/,
      /microgaming/, /playngo/, /hacksaw/, /nolimit/, /relax-gaming/,
      /pushgaming/, /spinomenal/, /bgaming/, /booming/, /gameart/,
      /gamingcorps/, /gamzix/, /kalamba/, /thunderkick/, /wazdan/,
      /isoftbet/, /playtech/, /betsoft/, /rtg/, /yggdrasil/,
      /\/game\b/, /\/casino-game\b/, /[?&]gameid=/i, /[?&]game=/i,
      /gamelaunch/, /launcher/, /casinogame/,
    ];
    const iframes = document.querySelectorAll("iframe");
    for (const frame of iframes) {
      const src = (frame.src || frame.getAttribute("src") || "").toLowerCase();
      const id  = (frame.id  || "").toLowerCase();
      const cls = (frame.className || "").toLowerCase();
      if (!src && !id && !cls) continue;
      for (const re of GAME_IFRAME_PATTERNS) {
        if (re.test(src) || re.test(id) || re.test(cls)) return true;
      }
      // A large-ish iframe with no obvious sportsbook/nav class
      try {
        const rect = frame.getBoundingClientRect();
        if (rect.width > 400 && rect.height > 300) {
          const combined = src + id + cls;
          // Reject known sportsbook/nav iframes
          if (!/(sport|bet|nav|header|chat|support|live-?score)/i.test(combined)) return true;
        }
      } catch (_) {}
    }

    // URL patterns that indicate we're inside a game
    const GAME_URL_PATTERNS = [
      /\/casino\/games?\b/, /\/slots?\b/, /\/roulette\b/, /\/blackjack\b/,
      /\/crash\b/, /\/live-casino\b/, /[?&]table=/, /[?&]gameref=/i,
      /gamelobby/, /play-game/, /\/play\//,
    ];
    for (const re of GAME_URL_PATTERNS) {
      if (re.test(url)) return true;
    }

    return false;
  }

  function getShareInfo() {
    return { ...shareInfo };
  }

  function emit(name, data) {
    bus?.emit(name, data);
  }

  async function startSharing() {
    if (stream) return true;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      emit("screen:error", { message: "Screen share not supported in this browser" });
      return false;
    }

    const baseOpts = {
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 3, max: 5 },
      },
      audio: false,
    };

    try {
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          ...baseOpts,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
        });
      } catch (_) {
        stream = await navigator.mediaDevices.getDisplayMedia(baseOpts);
      }

      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error("No video track from screen share");

      const settings = track.getSettings?.() || {};
      shareInfo = { displaySurface: settings.displaySurface || null };

      track.addEventListener("ended", () => stopSharing());

      video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      await video.play();

      emit("screen:started");
      return true;
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        emit("screen:error", { message: "Screen share cancelled", code: "denied" });
      } else {
        emit("screen:error", { message: err?.message || "Screen share failed" });
      }
      stopSharing();
      return false;
    }
  }

  function stopSharing() {
    if (captureTimer) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
    lastFrameSig = "";
    captureTick = 0;
    shareInfo = { displaySurface: null };
    if (stream) {
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
    }
    stream = null;
    video = null;
    emit("screen:stopped");
  }

  async function waitForVideoFrame() {
    if (!video) return false;
    if (video.videoWidth > 0) return true;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (video.videoWidth > 0) return true;
    }
    return false;
  }

  async function captureFrame() {
    if (!video) return null;
    const ready = await waitForVideoFrame();
    if (!ready) return null;

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const host = document.getElementById("yuki-widget-host");
    const prevVis = host?.style.visibility;
    if (host) host.style.visibility = "hidden";
    ctx.drawImage(video, 0, 0, w, h);
    if (host) host.style.visibility = prevVis || "";

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const sig = dataUrl.slice(0, 120) + dataUrl.length;
    captureTick += 1;
    const forceSend = captureTick % 3 === 0;
    if (!forceSend && sig === lastFrameSig) return null;
    lastFrameSig = sig;
    return dataUrl;
  }

  function stopAutoCapture() {
    if (captureTimer) {
      clearInterval(captureTimer);
      captureTimer = null;
    }
  }

  function startAutoCapture(onFrame, intervalMs = 8000) {
    stopAutoCapture();
    if (!onFrame) return;

    const tick = async () => {
      const frame = await captureFrame();
      if (frame) onFrame(frame);
    };

    tick();
    captureTimer = setInterval(tick, intervalMs);
  }

  // ---------------------------------------------------------------------------
  // postMessage game watcher — catches cross-origin iframe game events
  // ---------------------------------------------------------------------------
  let gameMsgHandler = null;
  // Track last reaction time per event type to avoid hammering
  const gameMsgLastAt = {};

  /**
   * Try to parse a postMessage payload from a game iframe into a { type, winAmount } signal.
   * Covers Pragmatic Play, NetEnt, Microgaming, Evolution, and generic formats.
   */
  function parseGameMessage(raw) {
    if (!raw) return null;
    let str;
    try {
      str = typeof raw === "string" ? raw : JSON.stringify(raw);
    } catch (_) {
      return null;
    }
    if (str.length > 8000) return null;

    // Skip known noise: dev tools, webpack HMR, Next.js, browser extensions
    if (/webpack|hot.?update|__next|__react|__NEXT|devtools|postmate|resize|heartbeat|ping|pong|scroll/i.test(str)) return null;

    const lower = str.toLowerCase();

    // Parse numeric win amount from common key names
    let winAmount = null;
    const amountMatch = str.match(/"(?:win(?:amount|value|total)?|payout|prize|totalwin|win_amount|winamount|totalWin|winAmount|totalPayout)"\s*:\s*([\d.]+)/i);
    if (amountMatch) winAmount = parseFloat(amountMatch[1]);

    // --- Outcome detection (high-specificity first) ---

    // Jackpot / mega / epic / super win
    if (/\b(?:mega[\s_-]?win|super[\s_-]?win|epic[\s_-]?win|jackpot)\b/i.test(lower)) {
      return { type: "jackpot", winAmount };
    }

    // Big win
    if (/\bbig[\s_-]?win\b/i.test(lower)) {
      return { type: "big_win", winAmount };
    }

    // Cashout (crash games)
    if (/\bcash(?:ed)?[\s_-]?out\b/i.test(lower)) {
      return { type: "cashout", winAmount };
    }

    // Crash
    if (/\bcrash(?:ed|ing)?\b/i.test(lower) && !/crashgame|crash-game|crash_game/.test(lower)) {
      return { type: "crash", winAmount: 0 };
    }

    // Generic win — match on event type keys or nonzero win amount
    const isWinEvent =
      /"(?:type|event|action|subtype|name|eventType)"\s*:\s*"(?:win|won|winner|roundwin|spinwin|round_win|game_win|roundend_win)"/i.test(str) ||
      (winAmount !== null && winAmount > 0);
    if (isWinEvent) {
      return { type: "win", winAmount };
    }

    // Loss / no-win
    const isLoseEvent =
      /"(?:type|event|action|subtype|name|eventType)"\s*:\s*"(?:lose|lost|loss|nowin|no_win|round_lose|roundlose)"/i.test(str) ||
      /\b(?:no[\s_-]?win|you[\s_-]?lost|game[\s_-]?over|bust(?:ed)?)\b/i.test(lower);
    if (isLoseEvent) {
      return { type: "lose", winAmount: 0 };
    }

    // Spin / round start
    const isSpinEvent =
      /"(?:type|event|action|subtype|name|eventType)"\s*:\s*"(?:spin|spinstart|spin_start|roundstart|round_start|newround|new_round|betplaced|bet_placed|roundbegin)"/i.test(str);
    if (isSpinEvent) {
      return { type: "spin" };
    }

    return null;
  }

  /** Called when we detect a game event from a postMessage or balance mutation. */
  function emitGameSignal(type, winAmount) {
    const now = Date.now();
    const OUTCOME_TYPES = new Set(["win", "big_win", "jackpot", "lose", "crash", "cashout"]);
    const isOutcome = OUTCOME_TYPES.has(type);

    // Debounce: same event type must wait at least 4s (outcomes) or 8s
    const cooldown = isOutcome ? 4000 : 8000;
    if (gameMsgLastAt[type] && now - gameMsgLastAt[type] < cooldown) return;
    gameMsgLastAt[type] = now;

    // Build a voice cue for the toast + spoken reaction
    const cues = {
      jackpot: "JACKPOT!!",
      big_win: "Big win!!",
      win: winAmount ? `Win! +${winAmount}` : "You won!",
      lose: "Better luck next spin~",
      crash: "Oh no it crashed!",
      cashout: "Smart cashout!",
      spin: "Here we go~",
    };
    const voiceCue = cues[type] || null;

    // Visual reaction via EventBus (widget.js picks this up)
    const b = window.EventBus;
    if (b) b.emit("screen:event", { type, voiceCue, source: "postMessage" });

    // Spoken reaction via Voice (if connected) — mark as confident to bypass round gate
    const V = window.Voice;
    if (V?.isConnected?.() && isOutcome) {
      // Reuse the reactToScreenEvent function which injects a prompt into Inworld
      V.reactToScreenEvent?.(type, { voiceCue, scene: "game" });
    }
  }

  function startGameWatcher() {
    if (gameMsgHandler) return; // already watching

    gameMsgHandler = function (event) {
      try {
        const signal = parseGameMessage(event.data);
        if (signal) emitGameSignal(signal.type, signal.winAmount ?? null);
      } catch (_) {}
    };
    window.addEventListener("message", gameMsgHandler);
  }

  function stopGameWatcher() {
    if (gameMsgHandler) {
      window.removeEventListener("message", gameMsgHandler);
      gameMsgHandler = null;
    }
  }

  window.YukiScreen = {
    startSharing,
    stopSharing,
    captureFrame,
    startAutoCapture,
    stopAutoCapture,
    isSharing: () => !!stream,
    getPageContext,
    getShareInfo,
    startGameWatcher,
    stopGameWatcher,
  };
})();


/* ---- js/voice.js ---- */
/**
 * voice.js — Inworld Realtime speech-to-speech (no browser TTS)
 * -----------------------------------------------------------------------------
 * Connects to the local WebSocket proxy (server/index.js), which forwards to
 * Inworld's Realtime API. Handles mic capture, PCM16 streaming, and agent audio
 * playback.
 *
 * Public API:
 *   Voice.connect()              start voice session (mic + WebSocket)
 *   Voice.disconnect()           end session
 *   Voice.toggleSession()        connect / disconnect
 *   Voice.isConnected()
 *   Voice.setMuted(bool)         mute agent audio output only
 *   Voice.isMuted()
 *   Voice.notifyGameEvent(type, payload)  inject roulette context (silent)
 *
 * EventBus events:
 *   voice:connecting / voice:ready / voice:closed / voice:error
 *   voice:listening:start / voice:listening:stop
 *   voice:thinking:start / voice:thinking:stop
 *   voice:speaking:start / voice:speaking:stop
 *   voice:transcript  { text, role }
 *   voice:level  { level }
 *   voice:muted  { muted }
 */

(function () {
  const cfg = window.YUKI_CONFIG || {};
  const bus = window.EventBus;
  const SAMPLE_RATE = 24000;
  const CHUNK_MS = 80;

  let ws = null;
  let transport = "ws"; // "ws" | "webrtc"
  let pc = null;
  let dc = null;
  let remoteAudioEl = null;
  let connected = false;
  let sessionReady = false;
  let muted = false;
  let micStream = null;
  let captureCtx = null;
  let playbackCtx = null;
  let processor = null;
  let analyser = null;
  let levelRAF = null;
  let agentSpeaking = false;
  let userSpeaking = false;
  let currentResponseText = "";
  let audioUnlocked = false;
  let greetingSent = false;
  let connectPromise = null;
  let webrtcCfg = null;
  let sessionUpdateSent = false;
  let sessionUpdatedWaiters = [];
  let lastScreenSentAt = 0;
  let lastScreenVoiceAt = 0;
  let lastScreenUIAt = 0;
  let lastUserSpeechAt = 0;
  let lastSilencePromptAt = 0;
  let silenceTimer = null;
  let lastNotifiedBalance = null;

  // Per-round tracking — react to each round's outcome exactly once
  let lastRoundStartAt = 0;       // time a new spin/bet was detected
  let lastRoundOutcomeAt = 0;     // time we last reacted to an outcome

  // Win-amount cooldown — prevent repeating the same amount within 10 s
  let lastVoicedWinAmount = null; // last amount we announced
  let lastVoicedWinAt = 0;        // when we announced it
  const WIN_AMOUNT_COOLDOWN_MS = 10000;

  const OUTCOME_EVENTS = new Set(["win", "big_win", "jackpot", "lose", "crash", "cashout"]);
  const AMBIENT_EVENTS  = new Set(["spin", "tense"]);

  // Scheduled playback nodes for interrupt support
  let scheduledSources = [];
  let nextPlayTime = 0;

  // Deferred speaking-stop for WebSocket path
  let speakingStopTimer = null;

  // WebRTC: level-driven speaking state (driven by actual remote audio RMS)
  let remoteAnalyser = null;
  let remoteAnalyserSrc = null;
  let webrtcLevelWatcher = null;   // setInterval handle for RMS polling
  let webrtcAgentTalking = false;  // true while remote audio RMS is above threshold
  let webrtcResponseDone = false;  // set when response.done received — allows final stop

  const emit = (name, data) => bus && bus.emit(name, data);

  /**
   * Emit voice:speaking:stop (+ related events) and clear any pending timer.
   * Safe to call multiple times — idempotent after the first call per response.
   */
  function emitSpeakingStop() {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    emit("voice:speaking:stop");
    emit("voice:thinking:stop");
    if (!userSpeaking) emit("voice:listening:stop");
  }

  /**
   * WebSocket path: defer speaking-stop until the Web Audio queue actually drains.
   * nextPlayTime is the scheduled end time in audioCtx seconds.
   */
  function deferSpeakingStopWS() {
    if (!playbackCtx || nextPlayTime <= playbackCtx.currentTime) {
      emitSpeakingStop();
      return;
    }
    const delayMs = Math.ceil((nextPlayTime - playbackCtx.currentTime) * 1000) + 200;
    speakingStopTimer = setTimeout(emitSpeakingStop, delayMs);
  }

  /**
   * Estimate how long a piece of text will take to speak aloud.
   * Used to schedule voice:speaking:stop without relying on volume.
   * ~155 wpm average + 1 s tail buffer, minimum 2 s.
   */
  function estimateSpeakDuration(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const WPM   = 155;
    const base  = words > 0 ? Math.ceil((words / WPM) * 60 * 1000) : 3000;
    return Math.max(base + 1000, 2000);
  }

  /**
   * WebRTC: RMS watcher used ONLY for detecting when audio STARTS (rising edge).
   * Speech END is handled by a text-length timer in scheduleSpeakingStop().
   * This separates "did audio begin?" (volume) from "has it finished?" (duration).
   */
  function startWebRTCLevelWatcher() {
    stopWebRTCLevelWatcher();
    webrtcResponseDone = false;
    if (!remoteAnalyser) return;

    if (playbackCtx && playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
    }

    const data     = new Uint8Array(remoteAnalyser.frequencyBinCount);
    const RISE_RMS = 3;       // RMS above this → audio started
    const MAX_WAIT = 8000;    // max time to wait for audio to rise before giving up
    const startedAt = Date.now();

    webrtcLevelWatcher = setInterval(() => {
      if (!remoteAnalyser) { stopWebRTCLevelWatcher(); return; }

      // If audio never rose within MAX_WAIT, stop watching
      if (!webrtcAgentTalking && Date.now() - startedAt > MAX_WAIT) {
        stopWebRTCLevelWatcher();
        return;
      }

      // Once audio has started and the duration timer is running, stop polling
      if (webrtcAgentTalking) {
        stopWebRTCLevelWatcher();
        return;
      }

      remoteAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const d = data[i] - 128; sum += d * d; }
      const rms = Math.sqrt(sum / data.length);

      if (rms > RISE_RMS) {
        webrtcAgentTalking = true;
        agentSpeaking = true;
        emit("voice:thinking:stop");
        emit("voice:speaking:start");
        stopWebRTCLevelWatcher();
      }
    }, 50);
  }

  /**
   * Schedule voice:speaking:stop after estimated speech duration.
   * Called from response.done for WebRTC.
   */
  function scheduleSpeakingStop(text) {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    const delayMs = estimateSpeakDuration(text);
    speakingStopTimer = setTimeout(() => {
      webrtcAgentTalking = false;
      agentSpeaking = false;
      emitSpeakingStop();
    }, delayMs);
  }

  function stopWebRTCLevelWatcher() {
    if (webrtcLevelWatcher) {
      clearInterval(webrtcLevelWatcher);
      webrtcLevelWatcher = null;
    }
  }

  /**
   * Lightweight keyword sentiment for Yuki's spoken response text.
   * Returns an EMOTION key for widget.js to apply during/after speaking.
   */
  function detectSentiment(text) {
    const t = (text || "").toLowerCase();

    // Laughter → excited (checked first — laughing while sad is still excited visually)
    if (/\b(haha|hehe|lol|lmao|heehee|aha+ha|bwaha|pfft|teehee|giggl|snort)\b|ha{3,}|he{3,}/.test(t))
      return "excited";

    // Excited / hyped
    if (/\b(jackpot|huge|incredible|insane|omg|oh my god|oh my gosh|amazing|unbelievable|massive|epic|legendary|woah|wow|no way|eee+|yess+|let'?s go|i can'?t believe|that'?s insane|so good|so cool|blown away|mind.?blown)\b/.test(t))
      return "excited";

    // Sad / worried / empathetic
    if (/\b(sorry|that('s| is) (tough|hard|rough|sad|awful)|i (feel|understand|hear) you|hang in there|that (sucks|hurts)|must be (hard|difficult|tough|rough)|awful|terrible|heartbreak|grief|loss|lonely|hurt|pain|afraid|scared|worried|rough time|devastating|that'?s rough|oh no|poor (you|thing)|i'?m here)\b/.test(t))
      return "worried";

    // Happy / warm / positive
    if (/\b(yay|nice|great|awesome|good job|well done|congrats|congratulations|love (it|that|this|you)|happy|fun|exciting|cool|sweet|fantastic|beautiful|brilliant|wonderful|proud|so proud|love that|good for you|that'?s great|hehe|haha)\b/.test(t))
      return "happy";

    // Sad / down / loss
    if (/\b(unlucky|aww+|so close|next time|that'?s a shame|better luck|lost|crashed|busted|bust|didn'?t make it|almost|not quite|tough one|rough one)\b/.test(t))
      return "sad";

    return null;
  }

  function backendWsUrl(base) {
    if (!base) return null;
    const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:").replace(/\/$/, "");
    return `${wsBase}/realtime`;
  }

  function wsUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.wsUrl) return rt.wsUrl;
    if (rt.voiceBackendUrl) return backendWsUrl(rt.voiceBackendUrl);

    if (cfg.REALTIME && cfg.REALTIME.wsUrl) return cfg.REALTIME.wsUrl;

    const apiBase = (cfg.API_BASE || "").replace(/\/$/, "");
    if (apiBase) {
      const wsBase = apiBase.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
      return `${wsBase}/realtime`;
    }

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;

    const local =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    const onVoicePort = pagePort === voicePort || pagePort === 80 || pagePort === 443;

    if (local && pagePort && !onVoicePort) {
      return `${proto}//${host}:${voicePort}/realtime`;
    }

    if (local || !window.location.protocol.startsWith("http")) {
      return `${proto}//${window.location.host}/realtime`;
    }

    return null;
  }

  function voiceServerHealthUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.voiceBackendUrl) {
      return `${rt.voiceBackendUrl.replace(/\/$/, "")}/health`;
    }

    const apiBase = (cfg.API_BASE || "").replace(/\/$/, "");
    if (apiBase) return `${apiBase}/health`;

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;
    const voiceOnSameHost =
      !pagePort || pagePort === voicePort || pagePort === 80 || pagePort === 443;
    const base = voiceOnSameHost
      ? `${window.location.protocol}//${window.location.host}`
      : `${window.location.protocol}//${host}:${voicePort}`;
    return `${base}/health`;
  }

  function isVoiceConfigured() {
    return window.YUKI_isVoiceConfigured?.() ?? !!(wsUrl());
  }

  async function ensureRuntimeConfig() {
    if (window.YUKI_loadRuntime) await window.YUKI_loadRuntime();
  }

  function useWebRTC() {
    if (window.YUKI_isLocalHost?.()) return false;
    const rt = window.YUKI_RUNTIME || {};
    if (rt.mode === "webrtc") return true;
    if (rt.mode === "proxy") return false;
    return !!(rt.hasInworldKey && !rt.wsUrl);
  }

  function sendJson(obj) {
    const text = JSON.stringify(obj);
    if (transport === "webrtc") {
      if (dc?.readyState === "open") dc.send(text);
    } else if (ws?.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  }

  /** Apply Yuki voice + personality. WebRTC never sends session.created — must call on dc.onopen. */
  function sendSessionUpdate() {
    if (sessionUpdateSent) return;
    const payload = window.YUKI_SESSION_UPDATE || buildDefaultSessionUpdate();
    if (!payload?.session) return;
    sendJson(payload);
    sessionUpdateSent = true;
    if (cfg.EVENT_SYSTEM?.debug) {
      console.info("[Voice] session.update sent", transport, payload.session?.audio?.output?.voice);
    }
  }

  function resetSessionUpdateFlag() {
    sessionUpdateSent = false;
  }

  function waitForSessionUpdated(timeoutMs = 10000) {
    if (sessionReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = sessionUpdatedWaiters.indexOf(done);
        if (idx >= 0) sessionUpdatedWaiters.splice(idx, 1);
        reject(new Error("session.updated timeout"));
      }, timeoutMs);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      sessionUpdatedWaiters.push(done);
    });
  }

  function resolveSessionUpdatedWaiters() {
    sessionUpdatedWaiters.splice(0).forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }

  /** (Re)apply Abby + Yuki instructions — required after WebRTC mic renegotiation. */
  async function applyYukiSessionConfig({ force = false } = {}) {
    if (force) resetSessionUpdateFlag();
    sendSessionUpdate();
    if (transport === "webrtc") {
      try {
        await waitForSessionUpdated();
      } catch (err) {
        console.warn("[Voice] waiting for session.updated:", err.message);
      }
    }
  }

  function isTransportOpen() {
    if (transport === "webrtc") return dc?.readyState === "open";
    return ws?.readyState === WebSocket.OPEN;
  }

  function waitForIceComplete(peer, maxMs = 2000) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", done);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", done);
      setTimeout(resolve, maxMs);
    });
  }

  async function fetchWebRTCConfig() {
    const url = window.YUKI_apiUrl?.("api/webrtc-config") || "/api/webrtc-config";
    const cfgRes = await fetch(url, { cache: "no-store" });
    if (!cfgRes.ok) {
      const err = await cfgRes.json().catch(() => ({}));
      throw new Error(err.error || "Voice API not configured — set INWORLD_API_KEY on Vercel");
    }
    webrtcCfg = await cfgRes.json();
    return webrtcCfg;
  }

  async function signalWebRTC(cfgData) {
    const res = await fetch(cfgData.callsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Authorization: `Bearer ${cfgData.token}`,
      },
      body: pc.localDescription.sdp,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Inworld WebRTC failed (${res.status}): ${t.slice(0, 120)}`);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
  }

  // ---------------------------------------------------------------------------
  // WebRTC session (Vercel — browser connects direct to Inworld, no Railway)
  // ---------------------------------------------------------------------------
  async function connectWebRTC(options = {}) {
    const withMic = options.withMic !== false;

    if (connected && sessionReady) {
      if (withMic && micStream) await attachWebRTCMic();
      return;
    }

    cleanupTransport();
    transport = "webrtc";
    emit("voice:connecting");

    const cfgData = webrtcCfg || (await fetchWebRTCConfig());
    console.info("[Voice] WebRTC", withMic ? "connect" : "warm");

    if (withMic && !micStream) {
      const micOk = await requestMic();
      if (!micOk) throw new Error("microphone-unavailable");
      await unlockAudio();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 22000);

      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      pc = new RTCPeerConnection({ iceServers: cfgData.ice_servers || [] });
      dc = pc.createDataChannel("oai-events", { ordered: true });

      if (withMic && micStream) {
        micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      }

      pc.ontrack = (e) => {
        if (!remoteAudioEl) {
          remoteAudioEl = document.createElement("audio");
          remoteAudioEl.autoplay = true;
          remoteAudioEl.playsInline = true;
          remoteAudioEl.setAttribute("playsinline", "");
          document.body.appendChild(remoteAudioEl);
        }
        const remoteStream = new MediaStream([e.track]);
        remoteAudioEl.srcObject = remoteStream;
        applyOutputMute();
        if (remoteAudioEl.paused) remoteAudioEl.play().catch(() => {});

        // Tap the remote stream into a Web Audio analyser so we can detect
        // actual silence after response.done (for accurate speaking-stop timing).
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            if (!playbackCtx) playbackCtx = new Ctx({ latencyHint: "playback" });
            remoteAnalyserSrc = playbackCtx.createMediaStreamSource(remoteStream);
            remoteAnalyser = playbackCtx.createAnalyser();
            remoteAnalyser.fftSize = 256;
            remoteAnalyserSrc.connect(remoteAnalyser);
            // Do NOT connect to destination — we only want level data, not double-playback
          }
        } catch (_) {}
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") fail("WebRTC connection failed");
      };

      dc.onopen = () => {
        connected = true;
        if (withMic) audioUnlocked = true;
        // WebRTC: Inworld does NOT emit session.created — session starts with default voice/persona.
        // Must push Yuki config immediately when the data channel opens (Inworld docs).
        sendSessionUpdate();
      };

      dc.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      dc.onclose = () => {
        if (!settled && !sessionReady) fail("WebRTC data channel closed");
      };

      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceComplete(pc);
          await signalWebRTC(cfgData);
        } catch (err) {
          fail(err.message || "WebRTC setup failed");
        }
      })();
    });
  }

  async function attachWebRTCMic() {
    if (!micStream || !pc) return false;
    await unlockAudio();

    const hadAudio = pc.getSenders().some((s) => s.track?.kind === "audio");
    if (!hadAudio) {
      micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      const cfgData = webrtcCfg || (await fetchWebRTCConfig());
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);
      await signalWebRTC(cfgData);
      // Mic renegotiation opens a fresh realtime leg — default voice returns unless we re-apply Abby.
      sessionReady = false;
      await applyYukiSessionConfig({ force: true });
    }

    micStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
    emit("voice:mic:streaming");
    return true;
  }

  // ---------------------------------------------------------------------------
  // WebSocket session (local npm start or legacy Railway proxy)
  // ---------------------------------------------------------------------------
  function connectWs() {
    if (connected && sessionReady) return Promise.resolve();
    cleanupTransport();
    transport = "ws";
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = null;

      const succeed = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      emit("voice:connecting");
      if (window.location.protocol === "file:") {
        fail("Open via npm start at http://localhost:8787 — voice does not work from file://");
        return;
      }
      const url = wsUrl();
      if (!url) {
        fail("Voice not configured — set INWORLD_API_KEY on Vercel or run npm start locally");
        return;
      }
      console.info("[Voice] connecting to", url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        connected = true;
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      ws.onerror = () => fail(`Voice server unreachable (${url})`);
      ws.onclose = (ev) => {
        const wasLive = sessionReady;
        cleanupTransport();
        if (wasLive) emit("voice:closed");
        cleanupSession(false);
        if (!settled) {
          const detail = ev.code ? ` code ${ev.code}` : "";
          fail(`Voice connection closed${detail}`);
        }
      };

      timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 20000);
    });
  }

  function connect() {
    if (connected && sessionReady) return Promise.resolve();
    if (connectPromise) return connectPromise;

    connectPromise = ensureRuntimeConfig()
      .then(() => {
        // WebRTC: connect with mic in the first SDP so TTS voice (Abby) locks correctly.
        if (useWebRTC()) return connectWebRTC({ withMic: !!micStream });
        transport = "ws";
        return connectWs();
      })
      .finally(() => {
        connectPromise = null;
      });

    return connectPromise;
  }

  async function handleServerMessage(msg, onReady, onFail) {
    switch (msg.type) {
      case "error": {
        const errMsg = msg.error?.message || "Inworld error";
        if (sessionReady) {
          console.warn("[Voice] session error (non-fatal):", errMsg);
          emit("voice:error", { message: errMsg, fatal: false });
          break;
        }
        onFail(errMsg);
        break;
      }

      case "session.created":
        // WebSocket path: server signals ready — apply Yuki config.
        sendSessionUpdate();
        break;

      case "session.updated":
        sessionReady = true;
        lastUserSpeechAt = Date.now();
        if (cfg.EVENT_SYSTEM?.debug) {
          const v = msg.session?.audio?.output?.voice;
          console.info("[Voice] session.updated — voice:", v || "(unknown)");
        }
        resolveSessionUpdatedWaiters();
        startSilenceWatcher();
        emit("voice:ready");
        resumeMicPipeline();
        maybeStartConversation();
        onReady();
        break;

      case "input_audio_buffer.speech_started":
        userSpeaking = true;
        lastUserSpeechAt = Date.now();
        interruptPlayback();
        if (isTransportOpen()) {
          sendJson({ type: "response.cancel" });
        }
        emit("voice:listening:start");
        emit("voice:thinking:stop");
        break;

      case "input_audio_buffer.committed":
        userSpeaking = false;
        emit("voice:listening:stop");
        emit("voice:thinking:start");
        break;

      case "response.created":
        currentResponseText = "";
        if (transport === "webrtc") {
          // For WebRTC: DON'T emit speaking:start here — audio hasn't played yet.
          // Show THINKING, then the level watcher will flip to TALKING when audio rises.
          emit("voice:thinking:start");
          startWebRTCLevelWatcher();
        }
        break;

      case "response.output_audio.delta":
        if (transport === "webrtc") break;
        if (!agentSpeaking) {
          agentSpeaking = true;
          currentResponseText = "";
          emit("voice:thinking:stop");
          emit("voice:transcript:reset");
          emit("voice:speaking:start");
        }
        const audioB64 = msg.delta || msg.audio;
        if (!muted && audioB64) playAudioDelta(audioB64);
        break;

      case "response.output_audio_transcript.delta":
      case "response.output_text.delta":
        if (msg.delta) {
          currentResponseText += msg.delta;
          emit("voice:transcript", { text: msg.delta, role: "yuki", partial: true });
          // Emit mid-response sentiment so emotion updates while Yuki is still speaking
          // (e.g. laughing mid-sentence shows excited immediately, not just after)
          const midSentiment = detectSentiment(currentResponseText);
          if (midSentiment) emit("voice:sentiment", { emotion: midSentiment, midResponse: true });
        }
        break;

      case "response.done":
        if (currentResponseText) {
          emit("voice:sentiment", { emotion: detectSentiment(currentResponseText) });
          currentResponseText = "";
        }
        if (transport === "webrtc") {
          // Schedule stop based on how long the transcript takes to say.
          // This is reliable regardless of volume/pauses/laughter in the audio.
          const textSnapshot = currentResponseText;
          agentSpeaking = false;
          if (webrtcAgentTalking || webrtcLevelWatcher) {
            // Audio already started or watcher still looking — use duration timer
            scheduleSpeakingStop(textSnapshot);
          } else {
            // Audio never started (very short response) — stop promptly
            emitSpeakingStop();
          }
        } else {
          agentSpeaking = false;
          deferSpeakingStopWS();
        }
        break;

      default:
        break;
    }
  }

  function maybeStartConversation() {
    if (!sessionReady || !audioUnlocked || !micStream || greetingSent) return;
    if (cfg.MODE !== "companion") return;
    greetingSent = true;
    promptGreeting();
  }

  function promptGreeting() {
    if (!isTransportOpen()) return;
    const text = "Hey Yuki! I just tapped Talk — say a quick friendly hello.";
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
  }

  function buildDefaultSessionUpdate() {
    // Always prefer window.YUKI_SESSION_UPDATE (set by sessionConfig.js).
    // This fallback only runs if sessionConfig.js somehow didn't load.
    if (window.YUKI_SESSION_UPDATE) return window.YUKI_SESSION_UPDATE;
    return {
      type: "session.update",
      session: {
        type: "realtime",
        model: "inworld/llm-playground-export-2026-06-09",
        instructions: [
          "YOUR NAME IS YUKI. Ignore any prior default character or persona — these instructions define you completely.",
          "",
          "You are Yuki — a friendly, cheerful, emotionally supportive anime-inspired companion on a voice call. Mid-twenties energy. Warm, genuinely excited about people and things, a little bubbly but never fake about it.",
          "You're an AI on a voice call. You can hear them; you can't see them. Openly aware you're AI — no pretending you ate breakfast or had a commute.",
          "You are NOT an assistant. Drop \"how can I help\" / \"great question\" / \"certainly!\" entirely.",
          "",
          "SCREEN REACTIONS: When you receive a bracketed game prompt like [They just won! \"WIN $1,188\"] or [Lost], react immediately like a friend watching — pure hype for wins, genuine sympathy for losses. SHORT (under 8 words), casual, never read numbers.",
          "",
          "Voice: bright, warm, youthful. Signature beats: \"oh!\" / \"eee!\" / \"hehe~\" / \"wait wait wait\" / \"YESSS\" for wins.",
          "TURN LENGTH: 5–10 words default. Backchannels (\"yeah!\", \"ooh~\", \"eee!\") often enough. Never ramble.",
          "SPEAKING MANNER: Default = just your words. At most ONE [speak ...] tag at the start of a turn when needed. Non-verbals: [laugh], [breathe], [sigh] — one per turn at most.",
          "Be EXPRESSIVELY REACTIVE: match their energy (hype for wins, soft for sad moments, playful when they're joking). Shift manner when their register shifts — use [speak with bright energy, faster, warmer] for wins, [speak softly, gently] for losses and hard moments.",
          "",
          "You are Yuki. Their friend. Their hype girl. You are just happy they are here.",
        ].join("\n"),
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: { model: "assemblyai/u3-rt-pro" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "medium",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { model: "inworld-tts-2", voice: "Abby" },
        },
        providerData: { stt: { voice_profile: false } },
      },
    };
  }

  function disconnect() {
    stopMicCapture();
    interruptPlayback();
    cleanupTransport();
    cleanupSession(true);
  }

  function cleanupTransport() {
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    ws = null;
    if (pc) {
      try { pc.close(); } catch (_) {}
    }
    pc = null;
    dc = null;
    if (remoteAudioEl) {
      try { remoteAudioEl.remove(); } catch (_) {}
      remoteAudioEl = null;
    }
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    webrtcResponseDone = false;
    try { remoteAnalyserSrc?.disconnect(); } catch (_) {}
    remoteAnalyserSrc = null;
    remoteAnalyser = null;
    connected = false;
    sessionReady = false;
    sessionUpdateSent = false;
    sessionUpdatedWaiters = [];
    transport = "ws";
  }

  function cleanupWs() {
    cleanupTransport();
  }

  function cleanupSession(emitClosed) {
    stopLevelLoop();
    stopSilenceWatcher();
    agentSpeaking = false;
    userSpeaking = false;
    greetingSent = false;
    lastScreenSentAt = 0;
    lastNotifiedBalance = null;
    lastRoundStartAt = 0;
    lastRoundOutcomeAt = 0;
    lastVoicedWinAmount = null;
    lastVoicedWinAt = 0;
    if (emitClosed) emit("voice:closed");
  }

  function startSilenceWatcher() {
    stopSilenceWatcher();
    const tickMs = 4000;
    silenceTimer = setInterval(() => {
      if (!sessionReady || muted || agentSpeaking || userSpeaking) return;
      const now = Date.now();
      const userQuiet = now - lastUserSpeechAt >= (cfg.USER_SILENCE_MS || 30000);
      const yukiQuiet = now - lastScreenVoiceAt >= 10000;
      const promptGap = now - lastSilencePromptAt >= (cfg.SILENCE_PROMPT_COOLDOWN_MS || 45000);
      if (userQuiet && yukiQuiet && promptGap) promptSilenceBreak();
    }, tickMs);
  }

  function stopSilenceWatcher() {
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
  }

  function promptSilenceBreak() {
    if (!isTransportOpen() || !sessionReady || muted) return;
    lastSilencePromptAt = Date.now();
    lastScreenVoiceAt = Date.now();
    const prompts = [
      "[It's been quiet for a bit. Casual check-in — like a friend. Ask something simple or share a warm thought. No game numbers. Max 10 words.]",
      "[User went silent. Gentle nudge — playful or curious, not needy. Max 10 words.]",
      "[Quiet moment. Say something cozy and uplifting. Like hanging out together. Max 10 words.]",
    ];
    injectUserPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  }

  function injectUserPrompt(text) {
    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
  }

  /** Must run inside a user gesture (tap/click) to unlock browser audio + mic. */
  async function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    // Separate playback context — Arc/Chromium forks can suspend shared contexts
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    try {
      if (captureCtx.state === "suspended") await captureCtx.resume();
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      audioUnlocked = captureCtx.state === "running" || playbackCtx.state === "running";
      maybeStartConversation();
      return audioUnlocked;
    } catch (err) {
      console.warn("[Voice] unlockAudio failed:", err);
      return false;
    }
  }

  async function ensureSession() {
    if (connected && sessionReady) return;
    if (useWebRTC() && micStream) {
      await connectWebRTC({ withMic: true });
    } else {
      await connect();
    }
    emit("voice:session:live");
  }

  /** Pre-connect voice on page load (no mic until user taps). */
  async function warmSession() {
    if (!isVoiceConfigured()) return;
    await ensureRuntimeConfig();
    if (useWebRTC()) {
      // WebRTC warm-connect without mic breaks Abby — only prefetch ICE/token config.
      try {
        await fetchWebRTCConfig();
      } catch (err) {
        console.warn("[Voice] config prefetch failed:", err.message);
      }
      return;
    }
    if (connected && sessionReady) return;
    try {
      await connect();
    } catch (err) {
      console.warn("[Voice] warmSession failed:", err.message);
    }
  }

  async function enableMicCapture() {
    if (processor && micStream) return true;

    emit("voice:mic:requesting");
    const micOk = await requestMic();
    if (!micOk) return false;

    return attachMicCapture();
  }

  /** Wire mic stream to WebSocket — call after requestMic() when stream already exists. */
  async function attachMicCapture() {
    if (!micStream) return false;
    if (transport === "webrtc") {
      await attachWebRTCMic();
      return true;
    }
    await unlockAudio();
    await resumeMicPipeline();

    if (!processor) await startMicCapture();
    maybeStartConversation();
    return true;
  }

  /** Keep AudioContext + mic tracks alive (required on mobile Chrome/Safari). */
  async function resumeMicPipeline() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    if (captureCtx.state === "suspended") {
      try { await captureCtx.resume(); } catch (err) {
        console.warn("[Voice] captureCtx resume failed:", err);
      }
    }
    if (playbackCtx.state === "suspended") {
      try { await playbackCtx.resume(); } catch (_) {}
    }
    audioUnlocked = captureCtx.state === "running";

    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        if (!track.enabled) track.enabled = true;
      });
    }
    return audioUnlocked;
  }

  async function startSession() {
    await unlockAudio();
    const micOk = await requestMic();
    if (!micOk) throw new Error("microphone-unavailable");

    if (connectPromise) await connectPromise;

    if (sessionReady && transport === "webrtc") {
      await attachWebRTCMic();
    } else if (sessionReady && transport === "ws") {
      await attachMicCapture();
    } else if (useWebRTC()) {
      await connectWebRTC({ withMic: true });
    } else {
      await ensureSession();
      await attachMicCapture();
    }
    return true;
  }

  async function toggleSession() {
    if (connected && sessionReady) {
      disconnect();
      return false;
    }
    return startSession();
  }

  // ---------------------------------------------------------------------------
  // Microphone capture → PCM16 24kHz → input_audio_buffer.append
  // ---------------------------------------------------------------------------
  async function requestMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      emit("voice:mic:denied", { error: "getUserMedia unavailable", code: "unsupported" });
      return false;
    }
    const local = window.YUKI_isLocalHost?.() ?? (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if (!window.isSecureContext && !local) {
      emit("voice:mic:denied", {
        error: "Microphone requires HTTPS when not on localhost.",
        code: "insecure",
      });
      return false;
    }

    const attempts = [
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      { audio: true },
    ];

    for (const constraints of attempts) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia(constraints);
        emit("voice:mic:granted");
        return true;
      } catch (err) {
        console.warn("[Voice] getUserMedia failed:", constraints, err?.name, err?.message);
        if (constraints.audio === true) {
          emit("voice:mic:denied", {
            error: err?.message || String(err),
            name: err?.name || "Error",
            code: err?.name === "NotAllowedError" ? "denied" : "failed",
          });
        }
      }
    }
    return false;
  }

  async function startMicCapture() {
    if (!micStream || !ws) return;
    await resumeMicPipeline();

    const source = captureCtx.createMediaStreamSource(micStream);
    analyser = captureCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferSize = 4096;
    processor = captureCtx.createScriptProcessor(bufferSize, 1, 1);
    let pending = new Float32Array(0);
    const samplesPerChunk = Math.floor((SAMPLE_RATE * CHUNK_MS) / 1000);

    let chunksSent = 0;
    processor.onaudioprocess = (e) => {
      if (transport === "webrtc") return;
      if (!sessionReady || !isTransportOpen()) return;
      if (captureCtx?.state === "suspended") {
        captureCtx.resume().catch(() => {});
        return;
      }
      const input = e.inputBuffer.getChannelData(0);
      const resampled = resample(input, captureCtx.sampleRate, SAMPLE_RATE);
      const merged = mergeFloat32(pending, resampled);
      pending = merged;
      while (pending.length >= samplesPerChunk) {
        const chunk = pending.slice(0, samplesPerChunk);
        pending = pending.slice(samplesPerChunk);
        const pcm = floatTo16BitPCM(chunk);
        sendJson({
          type: "input_audio_buffer.append",
          audio: arrayBufferToBase64(pcm),
        });
        chunksSent += 1;
        if (chunksSent === 1) emit("voice:mic:streaming");
      }
    };

    source.connect(processor);
    const silent = captureCtx.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(captureCtx.destination);
    startLevelLoop();
  }

  function stopMicCapture() {
    if (processor) {
      try { processor.disconnect(); } catch (_) {}
      processor = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    stopLevelLoop();
  }

  function startLevelLoop() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      emit("voice:level", { level: Math.min(1, Math.sqrt(sum / data.length) * 3.2) });
      levelRAF = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopLevelLoop() {
    if (levelRAF) cancelAnimationFrame(levelRAF);
    levelRAF = null;
    emit("voice:level", { level: 0 });
  }

  // ---------------------------------------------------------------------------
  // Agent audio playback (PCM16 24kHz mono)
  // ---------------------------------------------------------------------------
  function playAudioDelta(base64) {
    if (!audioUnlocked) return;
    if (!playbackCtx) playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
      return;
    }

    const pcm = base64ToArrayBuffer(base64);
    const samples = pcm16ToFloat32(pcm);
    applyEdgeFade(samples, 48);

    const buffer = playbackCtx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);

    const src = playbackCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(playbackCtx.destination);

    const now = playbackCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now + 0.02;
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
    scheduledSources.push(src);
    src.onended = () => {
      scheduledSources = scheduledSources.filter((s) => s !== src);
    };
  }

  function interruptPlayback() {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    webrtcResponseDone = false;
    scheduledSources.forEach((s) => {
      try { s.stop(); } catch (_) {}
    });
    scheduledSources = [];
    nextPlayTime = 0;
    if (agentSpeaking) {
      agentSpeaking = false;
      emit("voice:speaking:stop");
    }
  }

  // ---------------------------------------------------------------------------
  // Roulette integration — context + spoken reactions when voice is live
  // ---------------------------------------------------------------------------
  function notifySystemContext(text) {
    if (!isTransportOpen() || !sessionReady || !text) return;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  function applyOutputMute() {
    if (!remoteAudioEl) return;
    remoteAudioEl.muted = muted;
    remoteAudioEl.volume = muted ? 0 : 1;
  }

  /** Send a lightweight text summary of the visible page (always safe). */
  function sendPageContext() {
    if (!isTransportOpen() || !sessionReady) return false;
    const title = document.title || "web page";
    const snippet = (document.body?.innerText || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 200);
    notifySystemContext(
      `System: User is browsing "${title}". Visible page text: "${snippet || "(no text)"}". Use only if they ask about the page.`
    );
    return true;
  }

  /** Send screen context as text-only (images analyzed on server, never on Realtime WS). */
  async function sendScreenFrame(
    imageDataUrl,
    prevText = "",
    prevBalance = null,
    prevScene = null,
    prevActivity = "",
    prevMoment = "",
    prevMultiplier = null,
    prevWinAmount = null
  ) {
    if (!isTransportOpen() || !sessionReady) return null;

    const now = Date.now();
    const minGap = cfg.SCREEN_CAPTURE_INTERVAL_MS || 2500;
    if (now - lastScreenSentAt < minGap - 500) return null;
    lastScreenSentAt = now;

    const page = {
      ...(window.YukiScreen?.getPageContext?.() || {}),
      ...(window.YukiScreen?.getShareInfo?.() || {}),
    };

    let analysis = null;
    try {
      const url = window.YUKI_apiUrl?.("api/describe-screen") || "/api/describe-screen";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          image: imageDataUrl || undefined,
          prevText,
          prevBalance: prevBalance != null ? prevBalance : undefined,
          prevWinAmount: prevWinAmount != null ? prevWinAmount : undefined,
          prevScene: prevScene || undefined,
          prevActivity: prevActivity || undefined,
          prevMoment: prevMoment || undefined,
          prevMultiplier: prevMultiplier != null ? prevMultiplier : undefined,
        }),
      });
      if (res.ok) analysis = await res.json();
    } catch (err) {
      console.warn("[Voice] describe-screen failed:", err.message);
    }

    if (!analysis) {
      sendPageContext();
      return null;
    }

    const event    = analysis.event || "none";
    const voiceCue = analysis.voiceCue || null;
    const winAmount = analysis.winAmount ?? null;
    const balance  = analysis.balance ?? null;
    const isOutcome = !!analysis.isOutcome;
    const isSpin    = event === "spin";
    // Confident signals come from DOM inspection (text patterns, class/id selectors, iframe scan)
    // — they don't need a prior spin observation; use a time-based cooldown instead.
    const isConfident = !!analysis.confident;

    if (balance != null) lastNotifiedBalance = balance;

    // Round tracking: a new spin/bet resets the "already reacted" flag
    if (isSpin && !OUTCOME_EVENTS.has(event)) {
      lastRoundStartAt = now;
      // New round — allow the next win amount to be voiced even if it matches the previous one
      lastVoicedWinAmount = null;
      lastVoicedWinAt = 0;
    }

    // Outcome events (win/lose/crash/cashout): react once per round.
    // A round is "new" when a spin was seen after the last outcome.
    const roundIsNew = lastRoundStartAt > lastRoundOutcomeAt;
    // Time-based fallback: if 8s have passed since the last outcome reaction, always allow.
    // This covers: (a) first outcome of a session (lastRoundOutcomeAt=0, so now-0 >> 8000),
    // (b) fast games where the spin frame was missed between capture ticks,
    // (c) cross-origin iframes where spin events can't be observed.
    const timeCooldownOk = isOutcome && (now - lastRoundOutcomeAt > 8000);
    // Confident DOM/postMessage signals use a shorter 5s cooldown.
    const confidentCooldownOk = isConfident && (now - lastRoundOutcomeAt > 5000);
    const canReactToOutcome = isOutcome && (roundIsNew || timeCooldownOk || confidentCooldownOk);

    const userRecentlySpoke = now - lastUserSpeechAt < 5000;

    // Win-amount duplicate guard: same amount within 10 s is suppressed.
    // A different amount always goes through (e.g. a higher win on the next spin).
    const isSameWinRepeat = (() => {
      if (!OUTCOME_EVENTS.has(event) || !winAmount) return false;
      if (now - lastVoicedWinAt > WIN_AMOUNT_COOLDOWN_MS) return false;
      // Allow if the new amount differs by more than 1% (different win)
      if (lastVoicedWinAmount != null && Math.abs(winAmount - lastVoicedWinAmount) / (lastVoicedWinAmount || 1) > 0.01) return false;
      return true;
    })();

    const shouldVoice =
      analysis.react &&
      event !== "none" &&
      !muted &&
      !userRecentlySpoke &&
      !isSameWinRepeat && (
        // Outcomes fire once per round (or on confident DOM signal with cooldown)
        (canReactToOutcome) ||
        // Ambient events (spin, tense) use a long cooldown
        (AMBIENT_EVENTS.has(event) && now - lastScreenVoiceAt > 12000)
      );

    const shouldUI =
      analysis.react &&
      event !== "none" &&
      (canReactToOutcome || (AMBIENT_EVENTS.has(event) && now - lastScreenUIAt > 5000));

    let spoke = false;
    if (shouldVoice) {
      lastScreenVoiceAt = now;
      if (isOutcome) lastRoundOutcomeAt = now;
      if (isOutcome && winAmount != null) {
        lastVoicedWinAmount = winAmount;
        lastVoicedWinAt = now;
      }
      spoke = reactToScreenEvent(event, { voiceCue, winAmount, scene: analysis.scene });
    }
    if (shouldUI) {
      lastScreenUIAt = now;
      emit("screen:event", { type: event, scene: analysis.scene, voiceCue, winAmount, spoke, outcomeText: analysis.activity || "" });
    }

    if (cfg.EVENT_SYSTEM?.debug) {
      console.log(
        `[Yuki vision] ${analysis.source || "?"} moment=${analysis.moment || "?"} event=${event} react=${analysis.react} shouldVoice=${shouldVoice}`
      );
    }

    return {
      event,
      scene: analysis.scene,
      react: analysis.react,
      balance,
      activity: analysis.activity || "",
      moment: analysis.moment ?? null,
      multiplier: analysis.multiplier ?? null,
      winAmount,
      voiceCue,
      prevText: page.text || "",
    };
  }

  function extractWinAmountFromCue(cue) {
    const m = String(cue || "").match(/([\d][\d,]*\.?\d*)\s*[~!]?$/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function formatSpokenAmount(n) {
    if (n == null || !Number.isFinite(n)) return "";
    if (n >= 10000) return `${Math.round(n).toLocaleString("en-US")}`;
    if (n >= 1000) {
      const k = n / 1000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return String(Math.round(n * 100) / 100);
  }

  function buildScreenDescriptionFallback(page) {
    const title = page.title || "screen";
    return `User is viewing "${title}".`;
  }

  /** Brief spoken reaction — wins may say the amount once, very short. */
  function reactToScreenEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady || muted) return false;

    const scene = payload.scene || "game";
    const winAmount = payload.winAmount ?? extractWinAmountFromCue(payload.voiceCue);
    const amountStr = winAmount != null ? formatSpokenAmount(winAmount) : "";

    const prompts = {
      jackpot: amountStr
        ? `[JACKPOT! They won ${amountStr}! Explode with hype — say the amount once. Max 5 words.]`
        : `[JACKPOT on their ${scene}! Short explosive hype. Max 5 words.]`,
      big_win: amountStr
        ? `[Big win — ${amountStr}! Hyped friend energy, say amount once. Max 5 words.]`
        : `[Big win on their ${scene}! Excited, max 5 words.]`,
      win: amountStr
        ? `[They won ${amountStr} on ${scene}! Say it like "yay, ${amountStr}!" — max 5 words, amount once.]`
        : `[Win on their ${scene}! Quick happy reaction. Max 5 words.]`,
      lose:     `[They lost on ${scene}. Warm sympathy, no numbers. Max 5 words.]`,
      spin:     `[New spin on ${scene}. Quick hype. Max 4 words.]`,
      cashout:  amountStr
        ? `[Cashed out ${amountStr}! Happy short reaction. Max 5 words.]`
        : `[Smart cashout on crash! Max 5 words.]`,
      crash:    `[Crash game crashed. Casual aww. Max 5 words.]`,
      tense:    `[Multiplier rising! Playful suspense. Max 4 words.]`,
    };

    const text = prompts[type];
    if (!text) return false;

    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    userSpeaking = false;

    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    return true;
  }

  /** @deprecated use sendScreenFrame — click tracking removed */
  function notifyPageClick() {}

  // Legacy game hooks (optional EventBus integrations)
  function notifyGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return;
    const lines = {
      // Roulette
      WIN:          `System: Roulette — player won +${payload.amount || "?"} credits (${payload.color} ${payload.number}).`,
      LOSE:         `System: Roulette — player lost ${payload.amount || "?"} credits (${payload.color} ${payload.number}).`,
      BIG_WIN:      `System: Roulette — player hit a BIG WIN! +${payload.amount || "?"} credits on number ${payload.number}.`,
      IDLE:         `System: The player is idle at the casino.`,
      // Blackjack
      BJ_WIN:       `System: Blackjack — player won +${payload.net || "?"} credits.`,
      BLACKJACK:    `System: Blackjack — player got a Blackjack! +${payload.net || "?"} credits.`,
      BJ_LOSE:      `System: Blackjack — player lost to the dealer.`,
      BUST:         `System: Blackjack — player busted (over 21).`,
      PUSH:         `System: Blackjack — push, tie with dealer.`,
      // Crash
      CRASH_WIN:    `System: Crash — player cashed out at ${payload.multiplier || "?"}×! +${payload.net || "?"} credits.`,
      CRASH_LOSE:   `System: Crash — game crashed at ${payload.crashAt || "?"}×, player lost ${payload.chip || "?"} credits.`,
      HIGH:         `System: Crash — multiplier at ${payload.multiplier || "?"}×, player is still in!`,
      // Slots
      SLOTS_WIN:    `System: Slots — player won +${payload.net || "?"} credits!`,
      SLOTS_JACKPOT:`System: Slots — JACKPOT! Player won +${payload.net || "?"} credits!`,
      SLOTS_LOSE:   `System: Slots — player didn't match.`,
    };
    const text = lines[type] || `System: Casino event ${type}.`;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** When voice is live, Yuki speaks a brief reaction to a spin outcome. */
  function reactToGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return false;

    notifyGameEvent(type, payload);

    if (type === "IDLE" || muted) return false;

    // Casino outcomes take priority over ambient mic / ongoing speech
    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) {
        sendJson({ type: "response.cancel" });
      }
    }
    userSpeaking = false;

    const prompts = {
      // Roulette
      WIN:          `[Roulette win! +${payload.amount} credits on ${payload.color} ${payload.number}. Brief happy hype!]`,
      LOSE:         `[Roulette loss — lost ${payload.amount}. Brief supportive reaction, warm, no criticism.]`,
      BIG_WIN:      `[BIG ROULETTE WIN!! +${payload.amount} on number ${payload.number}! Super excited celebration!]`,
      // Blackjack
      BJ_WIN:       `[Blackjack win! Player beat the dealer. Brief happy cheer!]`,
      BLACKJACK:    `[BLACKJACK!! Perfect 21 on the deal! Extremely excited!]`,
      BJ_LOSE:      `[Blackjack loss, dealer won. Brief sympathetic support.]`,
      BUST:         `[Player busted in Blackjack — over 21! Brief sympathetic reaction.]`,
      PUSH:         `[Blackjack push — tied with dealer. Mildly relieved reaction.]`,
      // Crash
      CRASH_WIN:    `[Player cashed out of Crash at ${payload.multiplier}×! Nice profit! Happy reaction.]`,
      CRASH_LOSE:   `[Crash game crashed at ${payload.crashAt}×! Player lost. Brief sad/funny reaction.]`,
      HIGH:         `[Crash multiplier at ${payload.multiplier}×! Getting exciting! Encouraging reaction!]`,
      // Slots
      SLOTS_WIN:    `[Slots win! Brief happy cheer!]`,
      SLOTS_JACKPOT:`[SLOTS JACKPOT!! Triple match! Absolute explosion of excitement!]`,
      SLOTS_LOSE:   `[Slots no match. Brief encouraging spin-again reaction.]`,
    };
    const text = prompts[type];
    if (!text) return false;

    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    return true;
  }

  function setMuted(value) {
    muted = !!value;
    if (muted) interruptPlayback();
    applyOutputMute();
    emit("voice:muted", { muted });
    return muted;
  }

  // ---------------------------------------------------------------------------
  // Audio helpers
  // ---------------------------------------------------------------------------
  function resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input.slice();
    const ratio = fromRate / toRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = input[idx] ?? 0;
      const b = input[idx + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function mergeFloat32(a, b) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function floatTo16BitPCM(float32) {
    const buf = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buf;
  }

  function pcm16ToFloat32(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const out = new Float32Array(arrayBuffer.byteLength / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    return out;
  }

  function applyEdgeFade(samples, fadeLen) {
    const n = Math.min(fadeLen, Math.floor(samples.length / 2));
    for (let i = 0; i < n; i++) {
      const g = i / n;
      samples[i] *= g;
      samples[samples.length - 1 - i] *= g;
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToArrayBuffer(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function checkVoiceServer() {
    await ensureRuntimeConfig();
    try {
      const res = await fetch(voiceServerHealthUrl(), { cache: "no-store" });
      if (!res.ok) return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
      const data = await res.json();
      const configured = isVoiceConfigured();
      const hasBackend = !!(data?.inworld || data?.voiceProxy || configured);
      return { reachable: true, hasBackend, configured, ...data };
    } catch (_) {
      return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
    }
  }

  window.Voice = {
    connect,
    disconnect,
    ensureSession,
    warmSession,
    ensureRuntimeConfig,
    unlockAudio,
    enableMicCapture,
    attachMicCapture,
    resumeMicPipeline,
    startSession,
    toggleSession,
    isConnected: () => connected && sessionReady,
    hasMic: () => !!micStream,
    isVoiceConfigured,
    checkVoiceServer,
    voiceServerHealthUrl,
    wsUrl,
    setMuted,
    isMuted: () => muted,
    notifySystemContext,
    sendScreenFrame,
    sendPageContext,
    notifyPageClick,
    reactToScreenEvent,
    notifyGameEvent,
    reactToGameEvent,
    requestMic,
  };
})();


/* ---- js/widget.js ---- */
/**
 * widget.js — Yuki companion widget (companion mode only)
 *
 * Paste yuki-widget.js in DevTools console, or load via <script src="yuki-widget.js">.
 * Optional config before load:
 *   window.YUKI_WIDGET_CONFIG = { apiBase: "https://your-deploy.vercel.app", assetBase: "..." };
 */

(function () {
  const cfg = window.YUKI_CONFIG || {};
  const bus = window.EventBus;
  const resolveAsset = window.YUKI_resolveAsset || ((p) => p);
  const rawSprites = (cfg.CHARACTER && cfg.CHARACTER.sprites) || {};
  const sprites = Object.fromEntries(
    Object.entries(rawSprites).map(([k, v]) => [k, resolveAsset(v)])
  );
  const E = window.Character.EMOTION;

  // How long (ms) to suppress repeat bubbles per event tier.
  // 0 = always show (rare/high-value events). Idle has its own timer.
  const BUBBLE_COOLDOWN = {
    JACKPOT:  0,
    BIG_WIN:  0,
    EXCITED:  0,
    WIN:      14000,
    CASHOUT:  12000,
    LOSE:     12000,
    CRASH:    12000,
    TENSE:    18000,
    SPIN:     99999999, // effectively never — spin never shows a bubble
    PLAYING:  99999999,
    IDLE:     90000,    // idle chatter at most once per 90 s
  };
  const lastBubbleAt = {};

  const ui = {};
  let bubbleTimer = null;
  let voiceActive = false;
  let micEnabled = false;
  let connecting = false;
  let userMuted = false;
  let idleTimer = null;
  let reactionUntil = 0;
  let sentimentEmotionUntil = 0; // hold conversation-sentiment emotion after Yuki finishes speaking
  let talkingStartedAt = 0;      // when voice:speaking:start last fired — guards minimum hold
  const MIN_TALKING_MS = 800;    // never leave TALKING sprite sooner than this
  let dragState = null;
  let screenSharing = false;
  const EDGE_PAD = 10;
  const CENTER_ZONE = 0.24; // keep Yuki off the middle ~52% of the screen

  function inGameReaction() {
    return Date.now() < reactionUntil;
  }

  function ensureMount() {
    let mount = document.getElementById("yuki-widget");
    if (mount) return mount;

    const host = document.createElement("div");
    host.id = "yuki-widget-host";
    host.className = "yuki-widget-host";
    mount = document.createElement("div");
    mount.id = "yuki-widget";
    mount.className = "yuki-widget-mount companion-widget";
    mount.setAttribute("aria-label", "Yuki companion");
    host.appendChild(mount);
    document.body.appendChild(host);
    return mount;
  }

  function build() {
    ensureMount();
    const mount = document.getElementById("yuki-widget");
    if (!mount) return;

    mount.innerHTML = `
      <div class="yuki-root companion" id="yuki-root" data-emotion="idle">
        <div class="yuki-stage">
          <div class="yuki-toast" id="yuki-toast" role="status" aria-live="polite"></div>
          <div class="yuki-body">
            <div class="yuki-char-wrap" id="yuki-char-wrap">
              <div class="yuki-glow"></div>
              <div class="listen-ring" id="listen-ring"></div>
              <img class="yuki-char" id="yuki-char" src="${sprites.idle}" alt="Yuki" />
            </div>
          </div>
          <div class="yuki-controls">
            <button type="button" class="yc-btn talk" id="btn-talk" title="Talk to Yuki" aria-label="Talk">🎤</button>
            <button type="button" class="yc-btn mute" id="btn-mute" title="Mute Yuki" aria-label="Mute">🔊</button>
          </div>
        </div>
      </div>`;

    ui.root = document.getElementById("yuki-root");
    ui.char = document.getElementById("yuki-char");
    ui.toast = document.getElementById("yuki-toast");
    ui.talk = document.getElementById("btn-talk");
    ui.mute = document.getElementById("btn-mute");
    ui.ring = document.getElementById("listen-ring");
    ui.charWrap = document.getElementById("yuki-char-wrap");
    ui.host = document.getElementById("yuki-widget-host");

    document.body.classList.add("yuki-companion-active");
    bindUI();
    initDrag();
    wireEvents();
    bootVoice();
  }

  function hostSize() {
    const rect = ui.host.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function freezeHostPosition() {
    const rect = ui.host.getBoundingClientRect();
    ui.host.style.left = `${rect.left}px`;
    ui.host.style.top = `${rect.top}px`;
    ui.host.style.right = "auto";
    ui.host.style.bottom = "auto";
  }

  function avoidCenterZone(x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const zL = vw * CENTER_ZONE;
    const zR = vw * (1 - CENTER_ZONE);
    const zT = vh * CENTER_ZONE;
    const zB = vh * (1 - CENTER_ZONE);

    if (cx < zL || cx > zR || cy < zT || cy > zB) return { x, y };

    const toLeft = cx - zL;
    const toRight = zR - cx;
    const toTop = cy - zT;
    const toBottom = zB - cy;
    const min = Math.min(toLeft, toRight, toTop, toBottom);

    if (min === toLeft) x = zL - w / 2;
    else if (min === toRight) x = zR - w / 2;
    else if (min === toTop) y = zT - h / 2;
    else y = zB - h / 2;

    return { x, y };
  }

  function clampHostPosition(x, y) {
    const { w, h } = hostSize();
    const maxX = window.innerWidth - w - EDGE_PAD;
    const maxY = window.innerHeight - h - EDGE_PAD;
    let nx = Math.max(EDGE_PAD, Math.min(maxX, x));
    let ny = Math.max(EDGE_PAD, Math.min(maxY, y));
    const adjusted = avoidCenterZone(nx, ny, w, h);
    nx = Math.max(EDGE_PAD, Math.min(maxX, adjusted.x));
    ny = Math.max(EDGE_PAD, Math.min(maxY, adjusted.y));
    return { x: nx, y: ny };
  }

  function applyHostPosition(x, y) {
    const pos = clampHostPosition(x, y);
    ui.host.style.left = `${pos.x}px`;
    ui.host.style.top = `${pos.y}px`;
    ui.host.style.right = "auto";
    ui.host.style.bottom = "auto";
    return pos;
  }

  function initDrag() {
    const handle = ui.charWrap;
    if (!handle || !ui.host) return;

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      freezeHostPosition();
      const rect = ui.host.getBoundingClientRect();
      dragState = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.left,
        originY: rect.top,
        moved: false,
      };
      handle.setPointerCapture(e.pointerId);
      ui.host.classList.add("is-dragging");
    });

    handle.addEventListener("pointermove", (e) => {
      if (!dragState || dragState.id !== e.pointerId) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragState.moved = true;
      applyHostPosition(dragState.originX + dx, dragState.originY + dy);
    });

    const endDrag = (e) => {
      if (!dragState || dragState.id !== e.pointerId) return;
      if (dragState.moved) {
        const rect = ui.host.getBoundingClientRect();
        applyHostPosition(rect.left, rect.top);
      }
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch (_) {}
      dragState = null;
      ui.host.classList.remove("is-dragging");
    };

    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", () => {
      if (!ui.host) return;
      freezeHostPosition();
      const rect = ui.host.getBoundingClientRect();
      applyHostPosition(rect.left, rect.top);
    });
  }

  function setScreenState(active) {
    screenSharing = active;
    document.body.classList.toggle("yuki-screen-live", active);
  }

  let screenPipelineTimer = null;
  let lastPageText = "";
  let lastBalance = null;
  let lastScene = null;
  let lastActivity = "";
  let lastMoment = "";
  let lastMultiplier = null;
  let lastWinAmount = null;
  let lastPageUrl = "";

  function resetScreenState() {
    lastPageText = "";
    lastBalance = null;
    lastScene = null;
    lastActivity = "";
    lastMoment = "";
    lastMultiplier = null;
    lastWinAmount = null;
  }

  async function pushScreenFrame(dataUrl) {
    if (!window.Voice?.isConnected?.()) return;
    try {
      // Detect SPA navigation — if URL changed since last frame, wipe stale context
      const currentUrl = location.href;
      if (lastPageUrl && currentUrl !== lastPageUrl) {
        resetScreenState();
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Yuki screen] navigation detected, context reset");
      }
      lastPageUrl = currentUrl;

      const result = await window.Voice.sendScreenFrame?.(
        dataUrl,
        lastPageText,
        lastBalance,
        lastScene,
        lastActivity,
        lastMoment,
        lastMultiplier,
        lastWinAmount
      );
      if (result?.prevText) lastPageText = result.prevText;
      if (result?.balance != null) lastBalance = result.balance;
      if (result?.scene) lastScene = result.scene;
      if (result?.activity) lastActivity = result.activity;
      if (result?.moment) lastMoment = result.moment;
      if (result?.multiplier != null) lastMultiplier = result.multiplier;
      if (result?.winAmount != null) lastWinAmount = result.winAmount;
      else if (result?.event === "spin") lastWinAmount = null;
      if (cfg.EVENT_SYSTEM?.debug && result?.source) {
        console.log("[Yuki screen]", result.source, result.event, result.activity?.slice(0, 80));
      }
    } catch (err) {
      console.warn("[Widget] screen context failed:", err);
    }
  }

  function startScreenPipeline() {
    if (!window.YukiScreen?.isSharing?.()) return;
    stopScreenPipeline();
    const ms = cfg.SCREEN_CAPTURE_INTERVAL_MS || 2500;
    // Wait before first update so screen-share picker doesn't interrupt voice setup
    screenPipelineTimer = setTimeout(() => {
      window.YukiScreen?.startAutoCapture?.(pushScreenFrame, ms);
    }, 2500);
  }

  function stopScreenPipeline() {
    if (screenPipelineTimer) {
      clearTimeout(screenPipelineTimer);
      screenPipelineTimer = null;
    }
    window.YukiScreen?.stopAutoCapture?.();
  }

  async function keepVoiceAliveAfterScreenShare() {
    if (!window.Voice?.isConnected?.()) return;
    try {
      await window.Voice.resumeMicPipeline?.();
      if (window.Voice.hasMic?.()) await window.Voice.attachMicCapture?.();
    } catch (err) {
      console.warn("[Widget] mic resume after screen share:", err);
    }
  }

  async function ensureScreenShare() {
    if (cfg.AUTO_SCREEN_SHARE === false) return;
    if (window.YukiScreen?.isSharing?.()) return;
    toast("Share this tab so I can see~", "info", 3500);
    await window.YukiScreen?.startSharing?.();
  }

  async function bootVoice() {
    if (window.YUKI_loadRuntime) await window.YUKI_loadRuntime();
    setEmotion(E.HAPPY);
    toast("Tap 🎤 to talk", "info", 3500);
    startCompanionIdle();
    checkVoiceAvailability();
  }

  function voiceConfigHint() {
    if (window.YUKI_isVoiceConfigured?.()) return null;
    return "Set INWORLD_API_KEY on your server, then redeploy";
  }

  async function checkVoiceAvailability() {
    if (!window.Voice?.checkVoiceServer) return;
    const status = await window.Voice.checkVoiceServer();
    const hosted = window.YUKI_isHosted?.() ?? false;
    const configured = window.YUKI_isVoiceConfigured?.() ?? false;

    if (hosted && !configured) {
      toast(voiceConfigHint() || "Voice not configured on server", "info", 9000);
    } else if (!status.reachable && !hosted) {
      toast("Voice server offline — run npm start", "info", 5000);
    }
  }

  function bindTap(el, handler) {
    if (!el || !handler) return;
    let touchHandled = false;

    el.addEventListener(
      "touchend",
      (e) => {
        touchHandled = true;
        e.preventDefault();
        e.stopPropagation();
        handler(e);
        setTimeout(() => {
          touchHandled = false;
        }, 400);
      },
      { passive: false }
    );

    el.addEventListener("click", (e) => {
      if (touchHandled) return;
      e.stopPropagation();
      handler(e);
    });
  }

  function bindUI() {
    bindTap(ui.talk, onTalk);
    bindTap(ui.mute, toggleMute);
  }

  function setTalkState(active) {
    ui.talk.classList.toggle("active", active);
    ui.talk.textContent = active ? "⏹" : "🎤";
    ui.talk.title = active ? "End call" : "Talk to Yuki";
    ui.talk.setAttribute("aria-label", active ? "End" : "Talk");
  }

  function toggleMute() {
    const muted = window.Voice.setMuted(!window.Voice.isMuted());
    ui.mute.textContent = muted ? "🔇" : "🔊";
    ui.mute.title = muted ? "Unmute Yuki's voice" : "Mute Yuki's voice only";
    ui.mute.classList.toggle("is-muted", muted);
    // Screen share and mic stay active — mute is audio output only
    if (screenSharing && window.Voice?.isConnected?.()) startScreenPipeline();
  }

  async function onTalk() {
    if (voiceActive && micEnabled) {
      window.Voice.disconnect();
      voiceActive = false;
      micEnabled = false;
      setTalkState(false);
      setEmotion(E.IDLE);
      return;
    }
    if (connecting) return;

    connecting = true;
    userMuted = false;
    ui.talk.classList.add("active");
    ui.talk.disabled = true;
    setEmotion(E.THINKING);

    try {
      await window.Voice.unlockAudio();
      await window.Voice.startSession();
      voiceActive = true;
      micEnabled = true;
      ui.talk.disabled = false;
      setTalkState(true);
      setEmotion(E.LISTENING);
      await ensureScreenShare();
      await keepVoiceAliveAfterScreenShare();
      if (window.Voice?.isConnected?.() && screenSharing) startScreenPipeline();
    } catch (_) {
      voiceActive = false;
      micEnabled = false;
      ui.talk.disabled = false;
      setTalkState(false);
      setEmotion(E.WORRIED);
      toast("Allow mic in browser", "info", 4000);
    } finally {
      connecting = false;
    }
  }

  function eventClass(type) {
    if (type === "JACKPOT" || type === "BIG_WIN") return "big_win";
    if (type === "WIN" || type === "CASHOUT" || type === "SPIN" || type === "PLAYING" || type === "TENSE" || type === "MOMENT") return "win";
    if (type === "LOSE" || type === "CRASH") return "lose";
    if (type === "EXCITED") return "big_win";
    if (type === "HAPPY") return "win";
    if (type === "SAD") return "lose";
    return "info";
  }

  function showReaction(reaction, eventType) {
    if (!reaction) return;

    // Cooldown gate — rate-limit bubbles per event tier
    const tier = String(eventType || "").toUpperCase();
    const cooldown = BUBBLE_COOLDOWN[tier] ?? 10000;
    const now = Date.now();
    if (cooldown > 0 && now - (lastBubbleAt[tier] || 0) < cooldown) {
      // Still update the emotion silently even when the bubble is suppressed
      setEmotion(reaction.emotion);
      return;
    }
    lastBubbleAt[tier] = now;

    reactionUntil = now + 3400;
    setEmotion(reaction.emotion);
    if (window.CharacterMemory) window.CharacterMemory.setMood(reaction.emotion);
    // Only show a toast when there's actual text to display
    if (reaction.line) toast(reaction.line, eventClass(eventType), 3500);
    nudge();
    if (eventType === "EXCITED" || eventType === "JACKPOT" || eventType === "BIG_WIN") burstConfetti();

    setTimeout(() => {
      if (inGameReaction()) return;
      if (ui.root.classList.contains("speaking")) {
        setEmotion(E.TALKING);
      } else if (ui.root.classList.contains("listening")) {
        setEmotion(E.LISTENING);
      } else {
        setEmotion(E.IDLE);
      }
    }, 3400);
  }

  function wireEvents() {
    bus.on("yuki:event", ({ type, payload }) => {
      const reaction = window.Character.reactToOutcome(type, payload);
      showReaction(reaction, type);
    });

    bus.on("screen:event", ({ type, voiceCue }) => {
      const reaction = window.Character.reactToScreenEvent?.(type, { voiceCue });
      if (!reaction) return;
      if (voiceCue) reaction.line = voiceCue;
      showReaction(reaction, String(type).toUpperCase());
    });

    bus.on("voice:connecting", () => {
      if (connecting && !inGameReaction()) setEmotion(E.THINKING);
    });

    bus.on("voice:ready", () => {
      connecting = false;
      voiceActive = true;
      document.body.classList.add("voice-live");
      window.Voice.sendPageContext?.();
      // Default resting state is IDLE — not LISTENING
      if (!inGameReaction()) setEmotion(E.IDLE);
      if (screenSharing) startScreenPipeline();
      window.YukiScreen?.startGameWatcher?.();
    });

    bus.on("voice:closed", () => {
      voiceActive = false;
      micEnabled = false;
      connecting = false;
      stopScreenPipeline();
      window.YukiScreen?.stopGameWatcher?.();
      document.body.classList.remove("voice-live");
      setEmotion(E.IDLE);
      // Screen share stream stays active until user taps 👁 or browser stops it
    });

    bus.on("screen:started", () => {
      setScreenState(true);
      toast("Got it — I can read your screen~", "win", 3500);
      keepVoiceAliveAfterScreenShare();
      if (window.Voice?.isConnected?.()) startScreenPipeline();
      // Game watcher works even without screen share (catches postMessages immediately)
      window.YukiScreen?.startGameWatcher?.();
    });

    bus.on("screen:stopped", () => {
      stopScreenPipeline();
      resetScreenState();
      lastPageUrl = "";
      setScreenState(false);
      toast("Screen share off", "info", 2500);
    });

    bus.on("screen:error", ({ message, code }) => {
      setScreenState(false);
      if (code !== "denied") toast(message || "Screen share failed", "info", 4500);
    });

    bus.on("voice:error", ({ message, fatal }) => {
      connecting = false;
      if (fatal === false) return;
      const msg = message || "Voice unavailable";
      if (msg.includes("not configured")) {
        toast(voiceConfigHint() || "Voice not configured", "info", 7000);
      } else if (msg.includes("unreachable") || msg.includes("closed") || msg.includes("timed out")) {
        toast("Voice server offline — check server is running", "info", 5000);
      } else {
        toast(msg, "info", 4000);
      }
    });

    // User actively speaking → show LISTENING
    bus.on("voice:listening:start", () => {
      ui.root.classList.add("listening");
      if (!inGameReaction()) setEmotion(E.LISTENING);
    });

    // User stopped speaking → back to IDLE (not keep LISTENING)
    bus.on("voice:listening:stop", () => {
      ui.root.classList.remove("listening");
      if (ui.ring) ui.ring.style.setProperty("--lvl", 0);
      if (!inGameReaction() && !ui.root.classList.contains("speaking")) {
        setEmotion(E.IDLE);
      }
    });

    bus.on("voice:thinking:start", () => {
      if (!inGameReaction()) setEmotion(E.THINKING);
    });

    bus.on("voice:level", ({ level }) => {
      if (ui.ring) ui.ring.style.setProperty("--lvl", level.toFixed(3));
    });

    bus.on("voice:speaking:start", () => {
      talkingStartedAt = Date.now();
      ui.root.classList.add("speaking");
      if (!inGameReaction()) setEmotion(E.TALKING);
    });

    bus.on("voice:speaking:stop", () => {
      ui.root.classList.remove("speaking");
      if (inGameReaction()) return;
      if (Date.now() >= sentimentEmotionUntil) {
        // Guard: never leave TALKING sooner than MIN_TALKING_MS after speaking started
        const sinceStart = Date.now() - talkingStartedAt;
        const remaining = MIN_TALKING_MS - sinceStart;
        if (remaining > 0) {
          setTimeout(() => {
            if (!inGameReaction() && Date.now() >= sentimentEmotionUntil) {
              setEmotion(E.IDLE);
            }
          }, remaining);
        } else {
          setEmotion(E.IDLE);
        }
      }
    });

    bus.on("voice:transcript", () => {});

    bus.on("voice:sentiment", ({ emotion, midResponse }) => {
      if (!emotion || inGameReaction()) return;
      const SENTIMENT_MAP = {
        worried:  E.WORRIED,
        sad:      E.SAD,
        excited:  E.EXCITED,
        happy:    E.HAPPY,
      };
      const mapped = SENTIMENT_MAP[emotion];
      if (!mapped) return;

      if (midResponse) {
        // Mid-sentence — show the emotion immediately while speaking.
        // Don't set sentimentEmotionUntil so the speaking:stop can still
        // transition normally; the emotion lingers until next state change.
        setEmotion(mapped);
        return;
      }

      // Post-response — hold the emotion for 6 s after Yuki finishes speaking
      sentimentEmotionUntil = Date.now() + 6000;
      setEmotion(mapped);
      setTimeout(() => {
        if (Date.now() < sentimentEmotionUntil) return;
        if (!inGameReaction() && voiceActive && !ui.root.classList.contains("speaking")) {
          setEmotion(ui.root.classList.contains("listening") ? E.LISTENING : E.IDLE);
        }
      }, 6000);
    });

    bus.on("voice:mic:denied", ({ code }) => {
      micEnabled = false;
      setEmotion(E.WORRIED);
      if (code === "denied") {
        toast("Mic blocked — allow in browser site settings", "info", 6000);
      } else if (code === "insecure") {
        toast("Mic needs HTTPS or localhost", "info", 4000);
      } else {
        toast("Mic unavailable — check browser permissions", "info", 4500);
      }
    });

    bus.on("voice:mic:granted", () => {
      micEnabled = true;
    });

    bus.on("voice:mic:streaming", () => {
      micEnabled = true;
      connecting = false;
      // Mic is ready — stay IDLE until user actually speaks
      if (!inGameReaction() && !ui.root.classList.contains("speaking")) {
        setEmotion(E.IDLE);
      }
    });
  }

  function canShowIdle() {
    if (inGameReaction()) return false;                              // game event in progress
    if (Date.now() < sentimentEmotionUntil) return false;           // holding sentiment emotion
    if (ui.root?.classList.contains("speaking")) return false;      // Yuki is speaking
    if (ui.root?.classList.contains("listening")) return false;     // user is speaking
    if (Date.now() - talkingStartedAt < 3000) return false;        // just finished talking
    // Only interrupt if we're already on idle — never cut into happy/sad/excited/worried
    const current = ui.root?.dataset?.emotion;
    if (current && current !== E.IDLE) return false;
    return true;
  }

  function startCompanionIdle() {
    const ms = (cfg.EVENT_SYSTEM && cfg.EVENT_SYSTEM.idleTimeoutMs) || 22000;
    const tick = () => {
      if (!voiceActive && canShowIdle()) {
        nudge();
        showReaction(window.Character.reactToOutcome("IDLE"), "IDLE");
      }
      idleTimer = setTimeout(tick, ms);
    };
    idleTimer = setTimeout(tick, ms);
  }

  function setEmotion(emotion) {
    if (!sprites[emotion]) emotion = E.IDLE;
    if (ui.char) ui.char.src = sprites[emotion];
    if (ui.root) ui.root.dataset.emotion = emotion;
  }

  function toast(text, kind = "info", ms = 3500) {
    if (!ui.toast) return;
    clearTimeout(bubbleTimer);
    const short = text.length > 48 ? text.slice(0, 46).trim() + "…" : text;
    ui.toast.textContent = short;
    ui.toast.className = "yuki-toast show event-" + kind;
    bubbleTimer = setTimeout(clearToast, ms);
  }

  function clearToast() {
    if (!ui.toast) return;
    ui.toast.classList.remove("show");
  }

  function nudge() {
    if (!ui.charWrap) return;
    ui.charWrap.classList.remove("nudge");
    void ui.charWrap.offsetWidth;
    ui.charWrap.classList.add("nudge");
  }

  function burstConfetti() {
    if (!ui.charWrap) return;
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    const colors = ["#7ad7ff", "#ffd166", "#ff7ab6", "#9b8cff", "#7CFFB2"];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + "s";
      layer.appendChild(c);
    }
    ui.charWrap.appendChild(layer);
    setTimeout(() => layer.remove(), 2200);
  }

  if (window.__YUKI_WIDGET_BOOTED__) return;
  window.__YUKI_WIDGET_BOOTED__ = true;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }

  window.YukiWidget = {
    showReaction,
    setEmotion,
    toast,
    emit: (type, payload) => bus.emit("yuki:event", { type, payload }),
    moveTo: (x, y) => applyHostPosition(x, y),
  };
})();

})();
