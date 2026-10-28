import type { GameState } from "../game/types";
import { HOME, PLACES, SCENARIOS, dist } from "../game/data";
import { cn } from "../utils/cn";

interface Props {
  state: GameState;
  perspective: "patient" | "caregiver";
  className?: string;
}

/**
 * Mixed reality scene: a stylised neighbourhood (the "real" layer)
 * plus AR overlays rendered by the wearable (labels, safe zone, guidance path).
 * From the patient's perspective, low orientation blurs/desaturates the real
 * layer – the AR layer is what keeps him anchored.
 */
export function SceneView({ state, perspective, className }: Props) {
  const scenario = SCENARIOS[state.scenarioIndex];
  const { patientPos, orientation, guidanceActive, safeRadius, caregiverPresent, caregiverTravel, episode } = state;
  const isPatient = perspective === "patient";
  const confusion = isPatient ? Math.max(0, (60 - orientation) / 60) : 0; // 0..1
  const blur = confusion * 5;
  const labelOpacity = isPatient ? Math.min(1, orientation / 70) : 1;

  // guidance path dots
  const pathDots: { x: number; y: number }[] = [];
  if (guidanceActive) {
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      pathDots.push({
        x: patientPos.x + ((HOME.x - patientPos.x) * i) / steps,
        y: patientPos.y + ((HOME.y - patientPos.y) * i) / steps,
      });
    }
  }

  const travelProgress = caregiverTravel
    ? 1 - Math.max(0, caregiverTravel.arriveAt - state.tick) / Math.max(1, caregiverTravel.arriveAt - state.tick + 1)
    : 0;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-3xl border border-white/60 shadow-lg", className)}>
      <div className="relative aspect-[4/3] w-full">
        {/* REAL LAYER */}
        <div
          className={cn("absolute inset-0 bg-gradient-to-b transition-all duration-1000", scenario.sky)}
          style={{ filter: `blur(${blur}px) saturate(${1 - confusion * 0.6})` }}
        >
          {/* ground */}
          <div className="absolute inset-x-0 bottom-0 top-[18%] bg-gradient-to-b from-emerald-100/70 to-emerald-200/80" />
          {/* roads */}
          <div className="absolute left-0 right-0 top-[55%] h-[6%] bg-zinc-300/80">
            <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 [background:repeating-linear-gradient(90deg,#fff_0_12px,transparent_12px_24px)]" />
          </div>
          <div className="absolute bottom-0 top-[18%] left-[48%] w-[5%] bg-zinc-300/80">
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 [background:repeating-linear-gradient(180deg,#fff_0_12px,transparent_12px_24px)]" />
          </div>
          {/* lake */}
          <div className="absolute left-[8%] top-[20%] h-[16%] w-[22%] rounded-[50%] bg-sky-300/70 blur-[1px]" />
          {/* places */}
          {PLACES.map((p) => (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow sm:text-4xl"
              style={{ left: `${p.pos.x}%`, top: `${p.pos.y}%` }}
            >
              {p.emoji}
            </div>
          ))}
        </div>

        {/* confusion fog */}
        {confusion > 0 && (
          <div
            className="pointer-events-none absolute inset-0 bg-zinc-200/40 mix-blend-multiply transition-opacity duration-700"
            style={{ opacity: confusion }}
          />
        )}

        {/* AR LAYER */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 75" preserveAspectRatio="none">
          {/* safe zone (scaled vertically to keep circle in 4:3) */}
          <ellipse
            cx={HOME.x}
            cy={HOME.y * 0.75}
            rx={safeRadius}
            ry={safeRadius * 0.75}
            fill={state.inSafeZone ? "rgba(16,185,129,0.10)" : "rgba(244,63,94,0.10)"}
            stroke={state.inSafeZone ? "rgba(16,185,129,0.8)" : "rgba(244,63,94,0.9)"}
            strokeWidth="0.5"
            strokeDasharray="1.5 1"
            className={cn(!state.inSafeZone && "animate-pulse")}
          />
          {/* guidance path */}
          {guidanceActive && (
            <>
              <line
                x1={patientPos.x}
                y1={patientPos.y * 0.75}
                x2={HOME.x}
                y2={HOME.y * 0.75}
                stroke="rgba(14,165,233,0.5)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {pathDots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y * 0.75} r="1.1" fill="#0ea5e9" opacity={0.4 + (i / pathDots.length) * 0.6}>
                  <animate attributeName="r" values="0.8;1.5;0.8" dur="1.4s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                </circle>
              ))}
            </>
          )}
          {/* caregiver travelling */}
          {caregiverTravel && (
            <circle
              cx={HOME.x + (patientPos.x - HOME.x) * travelProgress}
              cy={(HOME.y + (patientPos.y - HOME.y) * travelProgress) * 0.75}
              r="1.6"
              fill="#f59e0b"
            />
          )}
        </svg>

        {/* AR labels */}
        {PLACES.map((p) => {
          const near = dist(p.pos, patientPos) < 14;
          const show = p.id === "home" || near || !isPatient || guidanceActive;
          if (!show) return null;
          return (
            <div
              key={p.id}
              className="absolute -translate-x-1/2 transition-opacity duration-700"
              style={{ left: `${p.pos.x}%`, top: `${p.pos.y - 11}%`, opacity: labelOpacity }}
            >
              <div
                className={cn(
                  "whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur sm:text-xs",
                  p.id === "home"
                    ? "border-sky-300 bg-sky-500/90 text-white"
                    : "border-white/70 bg-white/80 text-zinc-700",
                )}
              >
                {p.name}
                {isPatient && near && p.id !== "home" && (
                  <span className="ml-1 text-zinc-500">· {p.hint}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* patient avatar */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
          style={{ left: `${patientPos.x}%`, top: `${patientPos.y}%` }}
        >
          <div className="relative flex flex-col items-center">
            {episode && (
              <div className="absolute -top-9 whitespace-nowrap rounded-xl bg-white/90 px-2 py-1 text-[10px] text-zinc-700 shadow sm:text-xs">
                {isPatient ? "💭" : "💭 " + episode.thought.slice(0, 34) + (episode.thought.length > 34 ? "…" : "")}
              </div>
            )}
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-xl shadow-lg sm:h-11 sm:w-11 sm:text-2xl",
                state.anxiety > 60 ? "border-rose-400" : state.anxiety > 35 ? "border-amber-400" : "border-emerald-400",
              )}
            >
              👴
            </div>
            {/* wearable blip */}
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sky-500 ring-2 ring-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-sky-400 opacity-70" />
            </span>
            {caregiverPresent && (
              <div className="absolute -right-8 top-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400 bg-white text-xl shadow sm:h-10 sm:w-10">
                👩
              </div>
            )}
          </div>
        </div>

        {/* AR HUD */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            {isPatient ? "Vista del paciente · capa AR" : "Vista del cuidador · mapa en vivo"}
          </span>
          <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] text-white backdrop-blur">
            {scenario.dayLabel} · {scenario.timeLabel}
          </span>
        </div>
        {isPatient && confusion > 0.35 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-sky-700 shadow">
              Tu dispositivo te está guiando. Mira las etiquetas azules.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
