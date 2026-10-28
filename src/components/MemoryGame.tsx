import { useMemo, useState } from "react";
import { MEMORIES } from "../game/data";
import type { Memory } from "../game/types";
import { cn } from "../utils/cn";

interface Props {
  focusId?: string | null;
  onAnswer: (correct: boolean, memoryId: string) => void;
  onClose: () => void;
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function MemoryCard({ m, large }: { m: Memory; large?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-white shadow-md", large ? "w-full" : "w-40")}>
      {m.image ? (
        <img src={m.image} alt={m.title} className={cn("w-full object-cover", large ? "h-48" : "h-28")} />
      ) : (
        <div className={cn("flex w-full items-center justify-center bg-amber-50 text-6xl", large ? "h-48" : "h-28")}>
          {m.emoji}
        </div>
      )}
      <div className="p-3">
        <p className={cn("font-semibold text-zinc-800", large ? "text-xl" : "text-sm")}>{m.title}</p>
        {large && <p className="mt-1 text-base leading-relaxed text-zinc-600">{m.caption}</p>}
      </div>
    </div>
  );
}

export function MemoryGame({ focusId, onAnswer, onClose }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<null | { correct: boolean; m: Memory }>(null);

  const questions = useMemo(() => {
    const base = shuffle(MEMORIES);
    if (focusId) {
      const f = MEMORIES.find((m) => m.id === focusId);
      if (f) return [f, ...base.filter((m) => m.id !== focusId)].slice(0, 3);
    }
    return base.slice(0, 3);
  }, [focusId]);

  const current = questions[Math.min(round, questions.length - 1)];
  const options = useMemo(() => {
    const other = shuffle(MEMORIES.filter((m) => m.id !== current.id))[0];
    return shuffle([current, other]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id]);

  if (round >= questions.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-5xl">🌼</div>
        <p className="text-xl font-semibold text-zinc-800">Qué bonitos recuerdos, Don Manuel.</p>
        <p className="text-zinc-600">Tu familia te quiere y está cerca de ti.</p>
        <button onClick={onClose} className="rounded-full bg-sky-600 px-6 py-3 text-lg font-medium text-white shadow">
          Volver
        </button>
      </div>
    );
  }

  if (feedback) {
    return (
      <div className="flex flex-col items-center gap-4 py-2">
        <MemoryCard m={feedback.m} large />
        <p className={cn("text-center text-lg font-medium", feedback.correct ? "text-emerald-700" : "text-sky-700")}>
          {feedback.correct
            ? `¡Eso es! ${feedback.m.who}, ${feedback.m.relation}.`
            : `Tranquilo. Es ${feedback.m.who}, ${feedback.m.relation}. Siempre está contigo.`}
        </p>
        <button
          onClick={() => {
            setFeedback(null);
            setRound((r) => r + 1);
          }}
          className="rounded-full bg-sky-600 px-6 py-3 text-lg font-medium text-white shadow"
        >
          Siguiente recuerdo
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-center text-xl font-semibold text-zinc-800">¿Quién o qué es esto?</p>
      {current.image ? (
        <img src={current.image} alt="" className="h-44 w-full rounded-2xl object-cover shadow-md" />
      ) : (
        <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-amber-50 text-7xl shadow-md">{current.emoji}</div>
      )}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              const correct = o.id === current.id;
              onAnswer(correct, current.id);
              setFeedback({ correct, m: current });
            }}
            className="rounded-2xl border-2 border-sky-200 bg-white px-4 py-4 text-lg font-medium text-zinc-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 active:scale-[0.98]"
          >
            <span className="mr-2 text-2xl">{o.emoji}</span>
            {o.who}
          </button>
        ))}
      </div>
      <button onClick={onClose} className="text-sm text-zinc-500 underline">
        Salir
      </button>
    </div>
  );
}
