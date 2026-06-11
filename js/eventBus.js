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
