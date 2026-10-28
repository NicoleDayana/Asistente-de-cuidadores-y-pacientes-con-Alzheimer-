import { useEffect, useRef, useState } from "react";
import type { Action, GameState } from "../game/types";
import { CAREGIVER_NAME, HOME, MEMORIES, PATIENT_NAME, PATIENT_QUICK_REPLIES, SCENARIOS, WORLD_SCALE, dist, nearestPlace } from "../game/data";
import { Device } from "./Device";
import { BreathingExercise } from "./BreathingExercise";
import { MemoryCard, MemoryGame } from "./MemoryGame";
import { applyLook, input, installTouch } from "../vr/input";
import { xrStore } from "../vr/VRScene";
import { cn } from "../utils/cn";

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  voiceEnabled: boolean;
  compact?: boolean;
}

function Key({ k }: { k: string }) {
  return <kbd className="ml-1 rounded border border-white/30 bg-black/30 px-1 text-[10px] font-mono">{k}</kbd>;
}

export function PatientHUD({ state, dispatch, voiceEnabled, compact }: Props) {
  const scenario = SCENARIOS[state.scenarioIndex];
  const place = nearestPlace(state.patientPos);
  const lastMsg = [...state.messages].reverse().find((m) => m.from === "caregiver");
  const lastSpoken = useRef(0);
  const lookLayer = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);
  const [vrSupport, setVrSupport] = useState<{ vr: boolean; ar: boolean }>({ vr: false, ar: false });
  const [inXR, setInXR] = useState(false);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  const idle = () => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });

  // WebXR capability detection
  useEffect(() => {
    const xr = (navigator as any).xr;
    if (!xr) return;
    Promise.all([
      xr.isSessionSupported("immersive-vr").catch(() => false),
      xr.isSessionSupported("immersive-ar").catch(() => false),
    ]).then(([vr, ar]) => setVrSupport({ vr, ar }));
    return xrStore.subscribe((s) => setInXR(!!s.session));
  }, []);

  // Pointer lock look
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement === lookLayer.current) applyLook(e.movementX, e.movementY);
    };
    const onChange = () => {
      const l = document.pointerLockElement === lookLayer.current;
      input.pointerLocked = l;
      setLocked(l);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("pointerlockchange", onChange);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointerlockchange", onChange);
    };
  }, []);

  // Touch controls
  useEffect(() => {
    if (!lookLayer.current || !isTouch) return;
    return installTouch(lookLayer.current);
  }, [isTouch]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.code) {
        case "Digit1": dispatch({ type: "PATIENT_WHERE" }); break;
        case "Digit2": dispatch({ type: "PATIENT_TIME" }); break;
        case "Digit3": dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "breathing" }); break;
        case "Digit4": dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "memory" }); break;
        case "Digit5": dispatch({ type: "PATIENT_CALL" }); break;
        case "KeyE": if (lastMsg) dispatch({ type: "PATIENT_ACK_MESSAGE" }); break;
        case "Escape": idle(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMsg]);

  // Speak caregiver messages (also works while in the VR session)
  useEffect(() => {
    if (!voiceEnabled || !lastMsg || lastMsg.id === lastSpoken.current) return;
    if (lastMsg.kind === "voice" && "speechSynthesis" in window) {
      lastSpoken.current = lastMsg.id;
      const u = new SpeechSynthesisUtterance(lastMsg.text);
      u.lang = "es-ES";
      u.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, [lastMsg, voiceEnabled]);

  // Release pointer lock when an activity opens so the mouse can be used
  useEffect(() => {
    if (state.activity !== "idle" && document.pointerLockElement) document.exitPointerLock();
  }, [state.activity]);

  const metres = Math.round(dist(state.patientPos, HOME) * WORLD_SCALE);
  const modal = state.activity !== "idle";

  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white">
      {/* look / move layer */}
      <div
        ref={lookLayer}
        className={cn("pointer-events-auto absolute inset-0", locked ? "cursor-none" : "cursor-crosshair")}
        onClick={() => {
          if (!isTouch && !modal && !inXR) lookLayer.current?.requestPointerLock();
        }}
      />
      {/* crosshair */}
      {!isTouch && !modal && (
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 ring-2 ring-black/20" />
      )}
      {/* touch joystick hint */}
      {isTouch && (
        <>
          <div className="absolute bottom-24 left-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/40 bg-black/20 text-[10px] text-white/70">
            mover
          </div>
          <div className="absolute bottom-28 right-6 rounded-full bg-black/30 px-3 py-1 text-[10px] text-white/70">arrastra para mirar</div>
        </>
      )}

      {/* top-left: identity & time */}
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        <div className="rounded-2xl bg-black/45 px-3 py-2 backdrop-blur">
          <p className="text-[10px] uppercase tracking-wide text-white/60">Vista del paciente · {PATIENT_NAME}</p>
          <p className="text-2xl font-bold tabular-nums leading-none">{scenario.timeLabel}</p>
          <p className="text-xs text-white/80">{scenario.dayLabel}</p>
        </div>
        <div className="rounded-2xl bg-sky-600/80 px-3 py-1.5 text-xs backdrop-blur">
          <span className="font-semibold">📍 {place.name}</span>
          {place.id !== "home" && <span className="text-white/80"> · casa a {metres} m</span>}
        </div>
        {!compact && (
          <div className="rounded-2xl bg-black/35 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur">
            {isTouch ? (
              <>Joystick izq. mover · arrastra der. mirar</>
            ) : locked ? (
              <>WASD mover · ratón mirar · <Key k="Esc" /> liberar ratón</>
            ) : (
              <>Clic en la escena para mirar · <Key k="W" /><Key k="A" /><Key k="S" /><Key k="D" /> caminar</>
            )}
          </div>
        )}
      </div>

      {/* top-right: device */}
      <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
        <div className="pointer-events-auto origin-top-right scale-[0.6] sm:scale-[0.7]">
          <Device state={state} size={200} compact onTap={() => dispatch({ type: "PATIENT_WHERE" })} />
        </div>
        {(vrSupport.vr || vrSupport.ar) && !inXR && (
          <div className="pointer-events-auto -mt-6 flex gap-1.5">
            {vrSupport.vr && (
              <button onClick={() => xrStore.enterVR()} className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold shadow hover:bg-violet-500">
                🥽 Entrar en VR
              </button>
            )}
            {vrSupport.ar && (
              <button onClick={() => xrStore.enterAR()} className="rounded-full bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold shadow hover:bg-fuchsia-500">
                🪟 Realidad mixta
              </button>
            )}
          </div>
        )}
        {inXR && (
          <button onClick={() => xrStore.getState().session?.end()} className="pointer-events-auto -mt-6 rounded-full bg-zinc-800 px-3 py-1.5 text-xs">
            Salir de VR
          </button>
        )}
      </div>

      {/* thought bubble */}
      {state.episode && !modal && (
        <div className="absolute left-1/2 top-3 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-amber-300/60 bg-amber-900/60 px-4 py-2 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-wide text-amber-200">Pensamiento</p>
          <p className="text-base italic">«{state.episode.thought}»</p>
          <p className="mt-0.5 text-xs text-amber-100">Tu brazalete vibra suave: «Estoy contigo. Todo está bien.»</p>
        </div>
      )}

      {/* bottom-left: caregiver message */}
      {lastMsg && !modal && (
        <div className="pointer-events-auto absolute bottom-3 left-3 w-[min(92vw,380px)] rounded-2xl border border-sky-300/50 bg-black/55 p-3 backdrop-blur">
          <div className="flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-lg">👩</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sky-300">
                {CAREGIVER_NAME}, tu hija {lastMsg.kind === "voice" && "🔊"}
              </p>
              <p className="text-sm leading-snug">{lastMsg.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {lastMsg.kind === "memory" && lastMsg.memoryId && (
                  <button onClick={() => dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: lastMsg.memoryId! })} className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-black">
                    Ver recuerdo
                  </button>
                )}
                {PATIENT_QUICK_REPLIES.slice(0, 3).map((r) => (
                  <button key={r} onClick={() => dispatch({ type: "PATIENT_ACK_MESSAGE" })} className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* bottom-right: actions */}
      {!modal && (
        <div className={cn("pointer-events-auto absolute bottom-3 right-3 grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-5", isTouch && "bottom-3 right-3 grid-cols-3")}>
          {[
            { k: "1", e: "📍", l: "¿Dónde estoy?", a: () => dispatch({ type: "PATIENT_WHERE" }), pulse: !!state.episode && state.orientation < 50, c: "bg-sky-600" },
            { k: "2", e: "🕒", l: "¿Qué día es?", a: () => dispatch({ type: "PATIENT_TIME" }), c: "bg-sky-700" },
            { k: "3", e: "🌬️", l: "Respirar", a: () => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "breathing" }), pulse: state.anxiety > 60, c: "bg-teal-600" },
            { k: "4", e: "🖼️", l: "Recuerdos", a: () => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "memory" }), c: "bg-amber-600" },
            { k: "5", e: "📞", l: state.pendingCall ? "Llamando…" : `Llamar a ${CAREGIVER_NAME}`, a: () => dispatch({ type: "PATIENT_CALL" }), c: "bg-rose-600" },
          ].map((b) => (
            <button
              key={b.k}
              onClick={b.a}
              className={cn("flex min-w-[88px] flex-col items-center rounded-2xl px-2 py-2 text-center shadow-lg transition hover:brightness-110 active:scale-95", b.c, b.pulse && "animate-pulse ring-4 ring-white/40")}
            >
              <span className="text-xl leading-none">{b.e}</span>
              <span className="mt-1 text-[11px] font-semibold leading-tight">{b.l}</span>
              {!isTouch && <span className="text-[9px] text-white/60">tecla {b.k}</span>}
            </button>
          ))}
        </div>
      )}

      {/* activity modal (in a VR session the in-world wrist panel takes over) */}
      {modal && !inXR && (
        <div className="pointer-events-auto absolute inset-0 flex items-end justify-center bg-black/30 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-4 text-zinc-800 shadow-2xl">
            {state.activity === "where" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Estás aquí</p>
                <div className="flex items-center gap-3 rounded-2xl bg-sky-50 p-3">
                  <span className="text-4xl">{place.emoji}</span>
                  <div>
                    <p className="text-xl font-semibold">{place.name}</p>
                    <p className="text-sm text-zinc-600">{place.hint}</p>
                  </div>
                </div>
                <p className="rounded-2xl bg-zinc-50 p-3 text-sm">
                  {place.id === "home"
                    ? `Estás en tu casa, calle Olmo 12. Es tu hogar desde hace 40 años. ${CAREGIVER_NAME} está cerca.`
                    : `Tu casa está a ${metres} metros. Mira el haz de luz azul en el cielo: señala tu casa. ${CAREGIVER_NAME} sabe dónde estás.`}
                </p>
                <button onClick={idle} className="self-center rounded-full bg-sky-600 px-6 py-2.5 font-medium text-white">Entendido</button>
              </div>
            )}
            {state.activity === "time" && (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-5xl font-bold tabular-nums">{scenario.timeLabel}</p>
                <p className="text-xl">{scenario.dayLabel}</p>
                <p className="rounded-2xl bg-sky-50 p-3 text-sm">
                  {scenario.id === "sunset" ? "Es de noche. No tienes que ir a trabajar: estás jubilado y hoy toca descansar." : scenario.id === "walk" ? "Es hora del paseo con Toby. Después, de vuelta a casa a merendar." : "Es por la mañana. Ya has desayunado. Hoy no hay nada urgente."}
                </p>
                <button onClick={idle} className="rounded-full bg-sky-600 px-6 py-2.5 font-medium text-white">Gracias</button>
              </div>
            )}
            {state.activity === "breathing" && (
              <BreathingExercise withCaregiver={!!lastMsg?.text.includes("respirar")} onCycle={() => dispatch({ type: "PATIENT_BREATH_CYCLE" })} onFinish={idle} />
            )}
            {state.activity === "memory" && state.openMemoryId && (
              <div className="flex flex-col items-center gap-3">
                <MemoryCard m={MEMORIES.find((m) => m.id === state.openMemoryId)!} large />
                <div className="flex gap-2">
                  <button onClick={() => { dispatch({ type: "PATIENT_MEMORY_ANSWER", correct: true, memoryId: state.openMemoryId! }); dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: null }); idle(); }} className="rounded-full bg-sky-600 px-5 py-2.5 font-medium text-white">Lo recuerdo 💛</button>
                  <button onClick={() => dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: null })} className="rounded-full bg-zinc-100 px-5 py-2.5 text-zinc-700">Más recuerdos</button>
                </div>
              </div>
            )}
            {state.activity === "memory" && !state.openMemoryId && (
              <MemoryGame focusId={state.episode?.type === "olvido" ? "ana" : null} onAnswer={(c, id) => dispatch({ type: "PATIENT_MEMORY_ANSWER", correct: c, memoryId: id })} onClose={idle} />
            )}
            {state.activity === "calling" && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
                  👩<span className="absolute inset-0 animate-ping rounded-full border-4 border-emerald-300" />
                </div>
                <p className="text-lg font-semibold">Llamando a {CAREGIVER_NAME}…</p>
                <p className="text-sm text-zinc-600">Tu brazalete ha avisado a tu hija. Respira despacio mientras contesta.</p>
                <button onClick={idle} className="rounded-full bg-zinc-100 px-5 py-2 text-zinc-700">Colgar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
