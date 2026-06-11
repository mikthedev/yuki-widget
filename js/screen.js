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
