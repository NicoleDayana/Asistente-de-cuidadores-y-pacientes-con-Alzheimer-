import type { Memory, Place, Scenario, Vec } from "./types";

export const PATIENT_NAME = "Don Manuel";
export const CAREGIVER_NAME = "Ana";

export const HOME: Vec = { x: 50, y: 56 };

export const PLACES: Place[] = [
  { id: "home", name: "Tu casa", hint: "Calle Olmo 12 · Aquí vives con Ana", emoji: "🏠", pos: HOME },
  { id: "park", name: "Parque del Lago", hint: "Paseas aquí con Toby por las mañanas", emoji: "🌳", pos: { x: 20, y: 24 } },
  { id: "bakery", name: "Panadería de Luis", hint: "Compras pan los martes", emoji: "🥖", pos: { x: 80, y: 28 } },
  { id: "pharmacy", name: "Farmacia Sol", hint: "Recoges tus pastillas aquí", emoji: "💊", pos: { x: 83, y: 78 } },
  { id: "church", name: "Plaza Mayor", hint: "Bancos frente a la fuente", emoji: "⛲", pos: { x: 17, y: 80 } },
  { id: "school", name: "Antigua escuela", hint: "Trabajaste aquí 30 años", emoji: "🏫", pos: { x: 50, y: 12 } },
];

export const MEMORIES: Memory[] = [
  {
    id: "ana",
    title: "Ana, tu hija",
    who: "Ana",
    relation: "tu hija",
    caption: "Vive contigo y te cuida cada día. Le encanta tu tortilla de patatas.",
    emoji: "👩",
    image: `${import.meta.env.BASE_URL}images/memory-family.jpg`,
  },
  {
    id: "casa",
    title: "Tu casa en la calle Olmo",
    who: "Tu casa",
    relation: "donde vives",
    caption: "La puerta azul, el geranio en la ventana. Aquí llevas 40 años.",
    emoji: "🏠",
    image: `${import.meta.env.BASE_URL}images/memory-home.jpg`,
  },
  {
    id: "toby",
    title: "Toby, tu perro",
    who: "Toby",
    relation: "tu perro",
    caption: "Te espera en el jardín. Paseáis juntos por el Parque del Lago.",
    emoji: "🐕",
    image: `${import.meta.env.BASE_URL}images/memory-garden.jpg`,
  },
  {
    id: "lucia",
    title: "Lucía, tu nieta",
    who: "Lucía",
    relation: "tu nieta",
    caption: "Tiene 8 años y te pide que le cuentes historias de la escuela.",
    emoji: "👧",
  },
  {
    id: "maria",
    title: "María, tu esposa",
    who: "María",
    relation: "tu esposa",
    caption: "Bailabais en la Plaza Mayor cada verbena. Siempre está en tu corazón.",
    emoji: "💃",
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "morning",
    title: "Mañana en casa",
    subtitle: "Nivel 1 · Tranquilo",
    timeLabel: "10:30",
    dayLabel: "Martes por la mañana",
    duration: 120,
    episodeRate: 0.035,
    cooldown: 14,
    types: ["desorientacion", "olvido"],
    sky: "from-sky-200 via-sky-100 to-amber-50",
    description:
      "Don Manuel está en casa. A veces no reconoce la habitación o a Ana. El dispositivo le ayudará a orientarse.",
  },
  {
    id: "walk",
    title: "Paseo por el barrio",
    subtitle: "Nivel 2 · Deambulación",
    timeLabel: "17:15",
    dayLabel: "Jueves por la tarde",
    duration: 150,
    episodeRate: 0.04,
    cooldown: 12,
    types: ["wander", "desorientacion", "olvido"],
    sky: "from-amber-100 via-orange-50 to-sky-100",
    description:
      "Salida al parque. Puede intentar ir a lugares del pasado y salir de la zona segura. La guía AR le mostrará el camino a casa.",
  },
  {
    id: "sunset",
    title: "Atardecer (sundowning)",
    subtitle: "Nivel 3 · Agitación",
    timeLabel: "20:40",
    dayLabel: "Sábado al anochecer",
    duration: 180,
    episodeRate: 0.05,
    cooldown: 10,
    types: ["agitacion", "wander", "olvido", "desorientacion"],
    sky: "from-indigo-300 via-purple-200 to-orange-100",
    description:
      "Al caer la noche aumenta la inquietud. Cree que debe ir a trabajar. Ana y el dispositivo deben coordinarse para calmarle.",
  },
];

