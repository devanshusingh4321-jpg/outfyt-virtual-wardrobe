import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* THE ONE RULE: a single mutable scalar object. No React state.       */
/* ------------------------------------------------------------------ */

export const S = {
  p: 0, // real scroll 0..1
  sp: 0, // act axis = clamp01(p / 0.82)
  mx: 0, // cursor -1..1
  my: 0,
  t: 0, // clock, used only by grain (display-space, not scene geometry)
  reduced: false,
};

export const ACT_AXIS = 0.82;

/* ---------------------------- pure math ---------------------------- */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a || 1e-6));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** window that is exactly zero at both ends */
export const bell = (a: number, b: number, v: number) => {
  if (v <= a || v >= b) return 0;
  return Math.sin(Math.PI * ((v - a) / (b - a)));
};

/* ------------------------- colour primitives ----------------------- */
/* every ink step holds hue ~354deg and only drops chroma             */

export const RAW = {
  ink950: "#150406",
  ink900: "#1e070a",
  ink800: "#2c0e13",
  ink700: "#431a20",
  bone50: "#f2f3f5",
  bone400: "#9a8a8d",
  bone500: "#75666a",
  scarlet500: "#e0202b",
  scarlet300: "#ff5d64",
  cobalt500: "#2b4fd0",
} as const;

/** semantic roles bound to primitives */
export const ROLE = {
  field: RAW.ink950,
  fieldLift: RAW.ink900,
  cage: RAW.ink700,
  room: RAW.cobalt500,
  figureAccent: RAW.scarlet500,
  impulse: RAW.scarlet300,
  strand: RAW.bone50,
  quiet: RAW.bone500,
} as const;

export const HUE_SCARLET = 0.985;
export const HUE_COBALT = 0.625;

/** shortest-arc hue rotation, `pull` of the way to target */
export function pullHue(h: number, target: number, pull: number) {
  let d = target - h;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  let out = h + d * pull;
  if (out < 0) out += 1;
  if (out > 1) out -= 1;
  return out;
}

/* --------------------------- act gates ----------------------------- */
/* every boundary OVERLAPS its neighbour by 0.06-0.14 of the act axis  */

export type Gates = {
  figure: number;
  lattice: number;
  room: number;
  web: number;
  swing: number;
  dissolve: number;
};

export function gates(sp: number, p: number): Gates {
  return {
    // act 1 — the figure
    figure: smoothstep(0.0, 0.05, sp) * (1 - smoothstep(0.26, 0.40, sp)),
    // act 1b — the lattice weaves then un-weaves
    lattice: smoothstep(0.05, 0.14, sp) * (1 - smoothstep(0.24, 0.36, sp)),
    // act 2 — the grid room (opens INSIDE act 1's tail)
    room: smoothstep(0.22, 0.34, sp) * (1 - smoothstep(0.78, 0.94, sp)),
    // act 3 — the web (opens inside act 2)
    web: smoothstep(0.26, 0.36, sp) * (1 - smoothstep(0.56, 0.68, sp)),
    // act 4 — the swing rides the same table
    swing: smoothstep(0.27, 0.35, sp) * (1 - smoothstep(0.54, 0.66, sp)),
    // act 6 — closing wipe runs on REAL p
    dissolve: smoothstep(0.84, 1.0, p),
  };
}

/* ------------------------- the camera spine ------------------------ */

type Key = {
  at: number;
  pos: [number, number, number];
  look: [number, number, number];
  linear?: boolean;
};

/** legs from rest through the corridor are LINEAR: smoothstepped chains stall */
const KEYS: Key[] = [
  { at: 0.0, pos: [0, 10.5, 54], look: [0, 9, 0] },
  { at: 0.16, pos: [0, 9.6, 27], look: [0, 9, 0] },
  { at: 0.26, pos: [0, 8.4, 6], look: [0, 8, -34], linear: true },
  { at: 0.34, pos: [0, 7.4, -18], look: [0, 7, -58], linear: true },
  { at: 0.42, pos: [0, 7.0, -54], look: [0, 7, -96], linear: true },
  { at: 0.5, pos: [0, 6.8, -96], look: [0, 7, -140], linear: true },
  { at: 0.62, pos: [0, 7.2, -150], look: [0, 7, -196], linear: true },
  { at: 0.8, pos: [0, 8.0, -232], look: [0, 8, -286] },
  { at: 1.0, pos: [0, 8.6, -318], look: [0, 9, -380] },
];

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** camera base position at any act-axis value — anchors DERIVE from this */
export function spine(at: number, out = new THREE.Vector3()) {
  const v = clamp01(at);
  for (let i = 0; i < KEYS.length - 1; i++) {
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    if (v <= k1.at || i === KEYS.length - 2) {
      const raw = clamp01((v - k0.at) / (k1.at - k0.at));
      const t = k1.linear ? raw : raw * raw * (3 - 2 * raw);
      _a.set(...k0.pos);
      _b.set(...k1.pos);
      return out.copy(_a).lerp(_b, t);
    }
  }
  return out.set(...KEYS[0].pos);
}

export function spineLook(at: number, out = new THREE.Vector3()) {
  const v = clamp01(at);
  for (let i = 0; i < KEYS.length - 1; i++) {
    const k0 = KEYS[i];
    const k1 = KEYS[i + 1];
    if (v <= k1.at || i === KEYS.length - 2) {
      const raw = clamp01((v - k0.at) / (k1.at - k0.at));
      const t = k1.linear ? raw : raw * raw * (3 - 2 * raw);
      _a.set(...k0.look);
      _b.set(...k1.look);
      return out.copy(_a).lerp(_b, t);
    }
  }
  return out.set(...KEYS[0].look);
}

/* ---------------------------- the web table ------------------------ */
/* ONE table drives BOTH the strands and the camera swing             */

export type WebEntry = {
  at: number;
  span: number;
  side: number;
  lead: number;
  radius: number;
  lift: number;
};

const SPACING = [0.045, 0.045, 0.038, 0.035, 0.031];

export const WEB: WebEntry[] = (() => {
  const out: WebEntry[] = [];
  let at = 0.3;
  const radii = [6.4, 6.0, 6.6, 5.8, 6.2, 5.6];
  const lifts = [4.2, 3.4, 4.6, 3.0, 4.0, 3.2];
  for (let i = 0; i < 6; i++) {
    out.push({
      at,
      span: 0.082,
      side: i % 2 === 0 ? 1 : -1,
      radius: radii[i],
      lead: 3.8 * radii[i], // atan(radius/lead) ~ 14.7deg off axis
      lift: lifts[i],
    });
    if (i < SPACING.length) at += SPACING[i];
  }
  return out;
})();

/** local life of a strand, 0..1, outside its window returns -1 */
export function strandT(e: WebEntry, sp: number) {
  const t = (sp - e.at) / e.span;
  return t < 0 || t > 1 ? -1 : t;
}

/** anchor derived from the spine, never authored in world space */
export function anchorOf(e: WebEntry, out = new THREE.Vector3()) {
  spine(e.at, out);
  out.x += e.side * e.radius;
  out.y += e.lift;
  out.z -= e.lead;
  return out;
}

/** strand sag profile — TAUT means near-zero sag */
export function sagOf(t: number) {
  if (t < 0.12) return 0.1;
  if (t < 0.55) return 0.06;
  if (t < 0.8) return 0.06 + smoothstep(0.55, 0.8, t) * 1.9;
  return 1.9;
}

export function strandAlpha(t: number) {
  return smoothstep(0, 0.06, t) * (1 - smoothstep(0.8, 1.0, t));
}
