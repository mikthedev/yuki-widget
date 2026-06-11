/**
 * Bundle Yuki into a single pasteable file: yuki-widget.js
 *
 * Usage:
 *   node scripts/bundle-yuki.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const jsFiles = [
  "js/runtime.js",
  "js/config.js",
  "js/eventBus.js",
  "js/memory.js",
  "js/character.js",
  "js/sessionConfig.js",
  "js/screen.js",
  "js/voice.js",
  "js/widget.js",
];

const css = fs.readFileSync(path.join(root, "css/yuki-widget.css"), "utf8");

const jsParts = jsFiles.map((f) => {
  const content = fs.readFileSync(path.join(root, f), "utf8");
  return `\n/* ---- ${f} ---- */\n${content}`;
});

const header = `/**
 * Yuki Widget — single-file voice companion (Inworld Realtime)
 * Loaded automatically by yuki.js — you rarely paste this directly.
 *
 * ONE-LINE EMBED (DevTools console):
 *   (function(){var s=document.createElement("script");s.src="http://localhost:8787/yuki.js";document.head.appendChild(s)})();
 *
 * Replace localhost:8787 with your deployed URL on Vercel.
 * No extra config needed — apiBase & assetBase auto-detect from script URL.
 */
`;

const bundle = `${header}
(function () {
  "use strict";
  if (window.__YUKI_BUNDLE_LOADED__) {
    console.warn("[Yuki] already loaded");
    return;
  }
  window.__YUKI_BUNDLE_LOADED__ = true;

  const style = document.createElement("style");
  style.id = "yuki-widget-styles";
  style.textContent = ${JSON.stringify(css)};
  document.head.appendChild(style);

  const font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap";
  if (!document.querySelector('link[href*="Outfit"]')) {
    document.head.appendChild(font);
  }
${jsParts.join("\n")}
})();
`;

const outPath = path.join(root, "yuki-widget.js");
fs.writeFileSync(outPath, bundle);
console.log("Bundled →", outPath, `(${(bundle.length / 1024).toFixed(1)} KB)`);
