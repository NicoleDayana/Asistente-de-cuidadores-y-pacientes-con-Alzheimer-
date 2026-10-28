import { useState } from "react";
import type { Action, GameState } from "../game/types";
import { CAREGIVER_NAME, CAREGIVER_PRESETS, EPISODE_META, MEMORIES, PATIENT_NAME, SCENARIOS, nearestPlace } from "../game/data";
import { SceneView } from "./SceneView";
import { Device } from "./Device";
import { cn } from "../utils/cn";

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

function Gauge({ label, value, invert, unit }: { label: string; value: number; invert?: boolean; unit?: string }) {
  const good = invert ? value < 35 : value > 65;
  const mid = invert ? value < 60 : value > 40;
  const color = good ? "bg-emerald-500" : mid ? "bg-amber-400" : "bg-rose-500";
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <span className="text-xl font-bold tabular-nums text-zinc-800">
          {Math.round(value)}
          <span className="ml-0.5 text-xs font-normal text-zinc-400">{unit ?? "%"}</span>
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function ActionButton({
  emoji,
  label,
  sub,
  onClick,
  disabled,
  active,
  tone = "zinc",
}: {
  emoji: string;
  label: string;
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "zinc" | "sky" | "teal" | "amber" | "rose";
}) {
  const tones = {
    zinc: "border-zinc-200 bg-white hover:bg-zinc-50",
    sky: "border-sky-200 bg-sky-50 hover:bg-sky-100",
    teal: "border-teal-200 bg-teal-50 hover:bg-teal-100",
    amber: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    rose: "border-rose-200 bg-rose-50 hover:bg-rose-100",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
        active && "ring-2 ring-sky-400",
      )}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-zinc-800">{label}</span>
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </span>
    </button>
  );
}

