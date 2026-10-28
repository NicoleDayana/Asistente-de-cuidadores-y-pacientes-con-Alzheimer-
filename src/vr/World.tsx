import { memo, useMemo } from "react";
import "@react-three/fiber";
import { PLACES, SCENARIOS, to3D } from "../game/data";

/* ------------------------------------------------------------------ */
/* Primitive building blocks                                           */
/* ------------------------------------------------------------------ */

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 2, 6]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[1.4, 10, 8]} />
        <meshStandardMaterial color="#4f9a4a" flatShading />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.5]} />
        <meshStandardMaterial color="#a0714f" />
      </mesh>
      <mesh position={[0, 0.8, -0.22]}>
        <boxGeometry args={[1.6, 0.5, 0.06]} />
        <meshStandardMaterial color="#a0714f" />
      </mesh>
      {[-0.65, 0.65].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.45]} />
          <meshStandardMaterial color="#3f3f46" />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 4, 6]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

interface BuildingProps {
  position: [number, number, number];
  size?: [number, number, number];
  color: string;
  roof?: string;
  door?: string;
  rotation?: number;
  children?: React.ReactNode;
}

function Building({ position, size = [8, 5, 7], color, roof = "#b45309", door = "#78350f", rotation = 0, children }: BuildingProps) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* roof */}
      <mesh position={[0, h + 1.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[Math.max(w, d) * 0.78, 2.8, 4]} />
        <meshStandardMaterial color={roof} flatShading />
      </mesh>
      {/* door */}
      <mesh position={[0, 1.1, d / 2 + 0.02]}>
        <boxGeometry args={[1.2, 2.2, 0.06]} />
        <meshStandardMaterial color={door} />
      </mesh>
      {/* windows */}
      {[-w / 3, w / 3].map((x) => (
        <mesh key={x} position={[x, h * 0.6, d / 2 + 0.02]}>
          <boxGeometry args={[1.2, 1.2, 0.05]} />
          <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Landmarks                                                           */
/* ------------------------------------------------------------------ */

function Home({ position }: { position: [number, number, number] }) {
  return (
    <Building position={position} size={[8, 4.5, 7]} color="#fdf3e3" roof="#c2410c" door="#2563eb">
      {/* geranium */}
      <mesh position={[2.6, 2.1, 3.6]}>
        <boxGeometry args={[1.4, 0.3, 0.4]} />
        <meshStandardMaterial color="#7c2d12" />
      </mesh>
      {[2.2, 2.6, 3.0].map((x) => (
        <mesh key={x} position={[x, 2.45, 3.6]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      ))}
      {/* garden fence */}
      <mesh position={[0, 0.4, 6]}>
        <boxGeometry args={[12, 0.8, 0.1]} />
        <meshStandardMaterial color="#e7e5e4" />
      </mesh>
      <Tree position={[-5, 0, 4]} scale={0.7} />
    </Building>
  );
}

function Bakery({ position }: { position: [number, number, number] }) {
  return (
    <Building position={position} size={[7, 4, 6]} color="#fcd9b6" roof="#9a3412" door="#7c2d12">
      {/* awning */}
      <mesh position={[0, 2.9, 3.6]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[6, 0.1, 1.6]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </Building>
  );
}

function Pharmacy({ position }: { position: [number, number, number] }) {
  return (
    <Building position={position} size={[7, 4, 6]} color="#f1f5f9" roof="#475569" door="#0f766e">
      <mesh position={[0, 4.6, 3.1]}>
        <boxGeometry args={[0.5, 1.6, 0.2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 4.6, 3.1]}>
        <boxGeometry args={[1.6, 0.5, 0.2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.9} />
      </mesh>
    </Building>
  );
}

function School({ position }: { position: [number, number, number] }) {
  return (
    <Building position={position} size={[16, 7, 8]} color="#fde68a" roof="#7f1d1d" door="#44403c">
      <mesh position={[0, 8.2, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
      <mesh position={[0, 8.4, 1.6]}>
        <circleGeometry args={[1, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 10.4, 0]}>
        <coneGeometry args={[2.4, 2, 4]} />
        <meshStandardMaterial color="#7f1d1d" flatShading />
      </mesh>
    </Building>
  );
}

function Park({ position }: { position: [number, number, number] }) {
  const trees = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const r = 12 + (i % 3) * 3;
        return [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );
  return (
    <group position={position}>
      {/* lake */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[9.2, 32]} />
        <meshStandardMaterial color="#d6c7a1" />
      </mesh>
      {trees.map((p, i) => (
        <Tree key={i} position={p} scale={0.8 + (i % 4) * 0.15} />
      ))}
      <Bench position={[0, 0, 10.5]} rotation={Math.PI} />
      <Bench position={[10.5, 0, 0]} rotation={-Math.PI / 2} />
    </group>
  );
}

function Plaza({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[11, 40]} />
        <meshStandardMaterial color="#d4d4d8" />
      </mesh>
      {/* fountain */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[3, 3.2, 0.8, 24]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.82, 0]}>
        <circleGeometry args={[2.7, 24]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.1} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 1.6, 12]} />
        <meshStandardMaterial color="#a8a29e" />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshStandardMaterial color="#bae6fd" emissive="#7dd3fc" emissiveIntensity={0.4} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <Bench key={a} position={[Math.sin(a) * 7, 0, Math.cos(a) * 7]} rotation={a + Math.PI} />
      ))}
      {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a) => (
        <Lamp key={a} position={[Math.sin(a) * 9, 0, Math.cos(a) * 9]} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

const POS = Object.fromEntries(PLACES.map((p) => [p.id, to3D(p.pos)])) as Record<string, [number, number]>;

function at(id: string, y = 0): [number, number, number] {
  const [x, z] = POS[id];
  return [x, y, z];
}

const HOUSE_SPOTS: [number, number][] = [
  [-18, 12], [-30, 14], [18, 14], [30, 16], [-16, -14], [16, -16],
  [-40, 40], [40, 40], [-44, -8], [44, -10], [-26, 30], [26, 32], [-12, 36], [12, 36],
];

/** Axis-aligned obstacles (x, z, half-width, half-depth) used for simple player collision. */
export const OBSTACLES: { x: number; z: number; hw: number; hd: number }[] = [
  { x: POS.home[0], z: POS.home[1], hw: 4.3, hd: 3.8 },
  { x: POS.bakery[0], z: POS.bakery[1], hw: 3.8, hd: 3.3 },
  { x: POS.pharmacy[0], z: POS.pharmacy[1], hw: 3.8, hd: 3.3 },
  { x: POS.school[0], z: POS.school[1], hw: 8.3, hd: 4.3 },
  { x: POS.church[0], z: POS.church[1], hw: 3.5, hd: 3.5 }, // fountain
  { x: POS.park[0], z: POS.park[1], hw: 8.3, hd: 8.3 }, // lake
  ...HOUSE_SPOTS.map(([x, z]) => ({ x, z, hw: 3.3, hd: 2.8 })),
];

/** Resolve a position against OBSTACLES (pushes the point out of any box). */
export function resolveCollision(x: number, z: number, radius = 0.4): [number, number] {
  for (const o of OBSTACLES) {
    const dx = x - o.x;
    const dz = z - o.z;
    const px = o.hw + radius - Math.abs(dx);
    const pz = o.hd + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) x = o.x + Math.sign(dx || 1) * (o.hw + radius);
      else z = o.z + Math.sign(dz || 1) * (o.hd + radius);
    }
  }
  return [x, z];
}

export const World = memo(function World({ scenarioIndex }: { scenarioIndex: number }) {
  const scenario = SCENARIOS[scenarioIndex];
  const night = scenario.id === "sunset";
  const ground = night ? "#3f6b48" : scenario.id === "walk" ? "#7fb069" : "#86c26f";

  // decorative filler houses
  const houses = useMemo(() => {
    const list: { p: [number, number, number]; c: string; r: number }[] = [];
    const palette = ["#f5e6cc", "#e9d8fd", "#fde2e2", "#dbeafe", "#fef3c7", "#e0f2fe"];
    HOUSE_SPOTS.forEach(([x, z], i) => list.push({ p: [x, 0, z], c: palette[i % palette.length], r: (i % 2) * Math.PI }));
    return list;
  }, []);

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color={ground} />
      </mesh>
      {/* roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 6]}>
        <planeGeometry args={[150, 7]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -20]}>
        <planeGeometry args={[7, 110]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      {/* road dashes */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-72 + i * 7.5, 0.04, 6]}>
          <planeGeometry args={[3, 0.3]} />
          <meshStandardMaterial color="#f5f5f4" />
        </mesh>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`v${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -72 + i * 7.5]}>
          <planeGeometry args={[0.3, 3]} />
          <meshStandardMaterial color="#f5f5f4" />
        </mesh>
      ))}
      {/* sidewalk in front of home */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 1.5]}>
        <planeGeometry args={[150, 2]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>

      {/* landmarks */}
      <Home position={at("home")} />
      <Bakery position={at("bakery")} />
      <Pharmacy position={at("pharmacy")} />
      <School position={at("school")} />
      <Park position={at("park")} />
      <Plaza position={at("church")} />

      {houses.map((h, i) => (
        <Building key={i} position={h.p} rotation={h.r} size={[6, 3.6 + (i % 3) * 0.6, 5]} color={h.c} roof={i % 2 ? "#9a3412" : "#78350f"} />
      ))}

      {/* street lamps along main road */}
      {[-40, -20, 20, 40].map((x) => (
        <Lamp key={x} position={[x, 0, 11]} />
      ))}
      {/* scattered trees */}
      {[[-55, -55], [55, -50], [60, 55], [-60, 58], [-8, -45], [8, -48], [50, 10], [-50, 8]].map(([x, z], i) => (
        <Tree key={i} position={[x, 0, z]} scale={1 + (i % 3) * 0.2} />
      ))}
    </group>
  );
});
