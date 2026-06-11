/**
 * Yuki loader — paste one line in DevTools:
 *   (function(){var s=document.createElement("script");s.src="http://localhost:8787/yuki.js";document.head.appendChild(s)})();
 */
(function (w, d) {
  if (w.__YUKI_LOADING__ || w.__YUKI_BUNDLE_LOADED__) return;
  w.__YUKI_LOADING__ = true;

  var src = (d.currentScript && d.currentScript.src) || "";
  var origin = src ? new URL(src).origin : w.location.origin || "http://localhost:8787";

  var s = d.createElement("script");
  s.src = origin + "/yuki-widget.js";
  s.async = true;
  d.head.appendChild(s);
})(window, document);
