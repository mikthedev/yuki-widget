import { analyzeScreenVision } from "./inworld-router.mjs";

/** Moments the vision model returns for in-progress action (round not settled). */
const ACTIVE_MOMENTS = new Set([
  "spinning", "bet_placed", "cards_dealt", "playing", "multiplier_rising",
]);

/** Moments that represent a settled round outcome. */
const OUTCOME_MOMENTS = new Set([
  "result_win", "result_lose", "result_push", "crashed", "cashed_out",
]);

/** Map vision moment → reaction event type. */
const MOMENT_TO_EVENT = {
  spinning:          "spin",
  bet_placed:        "spin",
  cards_dealt:       "spin",
  multiplier_rising: "tense",
  crashed:           "crash",
  cashed_out:        "cashout",
  result_win:        "win",
  result_lose:       "lose",
  result_push:       "lose",
};

/** Short casual voice cue — only for high-signal events. Plain wins/spins return null. */
export function casualVoiceCue(event) {
  const cues = {
    jackpot:  "oh my god that's huge!!",
    big_win:  "yooo big hit!",
    lose:     "aww unlucky~",
    crash:    "nooo it crashed!",
    cashout:  "nice cashout!",
    tense:    "ooh getting intense~",
  };
  return cues[event] || null;
}

/** Compact amount for bubble + voice, e.g. 240, 1.2k, 22k */
export function formatWinAmount(value) {
  const n = parseBalance(value);
  if (n == null || n <= 0) return null;
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n).toLocaleString("en-US")}`;
  if (n >= 1_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

/** Pull a payout from vision text like "Win 240.00", "240 EGT", "+150". */
export function extractWinAmountFromText(text = "") {
  if (!text) return null;
  const s = String(text);
  const patterns = [
    /\bwin\s*[:=]?\s*(?:[$€£₹])?\s*([\d][\d,]*\.?\d*)/i,
    /\bwon\s*[:=]?\s*(?:[$€£₹])?\s*([\d][\d,]*\.?\d*)/i,
    /\bpayout\s*[:=]?\s*(?:[$€£₹])?\s*([\d][\d,]*\.?\d*)/i,
    /\+\s*([\d][\d,]*\.?\d*)/,
    /([\d][\d,]*\.?\d*)\s*(?:egt|credits?|coins?|krw|usd|eur)\b/i,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) {
      const v = parseBalance(m[1]);
      if (v != null && v > 0) return v;
    }
  }
  return null;
}

/** Short win reaction with amount — bubble + spoken cue stay tiny. */
export function buildWinVoiceCue(event, { amount = null, outcomeText = "" } = {}) {
  const amt = amount ?? extractWinAmountFromText(outcomeText);
  const formatted = formatWinAmount(amt);
  if (formatted) {
    if (event === "jackpot") return `JACKPOT! ${formatted}!`;
    if (event === "big_win") return `huge! ${formatted}!`;
    return `yay! ${formatted}~`;
  }
  return casualVoiceCue(event);
}

function classifyWinEvent(amount, balance = null) {
  if (balance != null && balance > 0) {
    const ratio = amount / balance;
    if (ratio >= 0.5 || amount >= 5000) return "jackpot";
    if (ratio >= 0.15 || amount >= 500) return "big_win";
    return "win";
  }
  if (amount >= 5000) return "jackpot";
  if (amount >= 500) return "big_win";
  return "win";
}

/** Parse a numeric balance/amount from various inputs. */
export function parseBalance(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  const cleaned = String(value).replace(/,/g, "").replace(/[^\d.]/g, "");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 1e12) return null;
  return n;
}

/** Find balance in DOM text (browser tab shares only). */
export function extractBalance(text = "") {
  if (!text) return null;
  const patterns = [
    /(?:balance|wallet|credits?|chips?|cash|funds|bankroll)\s*[:=]?\s*(?:[$€£₹])?\s*([\d][\d,]*\.?\d*)/gi,
    /(?:[$€£₹])\s*([\d][\d,]*\.?\d*)/gi,
    /(?:total)\s*(?:balance|credits?)?\s*[:=]?\s*([\d][\d,]*\.?\d*)/gi,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) {
      const v = parseBalance(m[1]);
      if (v != null) return v;
    }
  }
  return null;
}

/** Detect win/lose from balance change — backup signal. */
export function detectBalanceEvent(current, previous) {
  const cur = parseBalance(current);
  const prev = parseBalance(previous);
  if (cur == null || prev == null) return { event: "none", react: false, balance: cur };

  const delta = cur - prev;
  const minDelta = Math.max(0.05, prev * 0.005);
  if (Math.abs(delta) < minDelta) return { event: "none", react: false, delta, balance: cur };

  if (delta > 0) {
    const event = classifyWinEvent(delta, prev);
    return {
      event,
      react: true,
      delta,
      balance: cur,
      winAmount: delta,
      voiceCue: buildWinVoiceCue(event, { amount: delta }),
    };
  }
  return { event: "lose", react: true, delta, balance: cur, voiceCue: casualVoiceCue("lose") };
}

/** Detect win from the on-screen "Win" field (canvas slot games). */
export function detectWinAmountEvent(current, previous, scene = "slots", balance = null) {
  const cur = parseBalance(current);
  const prev = parseBalance(previous);
  if (cur == null || cur <= 0) return null;
  if (prev != null && cur <= prev + 0.01) return null;

  const event = classifyWinEvent(cur, balance);
  return {
    event,
    react: true,
    winAmount: cur,
    delta: prev != null ? cur - prev : cur,
    voiceCue: buildWinVoiceCue(event, { amount: cur }),
    isOutcome: true,
    scene: scene || "slots",
    activity: `Win ${cur}`,
    source: "vision-win-amount",
  };
}

function guessScene(text) {
  if (/slot|reel|cherries|jackpot|spin/.test(text)) return "slots";
  if (/roulette|wheel/.test(text)) return "roulette";
  if (/blackjack|dealer|hit|stand|bust/.test(text)) return "blackjack";
  if (/crash|multiplier|cash out|\d+\.\d+x/.test(text)) return "crash";
  if (/casino|bet|chips|credits/.test(text)) return "casino";
  if (/game|level|score|hp/.test(text)) return "game";
  return "other";
}

function useDomText(page = {}) {
  const s = page.displaySurface;
  return !s || s === "browser";
}

function buildResult(base) {
  const event = base.event || "none";
  return {
    description: base.description || base.activity || "",
    scene: base.scene || "other",
    event,
    react: !!base.react,
    balance: base.balance ?? null,
    delta: base.delta ?? null,
    activity: base.activity || base.description || "",
    voiceCue: base.voiceCue || (base.react && event !== "none" ? casualVoiceCue(event) : null),
    winAmount: base.winAmount ?? null,
    moment: base.moment || null,
    multiplier: base.multiplier ?? null,
    isOutcome: base.isOutcome ?? false,
    confident: base.confident ?? false,
    source: base.source || "text",
  };
}

/**
 * Convert vision output to a game reaction.
 * Returns null when nothing worth reacting to.
 */
export function detectVisionGameMoment(vision, prev = {}) {
  if (!vision?.activity && !vision?.moment) return null;

  const moment = String(vision.moment || "playing").toLowerCase();
  const scene = vision.scene || "other";
  const activity = String(vision.activity || "").trim();
  const multiplier = parseBalance(vision.multiplier);
  const prevMoment = String(prev.moment || "").toLowerCase();
  const prevMultiplier = parseBalance(prev.multiplier);

  const event = MOMENT_TO_EVENT[moment];
  const outcomeText = String(vision.outcomeText || "").trim();

  if (event && moment !== prevMoment) {
    const isOutcome = OUTCOME_MOMENTS.has(moment);
    // Upgrade win event if outcome text suggests jackpot or big win
    let resolvedEvent = event;
    if (event === "win" && outcomeText) {
      if (/jackpot/i.test(outcomeText)) resolvedEvent = "jackpot";
      else if (/big[\s-]?win/i.test(outcomeText)) resolvedEvent = "big_win";
    }
    // Build voice cue with win amount when visible on screen
    const parsedAmount =
      parseBalance(vision.winAmount) ??
      extractWinAmountFromText(outcomeText) ??
      extractWinAmountFromText(activity);
    const voiceCue =
      isOutcome && resolvedEvent !== "lose"
        ? buildWinVoiceCue(resolvedEvent, { amount: parsedAmount, outcomeText })
        : casualVoiceCue(resolvedEvent);
    return buildResult({
      scene,
      event: resolvedEvent,
      react: true,
      activity: outcomeText ? `${activity} — "${outcomeText}"` : activity,
      voiceCue,
      winAmount: parsedAmount,
      moment,
      multiplier,
      balance: parseBalance(vision.balance),
      isOutcome,
      source: "vision-moment",
    });
  }

  if (
    moment === "multiplier_rising" &&
    multiplier != null &&
    prevMultiplier != null &&
    multiplier >= prevMultiplier + 0.5
  ) {
    return buildResult({
      scene: scene || "crash",
      event: "tense",
      react: true,
      activity: activity || "multiplier climbing",
      voiceCue: casualVoiceCue("tense"),
      moment,
      multiplier,
      balance: parseBalance(vision.balance),
      source: "vision-mult",
    });
  }

  return null;
}

/**
 * Ordered win/lose/spin text rules. Each entry: { re, event, isOutcome, scene? }
 * Applied in order — first match wins.
 */
const TEXT_RULES = [
  // Wins (specific first)
  { re: /\bjackpot\b/i,                                                     event: "jackpot",  isOutcome: true  },
  { re: /\bbig[\s-]?win\b/i,                                                event: "big_win",  isOutcome: true  },
  { re: /\b(you[\s']?ve? won|you win|winner|won the round|you beat)\b/i,    event: "win",      isOutcome: true  },
  { re: /\b(payout|paid[\s-]?out|you have won|congratulations)\b/i,         event: "win",      isOutcome: true  },
  { re: /\bblackjack\b/i,                                                   event: "win",      isOutcome: true,  scene: "blackjack" },
  { re: /\bcash(?:ed)?[\s-]?out\b/i,                                        event: "cashout",  isOutcome: true,  scene: "crash" },
  // Losses
  { re: /\b(bust(?:ed)?)\b/i,                                               event: "lose",     isOutcome: true,  scene: "blackjack" },
  { re: /\b(you[\s']?ve? lost|you lose|round lost|no match)\b/i,            event: "lose",     isOutcome: true  },
  { re: /\b(no win|didn[\s']?t win|better luck|game over)\b/i,              event: "lose",     isOutcome: true  },
  { re: /\b(dealer wins|house wins|dealer wins the round)\b/i,              event: "lose",     isOutcome: true,  scene: "blackjack" },
  { re: /\bcrash(?:ed)?\b/i,                                                event: "crash",    isOutcome: true,  scene: "crash" },
  // Active round (spin/bet)
  { re: /\b(spinning|reels[\s-]?spinning)\b/i,                              event: "spin",     isOutcome: false, scene: "slots" },
  { re: /\b(place[\s-]?(?:your[\s-]?)?bet|bet[\s-]?placed)\b/i,            event: "spin",     isOutcome: false },
  { re: /\b(cards[\s-]?dealt|new[\s-]?round|round[\s-]?start(?:s|ed)?)\b/i,event: "spin",     isOutcome: false },
];

/** Text heuristics — works for any share mode since Yuki is always in-page. */
export function detectEventsFromText(page = {}, prevText = "", prevBalance = null) {
  const rawText = String(page.text || "");
  const text = rawText.toLowerCase();
  const scene = guessScene(text);
  const balance = extractBalance(rawText);

  const balEv = detectBalanceEvent(balance, prevBalance);
  if (balEv.react) {
    return buildResult({ ...balEv, scene: scene || "casino", source: "text-balance" });
  }

  const prev = String(prevText || "").toLowerCase();
  if (!text) {
    return buildResult({ event: "none", react: false, scene, balance, source: "text" });
  }

  for (const rule of TEXT_RULES) {
    if (!rule.re.test(text)) continue;
    // For outcome events: only fire if this keyword is NEW in the text since last tick
    if (rule.isOutcome && rule.re.test(prev)) continue;
    const detectedScene = rule.scene || scene || "game";
    const activity = text.match(rule.re)?.[0] || rule.event;
    return buildResult({
      event: rule.event,
      react: true,
      isOutcome: rule.isOutcome,
      scene: detectedScene,
      activity,
      balance,
      source: "text",
    });
  }

  return buildResult({ event: "none", react: false, scene, balance, source: "text" });
}

/**
 * Inspect the structured game signals collected from the DOM (including iframes).
 * Returns a high-confidence result with confident:true so voice.js can bypass
 * the spin-first round gate and use a simple time cooldown instead.
 */
export function detectDomSignals(page = {}) {
  const signals = page.gameSignals;
  if (!signals || !Array.isArray(signals) || signals.length === 0) return null;

  // Aggregate signal types
  const typeSignals = signals.filter((s) => s.type);
  const textSignals = signals.filter((s) => s.text);

  const allText = textSignals.map((s) => (s.text || "").toLowerCase()).join(" ");

  // Check text-bearing signals for specific keywords first (most precise)
  if (/jackpot/i.test(allText)) {
    return buildResult({ event: "jackpot", react: true, isOutcome: true, confident: true, scene: guessScene(allText), activity: "jackpot detected in DOM", source: "dom-signals" });
  }
  if (/big[\s-]?win/i.test(allText)) {
    return buildResult({ event: "big_win", react: true, isOutcome: true, confident: true, scene: guessScene(allText), activity: "big win detected in DOM", source: "dom-signals" });
  }
  if (/\b(bust(?:ed)?)\b/i.test(allText) || signals.some((s) => s.type === "lose")) {
    const isBust = /bust/i.test(allText);
    return buildResult({ event: "lose", react: true, isOutcome: true, confident: true, scene: isBust ? "blackjack" : guessScene(allText), activity: isBust ? "bust" : "loss detected in DOM", source: "dom-signals" });
  }
  if (textSignals.some((s) => /win|payout|jackpot|reward|prize/i.test(s.text || "")) || signals.some((s) => s.type === "win")) {
    return buildResult({ event: "win", react: true, isOutcome: true, confident: true, scene: guessScene(allText), activity: "win detected in DOM", source: "dom-signals" });
  }
  if (textSignals.some((s) => /lose|lost|bust|no win|game over/i.test(s.text || ""))) {
    return buildResult({ event: "lose", react: true, isOutcome: true, confident: true, scene: guessScene(allText), activity: "loss detected in DOM", source: "dom-signals" });
  }
  if (signals.some((s) => s.type === "spin")) {
    return buildResult({ event: "spin", react: true, isOutcome: false, confident: false, scene: guessScene(allText), activity: "spin/bet detected", source: "dom-signals" });
  }

  return null;
}

/**
 * Main analysis entry point.
 * @param {{ page?, image?, prevText?, prevBalance?, prevWinAmount?, prevScene?, prevMoment?, prevMultiplier? }} input
 */
export async function analyzeScreen(input = {}) {
  const page = input.page || {};

  // Only fire game reactions when an actual game is on screen.
  // Static pages (sports odds, lobby, account) should never trigger outcomes.
  // We trust the client-side isGameActive() detector. When there's no page.url
  // (direct API call / test), we allow reactions through.
  const gameActive = page.gameActive === true || !page.url;

  const prevBalance = parseBalance(input.prevBalance);
  const prevWinAmount = parseBalance(input.prevWinAmount);
  const prev = {
    moment: input.prevMoment || "",
    multiplier: parseBalance(input.prevMultiplier),
    scene: input.prevScene || null,
  };

  let vision = null;
  if (input.image) {
    try {
      vision = await analyzeScreenVision({
        imageDataUrl: input.image,
        page,
        prevBalance,
        prevMoment: prev.moment,
      });
    } catch (err) {
      console.warn("[describe-screen] vision failed:", err.message);
    }
  }

  const textBalance = useDomText(page) ? extractBalance(page.text) : null;
  const visionBalance = parseBalance(vision?.balance);
  const currentBalance = visionBalance ?? textBalance ?? null;
  const scene = vision?.scene || guessScene(page.text || "") || "other";
  const visionWinAmount =
    parseBalance(vision?.winAmount) ??
    extractWinAmountFromText(vision?.outcomeText) ??
    extractWinAmountFromText(vision?.activity);

  // All outcome/reaction checks are gated: only fire when a game is active on screen.
  if (gameActive) {
    // Canvas slot games: "Win" field in bottom bar (EGT, Pragmatic, etc.)
    const winAmtEv = detectWinAmountEvent(visionWinAmount, prevWinAmount, scene, currentBalance);
    if (winAmtEv?.react) {
      return buildResult({ ...winAmtEv, balance: currentBalance });
    }

    const balEv = detectBalanceEvent(currentBalance, prevBalance);
    if (balEv.react) {
      return buildResult({
        scene,
        event: balEv.event,
        react: true,
        balance: currentBalance,
        delta: balEv.delta,
        winAmount: balEv.winAmount ?? balEv.delta,
        activity: balEv.voiceCue || casualVoiceCue(balEv.event),
        voiceCue: balEv.voiceCue,
        isOutcome: true,
        source: visionBalance != null ? "vision-balance" : "text-balance",
      });
    }

    const visionMoment = detectVisionGameMoment(vision, prev);
    if (visionMoment?.react) return visionMoment;

    // DOM signals — high-confidence, includes same-origin iframe content
    const domSignal = detectDomSignals(page);
    if (domSignal?.react) return domSignal;

    const heuristics = detectEventsFromText(page, input.prevText || "", prevBalance);
    if (heuristics.react && heuristics.event !== "none") return heuristics;
  }

  if (vision?.activity) {
    return buildResult({
      description: vision.activity,
      scene,
      event: "none",
      react: false,
      balance: currentBalance,
      activity: vision.activity,
      moment: vision.moment || null,
      multiplier: parseBalance(vision.multiplier),
      source: "vision",
    });
  }

  return buildResult({
    description: "",
    scene,
    event: "none",
    react: false,
    balance: currentBalance,
    source: "text",
  });
}
