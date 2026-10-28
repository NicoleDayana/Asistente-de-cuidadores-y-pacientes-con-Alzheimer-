import { useEffect, useState } from "react";
import type { GameState } from "../game/types";
import { cn } from "../utils/cn";
import { nearestPlace } from "../game/data";

interface Props {
  state: GameState;
  size?: number;
  onTap?: () => void;
  compact?: boolean;
}

export function Device({ state, size = 230, onTap, compact }: Props) {
  const { heartRate, inSafeZone, episode, anxiety, deviceFlash, guidanceActive, pendingCall } = state;
  const [beat, setBeat] = useState(false);

  // heartbeat pulse synced to heart rate
  useEffect(() => {
    const interval = 60000 / Math.max(40, heartRate);
    const id = setInterval(() => {
      setBeat(true);
      setTimeout(() => setBeat(false), 140);
    }, interval);
    return () => clearInterval(id);
  }, [heartRate]);

  const alertLevel = !inSafeZone || anxiety > 70 ? "red" : episode || anxiety > 45 ? "amber" : "green";

  const statusText = !inSafeZone
    ? "Fuera de zona · SOS"
    : pendingCall
      ? "Llamando a Ana…"
      : guidanceActive
        ? "Guía a casa activa"
        : episode
          ? "Contigo · Respira"
          : "Seguro · Ubicación activa";

  const ringColor =
    alertLevel === "red"
      ? "shadow-[0_0_0_6px_rgba(239,68,68,0.35)]"
      : alertLevel === "amber"
        ? "shadow-[0_0_0_6px_rgba(245,158,11,0.35)]"
        : "shadow-[0_0_0_6px_rgba(16,185,129,0.25)]";

  const flashBg =
    deviceFlash === "alert"
      ? "bg-rose-50"
      : deviceFlash === "message"
        ? "bg-sky-50"
        : deviceFlash === "calm"
          ? "bg-emerald-50"
          : deviceFlash === "breathe"
            ? "bg-teal-50"
            : "bg-[#f4f5f7]";

  const place = nearestPlace(state.patientPos);
  const battery = Math.max(20, 96 - Math.floor(state.tick / 10));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 1.9, height: size * 1.25 }}>
      {/* strap */}
      <div
        className="absolute rounded-[18px] bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700 shadow-inner"
        style={{ width: size * 1.9, height: size * 0.62 }}
      >
        <div className="absolute inset-0 rounded-[18px] opacity-40 [background:repeating-linear-gradient(90deg,transparent_0_4px,rgba(0,0,0,0.25)_4px_5px)]" />
      </div>
      {/* bezel */}
      <button
        type="button"
        onClick={onTap}
        aria-label="Dispositivo de asistencia"
        className={cn(
          "relative rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-500 p-[9px] shadow-2xl transition-shadow duration-500",
          ringColor,
          onTap && "cursor-pointer active:scale-[0.98]",
        )}
        style={{ width: size, height: size }}
      >
        <div className="h-full w-full rounded-full bg-zinc-900 p-[6px]">
          <div
            className={cn(
              "relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-full px-5 py-5 transition-colors duration-700",
              flashBg,
            )}
          >
            {/* glass sheen */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/70 via-transparent to-transparent" />

            {/* battery */}
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <div className="relative h-[9px] w-[18px] rounded-[3px] border border-zinc-500">
                <div className="absolute inset-[1px] rounded-[1px] bg-zinc-600" style={{ width: `${battery * 0.14}px` }} />
                <div className="absolute -right-[3px] top-[2px] h-[3px] w-[2px] rounded-r bg-zinc-500" />
              </div>
            </div>

            {/* icons row */}
            <div className="relative flex items-center justify-center gap-2">
              {/* heart */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-white/80 transition-transform duration-150",
                    beat && "scale-110",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                    <path
                      d="M2 12h4l2-5 3 10 3-8 2 3h6"
                      stroke={alertLevel === "red" ? "#e11d48" : alertLevel === "amber" ? "#d97706" : "#0ea5e9"}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">{heartRate}</span>
              </div>
              {/* pin */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border bg-white/80",
                    inSafeZone ? "border-sky-200" : "border-rose-300 animate-pulse",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                    <path
                      d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"
                      stroke={inSafeZone ? "#0ea5e9" : "#e11d48"}
                      strokeWidth="1.8"
                    />
                    <circle cx="12" cy="11" r="2" stroke={inSafeZone ? "#0ea5e9" : "#e11d48"} strokeWidth="1.8" />
                  </svg>
                </div>
                <span className="mt-0.5 max-w-[52px] truncate text-[9px] text-zinc-600">{place.name}</span>
              </div>
              {/* medical / SOS */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-white/80",
                    pendingCall && "animate-pulse border-emerald-300",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" stroke="#0ea5e9" strokeWidth="1.8" />
                    <path d="M12 8v6M9 11h6" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="mt-0.5 text-[10px] text-zinc-600">SOS</span>
              </div>
            </div>

            {/* status */}
            <div
              className={cn(
                "relative flex items-center gap-1.5 text-[11px] font-medium",
                alertLevel === "red" ? "text-rose-600" : alertLevel === "amber" ? "text-amber-700" : "text-zinc-600",
              )}
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  alertLevel === "red" ? "bg-rose-500 animate-ping" : alertLevel === "amber" ? "bg-amber-500" : "bg-emerald-500",
                )}
              />
              {statusText}
            </div>
          </div>
        </div>
      </button>
      {!compact && (
        <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-zinc-400">
          toca la pantalla para ayuda
        </div>
      )}
    </div>
  );
}