export function CaregiverView({ state, dispatch }: Props) {
  const scenario = SCENARIOS[state.scenarioIndex];
  const [tab, setTab] = useState<"actions" | "log">("actions");
  const place = nearestPlace(state.patientPos);
  const meta = state.episode ? EPISODE_META[state.episode.type] : null;
  const remaining = Math.max(0, scenario.duration - state.tick);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* header */}
      <div className="flex items-center justify-between rounded-3xl bg-zinc-900 px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-200 text-2xl">👩</div>
          <div>
            <p className="text-xs text-zinc-400">Panel de cuidado · {CAREGIVER_NAME}</p>
            <p className="text-lg font-semibold">
              {PATIENT_NAME} · <span className="font-normal text-zinc-300">{place.name}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Tiempo restante</p>
          <p className="text-xl font-bold tabular-nums">
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </p>
        </div>
      </div>

      {/* alert banner */}
      {(state.episode || state.pendingCall || !state.inSafeZone) && (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-3xl border-2 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
            !state.inSafeZone || state.pendingCall ? "border-rose-300 bg-rose-50" : "border-amber-300 bg-amber-50",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{state.pendingCall ? "📞" : !state.inSafeZone ? "🚨" : meta?.icon}</span>
            <div>
              <p className="text-sm font-bold text-zinc-800">
                {state.pendingCall
                  ? `${PATIENT_NAME} te está llamando`
                  : !state.inSafeZone
                    ? "Fuera de la zona segura"
                    : `Episodio: ${meta?.label}`}
              </p>
              {state.episode && <p className="text-sm italic text-zinc-600">«{state.episode.thought}»</p>}
              {meta && <p className="mt-0.5 text-xs text-zinc-500">💡 {meta.tip}</p>}
            </div>
          </div>
          {state.pendingCall && (
            <button
              onClick={() => dispatch({ type: "CARE_ANSWER_CALL" })}
              className="shrink-0 animate-pulse rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow"
            >
              Contestar llamada
            </button>
          )}
        </div>
      )}

      {/* vitals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Gauge label="Pulso" value={state.heartRate} unit="lpm" invert />
        <Gauge label="Ansiedad" value={state.anxiety} invert />
        <Gauge label="Orientación" value={state.orientation} />
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Zona segura</span>
          <p className={cn("mt-1 text-lg font-bold", state.inSafeZone ? "text-emerald-600" : "text-rose-600")}>
            {state.inSafeZone ? "Dentro" : "FUERA"}
          </p>
          <input
            type="range"
            min={10}
            max={35}
            value={state.safeRadius}
            onChange={(e) => dispatch({ type: "CARE_SET_RADIUS", radius: Number(e.target.value) })}
            className="mt-1 w-full accent-emerald-600"
            aria-label="Radio de zona segura"
          />
          <span className="text-[10px] text-zinc-400">radio {state.safeRadius * 10} m</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-3">
          <SceneView state={state} perspective="caregiver" />
          <div className="flex items-center justify-between rounded-3xl bg-white/70 px-4 py-2 shadow-sm">
            <div className="scale-[0.55] origin-left -my-8">
              <Device state={state} size={160} compact />
            </div>
            <div className="text-right text-xs text-zinc-500">
              <p>Vista espejo del dispositivo</p>
              <p className="font-medium text-zinc-700">
                {state.guidanceActive ? "Guía AR activa" : state.activity === "breathing" ? "Respirando" : state.activity === "memory" ? "Viendo recuerdos" : "En espera"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-3xl bg-white/80 p-3 shadow-sm backdrop-blur">
          <div className="mb-3 flex gap-1 rounded-full bg-zinc-100 p-1">
            {(["actions", "log"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 rounded-full py-1.5 text-sm font-medium transition",
                  tab === t ? "bg-white text-zinc-900 shadow" : "text-zinc-500",
                )}
              >
                {t === "actions" ? "Acciones de apoyo" : `Registro (${state.log.length})`}
              </button>
            ))}
          </div>

          {tab === "actions" ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Mensaje de voz al dispositivo</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CAREGIVER_PRESETS.map((p) => (
                    <button
                      key={p.text}
                      onClick={() => dispatch({ type: "CARE_SEND_MESSAGE", text: p.text })}
                      className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-left text-xs text-zinc-700 transition hover:bg-sky-100"
                    >
                      <span className="text-base">{p.emoji}</span>
                      <span>{p.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Intervenciones</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ActionButton
                    emoji="🧭"
                    label={state.guidanceActive ? "Desactivar guía AR" : "Guía AR a casa"}
                    sub="Flechas en el dispositivo"
                    tone="sky"
                    active={state.guidanceActive}
                    onClick={() => dispatch({ type: "CARE_TOGGLE_GUIDANCE" })}
                  />
                  <ActionButton
                    emoji="🌬️"
                    label="Respirar juntos"
                    sub="Inicia ejercicio guiado"
                    tone="teal"
                    active={state.activity === "breathing"}
                    onClick={() => dispatch({ type: "CARE_BREATHE_TOGETHER" })}
                  />
                  <ActionButton
                    emoji="🏃"
                    label={state.caregiverPresent ? "Estás con él" : state.caregiverTravel ? `Llegas en ${Math.max(0, state.caregiverTravel.arriveAt - state.tick)}s` : "Ir con él"}
                    sub="Presencia física"
                    tone="amber"
                    disabled={state.caregiverPresent || !!state.caregiverTravel}
                    onClick={() => dispatch({ type: "CARE_GO" })}
                  />
                  <ActionButton
                    emoji="📞"
                    label="Contestar llamada"
                    sub={state.pendingCall ? "¡Llamada entrante!" : "Sin llamadas"}
                    tone="rose"
                    disabled={!state.pendingCall}
                    onClick={() => dispatch({ type: "CARE_ANSWER_CALL" })}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Enviar un recuerdo</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {MEMORIES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => dispatch({ type: "CARE_SEND_MEMORY", memoryId: m.id })}
                      className="flex w-24 shrink-0 flex-col items-center gap-1 rounded-xl border border-amber-100 bg-amber-50/70 p-2 text-center transition hover:bg-amber-100"
                    >
                      {m.image ? (
                        <img src={m.image} alt="" className="h-14 w-full rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-14 w-full items-center justify-center rounded-lg bg-white text-3xl">{m.emoji}</span>
                      )}
                      <span className="text-[11px] font-medium leading-tight text-zinc-700">{m.who}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Simulación (entrenamiento)</p>
                <div className="flex flex-wrap gap-2">
                  {(["desorientacion", "wander", "agitacion", "olvido"] as const).map((t) => (
                    <button
                      key={t}
                      disabled={!!state.episode}
                      onClick={() => dispatch({ type: "TRIGGER_EPISODE", episodeType: t })}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      {EPISODE_META[t].icon} Provocar {EPISODE_META[t].label.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <ul className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto pr-1">
              {state.log.length === 0 && <li className="text-sm text-zinc-400">Sin eventos todavía.</li>}
              {state.log.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs",
                    l.tone === "warn" ? "bg-amber-50 text-amber-900" : l.tone === "good" ? "bg-emerald-50 text-emerald-900" : "bg-zinc-50 text-zinc-700",
                  )}
                >
                  <span className="mr-2 font-mono text-[10px] text-zinc-400">
                    {Math.floor(l.at / 60)}:{String(l.at % 60).padStart(2, "0")}
                  </span>
                  {l.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
