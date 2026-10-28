/** Shared, mutable input state read every frame by the 3D player controller. */
export const input = {
  forward: 0, // -1..1 (W/S, joystick)
  strafe: 0, // -1..1 (A/D, joystick)
  yaw: 0, // radians, desktop/touch look
  pitch: 0,
  pointerLocked: false,
};

const keys = new Set<string>();

function syncKeys() {
  const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const s = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  input.forward = f;
  input.strafe = s;
}

let installed = false;
export function installKeyboard() {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;
  const down = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    keys.add(e.code);
    syncKeys();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    syncKeys();
  };
  const blur = () => {
    keys.clear();
    syncKeys();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    installed = false;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

export function applyLook(dx: number, dy: number, sensitivity = 0.0025) {
  input.yaw -= dx * sensitivity;
  input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch - dy * sensitivity));
}

/** Touch joystick (left) + look drag (right). Returns cleanup. */
export function installTouch(el: HTMLElement) {
  let joyId: number | null = null;
  let lookId: number | null = null;
  let joyOrigin = { x: 0, y: 0 };
  let lookLast = { x: 0, y: 0 };

  const start = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      const left = t.clientX < window.innerWidth / 2;
      if (left && joyId === null) {
        joyId = t.identifier;
        joyOrigin = { x: t.clientX, y: t.clientY };
      } else if (!left && lookId === null) {
        lookId = t.identifier;
        lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  };
  const move = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyId) {
        const dx = (t.clientX - joyOrigin.x) / 60;
        const dy = (t.clientY - joyOrigin.y) / 60;
        input.strafe = Math.max(-1, Math.min(1, dx));
        input.forward = Math.max(-1, Math.min(1, -dy));
      } else if (t.identifier === lookId) {
        applyLook(t.clientX - lookLast.x, t.clientY - lookLast.y, 0.005);
        lookLast = { x: t.clientX, y: t.clientY };
      }
    }
    if (joyId !== null || lookId !== null) e.preventDefault();
  };
  const end = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyId) {
        joyId = null;
        input.forward = 0;
        input.strafe = 0;
      } else if (t.identifier === lookId) lookId = null;
    }
  };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);
  return () => {
    el.removeEventListener("touchstart", start);
    el.removeEventListener("touchmove", move);
    el.removeEventListener("touchend", end);
    el.removeEventListener("touchcancel", end);
  };
}
