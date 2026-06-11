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
