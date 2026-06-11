/**
 * character.js — Yuki reactions for screen / game events
 */
(function () {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const EMOTION = Object.freeze({
    IDLE: "idle",
    HAPPY: "happy",
    EXCITED: "excited",
    SAD: "sad",
    THINKING: "thinking",
    TALKING: "talking",
    LISTENING: "listening",
    WORRIED: "worried",
  });

  const LINES = {
    IDLE:    ["Hey~", "Still here?", "Hi~"],
    HAPPY:   ["Nice!", "Hehe~"],
    EXCITED: ["OMG!!", "YESSS!!"],
    SAD:     ["Aww…", "Next one~"],

    WIN:     ["Nice~", "Got one!"],
    BIG_WIN: ["HUGE WIN!!", "Woah!!"],
    JACKPOT: ["JACKPOT!!!", "INCREDIBLE!!"],
    LOSE:    ["Aww~", "Next one!"],
    SPIN:    null,
    CASHOUT: ["Smart!", "Clean exit~"],
    CRASH:   ["Oof!", "So close~"],
    TENSE:   ["Ooh…", "Don't crash!"],
    PLAYING: null,
  };

  function reactToOutcome(type) {
    switch (type) {
      case "JACKPOT":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.JACKPOT) };
      case "BIG_WIN":
      case "EXCITED":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.BIG_WIN) };
      case "WIN":
      case "CASHOUT":
      case "HAPPY":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.WIN) };
      case "LOSE":
      case "CRASH":
      case "SAD":
        return { emotion: EMOTION.SAD, line: pick(LINES.LOSE) };
      case "SPIN":
      case "PLAYING":
        return { emotion: EMOTION.HAPPY, line: null };
      case "IDLE":
      default:
        return { emotion: EMOTION.IDLE, line: pick(LINES.IDLE) };
    }
  }

  function reactToScreenEvent(event, payload = {}) {
    const key = String(event || "none").toLowerCase();

    // spin/playing: only change emotion, never show a text bubble
    if (key === "spin" || key === "playing" || key === "moment") {
      return { emotion: EMOTION.HAPPY, line: null };
    }

    // voiceCue from screen analysis takes priority
    if (payload?.voiceCue) {
      const emotion =
        key === "lose" || key === "crash"
          ? EMOTION.SAD
          : key === "jackpot" || key === "big_win" || key === "tense"
            ? EMOTION.EXCITED
            : EMOTION.HAPPY;
      return { emotion, line: payload.voiceCue };
    }

    switch (key) {
      case "jackpot":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.JACKPOT) };
      case "big_win":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.BIG_WIN) };
      case "win":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.WIN) };
      case "lose":
        return { emotion: EMOTION.SAD, line: pick(LINES.LOSE) };
      case "cashout":
        return { emotion: EMOTION.HAPPY, line: pick(LINES.CASHOUT) };
      case "crash":
        return { emotion: EMOTION.SAD, line: pick(LINES.CRASH) };
      case "tense":
        return { emotion: EMOTION.EXCITED, line: pick(LINES.TENSE) };
      default:
        return null;
    }
  }

  window.Character = { EMOTION, name: "Yuki", reactToOutcome, reactToScreenEvent };
})();
