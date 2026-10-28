import type {
  Action,
  Episode,
  EpisodeType,
  GameState,
  LogEntry,
  Message,
  Mode,
  Vec,
} from "./types";
import {
  CAREGIVER_NAME,
  EPISODE_META,
  HOME,
  MEMORIES,
  PLACES,
  SCENARIOS,
  dist,
} from "./data";

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function initialState(mode: Mode = "both", scenarioIndex = 0): GameState {
  return {
    phase: "intro",
    mode,
    scenarioIndex,
    tick: 0,
    anxiety: 18,
    orientation: 85,
    heartRate: 70,
    patientPos: { ...HOME },
    inSafeZone: true,
    safeRadius: 20,
    episode: null,
    lastEpisodeEnd: -100,
    activity: "idle",
    guidanceActive: false,
    caregiverTravel: null,
    caregiverPresent: false,
    pendingCall: false,
    callAnswered: false,
    messages: [],
    log: [],
    score: {
      episodesResolved: 0,
      episodesTotal: 0,
      caregiverAssists: 0,
      patientSelfCalm: 0,
      bond: 0,
      peakAnxiety: 0,
    },
    openMemoryId: null,
    deviceFlash: null,
    nextId: 1,
    playerControlled: mode !== "caregiver",
  };
}

function addLog(s: GameState, text: string, tone: LogEntry["tone"] = "info"): GameState {
  const entry: LogEntry = { id: s.nextId, at: s.tick, text, tone };
  return { ...s, nextId: s.nextId + 1, log: [entry, ...s.log].slice(0, 40) };
}

function addMessage(s: GameState, m: Omit<Message, "id" | "at">): GameState {
  const msg: Message = { ...m, id: s.nextId, at: s.tick };
  return { ...s, nextId: s.nextId + 1, messages: [...s.messages, msg].slice(-30) };
}

function moveToward(from: Vec, to: Vec, speed: number): Vec {
  const d = dist(from, to);
  if (d <= speed) return { ...to };
  return {
    x: from.x + ((to.x - from.x) / d) * speed,
    y: from.y + ((to.y - from.y) / d) * speed,
  };
}

function startEpisode(s: GameState, forced?: EpisodeType): GameState {
  const scenario = SCENARIOS[s.scenarioIndex];
  const type = forced ?? pick(scenario.types);
  const meta = EPISODE_META[type];
  const episode: Episode = {
    type,
    startedAt: s.tick,
    intensity:
      type === "agitacion" ? 1.4 : type === "wander" ? 1.1 : type === "olvido" ? 0.9 : 1,
    thought: pick(meta.thoughts),
  };
  let anxiety = s.anxiety;
  let orientation = s.orientation;
  if (type === "desorientacion") {
    anxiety += 22;
    orientation = Math.min(orientation, 35);
  } else if (type === "wander") {
    anxiety += 16;
    orientation = Math.min(orientation, 42);
    const far = PLACES.filter((p) => p.id !== "home" && dist(p.pos, s.patientPos) > 25);
    episode.target = pick(far.length ? far : PLACES.filter((p) => p.id !== "home")).pos;
  } else if (type === "agitacion") {
    anxiety += 32;
    orientation = Math.min(orientation, 45);
  } else {
    anxiety += 20;
    orientation = Math.min(orientation, 50);
  }
  let next: GameState = {
    ...s,
    episode,
    anxiety: clamp(anxiety),
    orientation: clamp(orientation),
    guidanceActive: false,
    deviceFlash: "alert",
    score: { ...s.score, episodesTotal: s.score.episodesTotal + 1 },
  };
  next = addLog(next, `⚠️ Episodio: ${meta.label}. «${episode.thought}»`, "warn");
  next = addMessage(next, {
    from: "device",
    kind: "system",
    text: `He notado que tu pulso sube. Estoy aquí contigo. Tócame si necesitas ayuda.`,
  });
  return next;
}

function resolveEpisode(s: GameState): GameState {
  const meta = EPISODE_META[s.episode!.type];
  let next: GameState = {
    ...s,
    episode: null,
    lastEpisodeEnd: s.tick,
    guidanceActive: false,
    activity: s.activity === "breathing" ? s.activity : "idle",
    pendingCall: false,
    callAnswered: false,
    deviceFlash: "calm",
    score: { ...s.score, episodesResolved: s.score.episodesResolved + 1, bond: s.score.bond + 10 },
  };
  next = addLog(next, `✅ Episodio de ${meta.label.toLowerCase()} superado con calma.`, "good");
  next = addMessage(next, {
    from: "device",
    kind: "system",
    text: "Tu pulso vuelve a estar tranquilo. Lo has hecho muy bien.",
  });
  return next;
}

