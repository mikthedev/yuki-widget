import { analyzeScreen } from "../lib/describe-screen.mjs";

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }

  try {
    const { page = {}, image, prevText = "", prevBalance = null, prevWinAmount = null, prevScene = null, prevActivity = "", prevMoment = "", prevMultiplier = null } = req.body || {};
    const result = await analyzeScreen({
      page,
      image,
      prevText,
      prevBalance,
      prevWinAmount,
      prevScene,
      prevActivity,
      prevMoment,
      prevMultiplier,
    });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("[describe-screen]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
