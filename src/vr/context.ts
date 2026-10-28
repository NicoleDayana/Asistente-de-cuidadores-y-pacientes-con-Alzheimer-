import { createContext, useContext } from "react";
import type { Action, GameState } from "../game/types";

export interface GameCtx {
  state: GameState;
  dispatch: React.Dispatch<Action>;
}

export const GameContext = createContext<GameCtx | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("GameContext missing");
  return ctx;
}
