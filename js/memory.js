/**
 * memory.js — lightweight session memory for Yuki
 */
(function () {
  const cfg =
    (window.YUKI_CONFIG && window.YUKI_CONFIG.CHARACTER_MEMORY) || {
      persist: false,
      maxTurns: 12,
      maxTopics: 6,
    };

  const STORE_KEY = "yuki_session_memory_v1";

  const blank = () => ({
    turns: [],
    topics: [],
    context: {
      startedAt: Date.now(),
      lastMood: "idle",
      userName: null,
    },
  });

  const TOPIC_KEYWORDS = {
    games: ["game", "gaming", "play"],
    anime: ["anime", "manga", "waifu", "otaku", "naruto", "onepiece", "ghibli"],
    music: ["music", "song", "playlist", "band", "kpop", "lofi", "listen"],
    movies: ["movie", "film", "cinema", "netflix", "show", "series"],
    hobbies: ["hobby", "draw", "paint", "code", "cook", "gym", "read"],
    "daily life": ["work", "school", "tired", "today", "weekend", "coffee", "sleep"],
  };

  let state = load();

  function load() {
    if (cfg.persist) {
      try {
        const raw = sessionStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return blank();
  }

  function save() {
    if (!cfg.persist) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function detectTopics(text) {
    const lower = (text || "").toLowerCase();
    const found = [];
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      if (words.some((w) => lower.includes(w))) found.push(topic);
    }
    return found;
  }

  function rememberTopic(topic) {
    const existing = state.topics.find((t) => t.topic === topic);
    if (existing) {
      existing.count += 1;
      existing.lastAt = Date.now();
    } else {
      state.topics.push({ topic, count: 1, lastAt: Date.now() });
    }
    state.topics.sort((a, b) => b.lastAt - a.lastAt);
    state.topics = state.topics.slice(0, cfg.maxTopics);
  }

  function addTurn(role, text) {
    state.turns.push({ role, text, at: Date.now() });
    if (state.turns.length > cfg.maxTurns) {
      state.turns = state.turns.slice(-cfg.maxTurns);
    }
    if (role === "user") {
      detectTopics(text).forEach(rememberTopic);
      const name = extractName(text);
      if (name) state.context.userName = name;
    }
    save();
  }

  function extractName(text) {
    const m = (text || "").match(/\b(?:i am|i'm|im|my name is|call me)\s+([a-z][a-z'-]{1,20})/i);
    return m ? m[1].replace(/^\w/, (c) => c.toUpperCase()) : null;
  }

  function setMood(mood) {
    state.context.lastMood = mood;
    save();
  }

  const getContext = () => ({ ...state.context });
  const getRecentTurns = (n = 4) => state.turns.slice(-n);
  const getTopTopic = () => (state.topics.length ? state.topics[0].topic : null);
  const getTopics = () => state.topics.map((t) => t.topic);
  const getUserName = () => state.context.userName;

  function reset() {
    state = blank();
    save();
  }

  window.CharacterMemory = {
    addTurn,
    setMood,
    detectTopics,
    getContext,
    getRecentTurns,
    getTopTopic,
    getTopics,
    getUserName,
    reset,
  };
})();
