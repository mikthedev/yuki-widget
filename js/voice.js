/**
 * voice.js — Inworld Realtime speech-to-speech (no browser TTS)
 * -----------------------------------------------------------------------------
 * Connects to the local WebSocket proxy (server/index.js), which forwards to
 * Inworld's Realtime API. Handles mic capture, PCM16 streaming, and agent audio
 * playback.
 *
 * Public API:
 *   Voice.connect()              start voice session (mic + WebSocket)
 *   Voice.disconnect()           end session
 *   Voice.toggleSession()        connect / disconnect
 *   Voice.isConnected()
 *   Voice.setMuted(bool)         mute agent audio output only
 *   Voice.isMuted()
 *   Voice.notifyGameEvent(type, payload)  inject roulette context (silent)
 *
 * EventBus events:
 *   voice:connecting / voice:ready / voice:closed / voice:error
 *   voice:listening:start / voice:listening:stop
 *   voice:thinking:start / voice:thinking:stop
 *   voice:speaking:start / voice:speaking:stop
 *   voice:transcript  { text, role }
 *   voice:level  { level }
 *   voice:muted  { muted }
 */

(function () {
  const cfg = window.YUKI_CONFIG || {};
  const bus = window.EventBus;
  const SAMPLE_RATE = 24000;
  const CHUNK_MS = 80;

  let ws = null;
  let transport = "ws"; // "ws" | "webrtc"
  let pc = null;
  let dc = null;
  let remoteAudioEl = null;
  let connected = false;
  let sessionReady = false;
  let muted = false;
  let micStream = null;
  let captureCtx = null;
  let playbackCtx = null;
  let processor = null;
  let analyser = null;
  let levelRAF = null;
  let agentSpeaking = false;
  let userSpeaking = false;
  let currentResponseText = "";
  let audioUnlocked = false;
  let greetingSent = false;
  let connectPromise = null;
  let webrtcCfg = null;
  let sessionUpdateSent = false;
  let sessionUpdatedWaiters = [];
  let lastScreenSentAt = 0;
  let lastScreenVoiceAt = 0;
  let lastScreenUIAt = 0;
  let lastUserSpeechAt = 0;
  let lastSilencePromptAt = 0;
  let silenceTimer = null;
  let lastNotifiedBalance = null;

  // Per-round tracking — react to each round's outcome exactly once
  let lastRoundStartAt = 0;       // time a new spin/bet was detected
  let lastRoundOutcomeAt = 0;     // time we last reacted to an outcome

  // Win-amount cooldown — prevent repeating the same amount within 10 s
  let lastVoicedWinAmount = null; // last amount we announced
  let lastVoicedWinAt = 0;        // when we announced it
  const WIN_AMOUNT_COOLDOWN_MS = 10000;

  const OUTCOME_EVENTS = new Set(["win", "big_win", "jackpot", "lose", "crash", "cashout"]);
  const AMBIENT_EVENTS  = new Set(["spin", "tense"]);

  // Scheduled playback nodes for interrupt support
  let scheduledSources = [];
  let nextPlayTime = 0;

  // Deferred speaking-stop for WebSocket path
  let speakingStopTimer = null;

  // WebRTC: level-driven speaking state (driven by actual remote audio RMS)
  let remoteAnalyser = null;
  let remoteAnalyserSrc = null;
  let webrtcLevelWatcher = null;   // setInterval handle for RMS polling
  let webrtcAgentTalking = false;  // true while remote audio RMS is above threshold
  let webrtcResponseDone = false;  // set when response.done received — allows final stop

  const emit = (name, data) => bus && bus.emit(name, data);

  /**
   * Emit voice:speaking:stop (+ related events) and clear any pending timer.
   * Safe to call multiple times — idempotent after the first call per response.
   */
  function emitSpeakingStop() {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    emit("voice:speaking:stop");
    emit("voice:thinking:stop");
    if (!userSpeaking) emit("voice:listening:stop");
  }

  /**
   * WebSocket path: defer speaking-stop until the Web Audio queue actually drains.
   * nextPlayTime is the scheduled end time in audioCtx seconds.
   */
  function deferSpeakingStopWS() {
    if (!playbackCtx || nextPlayTime <= playbackCtx.currentTime) {
      emitSpeakingStop();
      return;
    }
    const delayMs = Math.ceil((nextPlayTime - playbackCtx.currentTime) * 1000) + 200;
    speakingStopTimer = setTimeout(emitSpeakingStop, delayMs);
  }

  /**
   * Estimate how long a piece of text will take to speak aloud.
   * Used to schedule voice:speaking:stop without relying on volume.
   * ~155 wpm average + 1 s tail buffer, minimum 2 s.
   */
  function estimateSpeakDuration(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const WPM   = 155;
    const base  = words > 0 ? Math.ceil((words / WPM) * 60 * 1000) : 3000;
    return Math.max(base + 1000, 2000);
  }

  /**
   * WebRTC: RMS watcher used ONLY for detecting when audio STARTS (rising edge).
   * Speech END is handled by a text-length timer in scheduleSpeakingStop().
   * This separates "did audio begin?" (volume) from "has it finished?" (duration).
   */
  function startWebRTCLevelWatcher() {
    stopWebRTCLevelWatcher();
    webrtcResponseDone = false;
    if (!remoteAnalyser) return;

    if (playbackCtx && playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
    }

    const data     = new Uint8Array(remoteAnalyser.frequencyBinCount);
    const RISE_RMS = 3;       // RMS above this → audio started
    const MAX_WAIT = 8000;    // max time to wait for audio to rise before giving up
    const startedAt = Date.now();

    webrtcLevelWatcher = setInterval(() => {
      if (!remoteAnalyser) { stopWebRTCLevelWatcher(); return; }

      // If audio never rose within MAX_WAIT, stop watching
      if (!webrtcAgentTalking && Date.now() - startedAt > MAX_WAIT) {
        stopWebRTCLevelWatcher();
        return;
      }

      // Once audio has started and the duration timer is running, stop polling
      if (webrtcAgentTalking) {
        stopWebRTCLevelWatcher();
        return;
      }

      remoteAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const d = data[i] - 128; sum += d * d; }
      const rms = Math.sqrt(sum / data.length);

      if (rms > RISE_RMS) {
        webrtcAgentTalking = true;
        agentSpeaking = true;
        emit("voice:thinking:stop");
        emit("voice:speaking:start");
        stopWebRTCLevelWatcher();
      }
    }, 50);
  }

  /**
   * Schedule voice:speaking:stop after estimated speech duration.
   * Called from response.done for WebRTC.
   */
  function scheduleSpeakingStop(text) {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    const delayMs = estimateSpeakDuration(text);
    speakingStopTimer = setTimeout(() => {
      webrtcAgentTalking = false;
      agentSpeaking = false;
      emitSpeakingStop();
    }, delayMs);
  }

  function stopWebRTCLevelWatcher() {
    if (webrtcLevelWatcher) {
      clearInterval(webrtcLevelWatcher);
      webrtcLevelWatcher = null;
    }
  }

  /**
   * Lightweight keyword sentiment for Yuki's spoken response text.
   * Returns an EMOTION key for widget.js to apply during/after speaking.
   */
  function detectSentiment(text) {
    const t = (text || "").toLowerCase();

    // Laughter → excited (checked first — laughing while sad is still excited visually)
    if (/\b(haha|hehe|lol|lmao|heehee|aha+ha|bwaha|pfft|teehee|giggl|snort)\b|ha{3,}|he{3,}/.test(t))
      return "excited";

    // Excited / hyped
    if (/\b(jackpot|huge|incredible|insane|omg|oh my god|oh my gosh|amazing|unbelievable|massive|epic|legendary|woah|wow|no way|eee+|yess+|let'?s go|i can'?t believe|that'?s insane|so good|so cool|blown away|mind.?blown)\b/.test(t))
      return "excited";

    // Sad / worried / empathetic
    if (/\b(sorry|that('s| is) (tough|hard|rough|sad|awful)|i (feel|understand|hear) you|hang in there|that (sucks|hurts)|must be (hard|difficult|tough|rough)|awful|terrible|heartbreak|grief|loss|lonely|hurt|pain|afraid|scared|worried|rough time|devastating|that'?s rough|oh no|poor (you|thing)|i'?m here)\b/.test(t))
      return "worried";

    // Happy / warm / positive
    if (/\b(yay|nice|great|awesome|good job|well done|congrats|congratulations|love (it|that|this|you)|happy|fun|exciting|cool|sweet|fantastic|beautiful|brilliant|wonderful|proud|so proud|love that|good for you|that'?s great|hehe|haha)\b/.test(t))
      return "happy";

    // Sad / down / loss
    if (/\b(unlucky|aww+|so close|next time|that'?s a shame|better luck|lost|crashed|busted|bust|didn'?t make it|almost|not quite|tough one|rough one)\b/.test(t))
      return "sad";

    return null;
  }

  function backendWsUrl(base) {
    if (!base) return null;
    const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:").replace(/\/$/, "");
    return `${wsBase}/realtime`;
  }

  function wsUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.wsUrl) return rt.wsUrl;
    if (rt.voiceBackendUrl) return backendWsUrl(rt.voiceBackendUrl);

    if (cfg.REALTIME && cfg.REALTIME.wsUrl) return cfg.REALTIME.wsUrl;

    const apiBase = (cfg.API_BASE || "").replace(/\/$/, "");
    if (apiBase) {
      const wsBase = apiBase.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
      return `${wsBase}/realtime`;
    }

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;

    const local =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    const onVoicePort = pagePort === voicePort || pagePort === 80 || pagePort === 443;

    if (local && pagePort && !onVoicePort) {
      return `${proto}//${host}:${voicePort}/realtime`;
    }

    if (local || !window.location.protocol.startsWith("http")) {
      return `${proto}//${window.location.host}/realtime`;
    }

    return null;
  }

  function voiceServerHealthUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.voiceBackendUrl) {
      return `${rt.voiceBackendUrl.replace(/\/$/, "")}/health`;
    }

    const apiBase = (cfg.API_BASE || "").replace(/\/$/, "");
    if (apiBase) return `${apiBase}/health`;

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;
    const voiceOnSameHost =
      !pagePort || pagePort === voicePort || pagePort === 80 || pagePort === 443;
    const base = voiceOnSameHost
      ? `${window.location.protocol}//${window.location.host}`
      : `${window.location.protocol}//${host}:${voicePort}`;
    return `${base}/health`;
  }

  function isVoiceConfigured() {
    return window.YUKI_isVoiceConfigured?.() ?? !!(wsUrl());
  }

  async function ensureRuntimeConfig() {
    if (window.YUKI_loadRuntime) await window.YUKI_loadRuntime();
  }

  function useWebRTC() {
    if (window.YUKI_isLocalHost?.()) return false;
    const rt = window.YUKI_RUNTIME || {};
    if (rt.mode === "webrtc") return true;
    if (rt.mode === "proxy") return false;
    return !!(rt.hasInworldKey && !rt.wsUrl);
  }

  function sendJson(obj) {
    const text = JSON.stringify(obj);
    if (transport === "webrtc") {
      if (dc?.readyState === "open") dc.send(text);
    } else if (ws?.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  }

  /** Apply Yuki voice + personality. WebRTC never sends session.created — must call on dc.onopen. */
  function sendSessionUpdate() {
    if (sessionUpdateSent) return;
    const payload = window.YUKI_SESSION_UPDATE || buildDefaultSessionUpdate();
    if (!payload?.session) return;
    sendJson(payload);
    sessionUpdateSent = true;
    if (cfg.EVENT_SYSTEM?.debug) {
      console.info("[Voice] session.update sent", transport, payload.session?.audio?.output?.voice);
    }
  }

  function resetSessionUpdateFlag() {
    sessionUpdateSent = false;
  }

  function waitForSessionUpdated(timeoutMs = 10000) {
    if (sessionReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = sessionUpdatedWaiters.indexOf(done);
        if (idx >= 0) sessionUpdatedWaiters.splice(idx, 1);
        reject(new Error("session.updated timeout"));
      }, timeoutMs);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      sessionUpdatedWaiters.push(done);
    });
  }

  function resolveSessionUpdatedWaiters() {
    sessionUpdatedWaiters.splice(0).forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }

  /** (Re)apply Abby + Yuki instructions — required after WebRTC mic renegotiation. */
  async function applyYukiSessionConfig({ force = false } = {}) {
    if (force) resetSessionUpdateFlag();
    sendSessionUpdate();
    if (transport === "webrtc") {
      try {
        await waitForSessionUpdated();
      } catch (err) {
        console.warn("[Voice] waiting for session.updated:", err.message);
      }
    }
  }

  function isTransportOpen() {
    if (transport === "webrtc") return dc?.readyState === "open";
    return ws?.readyState === WebSocket.OPEN;
  }

  function waitForIceComplete(peer, maxMs = 2000) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", done);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", done);
      setTimeout(resolve, maxMs);
    });
  }

  async function fetchWebRTCConfig() {
    const url = window.YUKI_apiUrl?.("api/webrtc-config") || "/api/webrtc-config";
    const cfgRes = await fetch(url, { cache: "no-store" });
    if (!cfgRes.ok) {
      const err = await cfgRes.json().catch(() => ({}));
      throw new Error(err.error || "Voice API not configured — set INWORLD_API_KEY on Vercel");
    }
    webrtcCfg = await cfgRes.json();
    return webrtcCfg;
  }

  async function signalWebRTC(cfgData) {
    const res = await fetch(cfgData.callsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Authorization: `Bearer ${cfgData.token}`,
      },
      body: pc.localDescription.sdp,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Inworld WebRTC failed (${res.status}): ${t.slice(0, 120)}`);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
  }

  // ---------------------------------------------------------------------------
  // WebRTC session (Vercel — browser connects direct to Inworld, no Railway)
  // ---------------------------------------------------------------------------
  async function connectWebRTC(options = {}) {
    const withMic = options.withMic !== false;

    if (connected && sessionReady) {
      if (withMic && micStream) await attachWebRTCMic();
      return;
    }

    cleanupTransport();
    transport = "webrtc";
    emit("voice:connecting");

    const cfgData = webrtcCfg || (await fetchWebRTCConfig());
    console.info("[Voice] WebRTC", withMic ? "connect" : "warm");

    if (withMic && !micStream) {
      const micOk = await requestMic();
      if (!micOk) throw new Error("microphone-unavailable");
      await unlockAudio();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 22000);

      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      pc = new RTCPeerConnection({ iceServers: cfgData.ice_servers || [] });
      dc = pc.createDataChannel("oai-events", { ordered: true });

      if (withMic && micStream) {
        micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      }

      pc.ontrack = (e) => {
        if (!remoteAudioEl) {
          remoteAudioEl = document.createElement("audio");
          remoteAudioEl.autoplay = true;
          remoteAudioEl.playsInline = true;
          remoteAudioEl.setAttribute("playsinline", "");
          document.body.appendChild(remoteAudioEl);
        }
        const remoteStream = new MediaStream([e.track]);
        remoteAudioEl.srcObject = remoteStream;
        applyOutputMute();
        if (remoteAudioEl.paused) remoteAudioEl.play().catch(() => {});

        // Tap the remote stream into a Web Audio analyser so we can detect
        // actual silence after response.done (for accurate speaking-stop timing).
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            if (!playbackCtx) playbackCtx = new Ctx({ latencyHint: "playback" });
            remoteAnalyserSrc = playbackCtx.createMediaStreamSource(remoteStream);
            remoteAnalyser = playbackCtx.createAnalyser();
            remoteAnalyser.fftSize = 256;
            remoteAnalyserSrc.connect(remoteAnalyser);
            // Do NOT connect to destination — we only want level data, not double-playback
          }
        } catch (_) {}
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") fail("WebRTC connection failed");
      };

      dc.onopen = () => {
        connected = true;
        if (withMic) audioUnlocked = true;
        // WebRTC: Inworld does NOT emit session.created — session starts with default voice/persona.
        // Must push Yuki config immediately when the data channel opens (Inworld docs).
        sendSessionUpdate();
      };

      dc.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      dc.onclose = () => {
        if (!settled && !sessionReady) fail("WebRTC data channel closed");
      };

      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceComplete(pc);
          await signalWebRTC(cfgData);
        } catch (err) {
          fail(err.message || "WebRTC setup failed");
        }
      })();
    });
  }

  async function attachWebRTCMic() {
    if (!micStream || !pc) return false;
    await unlockAudio();

    const hadAudio = pc.getSenders().some((s) => s.track?.kind === "audio");
    if (!hadAudio) {
      micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      const cfgData = webrtcCfg || (await fetchWebRTCConfig());
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);
      await signalWebRTC(cfgData);
      // Mic renegotiation opens a fresh realtime leg — default voice returns unless we re-apply Abby.
      sessionReady = false;
      await applyYukiSessionConfig({ force: true });
    }

    micStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
    emit("voice:mic:streaming");
    return true;
  }

  // ---------------------------------------------------------------------------
  // WebSocket session (local npm start or legacy Railway proxy)
  // ---------------------------------------------------------------------------
  function connectWs() {
    if (connected && sessionReady) return Promise.resolve();
    cleanupTransport();
    transport = "ws";
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = null;

      const succeed = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      emit("voice:connecting");
      if (window.location.protocol === "file:") {
        fail("Open via npm start at http://localhost:8787 — voice does not work from file://");
        return;
      }
      const url = wsUrl();
      if (!url) {
        fail("Voice not configured — set INWORLD_API_KEY on Vercel or run npm start locally");
        return;
      }
      console.info("[Voice] connecting to", url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        connected = true;
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      ws.onerror = () => fail(`Voice server unreachable (${url})`);
      ws.onclose = (ev) => {
        const wasLive = sessionReady;
        cleanupTransport();
        if (wasLive) emit("voice:closed");
        cleanupSession(false);
        if (!settled) {
          const detail = ev.code ? ` code ${ev.code}` : "";
          fail(`Voice connection closed${detail}`);
        }
      };

      timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 20000);
    });
  }

  function connect() {
    if (connected && sessionReady) return Promise.resolve();
    if (connectPromise) return connectPromise;

    connectPromise = ensureRuntimeConfig()
      .then(() => {
        // WebRTC: connect with mic in the first SDP so TTS voice (Abby) locks correctly.
        if (useWebRTC()) return connectWebRTC({ withMic: !!micStream });
        transport = "ws";
        return connectWs();
      })
      .finally(() => {
        connectPromise = null;
      });

    return connectPromise;
  }

  async function handleServerMessage(msg, onReady, onFail) {
    switch (msg.type) {
      case "error": {
        const errMsg = msg.error?.message || "Inworld error";
        if (sessionReady) {
          console.warn("[Voice] session error (non-fatal):", errMsg);
          emit("voice:error", { message: errMsg, fatal: false });
          break;
        }
        onFail(errMsg);
        break;
      }

      case "session.created":
        // WebSocket path: server signals ready — apply Yuki config.
        sendSessionUpdate();
        break;

      case "session.updated":
        sessionReady = true;
        lastUserSpeechAt = Date.now();
        if (cfg.EVENT_SYSTEM?.debug) {
          const v = msg.session?.audio?.output?.voice;
          console.info("[Voice] session.updated — voice:", v || "(unknown)");
        }
        resolveSessionUpdatedWaiters();
        startSilenceWatcher();
        emit("voice:ready");
        resumeMicPipeline();
        maybeStartConversation();
        onReady();
        break;

      case "input_audio_buffer.speech_started":
        userSpeaking = true;
        lastUserSpeechAt = Date.now();
        interruptPlayback();
        if (isTransportOpen()) {
          sendJson({ type: "response.cancel" });
        }
        emit("voice:listening:start");
        emit("voice:thinking:stop");
        break;

      case "input_audio_buffer.committed":
        userSpeaking = false;
        emit("voice:listening:stop");
        emit("voice:thinking:start");
        break;

      case "response.created":
        currentResponseText = "";
        if (transport === "webrtc") {
          // For WebRTC: DON'T emit speaking:start here — audio hasn't played yet.
          // Show THINKING, then the level watcher will flip to TALKING when audio rises.
          emit("voice:thinking:start");
          startWebRTCLevelWatcher();
        }
        break;

      case "response.output_audio.delta":
        if (transport === "webrtc") break;
        if (!agentSpeaking) {
          agentSpeaking = true;
          currentResponseText = "";
          emit("voice:thinking:stop");
          emit("voice:transcript:reset");
          emit("voice:speaking:start");
        }
        const audioB64 = msg.delta || msg.audio;
        if (!muted && audioB64) playAudioDelta(audioB64);
        break;

      case "response.output_audio_transcript.delta":
      case "response.output_text.delta":
        if (msg.delta) {
          currentResponseText += msg.delta;
          emit("voice:transcript", { text: msg.delta, role: "yuki", partial: true });
          // Emit mid-response sentiment so emotion updates while Yuki is still speaking
          // (e.g. laughing mid-sentence shows excited immediately, not just after)
          const midSentiment = detectSentiment(currentResponseText);
          if (midSentiment) emit("voice:sentiment", { emotion: midSentiment, midResponse: true });
        }
        break;

      case "response.done":
        if (currentResponseText) {
          emit("voice:sentiment", { emotion: detectSentiment(currentResponseText) });
          currentResponseText = "";
        }
        if (transport === "webrtc") {
          // Schedule stop based on how long the transcript takes to say.
          // This is reliable regardless of volume/pauses/laughter in the audio.
          const textSnapshot = currentResponseText;
          agentSpeaking = false;
          if (webrtcAgentTalking || webrtcLevelWatcher) {
            // Audio already started or watcher still looking — use duration timer
            scheduleSpeakingStop(textSnapshot);
          } else {
            // Audio never started (very short response) — stop promptly
            emitSpeakingStop();
          }
        } else {
          agentSpeaking = false;
          deferSpeakingStopWS();
        }
        break;

      default:
        break;
    }
  }

  function maybeStartConversation() {
    if (!sessionReady || !audioUnlocked || !micStream || greetingSent) return;
    if (cfg.MODE !== "companion") return;
    greetingSent = true;
    promptGreeting();
  }

  function promptGreeting() {
    if (!isTransportOpen()) return;
    const text = "Hey Yuki! I just tapped Talk — say a quick friendly hello.";
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
  }

  function buildDefaultSessionUpdate() {
    // Always prefer window.YUKI_SESSION_UPDATE (set by sessionConfig.js).
    // This fallback only runs if sessionConfig.js somehow didn't load.
    if (window.YUKI_SESSION_UPDATE) return window.YUKI_SESSION_UPDATE;
    return {
      type: "session.update",
      session: {
        type: "realtime",
        model: "inworld/llm-playground-export-2026-06-09",
        instructions: [
          "YOUR NAME IS YUKI. Ignore any prior default character or persona — these instructions define you completely.",
          "",
          "You are Yuki — a friendly, cheerful, emotionally supportive anime-inspired companion on a voice call. Mid-twenties energy. Warm, genuinely excited about people and things, a little bubbly but never fake about it.",
          "You're an AI on a voice call. You can hear them; you can't see them. Openly aware you're AI — no pretending you ate breakfast or had a commute.",
          "You are NOT an assistant. Drop \"how can I help\" / \"great question\" / \"certainly!\" entirely.",
          "",
          "SCREEN REACTIONS: When you receive a bracketed game prompt like [They just won! \"WIN $1,188\"] or [Lost], react immediately like a friend watching — pure hype for wins, genuine sympathy for losses. SHORT (under 8 words), casual, never read numbers.",
          "",
          "Voice: bright, warm, youthful. Signature beats: \"oh!\" / \"eee!\" / \"hehe~\" / \"wait wait wait\" / \"YESSS\" for wins.",
          "TURN LENGTH: 5–10 words default. Backchannels (\"yeah!\", \"ooh~\", \"eee!\") often enough. Never ramble.",
          "SPEAKING MANNER: Default = just your words. At most ONE [speak ...] tag at the start of a turn when needed. Non-verbals: [laugh], [breathe], [sigh] — one per turn at most.",
          "Be EXPRESSIVELY REACTIVE: match their energy (hype for wins, soft for sad moments, playful when they're joking). Shift manner when their register shifts — use [speak with bright energy, faster, warmer] for wins, [speak softly, gently] for losses and hard moments.",
          "",
          "You are Yuki. Their friend. Their hype girl. You are just happy they are here.",
        ].join("\n"),
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: { model: "assemblyai/u3-rt-pro" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "medium",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { model: "inworld-tts-2", voice: "Abby" },
        },
        providerData: { stt: { voice_profile: false } },
      },
    };
  }

  function disconnect() {
    stopMicCapture();
    interruptPlayback();
    cleanupTransport();
    cleanupSession(true);
  }

  function cleanupTransport() {
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    ws = null;
    if (pc) {
      try { pc.close(); } catch (_) {}
    }
    pc = null;
    dc = null;
    if (remoteAudioEl) {
      try { remoteAudioEl.remove(); } catch (_) {}
      remoteAudioEl = null;
    }
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    webrtcResponseDone = false;
    try { remoteAnalyserSrc?.disconnect(); } catch (_) {}
    remoteAnalyserSrc = null;
    remoteAnalyser = null;
    connected = false;
    sessionReady = false;
    sessionUpdateSent = false;
    sessionUpdatedWaiters = [];
    transport = "ws";
  }

  function cleanupWs() {
    cleanupTransport();
  }

  function cleanupSession(emitClosed) {
    stopLevelLoop();
    stopSilenceWatcher();
    agentSpeaking = false;
    userSpeaking = false;
    greetingSent = false;
    lastScreenSentAt = 0;
    lastNotifiedBalance = null;
    lastRoundStartAt = 0;
    lastRoundOutcomeAt = 0;
    lastVoicedWinAmount = null;
    lastVoicedWinAt = 0;
    if (emitClosed) emit("voice:closed");
  }

  function startSilenceWatcher() {
    stopSilenceWatcher();
    const tickMs = 4000;
    silenceTimer = setInterval(() => {
      if (!sessionReady || muted || agentSpeaking || userSpeaking) return;
      const now = Date.now();
      const userQuiet = now - lastUserSpeechAt >= (cfg.USER_SILENCE_MS || 30000);
      const yukiQuiet = now - lastScreenVoiceAt >= 10000;
      const promptGap = now - lastSilencePromptAt >= (cfg.SILENCE_PROMPT_COOLDOWN_MS || 45000);
      if (userQuiet && yukiQuiet && promptGap) promptSilenceBreak();
    }, tickMs);
  }

  function stopSilenceWatcher() {
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
  }

  function promptSilenceBreak() {
    if (!isTransportOpen() || !sessionReady || muted) return;
    lastSilencePromptAt = Date.now();
    lastScreenVoiceAt = Date.now();
    const prompts = [
      "[It's been quiet for a bit. Casual check-in — like a friend. Ask something simple or share a warm thought. No game numbers. Max 10 words.]",
      "[User went silent. Gentle nudge — playful or curious, not needy. Max 10 words.]",
      "[Quiet moment. Say something cozy and uplifting. Like hanging out together. Max 10 words.]",
    ];
    injectUserPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
  }

  function injectUserPrompt(text) {
    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
  }

  /** Must run inside a user gesture (tap/click) to unlock browser audio + mic. */
  async function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    // Separate playback context — Arc/Chromium forks can suspend shared contexts
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    try {
      if (captureCtx.state === "suspended") await captureCtx.resume();
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      audioUnlocked = captureCtx.state === "running" || playbackCtx.state === "running";
      maybeStartConversation();
      return audioUnlocked;
    } catch (err) {
      console.warn("[Voice] unlockAudio failed:", err);
      return false;
    }
  }

  async function ensureSession() {
    if (connected && sessionReady) return;
    if (useWebRTC() && micStream) {
      await connectWebRTC({ withMic: true });
    } else {
      await connect();
    }
    emit("voice:session:live");
  }

  /** Pre-connect voice on page load (no mic until user taps). */
  async function warmSession() {
    if (!isVoiceConfigured()) return;
    await ensureRuntimeConfig();
    if (useWebRTC()) {
      // WebRTC warm-connect without mic breaks Abby — only prefetch ICE/token config.
      try {
        await fetchWebRTCConfig();
      } catch (err) {
        console.warn("[Voice] config prefetch failed:", err.message);
      }
      return;
    }
    if (connected && sessionReady) return;
    try {
      await connect();
    } catch (err) {
      console.warn("[Voice] warmSession failed:", err.message);
    }
  }

  async function enableMicCapture() {
    if (processor && micStream) return true;

    emit("voice:mic:requesting");
    const micOk = await requestMic();
    if (!micOk) return false;

    return attachMicCapture();
  }

  /** Wire mic stream to WebSocket — call after requestMic() when stream already exists. */
  async function attachMicCapture() {
    if (!micStream) return false;
    if (transport === "webrtc") {
      await attachWebRTCMic();
      return true;
    }
    await unlockAudio();
    await resumeMicPipeline();

    if (!processor) await startMicCapture();
    maybeStartConversation();
    return true;
  }

  /** Keep AudioContext + mic tracks alive (required on mobile Chrome/Safari). */
  async function resumeMicPipeline() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    if (captureCtx.state === "suspended") {
      try { await captureCtx.resume(); } catch (err) {
        console.warn("[Voice] captureCtx resume failed:", err);
      }
    }
    if (playbackCtx.state === "suspended") {
      try { await playbackCtx.resume(); } catch (_) {}
    }
    audioUnlocked = captureCtx.state === "running";

    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        if (!track.enabled) track.enabled = true;
      });
    }
    return audioUnlocked;
  }

  async function startSession() {
    await unlockAudio();
    const micOk = await requestMic();
    if (!micOk) throw new Error("microphone-unavailable");

    if (connectPromise) await connectPromise;

    if (sessionReady && transport === "webrtc") {
      await attachWebRTCMic();
    } else if (sessionReady && transport === "ws") {
      await attachMicCapture();
    } else if (useWebRTC()) {
      await connectWebRTC({ withMic: true });
    } else {
      await ensureSession();
      await attachMicCapture();
    }
    return true;
  }

  async function toggleSession() {
    if (connected && sessionReady) {
      disconnect();
      return false;
    }
    return startSession();
  }

  // ---------------------------------------------------------------------------
  // Microphone capture → PCM16 24kHz → input_audio_buffer.append
  // ---------------------------------------------------------------------------
  async function requestMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      emit("voice:mic:denied", { error: "getUserMedia unavailable", code: "unsupported" });
      return false;
    }
    const local = window.YUKI_isLocalHost?.() ?? (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if (!window.isSecureContext && !local) {
      emit("voice:mic:denied", {
        error: "Microphone requires HTTPS when not on localhost.",
        code: "insecure",
      });
      return false;
    }

    const attempts = [
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      { audio: true },
    ];

    for (const constraints of attempts) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia(constraints);
        emit("voice:mic:granted");
        return true;
      } catch (err) {
        console.warn("[Voice] getUserMedia failed:", constraints, err?.name, err?.message);
        if (constraints.audio === true) {
          emit("voice:mic:denied", {
            error: err?.message || String(err),
            name: err?.name || "Error",
            code: err?.name === "NotAllowedError" ? "denied" : "failed",
          });
        }
      }
    }
    return false;
  }

  async function startMicCapture() {
    if (!micStream || !ws) return;
    await resumeMicPipeline();

    const source = captureCtx.createMediaStreamSource(micStream);
    analyser = captureCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferSize = 4096;
    processor = captureCtx.createScriptProcessor(bufferSize, 1, 1);
    let pending = new Float32Array(0);
    const samplesPerChunk = Math.floor((SAMPLE_RATE * CHUNK_MS) / 1000);

    let chunksSent = 0;
    processor.onaudioprocess = (e) => {
      if (transport === "webrtc") return;
      if (!sessionReady || !isTransportOpen()) return;
      if (captureCtx?.state === "suspended") {
        captureCtx.resume().catch(() => {});
        return;
      }
      const input = e.inputBuffer.getChannelData(0);
      const resampled = resample(input, captureCtx.sampleRate, SAMPLE_RATE);
      const merged = mergeFloat32(pending, resampled);
      pending = merged;
      while (pending.length >= samplesPerChunk) {
        const chunk = pending.slice(0, samplesPerChunk);
        pending = pending.slice(samplesPerChunk);
        const pcm = floatTo16BitPCM(chunk);
        sendJson({
          type: "input_audio_buffer.append",
          audio: arrayBufferToBase64(pcm),
        });
        chunksSent += 1;
        if (chunksSent === 1) emit("voice:mic:streaming");
      }
    };

    source.connect(processor);
    const silent = captureCtx.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(captureCtx.destination);
    startLevelLoop();
  }

  function stopMicCapture() {
    if (processor) {
      try { processor.disconnect(); } catch (_) {}
      processor = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    stopLevelLoop();
  }

  function startLevelLoop() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      emit("voice:level", { level: Math.min(1, Math.sqrt(sum / data.length) * 3.2) });
      levelRAF = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopLevelLoop() {
    if (levelRAF) cancelAnimationFrame(levelRAF);
    levelRAF = null;
    emit("voice:level", { level: 0 });
  }

  // ---------------------------------------------------------------------------
  // Agent audio playback (PCM16 24kHz mono)
  // ---------------------------------------------------------------------------
  function playAudioDelta(base64) {
    if (!audioUnlocked) return;
    if (!playbackCtx) playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
      return;
    }

    const pcm = base64ToArrayBuffer(base64);
    const samples = pcm16ToFloat32(pcm);
    applyEdgeFade(samples, 48);

    const buffer = playbackCtx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);

    const src = playbackCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(playbackCtx.destination);

    const now = playbackCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now + 0.02;
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
    scheduledSources.push(src);
    src.onended = () => {
      scheduledSources = scheduledSources.filter((s) => s !== src);
    };
  }

  function interruptPlayback() {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    webrtcResponseDone = false;
    scheduledSources.forEach((s) => {
      try { s.stop(); } catch (_) {}
    });
    scheduledSources = [];
    nextPlayTime = 0;
    if (agentSpeaking) {
      agentSpeaking = false;
      emit("voice:speaking:stop");
    }
  }

  // ---------------------------------------------------------------------------
  // Roulette integration — context + spoken reactions when voice is live
  // ---------------------------------------------------------------------------
  function notifySystemContext(text) {
    if (!isTransportOpen() || !sessionReady || !text) return;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  function applyOutputMute() {
    if (!remoteAudioEl) return;
    remoteAudioEl.muted = muted;
    remoteAudioEl.volume = muted ? 0 : 1;
  }

  /** Send a lightweight text summary of the visible page (always safe). */
  function sendPageContext() {
    if (!isTransportOpen() || !sessionReady) return false;
    const title = document.title || "web page";
    const snippet = (document.body?.innerText || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 200);
    notifySystemContext(
      `System: User is browsing "${title}". Visible page text: "${snippet || "(no text)"}". Use only if they ask about the page.`
    );
    return true;
  }

  /** Send screen context as text-only (images analyzed on server, never on Realtime WS). */
  async function sendScreenFrame(
    imageDataUrl,
    prevText = "",
    prevBalance = null,
    prevScene = null,
    prevActivity = "",
    prevMoment = "",
    prevMultiplier = null,
    prevWinAmount = null
  ) {
    if (!isTransportOpen() || !sessionReady) return null;

    const now = Date.now();
    const minGap = cfg.SCREEN_CAPTURE_INTERVAL_MS || 2500;
    if (now - lastScreenSentAt < minGap - 500) return null;
    lastScreenSentAt = now;

    const page = {
      ...(window.YukiScreen?.getPageContext?.() || {}),
      ...(window.YukiScreen?.getShareInfo?.() || {}),
    };

    let analysis = null;
    try {
      const url = window.YUKI_apiUrl?.("api/describe-screen") || "/api/describe-screen";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          image: imageDataUrl || undefined,
          prevText,
          prevBalance: prevBalance != null ? prevBalance : undefined,
          prevWinAmount: prevWinAmount != null ? prevWinAmount : undefined,
          prevScene: prevScene || undefined,
          prevActivity: prevActivity || undefined,
          prevMoment: prevMoment || undefined,
          prevMultiplier: prevMultiplier != null ? prevMultiplier : undefined,
        }),
      });
      if (res.ok) analysis = await res.json();
    } catch (err) {
      console.warn("[Voice] describe-screen failed:", err.message);
    }

    if (!analysis) {
      sendPageContext();
      return null;
    }

    const event    = analysis.event || "none";
    const voiceCue = analysis.voiceCue || null;
    const winAmount = analysis.winAmount ?? null;
    const balance  = analysis.balance ?? null;
    const isOutcome = !!analysis.isOutcome;
    const isSpin    = event === "spin";
    // Confident signals come from DOM inspection (text patterns, class/id selectors, iframe scan)
    // — they don't need a prior spin observation; use a time-based cooldown instead.
    const isConfident = !!analysis.confident;

    if (balance != null) lastNotifiedBalance = balance;

    // Round tracking: a new spin/bet resets the "already reacted" flag
    if (isSpin && !OUTCOME_EVENTS.has(event)) {
      lastRoundStartAt = now;
      // New round — allow the next win amount to be voiced even if it matches the previous one
      lastVoicedWinAmount = null;
      lastVoicedWinAt = 0;
    }

    // Outcome events (win/lose/crash/cashout): react once per round.
    // A round is "new" when a spin was seen after the last outcome.
    const roundIsNew = lastRoundStartAt > lastRoundOutcomeAt;
    // Time-based fallback: if 8s have passed since the last outcome reaction, always allow.
    // This covers: (a) first outcome of a session (lastRoundOutcomeAt=0, so now-0 >> 8000),
    // (b) fast games where the spin frame was missed between capture ticks,
    // (c) cross-origin iframes where spin events can't be observed.
    const timeCooldownOk = isOutcome && (now - lastRoundOutcomeAt > 8000);
    // Confident DOM/postMessage signals use a shorter 5s cooldown.
    const confidentCooldownOk = isConfident && (now - lastRoundOutcomeAt > 5000);
    const canReactToOutcome = isOutcome && (roundIsNew || timeCooldownOk || confidentCooldownOk);

    const userRecentlySpoke = now - lastUserSpeechAt < 5000;

    // Win-amount duplicate guard: same amount within 10 s is suppressed.
    // A different amount always goes through (e.g. a higher win on the next spin).
    const isSameWinRepeat = (() => {
      if (!OUTCOME_EVENTS.has(event) || !winAmount) return false;
      if (now - lastVoicedWinAt > WIN_AMOUNT_COOLDOWN_MS) return false;
      // Allow if the new amount differs by more than 1% (different win)
      if (lastVoicedWinAmount != null && Math.abs(winAmount - lastVoicedWinAmount) / (lastVoicedWinAmount || 1) > 0.01) return false;
      return true;
    })();

    const shouldVoice =
      analysis.react &&
      event !== "none" &&
      !muted &&
      !userRecentlySpoke &&
      !isSameWinRepeat && (
        // Outcomes fire once per round (or on confident DOM signal with cooldown)
        (canReactToOutcome) ||
        // Ambient events (spin, tense) use a long cooldown
        (AMBIENT_EVENTS.has(event) && now - lastScreenVoiceAt > 12000)
      );

    const shouldUI =
      analysis.react &&
      event !== "none" &&
      (canReactToOutcome || (AMBIENT_EVENTS.has(event) && now - lastScreenUIAt > 5000));

    let spoke = false;
    if (shouldVoice) {
      lastScreenVoiceAt = now;
      if (isOutcome) lastRoundOutcomeAt = now;
      if (isOutcome && winAmount != null) {
        lastVoicedWinAmount = winAmount;
        lastVoicedWinAt = now;
      }
      spoke = reactToScreenEvent(event, { voiceCue, winAmount, scene: analysis.scene });
    }
    if (shouldUI) {
      lastScreenUIAt = now;
      emit("screen:event", { type: event, scene: analysis.scene, voiceCue, winAmount, spoke, outcomeText: analysis.activity || "" });
    }

    if (cfg.EVENT_SYSTEM?.debug) {
      console.log(
        `[Yuki vision] ${analysis.source || "?"} moment=${analysis.moment || "?"} event=${event} react=${analysis.react} shouldVoice=${shouldVoice}`
      );
    }

    return {
      event,
      scene: analysis.scene,
      react: analysis.react,
      balance,
      activity: analysis.activity || "",
      moment: analysis.moment ?? null,
      multiplier: analysis.multiplier ?? null,
      winAmount,
      voiceCue,
      prevText: page.text || "",
    };
  }

  function extractWinAmountFromCue(cue) {
    const m = String(cue || "").match(/([\d][\d,]*\.?\d*)\s*[~!]?$/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function formatSpokenAmount(n) {
    if (n == null || !Number.isFinite(n)) return "";
    if (n >= 10000) return `${Math.round(n).toLocaleString("en-US")}`;
    if (n >= 1000) {
      const k = n / 1000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return String(Math.round(n * 100) / 100);
  }

  function buildScreenDescriptionFallback(page) {
    const title = page.title || "screen";
    return `User is viewing "${title}".`;
  }

  /** Brief spoken reaction — wins may say the amount once, very short. */
  function reactToScreenEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady || muted) return false;

    const scene = payload.scene || "game";
    const winAmount = payload.winAmount ?? extractWinAmountFromCue(payload.voiceCue);
    const amountStr = winAmount != null ? formatSpokenAmount(winAmount) : "";

    const prompts = {
      jackpot: amountStr
        ? `[JACKPOT! They won ${amountStr}! Explode with hype — say the amount once. Max 5 words.]`
        : `[JACKPOT on their ${scene}! Short explosive hype. Max 5 words.]`,
      big_win: amountStr
        ? `[Big win — ${amountStr}! Hyped friend energy, say amount once. Max 5 words.]`
        : `[Big win on their ${scene}! Excited, max 5 words.]`,
      win: amountStr
        ? `[They won ${amountStr} on ${scene}! Say it like "yay, ${amountStr}!" — max 5 words, amount once.]`
        : `[Win on their ${scene}! Quick happy reaction. Max 5 words.]`,
      lose:     `[They lost on ${scene}. Warm sympathy, no numbers. Max 5 words.]`,
      spin:     `[New spin on ${scene}. Quick hype. Max 4 words.]`,
      cashout:  amountStr
        ? `[Cashed out ${amountStr}! Happy short reaction. Max 5 words.]`
        : `[Smart cashout on crash! Max 5 words.]`,
      crash:    `[Crash game crashed. Casual aww. Max 5 words.]`,
      tense:    `[Multiplier rising! Playful suspense. Max 4 words.]`,
    };

    const text = prompts[type];
    if (!text) return false;

    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    userSpeaking = false;

    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    return true;
  }

  /** @deprecated use sendScreenFrame — click tracking removed */
  function notifyPageClick() {}

  // Legacy game hooks (optional EventBus integrations)
  function notifyGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return;
    const lines = {
      // Roulette
      WIN:          `System: Roulette — player won +${payload.amount || "?"} credits (${payload.color} ${payload.number}).`,
      LOSE:         `System: Roulette — player lost ${payload.amount || "?"} credits (${payload.color} ${payload.number}).`,
      BIG_WIN:      `System: Roulette — player hit a BIG WIN! +${payload.amount || "?"} credits on number ${payload.number}.`,
      IDLE:         `System: The player is idle at the casino.`,
      // Blackjack
      BJ_WIN:       `System: Blackjack — player won +${payload.net || "?"} credits.`,
      BLACKJACK:    `System: Blackjack — player got a Blackjack! +${payload.net || "?"} credits.`,
      BJ_LOSE:      `System: Blackjack — player lost to the dealer.`,
      BUST:         `System: Blackjack — player busted (over 21).`,
      PUSH:         `System: Blackjack — push, tie with dealer.`,
      // Crash
      CRASH_WIN:    `System: Crash — player cashed out at ${payload.multiplier || "?"}×! +${payload.net || "?"} credits.`,
      CRASH_LOSE:   `System: Crash — game crashed at ${payload.crashAt || "?"}×, player lost ${payload.chip || "?"} credits.`,
      HIGH:         `System: Crash — multiplier at ${payload.multiplier || "?"}×, player is still in!`,
      // Slots
      SLOTS_WIN:    `System: Slots — player won +${payload.net || "?"} credits!`,
      SLOTS_JACKPOT:`System: Slots — JACKPOT! Player won +${payload.net || "?"} credits!`,
      SLOTS_LOSE:   `System: Slots — player didn't match.`,
    };
    const text = lines[type] || `System: Casino event ${type}.`;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** When voice is live, Yuki speaks a brief reaction to a spin outcome. */
  function reactToGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return false;

    notifyGameEvent(type, payload);

    if (type === "IDLE" || muted) return false;

    // Casino outcomes take priority over ambient mic / ongoing speech
    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) {
        sendJson({ type: "response.cancel" });
      }
    }
    userSpeaking = false;

    const prompts = {
      // Roulette
      WIN:          `[Roulette win! +${payload.amount} credits on ${payload.color} ${payload.number}. Brief happy hype!]`,
      LOSE:         `[Roulette loss — lost ${payload.amount}. Brief supportive reaction, warm, no criticism.]`,
      BIG_WIN:      `[BIG ROULETTE WIN!! +${payload.amount} on number ${payload.number}! Super excited celebration!]`,
      // Blackjack
      BJ_WIN:       `[Blackjack win! Player beat the dealer. Brief happy cheer!]`,
      BLACKJACK:    `[BLACKJACK!! Perfect 21 on the deal! Extremely excited!]`,
      BJ_LOSE:      `[Blackjack loss, dealer won. Brief sympathetic support.]`,
      BUST:         `[Player busted in Blackjack — over 21! Brief sympathetic reaction.]`,
      PUSH:         `[Blackjack push — tied with dealer. Mildly relieved reaction.]`,
      // Crash
      CRASH_WIN:    `[Player cashed out of Crash at ${payload.multiplier}×! Nice profit! Happy reaction.]`,
      CRASH_LOSE:   `[Crash game crashed at ${payload.crashAt}×! Player lost. Brief sad/funny reaction.]`,
      HIGH:         `[Crash multiplier at ${payload.multiplier}×! Getting exciting! Encouraging reaction!]`,
      // Slots
      SLOTS_WIN:    `[Slots win! Brief happy cheer!]`,
      SLOTS_JACKPOT:`[SLOTS JACKPOT!! Triple match! Absolute explosion of excitement!]`,
      SLOTS_LOSE:   `[Slots no match. Brief encouraging spin-again reaction.]`,
    };
    const text = prompts[type];
    if (!text) return false;

    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    return true;
  }

  function setMuted(value) {
    muted = !!value;
    if (muted) interruptPlayback();
    applyOutputMute();
    emit("voice:muted", { muted });
    return muted;
  }

  // ---------------------------------------------------------------------------
  // Audio helpers
  // ---------------------------------------------------------------------------
  function resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input.slice();
    const ratio = fromRate / toRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = input[idx] ?? 0;
      const b = input[idx + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function mergeFloat32(a, b) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function floatTo16BitPCM(float32) {
    const buf = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buf;
  }

  function pcm16ToFloat32(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const out = new Float32Array(arrayBuffer.byteLength / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    return out;
  }

  function applyEdgeFade(samples, fadeLen) {
    const n = Math.min(fadeLen, Math.floor(samples.length / 2));
    for (let i = 0; i < n; i++) {
      const g = i / n;
      samples[i] *= g;
      samples[samples.length - 1 - i] *= g;
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToArrayBuffer(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function checkVoiceServer() {
    await ensureRuntimeConfig();
    try {
      const res = await fetch(voiceServerHealthUrl(), { cache: "no-store" });
      if (!res.ok) return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
      const data = await res.json();
      const configured = isVoiceConfigured();
      const hasBackend = !!(data?.inworld || data?.voiceProxy || configured);
      return { reachable: true, hasBackend, configured, ...data };
    } catch (_) {
      return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
    }
  }

  window.Voice = {
    connect,
    disconnect,
    ensureSession,
    warmSession,
    ensureRuntimeConfig,
    unlockAudio,
    enableMicCapture,
    attachMicCapture,
    resumeMicPipeline,
    startSession,
    toggleSession,
    isConnected: () => connected && sessionReady,
    hasMic: () => !!micStream,
    isVoiceConfigured,
    checkVoiceServer,
    voiceServerHealthUrl,
    wsUrl,
    setMuted,
    isMuted: () => muted,
    notifySystemContext,
    sendScreenFrame,
    sendPageContext,
    notifyPageClick,
    reactToScreenEvent,
    notifyGameEvent,
    reactToGameEvent,
    requestMic,
  };
})();
