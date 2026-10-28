import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "./context";
import { CAREGIVER_NAME, HOME, to3D } from "../game/data";

const [HX, HZ] = to3D(HOME);
const DOOR = new THREE.Vector3(HX, 0, HZ + 5);

function Person({ color, skin = "#f5d0b0" }: { color: string; skin?: string }) {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 4, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5b3a1e" />
      </mesh>
    </group>
  );
}

/** Ana: waits at the door, walks to the patient when "Ir con él" is used, stays close while present. */
export function Caregiver() {
  const { state } = useGame();
  const group = useRef<THREE.Group>(null);
  const pos = useRef(DOOR.clone());
  const bob = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    const [px, pz] = to3D(state.patientPos);
    const patient = new THREE.Vector3(px, 0, pz);
    let target: THREE.Vector3;
    if (state.caregiverPresent) {
      // stand ~1.3 m to the patient's side
      const dir = patient.clone().sub(pos.current).setY(0);
      if (dir.length() > 1.6) target = patient.clone().sub(dir.normalize().multiplyScalar(1.3));
      else target = pos.current.clone();
    } else if (state.caregiverTravel) {
      target = patient.clone();
    } else {
      target = DOOR;
    }
    const d = target.clone().sub(pos.current);
    const distance = d.length();
    const speed = state.caregiverTravel ? 3.2 : 2;
    if (distance > 0.05) {
      const step = Math.min(distance, speed * delta);
      pos.current.add(d.normalize().multiplyScalar(step));
      bob.current += delta * 10;
      group.current.rotation.y = Math.atan2(d.x, d.z);
    } else if (state.caregiverPresent) {
      // face the patient
      const f = patient.clone().sub(pos.current);
      group.current.rotation.y = Math.atan2(f.x, f.z);
    }
    group.current.position.copy(pos.current);
    group.current.position.y = distance > 0.05 ? Math.abs(Math.sin(bob.current)) * 0.06 : 0;
  });

  return (
    <group ref={group} position={DOOR.toArray()}>
      <Person color="#f59e0b" />
      <Billboard position={[0, 2.4, 0]}>
        <Text fontSize={0.32} color="#78350f" anchorX="center" outlineWidth={0.02} outlineColor="#ffffff">
          {CAREGIVER_NAME}{state.caregiverPresent ? " · contigo" : state.caregiverTravel ? " · viene hacia ti" : ""}
        </Text>
      </Billboard>
      {state.caregiverPresent && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** Toby the dog, wagging in the garden. */
export function Dog() {
  const ref = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (tail.current) tail.current.rotation.y = Math.sin(t * 12) * 0.6;
    if (ref.current) ref.current.position.y = Math.abs(Math.sin(t * 3)) * 0.05;
  });
  return (
    <group ref={ref} position={[HX + 3.5, 0, HZ + 5.5]}>
      <mesh position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.22, 0.6, 4, 8]} />
        <meshStandardMaterial color="#c58b4a" />
      </mesh>
      <mesh position={[0, 0.7, 0.45]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshStandardMaterial color="#c58b4a" />
      </mesh>
      <mesh ref={tail} position={[0, 0.6, -0.45]}>
        <boxGeometry args={[0.06, 0.06, 0.4]} />
        <meshStandardMaterial color="#a86f36" />
      </mesh>
      <Billboard position={[0, 1.3, 0]}>
        <Text fontSize={0.26} color="#78350f" anchorX="center" outlineWidth={0.02} outlineColor="#ffffff">
          Toby
        </Text>
      </Billboard>
    </group>
  );
}
