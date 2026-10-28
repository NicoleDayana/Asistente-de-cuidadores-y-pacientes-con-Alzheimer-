import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "./context";
import { HOME, PLACES, WORLD_SCALE, dist, to3D } from "../game/data";

const LABEL_FONT = undefined; // default troika font (latin incl. accents)

/** Floating AR label over a landmark. Visible depending on orientation / proximity. */
function PlaceLabel({ id }: { id: string }) {
  const { state } = useGame();
  const place = PLACES.find((p) => p.id === id)!;
  const [x, z] = to3D(place.pos);
  const near = dist(place.pos, state.patientPos) < 16;
  const isHome = id === "home";
  const show = isHome || near || state.guidanceActive || state.orientation > 70;
  if (!show) return null;
  const height = isHome ? 8 : id === "school" ? 12 : 7;
  return (
    <Billboard position={[x, height, z]} follow>
      <mesh>
        <planeGeometry args={[isHome ? 7 : 6.4, near && !isHome ? 2.2 : 1.4]} />
        <meshBasicMaterial color={isHome ? "#0284c7" : "#ffffff"} transparent opacity={0.88} depthWrite={false} />
      </mesh>
      <Text
        position={[0, near && !isHome ? 0.45 : 0, 0.01]}
        fontSize={0.7}
        color={isHome ? "#ffffff" : "#1f2937"}
        anchorX="center"
        anchorY="middle"
        font={LABEL_FONT}
        maxWidth={6}
      >
        {place.emoji} {place.name}
      </Text>
      {near && !isHome && (
        <Text position={[0, -0.45, 0.01]} fontSize={0.38} color="#4b5563" anchorX="center" anchorY="middle" maxWidth={6}>
          {place.hint}
        </Text>
      )}
    </Billboard>
  );
}

/** Pulsing arrows on the ground from the player to home. */
function GuidancePath() {
  const { state } = useGame();
  const group = useRef<THREE.Group>(null);
  const [px, pz] = to3D(state.patientPos);
  const [hx, hz] = to3D(HOME);
  const dx = hx - px;
  const dz = hz - pz;
  const len = Math.hypot(dx, dz);
  const count = Math.max(1, Math.min(14, Math.floor(len / 3)));
  const angle = Math.atan2(dx, dz);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((c, i) => {
      const phase = (t * 1.5 - i * 0.35) % (Math.PI * 2);
      c.position.y = 0.25 + Math.max(0, Math.sin(phase)) * 0.25;
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.45 + Math.max(0, Math.sin(phase)) * 0.55;
    });
  });

  if (!state.guidanceActive || len < 3) return null;
  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => {
        const f = (i + 1) / (count + 1);
        return (
          <mesh key={i} position={[px + dx * f, 0.3, pz + dz * f]} rotation={[-Math.PI / 2, 0, -angle]}>
            <coneGeometry args={[0.6, 1.4, 3]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Green/red dashed circle around home – the geofence. */
function SafeZone() {
  const { state } = useGame();
  const r = state.safeRadius * WORLD_SCALE;
  const [hx, hz] = to3D(HOME);
  const color = state.inSafeZone ? "#10b981" : "#f43f5e";
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = state.inSafeZone ? 0.35 : 0.5 + Math.sin(clock.getElapsedTime() * 6) * 0.3;
  });
  return (
    <group position={[hx, 0.06, hz]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.5, r, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* posts */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.9, Math.sin(a) * r]}>
            <boxGeometry args={[0.12, 1.8, 0.12]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Vertical light beam marking home. Stronger when confused or guided. */
function HomeBeacon() {
  const { state } = useGame();
  const [hx, hz] = to3D(HOME);
  const ref = useRef<THREE.Mesh>(null);
  const intensity = state.guidanceActive ? 1 : state.orientation < 60 ? 0.6 : state.activity === "where" ? 0.8 : 0;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = intensity * (0.25 + Math.sin(clock.getElapsedTime() * 2) * 0.1);
    ref.current.scale.x = ref.current.scale.z = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
  });
  if (intensity === 0) return null;
  return (
    <mesh ref={ref} position={[hx, 30, hz]}>
      <cylinderGeometry args={[1.2, 2.2, 60, 16, 1, true]} />
      <meshBasicMaterial color="#7dd3fc" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** A warm, tempting glow at the place the patient feels pulled to during a wander episode. */
function WanderLure() {
  const { state } = useGame();
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.6;
    ref.current.position.y = 3 + Math.sin(clock.getElapsedTime() * 1.5) * 0.4;
  });
  if (!state.episode || state.episode.type !== "wander" || !state.episode.target) return null;
  const [x, z] = to3D(state.episode.target);
  return (
    <group ref={ref} position={[x, 3, z]}>
      <mesh>
        <torusGeometry args={[2.2, 0.15, 8, 40]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.2, 0.15, 8, 40]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} />
      </mesh>
      <pointLight color="#f59e0b" intensity={30} distance={25} />
    </group>
  );
}

/** Haze sphere around the camera: the "fog of confusion" seen by the patient. */
function ConfusionHaze() {
  const { state } = useGame();
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const target = Math.max(0, (60 - state.orientation) / 60); // 0..1
  const current = useRef(0);
  useFrame(() => {
    if (!ref.current) return;
    current.current += (target - current.current) * 0.03;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = current.current * 0.55;
    const p = new THREE.Vector3();
    camera.getWorldPosition(p);
    ref.current.position.copy(p);
  });
  return (
    <mesh ref={ref} renderOrder={50}>
      {/* 1.6 m radius: the wrist panel (0.95 m) stays readable, the world beyond gets hazy */}
      <sphereGeometry args={[1.6, 24, 16]} />
      <meshBasicMaterial color="#9ca3af" transparent opacity={0} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

export function ARLayer({ worldVisible }: { worldVisible: boolean }) {
  const ids = useMemo(() => PLACES.map((p) => p.id), []);
  return (
    <group>
      {ids.map((id) => (
        <PlaceLabel key={id} id={id} />
      ))}
      <GuidancePath />
      <SafeZone />
      <HomeBeacon />
      <WanderLure />
      {worldVisible && <ConfusionHaze />}
    </group>
  );
}
