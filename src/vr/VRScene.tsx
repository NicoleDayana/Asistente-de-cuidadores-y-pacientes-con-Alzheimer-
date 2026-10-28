import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { XR, createXRStore, useXR } from "@react-three/xr";
import * as THREE from "three";
import type { Action, GameState } from "../game/types";
import { GameContext, useGame } from "./context";
import { SCENARIOS } from "../game/data";
import { World } from "./World";
import { ARLayer } from "./ARLayer";
import { Caregiver, Dog } from "./Characters";
import { Player } from "./Player";
import { WristPanel } from "./WristPanel";
import { installKeyboard } from "./input";

export const xrStore = createXRStore({
  hand: { teleportPointer: false },
  controller: { teleportPointer: false },
  foveation: 0.5,
});

const PALETTE = {
  morning: { sun: [40, 60, -30], sunColor: "#fff7e0", ambient: 0.75, fog: "#dbeafe", turbidity: 4, bg: "#bfdbfe" },
  walk: { sun: [-60, 25, 30], sunColor: "#ffe4b5", ambient: 0.65, fog: "#fde7c8", turbidity: 8, bg: "#fde7c8" },
  sunset: { sun: [-80, 6, 40], sunColor: "#fb923c", ambient: 0.28, fog: "#4c3a73", turbidity: 12, bg: "#3b2d6b" },
} as const;

function Atmosphere({ state }: { state: GameState }) {
  const scenario = SCENARIOS[state.scenarioIndex];
  const pal = PALETTE[scenario.id as keyof typeof PALETTE];
  const { scene } = useThree();
  const mode = useXR((s) => s.mode);
  const ar = mode === "immersive-ar";
  const fogRef = useRef<THREE.Fog | null>(null);

  // dynamic fog: confusion closes the horizon
  useEffect(() => {
    if (ar) {
      scene.fog = null;
      scene.background = null;
      return;
    }
    const fog = new THREE.Fog(pal.fog, 30, 160);
    fogRef.current = fog;
    scene.fog = fog;
    scene.background = new THREE.Color(pal.bg);
    return () => {
      scene.fog = null;
    };
  }, [scene, pal, ar]);

  useFrame(() => {
    const fog = fogRef.current;
    if (!fog) return;
    const confusion = Math.max(0, (65 - state.orientation) / 65);
    const targetNear = THREE.MathUtils.lerp(30, 6, confusion);
    const targetFar = THREE.MathUtils.lerp(160, 40, confusion);
    fog.near += (targetNear - fog.near) * 0.03;
    fog.far += (targetFar - fog.far) * 0.03;
  });

  if (ar) return <ambientLight intensity={1} />;
  return (
    <>
      <ambientLight intensity={pal.ambient} />
      <hemisphereLight args={["#ffffff", "#86c26f", 0.35]} />
      <directionalLight
        position={pal.sun as unknown as [number, number, number]}
        color={pal.sunColor}
        intensity={scenario.id === "sunset" ? 1.2 : 2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <Sky sunPosition={pal.sun as unknown as [number, number, number]} turbidity={pal.turbidity} rayleigh={scenario.id === "sunset" ? 3 : 1} />
      {scenario.id === "sunset" && <Stars radius={200} depth={50} count={1500} factor={4} fade />}
    </>
  );
}

function SceneContent() {
  const mode = useXR((s) => s.mode);
  const session = useXR((s) => s.session);
  const ar = mode === "immersive-ar";
  const { state } = useGame();
  return (
    <>
      <Atmosphere state={state} />
      {!ar && <World scenarioIndex={state.scenarioIndex} />}
      {!ar && <Dog />}
      <Caregiver />
      <ARLayer worldVisible={!ar} />
      <Player />
      {session && <WristPanel />}
    </>
  );
}

interface Props {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  className?: string;
}

export function VRScene({ state, dispatch, className }: Props) {
  const ctx = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  useEffect(() => installKeyboard(), []);
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 1.6, 8] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
      >
        <XR store={xrStore}>
          <GameContext.Provider value={ctx}>
            <SceneContent />
          </GameContext.Provider>
        </XR>
      </Canvas>
    </div>
  );
}
