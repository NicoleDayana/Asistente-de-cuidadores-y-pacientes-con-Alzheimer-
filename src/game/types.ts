export type Mode = "patient" | "caregiver" | "both";
export type Phase = "intro" | "playing" | "summary";
export type EpisodeType = "desorientacion" | "wander" | "agitacion" | "olvido";
export type Activity =
  | "idle"
  | "breathing"
  | "memory"
  | "where"
  | "time"
  | "calling";

export interface Vec {
  x: number;
  y: number;
}

export interface Place {
  id: string;
  name: string;
  hint: string;
  emoji: string;
  pos: Vec;
}

export interface Memory {
  id: string;
  title: string;
  who: string;
  relation: string;
  caption: string;
  emoji: string;
  image?: string;
}

export interface Episode {
  type: EpisodeType;
  startedAt: number;
  intensity: number;
  target?: Vec;
  thought: string;
}

export interface Message {
  id: number;
  from: "caregiver" | "patient" | "device";
  text: string;
  at: number;
  kind?: "voice" | "text" | "memory" | "system";
  memoryId?: string;
}

export interface LogEntry {
  id: number;
  at: number;
  text: string;
  tone: "info" | "warn" | "good";
}

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  dayLabel: string;
  duration: number;
  episodeRate: number;
  cooldown: number;
  types: EpisodeType[];
  sky: string;
  description: string;
}

export interface Score {
  episodesResolved: number;
  episodesTotal: number;
  caregiverAssists: number;
  patientSelfCalm: number;
  bond: number;
  peakAnxiety: number;
}

export interface GameState {
  phase: Phase;
  mode: Mode;
  scenarioIndex: number;
  tick: number;
  anxiety: number;
  orientation: number;
  heartRate: number;
  patientPos: Vec;
  inSafeZone: boolean;
  safeRadius: number;
  episode: Episode | null;
  lastEpisodeEnd: number;
  activity: Activity;
  guidanceActive: boolean;
  caregiverTravel: { arriveAt: number } | null;
  caregiverPresent: boolean;
  pendingCall: boolean;
  callAnswered: boolean;
  messages: Message[];
  log: LogEntry[];
  score: Score;
  openMemoryId: string | null;
  deviceFlash: string | null;
  nextId: number;
  /** true when a human moves the patient in the 3D/VR world */
  playerControlled: boolean;
}

export type Action =
  | { type: "START"; mode: Mode; scenarioIndex: number }
  | { type: "TICK" }
  | { type: "PATIENT_SET_ACTIVITY"; activity: Activity }
  | { type: "PATIENT_WHERE" }
  | { type: "PATIENT_TIME" }
  | { type: "PATIENT_CALL" }
  | { type: "PATIENT_BREATH_CYCLE" }
  | { type: "PATIENT_MEMORY_ANSWER"; correct: boolean; memoryId: string }
  | { type: "PATIENT_ACK_MESSAGE" }
  | { type: "PATIENT_OPEN_MEMORY"; memoryId: string | null }
  | { type: "PATIENT_MOVE"; pos: Vec }
  | { type: "CARE_SEND_MESSAGE"; text: string }
  | { type: "CARE_TOGGLE_GUIDANCE" }
  | { type: "CARE_BREATHE_TOGETHER" }
  | { type: "CARE_SEND_MEMORY"; memoryId: string }
  | { type: "CARE_ANSWER_CALL" }
  | { type: "CARE_GO" }
  | { type: "CARE_SET_RADIUS"; radius: number }
  | { type: "TRIGGER_EPISODE"; episodeType?: EpisodeType }
  | { type: "CLEAR_FLASH" }
  | { type: "NEXT_SCENARIO" }
  | { type: "RESTART" };
