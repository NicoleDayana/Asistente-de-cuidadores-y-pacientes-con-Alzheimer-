import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialState, reducer } from "./game/reducer";
import type { Mode } from "./game/types";
import { CAREGIVER_PRESETS, SCENARIOS } from "./game/data";
import { IntroScreen } from "./components/IntroScreen";
import { SummaryScreen } from "./components/SummaryScreen";
import { PatientWorldView } from "./components/PatientWorldView";
import { CaregiverView } from "./components/CaregiverView";
import { cn } from "./utils/cn";

function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((kind: "alert" | "soft") => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;
      const now = ctx.currentTime;
      const notes = kind === "alert" ? [660, 880] : [523, 659, 784];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, now + i * 0.18);
        g.gain.linearRampToValueAtTime(0.12, now + i * 0.18 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.4);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.18);
        o.stop(now + i * 0.18 + 0.45);
      });
    } catch {
      /* audio not available */
    }
  }, []);
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState());
  const [tab, setTab] = useState<"patient" | "caregiver">("patient");
  const [voice, setVoice] = useState(true);
  const [sound, setSound] = useState(true);
  const chime = useChime();

  // ---- Game loop ----
  useEffect(() => {
    if (state.phase !== "playing") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  // ---- Device feedback (sound + vibration) ----
  useEffect(() => {
    if (!state.deviceFlash) return;
    if (sound) chime(state.deviceFlash === "alert" ? "alert" : "soft");
    if (state.deviceFlash === "alert" && navigator.vibrate) navigator.vibrate([120, 80, 120]);
    const t = setTimeout(() => dispatch({ type: "CLEAR_FLASH" }), 1800);
    return () => clearTimeout(t);
  }, [state.deviceFlash, sound, chime]);

  // ---- AI for the role that is not being played ----
  const ai = useRef({
    lastCareMsg: -100,
    callSince: -1,
    memorySent: -100,
    breathCycles: 0,
    lastBreath: 0,
    activitySince: 0,
    lastAck: -100,
  });

  useEffect(() => {
    if (state.phase !== "playing") return;
    const t = state.tick;
    const a = ai.current;

    // --- Automatic caregiver (when the human plays the patient) ---
    if (state.mode === "patient") {
      if (state.pendingCall) {
        if (a.callSince < 0) a.callSince = t;
        if (t - a.callSince >= 3) {
          dispatch({ type: "CARE_ANSWER_CALL" });
          a.callSince = -1;
        }
      } else a.callSince = -1;

      if (state.episode) {
        const since = t - state.episode.startedAt;
        if (state.anxiety > 50 && t - a.lastCareMsg > 14 && since > 4) {
          const p = CAREGIVER_PRESETS[Math.floor(Math.random() * CAREGIVER_PRESETS.length)];
          dispatch({ type: "CARE_SEND_MESSAGE", text: p.text });
          a.lastCareMsg = t;
        }
        if (state.episode.type === "wander" && !state.inSafeZone && !state.guidanceActive && !state.caregiverPresent) {
          dispatch({ type: "CARE_TOGGLE_GUIDANCE" });
        }
        if (state.episode.type === "olvido" && since > 8 && t - a.memorySent > 40 && state.activity === "idle") {
          dispatch({ type: "CARE_SEND_MEMORY", memoryId: "ana" });
          a.memorySent = t;
        }
        if (state.anxiety > 82 && !state.caregiverTravel && !state.caregiverPresent) {
          dispatch({ type: "CARE_GO" });
        }
      }
    }

    // --- Automatic patient (when the human plays the caregiver) ---
    if (state.mode === "caregiver") {
      // breathing cycles happen automatically (no patient UI mounted)
      if (state.activity === "breathing") {
        if (t - a.lastBreath >= 12) {
          dispatch({ type: "PATIENT_BREATH_CYCLE" });
          a.lastBreath = t;
          a.breathCycles += 1;
          if (a.breathCycles >= 3) {
            dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });
            a.breathCycles = 0;
          }
        }
      } else {
        a.breathCycles = 0;
        a.lastBreath = t;
      }
      // memory viewing: patient "recognises" after a few seconds
      if (state.activity === "memory" && state.openMemoryId && t - a.activitySince > 5) {
        dispatch({ type: "PATIENT_MEMORY_ANSWER", correct: Math.random() > 0.3, memoryId: state.openMemoryId });
        dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: null });
        dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });
        a.activitySince = t;
      }
      if ((state.activity === "where" || state.activity === "time") && t - a.activitySince > 4) {
        dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });
      }
      if (state.activity === "idle") a.activitySince = t;

      // patient acknowledges caregiver messages
      const last = state.messages[state.messages.length - 1];
      if (last && last.from === "caregiver" && t - last.at === 2 && a.lastAck !== last.id) {
        dispatch({ type: "PATIENT_ACK_MESSAGE" });
        a.lastAck = last.id;
      }

      if (state.episode && state.activity === "idle") {
        const r = Math.random();
        if (r < 0.05) {
          dispatch({ type: "PATIENT_WHERE" });
          a.activitySince = t;
        } else if (r < 0.09 && state.anxiety > 55 && !state.pendingCall && !state.callAnswered) {
          dispatch({ type: "PATIENT_CALL" });
        } else if (r < 0.11 && state.anxiety > 45) {
          dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "breathing" });
          a.lastBreath = t;
        }
      }
      // give up on unanswered call after a while
      if (state.pendingCall) {
        if (a.callSince < 0) a.callSince = t;
        if (t - a.callSince > 20) {
          dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });
          a.callSince = -1;
        }
      } else a.callSince = -1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tick, state.phase]);

  const start = (mode: Mode, scenarioIndex: number) => {
    ai.current = { lastCareMsg: -100, callSince: -1, memorySent: -100, breathCycles: 0, lastBreath: 0, activitySince: 0, lastAck: -100 };
    setTab(mode === "caregiver" ? "caregiver" : "patient");
    dispatch({ type: "START", mode, scenarioIndex });
  };

  const scenario = SCENARIOS[state.scenarioIndex];

  return (
    <div className={cn("min-h-screen bg-gradient-to-br text-zinc-800 transition-colors duration-1000", state.phase === "playing" ? scenario.sky : "from-sky-100 via-white to-amber-50")}>
      {state.phase === "intro" && <IntroScreen onStart={start} />}

      {state.phase === "summary" && (
        <SummaryScreen
          state={state}
          onNext={() => {
            ai.current = { ...ai.current, lastCareMsg: -100, callSince: -1, memorySent: -100 };
            dispatch({ type: "NEXT_SCENARIO" });
          }}
          onRestart={() => start(state.mode, state.scenarioIndex)}
          onHome={() => dispatch({ type: "RESTART" })}
        />
      )}

      {state.phase === "playing" && (
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-5">
          {/* top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-xl">🫀</span>
              <div>
                <p className="text-sm font-semibold text-zinc-800">Contigo · {scenario.title}</p>
                <p className="text-xs text-zinc-500">
                  {state.mode === "both" ? "Modo dúo · 3D/VR + panel" : state.mode === "patient" ? "Vives el mundo como paciente (Ana automática)" : "Juegas como cuidador (Don Manuel automático)"}
                </p>
              </div>
            </div>

            {state.mode === "both" && (
              <div className="flex gap-1 rounded-full bg-zinc-100 p-1 xl:hidden">
                {(["patient", "caregiver"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTab(r)}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-sm font-medium transition",
                      tab === r ? "bg-white text-zinc-900 shadow" : "text-zinc-500",
                    )}
                  >
                    {r === "patient" ? "👴 Paciente" : "👩 Cuidador"}
                    {r === "caregiver" && (state.pendingCall || state.episode) && tab !== "caregiver" && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-rose-500" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoice((v) => !v)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", voice ? "border-sky-300 bg-sky-50 text-sky-700" : "border-zinc-200 bg-white text-zinc-500")}
                title="Leer en voz alta los mensajes del cuidador"
              >
                {voice ? "🔊 Voz" : "🔇 Voz"}
              </button>
              <button
                onClick={() => setSound((v) => !v)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", sound ? "border-sky-300 bg-sky-50 text-sky-700" : "border-zinc-200 bg-white text-zinc-500")}
              >
                {sound ? "🔔 Avisos" : "🔕 Avisos"}
              </button>
              <button
                onClick={() => dispatch({ type: "RESTART" })}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Salir
              </button>
            </div>
          </div>

          {/* panels */}
          {state.mode === "patient" && (
            <PatientWorldView state={state} dispatch={dispatch} voiceEnabled={voice} className="h-[calc(100dvh-5.5rem)] min-h-[480px]" />
          )}
          {state.mode === "caregiver" && <CaregiverView state={state} dispatch={dispatch} />}
          {state.mode === "both" && (
            <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
              <div className={cn("flex flex-col", tab !== "patient" && "hidden xl:flex")}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-sky-700">👴 Mundo del paciente (3D / VR)</p>
                <PatientWorldView state={state} dispatch={dispatch} voiceEnabled={voice} compact className="h-[calc(100dvh-8rem)] min-h-[440px] xl:sticky xl:top-3" />
              </div>
              <div className={cn("rounded-[2rem] border border-amber-200/60 bg-amber-50/30 p-3", tab !== "caregiver" && "hidden xl:block")}>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-amber-700">👩 Panel del cuidador</p>
                <CaregiverView state={state} dispatch={dispatch} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
