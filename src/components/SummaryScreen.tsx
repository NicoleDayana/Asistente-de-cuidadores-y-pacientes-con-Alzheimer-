import type { GameState } from "../game/types";
import { SCENARIOS } from "../game/data";

interface Props {
  state: GameState;
  onNext: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function SummaryScreen({ state, onNext, onRestart, onHome }: Props) {
  const s = state.score;
  const scenario = SCENARIOS[state.scenarioIndex];
  const resolvedRatio = s.episodesTotal ? s.episodesResolved / s.episodesTotal : 1;
  const stars = Math.max(1, Math.round(resolvedRatio * 2 + (s.peakAnxiety < 70 ? 1 : 0)));
  const hasNext = state.scenarioIndex < SCENARIOS.length - 1;

  const tips: string[] = [];
  if (s.peakAnxiety >= 75) tips.push("La ansiedad llegó muy alto. Intenta responder antes a la primera alerta del dispositivo.");
  if (s.caregiverAssists < 3) tips.push("Los mensajes de voz del cuidador reducen la ansiedad rápidamente: úsalos pronto.");
  if (s.patientSelfCalm < 3) tips.push("Anima al paciente a tocar el dispositivo: «¿Dónde estoy?» y respirar le dan autonomía.");
  if (s.episodesResolved < s.episodesTotal) tips.push("Algún episodio quedó sin resolver. Combinar guía AR + presencia física es lo más eficaz.");
  if (tips.length === 0) tips.push("Excelente coordinación. La calma del cuidador es la calma del paciente.");

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-12 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-sky-700">{scenario.title} · completado</p>
        <h1 className="mt-2 text-4xl font-bold text-zinc-900">Un día más, juntos.</h1>
        <p className="mt-3 text-3xl">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Episodios superados", value: `${s.episodesResolved}/${s.episodesTotal}`, emoji: "✅" },
          { label: "Apoyos del cuidador", value: s.caregiverAssists, emoji: "👩" },
          { label: "Autocalma del paciente", value: s.patientSelfCalm, emoji: "👴" },
          { label: "Vínculo", value: s.bond, emoji: "💛" },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl bg-white/80 p-4 shadow-sm">
            <p className="text-2xl">{k.emoji}</p>
            <p className="text-2xl font-bold text-zinc-800">{k.value}</p>
            <p className="text-xs text-zinc-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="w-full rounded-3xl bg-white/80 p-5 text-left shadow-sm">
        <p className="mb-2 text-sm font-semibold text-zinc-700">Aprendizajes</p>
        <ul className="flex flex-col gap-2 text-sm text-zinc-600">
          {tips.map((t) => (
            <li key={t} className="flex gap-2">
              <span>💡</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-400">
          Pico de ansiedad: {Math.round(s.peakAnxiety)}% · Pulso final: {state.heartRate} lpm
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {hasNext && (
          <button onClick={onNext} className="rounded-full bg-sky-600 px-8 py-3 text-lg font-semibold text-white shadow hover:bg-sky-700">
            Siguiente escenario →
          </button>
        )}
        <button onClick={onRestart} className="rounded-full bg-white px-8 py-3 text-lg font-medium text-zinc-700 shadow hover:bg-zinc-50">
          Repetir
        </button>
        <button onClick={onHome} className="rounded-full px-6 py-3 text-base text-zinc-500 underline">
          Inicio
        </button>
      </div>
    </div>
  );
}
