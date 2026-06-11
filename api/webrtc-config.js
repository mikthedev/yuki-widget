import { fetchIceServers, mintInworldJwt, resolveApiKey } from "../lib/inworld-jwt.mjs";

/** @type {import('@vercel/node').VercelRequest} */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!resolveApiKey()) {
    res.status(503).json({
      ok: false,
      error: "Set INWORLD_API_KEY in Vercel → Settings → Environment Variables, then redeploy",
    });
    return;
  }

  try {
    const apiKey = (process.env.INWORLD_API_KEY || "").trim();
    const jwt = await mintInworldJwt();
    const ice_servers = await fetchIceServers(jwt.token);

    res.status(200).json({
      ok: true,
      mode: "webrtc",
      // Inworld WebRTC calls endpoint expects Bearer <base64-api-key> (see Inworld docs).
      token: apiKey,
      tokenType: "Bearer",
      expirationTime: jwt.expirationTime || null,
      ice_servers,
      callsUrl: "https://api.inworld.ai/v1/realtime/calls",
    });
  } catch (err) {
    console.error("[webrtc-config]", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
