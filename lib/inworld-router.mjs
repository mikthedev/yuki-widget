/** Inworld Router API — vision analysis (server-side only, never on Realtime WS). */

export function getRouterAuthHeader() {
  const key = (process.env.INWORLD_API_KEY || "").trim();
  if (!key) return null;
  return `Basic ${key}`;
}

const ROUTER_URL = "https://api.inworld.ai/v1/chat/completions";

const VISION_SYSTEM = `You analyze casino and game screenshots to detect EXACTLY what just happened.

Return ONLY valid JSON — no markdown, no explanation:
{
  "scene": "slots|roulette|blackjack|crash|poker|sports|game|browser|other",
  "moment": "idle|spinning|result_win|result_lose|result_push|multiplier_rising|crashed|cashed_out|bet_placed|cards_dealt|playing",
  "activity": "one specific sentence describing what is VISIBLE RIGHT NOW",
  "outcomeText": null,
  "winAmount": null,
  "balance": null,
  "multiplier": null
}

moment guide — be DECISIVE, scan every pixel including small text, popups, overlays, chip stacks:
- result_win: ANY win indicator — "YOU WIN", "Winner!", "+amount", green payout text, win popup, coins flying, chip gain, jackpot screen, cash out confirmation, payout shown
- result_lose: ANY loss indicator — "No win", "BUST", "You lost", "Better luck", dealer winning, chips removed, bet gone with no return
- result_push: tie / push shown (blackjack only)
- spinning: reels actively spinning, roulette ball rolling, dice mid-air, cards being shuffled
- multiplier_rising: crash game multiplier number actively increasing
- crashed: crash game exploded / game over message after multiplier
- cashed_out: cash-out button was pressed and confirmed in crash game
- bet_placed: bet just placed, waiting for spin/deal
- cards_dealt: initial cards just shown, no outcome yet
- playing: active game in progress, no clear outcome visible
- idle: lobby, menu, home screen, waiting between rounds

IMPORTANT — canvas / iframe slot games (EGT, Pragmatic, Amusnet, Bell Link, etc.):
- The game is drawn on HTML CANVAS inside an iframe — there is NO readable DOM text for wins
- Read the BOTTOM STATUS BAR from the screenshot pixels: Balance | Win | Bet
- winAmount: the number shown next to the "Win" label ONLY (digits, no currency) — e.g. if Win shows "240.00 EGT" return 240
- balance: the number next to "Balance" label (digits only)
- result_win when Win field shows a value greater than zero after a spin
- outcomeText: copy the Win line exactly, e.g. "Win 240.00 EGT" or "240.00"

IMPORTANT — small UI matters:
- Win/loss results often appear as SMALL POPUPS, overlays, chip count changes, or brief text flashes — look for these carefully
- Balance or chip count changing upward = likely win; downward = likely loss
- The game content may be inside an iframe — analyze the ENTIRE visible area
- If you see a "+amount" or "-amount" anywhere, that is a payout or loss
- ALWAYS copy any visible win/loss text into outcomeText (e.g. "+$120", "YOU WIN 500", "BUST", "No win", "BLACKJACK!")

outcomeText: EXACT win/loss text visible (e.g. "Win 240.00 EGT", "YOU WIN 500", "BUST"). null if none.
winAmount: payout number from the Win/Payout field (digits only). null if Win shows 0 or not visible.
balance: visible Balance field (digits only). null if not visible.
multiplier: crash game multiplier if visible (e.g. 2.47). null otherwise.

BE DECISIVE — when in doubt between result_win/result_lose and playing, prefer the outcome.`;

/**
 * @param {{ imageDataUrl: string, page?: object, prevBalance?: number|null, prevMoment?: string }} input
 */
export async function analyzeScreenVision({
  imageDataUrl,
  page = {},
  prevBalance = null,
  prevMoment = "",
}) {
  const auth = getRouterAuthHeader();
  if (!auth || !imageDataUrl?.startsWith("data:image")) return null;

  // Build DOM-derived signal hints to guide the model
  const domHints = [];
  if (page.gameSignals && Array.isArray(page.gameSignals) && page.gameSignals.length > 0) {
    const sigTypes = page.gameSignals.filter((s) => s.type).map((s) => s.type);
    const sigTexts = page.gameSignals.filter((s) => s.text).map((s) => s.text).slice(0, 5);
    if (sigTypes.length > 0) domHints.push(`DOM signals detected: ${[...new Set(sigTypes)].join(", ")}.`);
    if (sigTexts.length > 0) domHints.push(`DOM element text: ${sigTexts.map((t) => `"${t}"`).join(", ")}.`);
  }
  if (page.hasIframes) domHints.push("Game content is inside an iframe — analyze the full visible area.");
  if (page.text) {
    const snippet = String(page.text).trim().slice(0, 150).replace(/\s+/g, " ");
    if (snippet) domHints.push(`Page text snippet: "${snippet}"`);
  }

  const hints = [
    page.title ? `Tab title: ${page.title}.` : "",
    prevBalance != null ? `Previous balance was ${prevBalance}.` : "",
    prevMoment ? `Previous game phase: ${prevMoment}.` : "",
    ...domHints,
    "This may be a canvas slot game — read the Win amount from the bottom bar pixels. Is Win > 0?",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(ROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google-ai-studio/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: VISION_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: hints },
            {
              type: "image_url",
              image_url: { url: imageDataUrl, detail: "high" },
            },
          ],
        },
      ],
      extra_body: {
        models: [
          "google-ai-studio/gemini-2.5-flash",
          "openai/gpt-4o",
          "openai/gpt-4o-mini",
        ],
        allow_fallbacks: true,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Vision API ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}
