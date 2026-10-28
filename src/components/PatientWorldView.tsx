import type { Action, GameState } from "../game/types";
import { VRScene } from "../vr/VRScene";
import { PatientHUD } from "./PatientHUD";
import { cn } from "../utils/cn";

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  voiceEnabled: boolean;
  compact?: boolean;
  className?: string;
}

/** First-person 3D / VR experience of the patient with the AR HUD on top. */
export function PatientWorldView({ state, dispatch, voiceEnabled, compact, className }: Props) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl bg-zinc-900 shadow-xl", className)}>
      <VRScene state={state} dispatch={dispatch} className="absolute inset-0" />
      <PatientHUD state={state} dispatch={dispatch} voiceEnabled={voiceEnabled} compact={compact} />
    </div>
  );
}