export const EPISODE_META: Record<
  string,
  { label: string; thoughts: string[]; icon: string; tip: string }
> = {
  desorientacion: {
    label: "Desorientación",
    icon: "🧭",
    thoughts: [
      "¿Dónde estoy? Esta habitación no es la mía…",
      "No reconozco esta calle. ¿Cómo he llegado aquí?",
      "Todo parece diferente. ¿Esto es mi casa?",
    ],
    tip: "Pulsa «¿Dónde estoy?» o envía un mensaje de voz tranquilizador.",
  },
  wander: {
    label: "Deambulación",
    icon: "🚶",
    thoughts: [
      "Tengo que ir a la escuela, los niños me esperan.",
      "Voy a buscar a María a la plaza, llego tarde.",
      "Tengo que volver a mi casa de antes, la de mi madre.",
    ],
    tip: "Activa la guía AR a casa o ve a por él. Vigila la zona segura.",
  },
  agitacion: {
    label: "Agitación vespertina",
    icon: "🌆",
    thoughts: [
      "Es muy tarde, tengo que irme ya. ¡Déjame salir!",
      "Hay alguien en la casa que no conozco…",
      "No puedo quedarme aquí, no es seguro.",
    ],
    tip: "Respiración guiada juntos y mensajes de voz suaves funcionan mejor.",
  },
  olvido: {
    label: "No reconoce al cuidador",
    icon: "👤",
    thoughts: [
      "¿Quién es esta señora? ¿Por qué está en mi casa?",
      "No sé quién eres. Quiero ver a mi hija.",
      "¿Dónde está Ana? Esta mujer dice que es ella…",
    ],
    tip: "Envía un recuerdo con foto. El juego de recuerdos refuerza el reconocimiento.",
  },
};

export const CAREGIVER_PRESETS = [
  { text: "Papá, soy Ana. Estoy aquí contigo, todo está bien.", emoji: "💛" },
  { text: "Estás en casa, en la calle Olmo. Estás seguro.", emoji: "🏠" },
  { text: "Respira despacio conmigo. Voy en un momento.", emoji: "🌬️" },
  { text: "Toby te está esperando en el jardín. Vamos a verle.", emoji: "🐕" },
  { text: "No tienes que ir a ningún sitio. Hoy es día de descanso.", emoji: "☕" },
  { text: "Te quiero mucho. Siéntate un ratito, ya llego.", emoji: "🤗" },
];

export const PATIENT_QUICK_REPLIES = [
  "Gracias, Ana",
  "Estoy mejor",
  "Ven, por favor",
  "Ya te veo",
];

export const BREATH_PATTERN = { inhale: 4, hold: 2, exhale: 6 };

/** 2D map percent coords -> 3D world metres (x, z). 1% = 1.2 m */
export const WORLD_SCALE = 1.2;
export function to3D(p: Vec): [number, number] {
  return [(p.x - HOME.x) * WORLD_SCALE, (p.y - HOME.y) * WORLD_SCALE];
}
export function from3D(x: number, z: number): Vec {
  return { x: HOME.x + x / WORLD_SCALE, y: HOME.y + z / WORLD_SCALE };
}

export function dist(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function nearestPlace(p: Vec): Place {
  return PLACES.reduce((best, pl) =>
    dist(pl.pos, p) < dist(best.pos, p) ? pl : best,
  );
}
