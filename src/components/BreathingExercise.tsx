import { useEffect, useRef, useState } from "react";
import { BREATH_PATTERN } from "../game/data";
import { cn } from "../utils/cn";

interface Props {
  onCycle: () => void;
  onFinish: () => void;
  withCaregiver?: boolean;
  cycles?: number;
}

type PhaseName = "inhale" | "hold" | "exhale";
const ORDER: PhaseName[] = ["inhale", "hold", "exhale"];
const LABEL: Record<PhaseName, string> = {
  inhale: "Inspira…",
  hold: "Mantén…",
  exhale: "Suelta el aire…",
};

export function BreathingExercise({ onCycle, onFinish, withCaregiver, cycles = 3 }: Props) {
  const [phase, setPhase] = useState<PhaseName>("inhale");
  const [count, setCount] = useState(BREATH_PATTERN.inhale);
  const [done, setDone] = useState(0);
  const cycleRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c > 1) return c - 1;
        // advance phase
        setPhase((p) => {
          const idx = ORDER.indexOf(p);
          const next = ORDER[(idx + 1) % ORDER.length];
          if (next === "inhale") {
            cycleRef.current += 1;
            setDone(cycleRef.current);
            onCycle();
          }
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (count === 0) setCount(BREATH_PATTERN[phase]);
  }, [count, phase]);

  useEffect(() => {
    if (done >= cycles) {
      const t = setTimeout(onFinish, 800);
      return () => clearTimeout(t);
    }
  }, [done, cycles, onFinish]);

  const scale = phase === "inhale" ? 1.35 : phase === "hold" ? 1.35 : 0.8;
  const duration = BREATH_PATTERN[phase];

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <p className="text-center text-lg font-medium text-teal-800">
        {withCaregiver ? "Ana respira contigo" : "Respira conmigo"}
      </p>
      <div className="relative flex h-52 w-52 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-teal-100/60" />
        <div
          className="absolute h-28 w-28 rounded-full bg-gradient-to-br from-teal-300 to-sky-400 shadow-xl transition-transform ease-in-out"
          style={{ transform: `scale(${scale})`, transitionDuration: `${duration}s` }}
        />
        <div className="relative z-10 flex flex-col items-center text-white drop-shadow">
          <span className="text-2xl font-semibold">{LABEL[phase]}</span>
          <span className="text-4xl font-bold tabular-nums">{count}</span>
        </div>
        {withCaregiver && (
          <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300 bg-white text-2xl shadow">
            👩
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: cycles }).map((_, i) => (
          <span
            key={i}
            className={cn("h-3 w-3 rounded-full transition-colors", i < done ? "bg-teal-500" : "bg-teal-200")}
          />
        ))}
      </div>
      <button
        onClick={onFinish}
        className="rounded-full bg-white px-5 py-2 text-base text-zinc-600 shadow hover:bg-zinc-50"
      >
        Ya estoy mejor
      </button>
    </div>
  );
}
