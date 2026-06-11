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
