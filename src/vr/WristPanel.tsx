import { Suspense, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "./context";
import { BREATH_PATTERN, CAREGIVER_NAME, HOME, MEMORIES, SCENARIOS, dist, nearestPlace, to3D } from "../game/data";

/* ---------- 3D button ---------- */
function Button3D({
  position,
  label,
  sub,
  color = "#0ea5e9",
  width = 0.42,
  onClick,
  pulse,
}: {
  position: [number, number, number];
  label: string;
  sub?: string;
  color?: string;
  width?: number;
  onClick: () => void;
  pulse?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = pulse ? 1 + Math.sin(clock.getElapsedTime() * 4) * 0.04 : 1;
    ref.current.scale.setScalar(hover ? s * 1.06 : s);
  });
  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[width, 0.16]} />
        <meshBasicMaterial color={hover ? "#ffffff" : color} />
      </mesh>
      <Text position={[0, sub ? 0.025 : 0, 0.002]} fontSize={0.05} color={hover ? color : "#ffffff"} anchorX="center" anchorY="middle" maxWidth={width - 0.04}>
        {label}
      </Text>
      {sub && (
        <Text position={[0, -0.04, 0.002]} fontSize={0.03} color={hover ? "#374151" : "#e0f2fe"} anchorX="center" anchorY="middle">
          {sub}
        </Text>
      )}
    </group>
  );
}

/* ---------- memory photo ---------- */
function MemoryPhoto({ url }: { url: string }) {
  const tex = useTexture(url);
  return (
    <mesh position={[0, 0.12, 0.002]}>
      <planeGeometry args={[0.5, 0.34]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

/* ---------- breathing orb ---------- */
function BreathingOrb() {
  const { state, dispatch } = useGame();
  const ref = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const t0 = useRef<number | null>(null);
  const cycles = useRef(0);
  const total = BREATH_PATTERN.inhale + BREATH_PATTERN.hold + BREATH_PATTERN.exhale;
  const [label, setLabel] = useState("Inspira…");

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (t0.current === null) t0.current = clock.getElapsedTime();
    const t = clock.getElapsedTime() - t0.current;
    const cycle = Math.floor(t / total);
    const phase = t % total;
    let scale: number;
    let txt: string;
    if (phase < BREATH_PATTERN.inhale) {
      scale = 0.5 + (phase / BREATH_PATTERN.inhale) * 0.6;
      txt = `Inspira… ${Math.ceil(BREATH_PATTERN.inhale - phase)}`;
    } else if (phase < BREATH_PATTERN.inhale + BREATH_PATTERN.hold) {
      scale = 1.1;
      txt = `Mantén… ${Math.ceil(BREATH_PATTERN.inhale + BREATH_PATTERN.hold - phase)}`;
    } else {
      const p = (phase - BREATH_PATTERN.inhale - BREATH_PATTERN.hold) / BREATH_PATTERN.exhale;
      scale = 1.1 - p * 0.6;
      txt = `Suelta el aire… ${Math.ceil(total - phase)}`;
    }
    ref.current.scale.setScalar(scale);
    if (txt !== label) setLabel(txt);
    if (cycle > cycles.current) {
      cycles.current = cycle;
      dispatch({ type: "PATIENT_BREATH_CYCLE" });
      if (cycle >= 3) dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });
    }
    // place 1.6 m in front of the head
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const p = new THREE.Vector3();
    camera.getWorldPosition(p);
    const target = p.clone().addScaledVector(dir, 1.8);
    target.y = p.y - 0.1;
    ref.current.parent!.position.lerp(target, 0.08);
    ref.current.parent!.lookAt(p);
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#5eead4" emissive="#14b8a6" emissiveIntensity={0.6} transparent opacity={0.85} />
      </mesh>
      <Text position={[0, 0.45, 0]} fontSize={0.08} color="#ffffff" anchorX="center" outlineWidth={0.006} outlineColor="#0f766e">
        {state.caregiverPresent || state.messages.some((m) => m.text.includes("respirar")) ? `${CAREGIVER_NAME} respira contigo` : "Respira conmigo"}
      </Text>
      <Text position={[0, -0.42, 0]} fontSize={0.07} color="#ffffff" anchorX="center" outlineWidth={0.006} outlineColor="#0f766e">
        {label}
      </Text>
    </group>
  );
}

