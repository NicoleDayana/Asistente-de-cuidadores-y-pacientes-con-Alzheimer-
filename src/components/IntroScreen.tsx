import { useState } from "react";
import type { Mode } from "../game/types";
import { SCENARIOS } from "../game/data";
import { Device } from "./Device";
import { initialState } from "../game/reducer";
import { cn } from "../utils/cn";

interface Props {
  onStart: (mode: Mode, scenarioIndex: number) => void;
}

const MODES: { id: Mode; emoji: string; title: string; tag: string; desc: string }[] = [
  {
    id: "patient",
    emoji: "🥽",
    title: "Vivirlo · Soy el paciente",
    tag: "3D en primera persona · compatible con gafas VR",
    desc: "Camina por el barrio de Don Manuel. Cuando llegue la confusión, el mundo se nubla y el brazalete proyecta su capa AR para guiarte. Ana (automática) te habla y viene a por ti.",
  },
  {
    id: "caregiver",
    emoji: "👩",
    title: "Acompañar · Soy el cuidador",
    tag: "Panel de monitoreo en tiempo real",
    desc: "Don Manuel (automático) tendrá episodios. Tú lees sus constantes, le envías tu voz, activas la guía AR o vas a su encuentro.",
  },
  {
    id: "both",
    emoji: "🤝",
    title: "Juntos · Dúo",
    tag: "Mundo 3D/VR + panel del cuidador",
    desc: "Una persona vive el mundo del paciente (en pantalla o con gafas VR) mientras la otra le apoya desde el panel. Ideal para entrenar en familia.",
  },
];

export function IntroScreen({ onStart }: Props) {
  const [mode, setMode] = useState<Mode>("both");
  const [scenario, setScenario] = useState(0);
  const demo = initialState();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <header className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Realidad mixta asistencial · 3D / WebXR · Simulación interactiva
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Contigo<span className="text-sky-600">.</span> Un brazalete que calma, orienta y conecta.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Un juego serio para personas con Alzheimer y quienes las cuidan. El dispositivo del brazo monitoriza el
            pulso y la ubicación, proyecta una capa de realidad aumentada con señales familiares y abre un canal
            directo con el cuidador. Cuando Don Manuel se desorienta, el juego consiste en devolverle la calma —
            juntos.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <p className="text-2xl">🫀</p>
              <p className="font-semibold text-zinc-800">Detecta</p>
              <p>Pulso y zona segura disparan alertas tempranas.</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <p className="text-2xl">🧭</p>
              <p className="font-semibold text-zinc-800">Orienta</p>
              <p>Etiquetas AR, ruta a casa y recuerdos con fotos.</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <p className="text-2xl">💬</p>
              <p className="font-semibold text-zinc-800">Conecta</p>
              <p>Voz del cuidador, respiración conjunta, presencia.</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center">
          <Device state={demo} size={240} compact />
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">1 · ¿Quién juega?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-3xl border-2 bg-white/80 p-5 text-left shadow-sm transition hover:shadow-md",
                mode === m.id ? "border-sky-500 ring-4 ring-sky-100" : "border-transparent",
              )}
            >
              <span className="text-4xl">{m.emoji}</span>
              <p className="mt-2 text-lg font-semibold text-zinc-800">{m.title}</p>
              <p className="text-xs font-medium text-sky-700">{m.tag}</p>
              <p className="mt-1 text-sm text-zinc-600">{m.desc}</p>
            </button>
          ))}
        </div>
        {mode !== "caregiver" && (
          <div className="mt-3 grid gap-2 rounded-3xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-zinc-700 sm:grid-cols-3">
            <div>
              <p className="font-semibold text-violet-800">🥽 Gafas VR (Quest, Pico, Vision Pro…)</p>
              <p>Abre esta página en el navegador de las gafas y pulsa <b>Entrar en VR</b>. Joystick izquierdo para caminar, derecho para girar. Apunta y pulsa el gatillo sobre el panel del brazalete.</p>
            </div>
            <div>
              <p className="font-semibold text-violet-800">🖥️ Ordenador</p>
              <p>Clic en la escena para mirar con el ratón, <b>WASD</b> para caminar. Teclas <b>1-5</b> para las acciones del brazalete.</p>
            </div>
            <div>
              <p className="font-semibold text-violet-800">📱 Móvil / tablet</p>
              <p>Joystick táctil a la izquierda para moverte, arrastra a la derecha para mirar. Botones grandes en pantalla.</p>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">2 · Escenario</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setScenario(i)}
              className={cn(
                "overflow-hidden rounded-3xl border-2 bg-white/80 text-left shadow-sm transition hover:shadow-md",
                scenario === i ? "border-sky-500 ring-4 ring-sky-100" : "border-transparent",
              )}
            >
              <div className={cn("h-16 bg-gradient-to-r", s.sky)} />
              <div className="p-4">
                <p className="text-xs font-medium text-sky-700">{s.subtitle}</p>
                <p className="text-lg font-semibold text-zinc-800">{s.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{s.description}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {s.dayLabel} · {s.timeLabel} · {Math.round(s.duration / 60)} min
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => onStart(mode, scenario)}
          className="rounded-full bg-sky-600 px-10 py-4 text-xl font-semibold text-white shadow-lg transition hover:bg-sky-700 active:scale-[0.98]"
        >
          Comenzar
        </button>
        <p className="text-xs text-zinc-400">
          Simulación educativa. No sustituye el consejo médico ni los dispositivos certificados.
        </p>
      </div>
    </div>
  );
}