function tick(s: GameState): GameState {
  if (s.phase !== "playing") return s;
  const scenario = SCENARIOS[s.scenarioIndex];
  const t = s.tick + 1;
  let { anxiety, orientation, patientPos, guidanceActive, caregiverPresent, caregiverTravel, activity } = s;
  let next: GameState = { ...s, tick: t };

  // Anxiety / orientation dynamics
  if (s.episode) {
    anxiety += s.episode.intensity * 0.9;
    if (s.episode.type !== "wander") orientation -= 0.45;
  } else {
    anxiety -= 0.7;
    orientation += 0.5;
  }
  if (activity === "breathing") anxiety -= 1.1;
  if (guidanceActive) {
    anxiety -= 0.35;
    orientation += 0.6;
  }
  if (caregiverPresent) {
    anxiety -= 1.6;
    orientation += 1.1;
  }
  if (!s.inSafeZone) anxiety += 0.4;

  // Caregiver travel
  if (caregiverTravel && t >= caregiverTravel.arriveAt && !caregiverPresent) {
    caregiverPresent = true;
    caregiverTravel = null;
    anxiety -= 18;
    orientation += 15;
    next = addLog(next, `🤝 ${CAREGIVER_NAME} ha llegado junto a Don Manuel.`, "good");
    next = addMessage(next, { from: "caregiver", kind: "voice", text: "Ya estoy aquí, papá. Dame la mano." });
    next.score = { ...next.score, caregiverAssists: next.score.caregiverAssists + 1 };
  }

  // Movement (automatic only when no human is steering the patient in 3D/VR)
  if (!s.playerControlled) {
    if (s.episode?.type === "wander" && s.episode.target && !guidanceActive && !caregiverPresent) {
      patientPos = moveToward(patientPos, s.episode.target, 0.8);
    } else if ((guidanceActive || caregiverPresent) && dist(patientPos, HOME) > 0.5) {
      patientPos = moveToward(patientPos, HOME, 1.3);
      if (dist(patientPos, HOME) <= 0.5 && guidanceActive) {
        guidanceActive = false;
        next = addLog(next, "🏠 Don Manuel ha llegado a casa siguiendo la guía AR.", "good");
        orientation += 10;
      }
    }
  } else if (guidanceActive && dist(patientPos, HOME) <= 3) {
    guidanceActive = false;
    orientation += 10;
    next = addLog(next, "🏠 Don Manuel ha llegado a casa siguiendo la guía AR.", "good");
  }

  const inSafeZone = dist(patientPos, HOME) <= s.safeRadius;
  if (s.inSafeZone && !inSafeZone) {
    next = addLog(next, "🚨 Ha salido de la zona segura. Alerta enviada al cuidador.", "warn");
    next.deviceFlash = "alert";
  } else if (!s.inSafeZone && inSafeZone) {
    next = addLog(next, "🟢 De vuelta en la zona segura.", "good");
  }

  // Random episode
  const cooldownOk = t - s.lastEpisodeEnd > scenario.cooldown;
  const warmup = t > 8;
  if (!s.episode && cooldownOk && warmup && Math.random() < scenario.episodeRate) {
    next = startEpisode({ ...next, anxiety: clamp(anxiety), orientation: clamp(orientation), patientPos });
    anxiety = next.anxiety;
    orientation = next.orientation;
  }

  anxiety = clamp(anxiety);
  orientation = clamp(orientation);
  const heartRate = Math.round(62 + anxiety * 0.58 + Math.sin(t * 1.3) * 2);

  next = {
    ...next,
    anxiety,
    orientation,
    patientPos,
    inSafeZone,
    guidanceActive,
    caregiverPresent,
    caregiverTravel,
    heartRate,
    score: { ...next.score, peakAnxiety: Math.max(next.score.peakAnxiety, anxiety) },
  };

  // Resolve episode
  if (
    next.episode &&
    next.anxiety < 32 &&
    next.orientation > 62 &&
    (next.episode.type !== "wander" || next.inSafeZone) &&
    t - next.episode.startedAt > 6
  ) {
    next = resolveEpisode(next);
  }

  // Caregiver leaves after things calm down
  if (next.caregiverPresent && !next.episode && next.anxiety < 20 && t - next.lastEpisodeEnd > 10) {
    next = { ...next, caregiverPresent: false };
    next = addLog(next, `${CAREGIVER_NAME} vuelve a sus tareas. Don Manuel está tranquilo.`, "info");
  }

  if (t >= scenario.duration) {
    next = { ...next, phase: "summary" };
  }
  return next;
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "START": {
      const st = initialState(a.mode, a.scenarioIndex);
      let n: GameState = { ...st, phase: "playing" };
      n = addLog(n, `▶️ Escenario «${SCENARIOS[a.scenarioIndex].title}» iniciado.`, "info");
      n = addMessage(n, {
        from: "device",
        kind: "system",
        text: `Buenos días, Don Manuel. Soy tu asistente. Estás en casa y ${CAREGIVER_NAME} está cerca.`,
      });
      return n;
    }
    case "TICK":
      return tick(s);

    case "PATIENT_SET_ACTIVITY":
      return { ...s, activity: a.activity, openMemoryId: a.activity === "memory" ? s.openMemoryId : null };

    case "PATIENT_WHERE": {
      let n: GameState = {
        ...s,
        activity: "where",
        orientation: clamp(s.orientation + 14),
        anxiety: clamp(s.anxiety - 6),
        score: { ...s.score, patientSelfCalm: s.score.patientSelfCalm + 1 },
      };
      n = addLog(n, "📍 Don Manuel ha consultado «¿Dónde estoy?» en el dispositivo.", "info");
      return n;
    }
    case "PATIENT_TIME": {
      let n: GameState = {
        ...s,
        activity: "time",
        orientation: clamp(s.orientation + 10),
        anxiety: clamp(s.anxiety - 4),
        score: { ...s.score, patientSelfCalm: s.score.patientSelfCalm + 1 },
      };
      n = addLog(n, "🕒 Don Manuel ha consultado la hora y el día.", "info");
      return n;
    }
    case "PATIENT_CALL": {
      if (s.pendingCall || s.callAnswered) return s;
      let n: GameState = { ...s, pendingCall: true, activity: "calling" };
      n = addLog(n, `📞 Don Manuel está llamando a ${CAREGIVER_NAME} desde el dispositivo.`, "warn");
      n = addMessage(n, { from: "patient", kind: "text", text: "Ana… ¿puedes venir?" });
      return n;
    }
    case "PATIENT_BREATH_CYCLE": {
      let n: GameState = {
        ...s,
        anxiety: clamp(s.anxiety - 9),
        orientation: clamp(s.orientation + 3),
        score: { ...s.score, patientSelfCalm: s.score.patientSelfCalm + 1 },
      };
      return n;
    }
    case "PATIENT_MEMORY_ANSWER": {
      const m = MEMORIES.find((x) => x.id === a.memoryId);
      let n: GameState = {
        ...s,
        anxiety: clamp(s.anxiety - (a.correct ? 8 : 4)),
        orientation: clamp(s.orientation + (a.correct ? 13 : 6)),
        score: {
          ...s.score,
          patientSelfCalm: s.score.patientSelfCalm + 1,
          bond: s.score.bond + (a.correct ? 3 : 1),
        },
      };
      n = addLog(
        n,
        a.correct
          ? `🧠 Ha reconocido a ${m?.who ?? "un recuerdo"}.`
          : `🧠 Ha repasado el recuerdo de ${m?.who ?? "alguien querido"}.`,
        "good",
      );
      return n;
    }
    case "PATIENT_ACK_MESSAGE": {
      let n: GameState = {
        ...s,
        anxiety: clamp(s.anxiety - 5),
        score: { ...s.score, bond: s.score.bond + 2 },
      };
      return n;
    }
    case "PATIENT_OPEN_MEMORY":
      return { ...s, openMemoryId: a.memoryId, activity: a.memoryId ? "memory" : s.activity };

    case "PATIENT_MOVE": {
      const pos = { x: clamp(a.pos.x, 2, 98), y: clamp(a.pos.y, 2, 98) };
      return { ...s, patientPos: pos }; // inSafeZone is re-evaluated on the next tick (fires alerts)
    }

    case "CARE_SEND_MESSAGE": {
      let n: GameState = {
        ...s,
        anxiety: clamp(s.anxiety - 11),
        orientation: clamp(s.orientation + 6),
        deviceFlash: "message",
        score: { ...s.score, caregiverAssists: s.score.caregiverAssists + 1, bond: s.score.bond + 4 },
      };
      n = addMessage(n, { from: "caregiver", kind: "voice", text: a.text });
      n = addLog(n, `🎙️ ${CAREGIVER_NAME} envió mensaje de voz: «${a.text}»`, "info");
      return n;
    }
    case "CARE_TOGGLE_GUIDANCE": {
      const on = !s.guidanceActive;
      let n: GameState = { ...s, guidanceActive: on, deviceFlash: on ? "guide" : null };
      n = addLog(n, on ? "🧭 Guía AR a casa activada en el dispositivo." : "Guía AR desactivada.", "info");
      if (on) {
        n = addMessage(n, { from: "device", kind: "system", text: "Sigue las flechas azules. Te llevan a casa, paso a paso." });
        n.score = { ...n.score, caregiverAssists: n.score.caregiverAssists + 1 };
      }
      return n;
    }
    case "CARE_BREATHE_TOGETHER": {
      let n: GameState = {
        ...s,
        activity: "breathing",
        deviceFlash: "breathe",
        score: { ...s.score, caregiverAssists: s.score.caregiverAssists + 1, bond: s.score.bond + 5 },
      };
      n = addMessage(n, { from: "caregiver", kind: "voice", text: "Vamos a respirar juntos, papá. Sigue el círculo." });
      n = addLog(n, `🌬️ ${CAREGIVER_NAME} inició respiración guiada conjunta.`, "info");
      return n;
    }
    case "CARE_SEND_MEMORY": {
      const m = MEMORIES.find((x) => x.id === a.memoryId);
      let n: GameState = {
        ...s,
        openMemoryId: a.memoryId,
        activity: "memory",
        anxiety: clamp(s.anxiety - 7),
        orientation: clamp(s.orientation + 9),
        deviceFlash: "message",
        score: { ...s.score, caregiverAssists: s.score.caregiverAssists + 1, bond: s.score.bond + 4 },
      };
      n = addMessage(n, {
        from: "caregiver",
        kind: "memory",
        memoryId: a.memoryId,
        text: `Mira, papá: ${m?.title ?? "un recuerdo"}.`,
      });
      n = addLog(n, `🖼️ ${CAREGIVER_NAME} compartió el recuerdo «${m?.title}».`, "info");
      return n;
    }
    case "CARE_ANSWER_CALL": {
      if (!s.pendingCall) return s;
      let n: GameState = {
        ...s,
        pendingCall: false,
        callAnswered: true,
        anxiety: clamp(s.anxiety - 16),
        orientation: clamp(s.orientation + 8),
        activity: "idle",
        deviceFlash: "message",
        score: { ...s.score, caregiverAssists: s.score.caregiverAssists + 1, bond: s.score.bond + 6 },
      };
      n = addMessage(n, { from: "caregiver", kind: "voice", text: "Hola papá, soy Ana. Te escucho. Estoy contigo." });
      n = addLog(n, `📞 ${CAREGIVER_NAME} respondió la llamada.`, "good");
      return n;
    }
    case "CARE_GO": {
      if (s.caregiverTravel || s.caregiverPresent) return s;
      const travel = Math.round(8 + dist(s.patientPos, HOME) * 0.4);
      let n: GameState = { ...s, caregiverTravel: { arriveAt: s.tick + travel } };
      n = addLog(n, `🏃 ${CAREGIVER_NAME} va hacia Don Manuel (llega en ~${travel}s).`, "info");
      n = addMessage(n, { from: "caregiver", kind: "voice", text: "Voy hacia ti, no te muevas de donde estás." });
      return n;
    }
    case "CARE_SET_RADIUS":
      return { ...s, safeRadius: a.radius, inSafeZone: dist(s.patientPos, HOME) <= a.radius };

    case "TRIGGER_EPISODE":
      if (s.episode || s.phase !== "playing") return s;
      return startEpisode(s, a.episodeType);

    case "CLEAR_FLASH":
      return { ...s, deviceFlash: null };

    case "NEXT_SCENARIO": {
      const idx = Math.min(s.scenarioIndex + 1, SCENARIOS.length - 1);
      return reducer(s, { type: "START", mode: s.mode, scenarioIndex: idx });
    }
    case "RESTART":
      return initialState(s.mode, s.scenarioIndex);
    default:
      return s;
  }
}
