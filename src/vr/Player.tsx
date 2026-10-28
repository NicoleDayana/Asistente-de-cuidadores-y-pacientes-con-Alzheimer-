import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin, useXR, useXRControllerLocomotion } from "@react-three/xr";
import * as THREE from "three";
import { useGame } from "./context";
import { from3D, to3D } from "../game/data";
import { input } from "./input";
import { resolveCollision } from "./World";

/** Spawn in front of the house door (not inside it). */
const SPAWN_OFFSET_Z = 9;

const EYE = 1.6;
const SPEED = 3.2; // m/s walking
const BOUND = 70;

export function Player() {
  const { state, dispatch } = useGame();
  const origin = useRef<THREE.Group>(null);
  const session = useXR((s) => s.session);
  const { camera } = useThree();
  const lastReport = useRef(0);
  const lastPos = useRef(new THREE.Vector3());
  const sway = useRef(0);

  // Put the player at the patient's initial position when the scenario starts
  useEffect(() => {
    if (!origin.current) return;
    const [x, z0] = to3D(state.patientPos);
    const z = Math.abs(x) < 1 && Math.abs(z0) < 1 ? z0 + SPAWN_OFFSET_Z : z0;
    origin.current.position.set(x, 0, z);
    lastPos.current.set(x, 0, z);
    input.yaw = 0;
    input.pitch = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scenarioIndex, state.phase]);

  // VR locomotion: left stick moves (head-relative), right stick snap-turns
  useXRControllerLocomotion(origin, { speed: SPEED }, { type: "snap", degrees: 30 });

  useFrame((_, delta) => {
    const o = origin.current;
    if (!o) return;

    if (!session) {
      // --- desktop / touch ---
      const yaw = input.yaw;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const move = new THREE.Vector3()
        .addScaledVector(fwd, input.forward)
        .addScaledVector(right, input.strafe);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(SPEED * delta);
        o.position.add(move);
        sway.current += delta * 9;
      }
      // confusion makes the world sway gently (desktop only – never in VR)
      const confusion = Math.max(0, (55 - state.orientation) / 55);
      const bob = Math.sin(sway.current) * 0.025 * (input.forward || input.strafe ? 1 : 0);
      const roll = Math.sin(performance.now() * 0.0012) * 0.035 * confusion;
      camera.position.set(o.position.x, o.position.y + EYE + bob, o.position.z);
      camera.rotation.set(0, 0, 0);
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = input.pitch;
      camera.rotation.z = roll;
    }

    // world bounds + building collision
    o.position.x = THREE.MathUtils.clamp(o.position.x, -BOUND, BOUND);
    o.position.z = THREE.MathUtils.clamp(o.position.z, -BOUND, BOUND);
    if (!session) {
      const [cx, cz] = resolveCollision(o.position.x, o.position.z);
      o.position.x = cx;
      o.position.z = cz;
      camera.position.x = cx;
      camera.position.z = cz;
    } else {
      // in VR, collide using the head position and shift the origin accordingly
      const head = new THREE.Vector3();
      camera.getWorldPosition(head);
      const [cx, cz] = resolveCollision(head.x, head.z);
      o.position.x += cx - head.x;
      o.position.z += cz - head.z;
    }

    // Report position to game state (throttled)
    lastReport.current += delta;
    if (lastReport.current > 0.3) {
      lastReport.current = 0;
      // in VR the head can move inside the play area – use camera world position
      const p = new THREE.Vector3();
      if (session) camera.getWorldPosition(p);
      else p.copy(o.position);
      if (p.distanceTo(lastPos.current) > 0.25) {
        lastPos.current.copy(p);
        dispatch({ type: "PATIENT_MOVE", pos: from3D(p.x, p.z) });
      }
    }
  });

  return <XROrigin ref={origin} />;
}