/* ---------- panel ---------- */
export function WristPanel() {
  const { state, dispatch } = useGame();
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const scenario = SCENARIOS[state.scenarioIndex];
  const place = nearestPlace(state.patientPos);
  const lastMsg = [...state.messages].reverse().find((m) => m.from === "caregiver");
  const idle = () => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "idle" });

  // auto-close informational panels in VR
  useEffect(() => {
    if (state.activity === "where" || state.activity === "time") {
      const t = setTimeout(idle, 9000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activity]);

  // Follow the head: 0.9 m ahead, slightly to the left and below eye level
  useFrame(() => {
    if (!group.current) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const left = new THREE.Vector3(dir.z, 0, -dir.x);
    const p = new THREE.Vector3();
    camera.getWorldPosition(p);
    const target = p.clone().addScaledVector(dir, 0.95).addScaledVector(left, 0.25);
    target.y = p.y - 0.42;
    group.current.position.lerp(target, 0.1);
    const look = p.clone();
    group.current.lookAt(look);
  });

  const statusColor = !state.inSafeZone || state.anxiety > 70 ? "#e11d48" : state.episode ? "#d97706" : "#10b981";
  const [hx, hz] = to3D(HOME);
  const [px, pz] = to3D(state.patientPos);
  const metres = Math.round(Math.hypot(hx - px, hz - pz));
  const memory = state.openMemoryId ? MEMORIES.find((m) => m.id === state.openMemoryId) : null;

  return (
    <>
      <group ref={group}>
        {/* backing */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[0.98, 0.62]} />
          <meshBasicMaterial color="#111827" transparent opacity={0.82} />
        </mesh>

        {/* device face */}
        <group position={[-0.36, 0.17, 0]}>
          <mesh>
            <circleGeometry args={[0.11, 40]} />
            <meshBasicMaterial color="#f4f5f7" />
          </mesh>
          <mesh position={[0, 0, -0.001]}>
            <ringGeometry args={[0.11, 0.125, 40]} />
            <meshBasicMaterial color={statusColor} />
          </mesh>
          <Text position={[0, 0.03, 0.002]} fontSize={0.045} color="#0f172a" anchorX="center">
            {state.heartRate} lpm
          </Text>
          <Text position={[0, -0.03, 0.002]} fontSize={0.022} color={statusColor} anchorX="center" maxWidth={0.2}>
            {!state.inSafeZone ? "Fuera de zona" : state.episode ? "Contigo · respira" : "Seguro · ubicación"}
          </Text>
        </group>

        {/* header */}
        <Text position={[-0.2, 0.26, 0]} fontSize={0.04} color="#ffffff" anchorX="left">
          {scenario.timeLabel} · {scenario.dayLabel}
        </Text>
        <Text position={[-0.2, 0.2, 0]} fontSize={0.03} color="#9ca3af" anchorX="left" maxWidth={0.64}>
          Estás en: {place.name}
        </Text>

        {/* caregiver message / thought */}
        {state.episode && state.activity === "idle" && !lastMsg && (
          <Text position={[-0.2, 0.12, 0]} fontSize={0.028} color="#fcd34d" anchorX="left" maxWidth={0.64}>
            Pensamiento: «{state.episode.thought}»
          </Text>
        )}
        {lastMsg && state.activity === "idle" && (
          <group>
            <Text position={[-0.2, 0.135, 0]} fontSize={0.026} color="#7dd3fc" anchorX="left">
              {CAREGIVER_NAME}, tu hija:
            </Text>
            <Text position={[-0.2, 0.08, 0]} fontSize={0.03} color="#ffffff" anchorX="left" maxWidth={0.64}>
              «{lastMsg.text}»
            </Text>
          </group>
        )}

        {/* actions */}
        {state.activity === "idle" && (
          <>
            <Button3D position={[-0.25, -0.07, 0]} label="¿Dónde estoy?" sub="te lo muestro" pulse={!!state.episode && state.orientation < 50} onClick={() => dispatch({ type: "PATIENT_WHERE" })} />
            <Button3D position={[0.23, -0.07, 0]} label="¿Qué día es?" sub="hora y fecha" color="#0284c7" onClick={() => dispatch({ type: "PATIENT_TIME" })} />
            <Button3D position={[-0.25, -0.25, 0]} label="Respirar" sub="un momento de calma" color="#0d9488" pulse={state.anxiety > 60} onClick={() => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "breathing" })} />
            <Button3D position={[0.23, -0.25, 0]} label={state.pendingCall ? "Llamando…" : `Llamar a ${CAREGIVER_NAME}`} sub="tu hija" color="#e11d48" onClick={() => dispatch({ type: "PATIENT_CALL" })} />
            {lastMsg && (
              <Button3D position={[0.3, 0.1, 0]} label="Gracias, Ana" width={0.3} color="#334155" onClick={() => dispatch({ type: "PATIENT_ACK_MESSAGE" })} />
            )}
            {lastMsg?.kind === "memory" && lastMsg.memoryId && (
              <Button3D position={[0.3, 0.24, 0]} label="Ver recuerdo" width={0.3} color="#b45309" onClick={() => dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: lastMsg.memoryId! })} />
            )}
          </>
        )}

        {state.activity === "where" && (
          <group>
            <Text position={[-0.46, 0.0, 0]} fontSize={0.045} color="#7dd3fc" anchorX="left">
              {place.name}
            </Text>
            <Text position={[-0.46, -0.06, 0]} fontSize={0.03} color="#e5e7eb" anchorX="left" maxWidth={0.9}>
              {place.hint}
            </Text>
            <Text position={[-0.46, -0.15, 0]} fontSize={0.03} color="#ffffff" anchorX="left" maxWidth={0.9}>
              {place.id === "home"
                ? "Estás en tu casa, calle Olmo 12. Ana está cerca."
                : `Tu casa está a ${metres} m. Sigue el haz de luz azul. ${CAREGIVER_NAME} sabe dónde estás.`}
            </Text>
            <Button3D position={[0.3, -0.25, 0]} label="Entendido" width={0.3} onClick={idle} />
          </group>
        )}

        {state.activity === "time" && (
          <group>
            <Text position={[-0.46, 0.02, 0]} fontSize={0.09} color="#ffffff" anchorX="left">
              {scenario.timeLabel}
            </Text>
            <Text position={[-0.46, -0.07, 0]} fontSize={0.04} color="#7dd3fc" anchorX="left">
              {scenario.dayLabel}
            </Text>
            <Text position={[-0.46, -0.15, 0]} fontSize={0.028} color="#e5e7eb" anchorX="left" maxWidth={0.9}>
              {scenario.id === "sunset" ? "Es de noche. No tienes que ir a trabajar: hoy toca descansar." : scenario.id === "walk" ? "Hora del paseo con Toby. Después, a casa a merendar." : "Es por la mañana. Ya has desayunado. No hay nada urgente."}
            </Text>
            <Button3D position={[0.3, -0.25, 0]} label="Gracias" width={0.3} onClick={idle} />
          </group>
        )}

        {state.activity === "calling" && (
          <group>
            <Text position={[-0.46, 0.0, 0]} fontSize={0.045} color="#fda4af" anchorX="left">
              Llamando a {CAREGIVER_NAME}…
            </Text>
            <Text position={[-0.46, -0.08, 0]} fontSize={0.03} color="#e5e7eb" anchorX="left" maxWidth={0.9}>
              Tu dispositivo ha avisado a tu hija. Respira despacio mientras contesta.
            </Text>
            <Button3D position={[0.3, -0.25, 0]} label="Colgar" width={0.3} color="#334155" onClick={idle} />
          </group>
        )}

        {state.activity === "memory" && (
          <group>
            {memory ? (
              <>
                <group position={[-0.2, -0.05, 0]}>
                  {memory.image ? (
                    <Suspense fallback={null}>
                      <MemoryPhoto url={memory.image} />
                    </Suspense>
                  ) : (
                    <mesh position={[0, 0.12, 0]}>
                      <planeGeometry args={[0.5, 0.34]} />
                      <meshBasicMaterial color="#fde68a" />
                    </mesh>
                  )}
                  <Text position={[0, -0.1, 0]} fontSize={0.04} color="#ffffff" anchorX="center">
                    {memory.title}
                  </Text>
                  <Text position={[0, -0.16, 0]} fontSize={0.026} color="#e5e7eb" anchorX="center" maxWidth={0.55}>
                    {memory.caption}
                  </Text>
                </group>
                <Button3D position={[0.3, -0.05, 0]} label="Lo recuerdo" width={0.3} color="#b45309" onClick={() => { dispatch({ type: "PATIENT_MEMORY_ANSWER", correct: true, memoryId: memory.id }); dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: null }); idle(); }} />
                <Button3D position={[0.3, -0.25, 0]} label="Cerrar" width={0.3} color="#334155" onClick={() => { dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: null }); idle(); }} />
              </>
            ) : (
              <>
                <Text position={[-0.46, 0.05, 0]} fontSize={0.035} color="#ffffff" anchorX="left">
                  Personas queridas
                </Text>
                {MEMORIES.slice(0, 4).map((m, i) => (
                  <Button3D key={m.id} position={[-0.25 + (i % 2) * 0.48, -0.07 - Math.floor(i / 2) * 0.18, 0]} label={m.who} sub={m.relation} color="#b45309" onClick={() => dispatch({ type: "PATIENT_OPEN_MEMORY", memoryId: m.id })} />
                ))}
                <Button3D position={[0.3, 0.1, 0]} label="Cerrar" width={0.3} color="#334155" onClick={idle} />
              </>
            )}
          </group>
        )}

        {state.activity === "breathing" && (
          <Button3D position={[0.3, -0.25, 0]} label="Ya estoy mejor" width={0.3} color="#0d9488" onClick={idle} />
        )}
        {state.activity === "idle" && !state.episode && (
          <Button3D position={[0.3, 0.24, 0]} label="Mis recuerdos" width={0.3} color="#b45309" onClick={() => dispatch({ type: "PATIENT_SET_ACTIVITY", activity: "memory" })} />
        )}
      </group>

      {state.activity === "breathing" && <BreathingOrb />}

      {/* distance hint when far from home */}
      {dist(state.patientPos, HOME) > state.safeRadius && (
        <group position={[hx, 14, hz]}>
          <Text fontSize={1.2} color="#ffffff" anchorX="center" outlineWidth={0.08} outlineColor="#0284c7">
            Tu casa · {metres} m
          </Text>
        </group>
      )}
    </>
  );
}
