// Time-driven simulation. Every machine's state is a pure function of the
// simulation time `t` (seconds since the page loaded), so the 3D scene (every
// frame) and the panels (once a second) always agree without sharing state.

import { buildLoop, distanceAt, sampleLoop, type LoopPath } from "./path";
import {
  AREA_SLOT_Z0,
  BAY,
  CONTAINER,
  EMPTY_AREA,
  QUAY,
  REEFER_AREA,
  ROW,
  RTGS,
  STS,
  TIER,
  TRAILER_Y,
  VESSEL,
  blockById,
  blockLen,
  blockWidth,
  laneZ,
  pickLine,
  type AreaDef,
  type BlockDef,
  type RtgDef,
  type ShuttleDef,
  type StsDef,
  type TtDef,
  type XtDef,
} from "./terminal";

const T0 = typeof performance !== "undefined" ? performance.now() : 0;
export const START = new Date();
export const simNow = () => (performance.now() - T0) / 1000;
export const wallClock = (t: number) => new Date(START.getTime() + t * 1000);

const frac = (x: number) => x - Math.floor(x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function hash(n: number, s: number) {
  return frac(Math.sin(n * 127.1 + s * 311.7) * 43758.5453);
}

export function containerId(seed1: number, seed2: number) {
  const line = pickLine(hash(seed1, seed2));
  const num = Math.floor(hash(seed1 + 7, seed2 + 3) * 900000 + 100000);
  const check = Math.floor(hash(seed1 + 2, seed2 + 9) * 10);
  return { id: `${line.prefix} ${num}-${check}`, line };
}

export type Tone = "green" | "amber" | "blue" | "grey" | "red";

// ------------------------------------------------------------------ vessel

export function vesselMoves(t: number) {
  let n = VESSEL.doneAtStart;
  for (const c of STS) n += Math.floor((t + c.offset) / c.cycle) - Math.floor(c.offset / c.cycle);
  const total = VESSEL.discharge + VESSEL.load;
  const done = Math.min(n, total);
  return {
    done,
    total,
    discharged: Math.min(done, VESSEL.discharge),
    loaded: Math.max(0, done - VESSEL.discharge),
    mode: (done < VESSEL.discharge ? "Discharge" : "Load") as "Discharge" | "Load",
  };
}

// ------------------------------------------------------------------ quay cranes

export const STS_TOP_Y = 40;
const LANE_SPREADER_Y = TRAILER_Y + CONTAINER.H + 0.45;

export interface StsState {
  trolleyZ: number;
  spreaderY: number;
  laden: boolean;
  phase: string;
  moves: number;
  mode: "Discharge" | "Load";
  box: { id: string; color: string; weight: number };
  cycleFrac: number;
}

function stsShipZ(c: StsDef, n: number) {
  return -9 - hash(n, c.x) * 28;
}

export function stsState(c: StsDef, t: number): StsState {
  const local = t + c.offset;
  const n = Math.floor(local / c.cycle);
  const f = local / c.cycle - n;
  const mode = vesselMoves(t).mode;
  const shipZ = stsShipZ(c, n);
  const nextZ = stsShipZ(c, n + 1);
  const tier = 2 + Math.floor(hash(n + 3, c.x) * 4);
  const pickY = VESSEL.deckY + 0.6 + tier * TIER + 0.45;
  const L = QUAY.ttLaneZ;
  const disc = mode === "Discharge";
  let z: number;
  let y: number;
  let phase: string;
  if (f < 0.12) {
    z = shipZ;
    y = lerp(STS_TOP_Y, pickY, smooth(f / 0.12));
    phase = disc ? "Spreader down · vessel" : "Landing box · vessel";
  } else if (f < 0.24) {
    z = shipZ;
    y = lerp(pickY, STS_TOP_Y, smooth((f - 0.12) / 0.12));
    phase = disc ? "Hoisting box" : "Hoisting empty";
  } else if (f < 0.46) {
    z = lerp(shipZ, L, smooth((f - 0.24) / 0.22));
    y = STS_TOP_Y;
    phase = disc ? "Trolley → apron" : "Trolley → apron (empty)";
  } else if (f < 0.58) {
    z = L;
    y = lerp(STS_TOP_Y, LANE_SPREADER_Y, smooth((f - 0.46) / 0.12));
    phase = disc ? "Landing on TT" : "Picking from TT";
  } else if (f < 0.7) {
    z = L;
    y = lerp(LANE_SPREADER_Y, STS_TOP_Y, smooth((f - 0.58) / 0.12));
    phase = disc ? "Hoisting empty" : "Hoisting box";
  } else if (f < 0.92) {
    z = lerp(L, nextZ, smooth((f - 0.7) / 0.22));
    y = STS_TOP_Y;
    phase = disc ? "Trolley → vessel" : "Trolley → vessel (laden)";
  } else {
    z = nextZ;
    y = lerp(STS_TOP_Y, STS_TOP_Y - 2, smooth((f - 0.92) / 0.08));
    phase = "Positioning over bay";
  }
  const laden = disc ? f >= 0.12 && f < 0.58 : f >= 0.58 || f < 0.12;
  const boxN = disc || f >= 0.58 ? n : n - 1;
  const box = containerId(boxN, c.x);
  return {
    trolleyZ: z,
    spreaderY: y,
    laden,
    phase,
    moves: c.baseMoves + n - Math.floor(c.offset / c.cycle),
    mode,
    box: { id: box.id, color: box.line.color, weight: 8 + hash(boxN, c.x + 5) * 22 },
    cycleFrac: f,
  };
}

// ------------------------------------------------------------------ yard cranes

export const RTG_TOP_Y = 19.5;
export const RTG_LANE_LOCAL_Z = -12;

export interface RtgState {
  x: number;
  trolleyZ: number; // relative to block centre
  spreaderY: number;
  laden: boolean;
  phase: string;
  tone: Tone;
  moves: number;
  bay: number;
  row: number;
}

export function rtgState(r: RtgDef, t: number): RtgState {
  const b = blockById(r.block);
  const half = blockLen(b) / 2;
  if (r.status !== "working") {
    const x = r.status === "idle" ? b.x - half - 3 : b.x + half + 3;
    return {
      x,
      trolleyZ: RTG_LANE_LOCAL_Z + 4,
      spreaderY: RTG_TOP_Y,
      laden: false,
      phase: r.status === "idle" ? "Parked · no work queue" : "Hydraulic hoist fault · WO-55812",
      tone: r.status === "idle" ? "grey" : "red",
      moves: r.baseMoves,
      bay: r.status === "idle" ? 0 : b.bays + 1,
      row: 0,
    };
  }
  const P = 34;
  const local = t + r.offset;
  const n = Math.floor(local / P);
  const f = local / P - n;
  const bayOf = (k: number) => Math.floor(hash(k, r.seed) * b.bays);
  const bayX = (k: number) => b.x - half + BAY * (bayOf(k) + 0.5);
  const rowN = Math.floor(hash(n + 11, r.seed) * b.rows);
  const rowZ = -blockWidth(b) / 2 + ROW * (rowN + 0.5);
  const tier = 1 + Math.floor(hash(n + 5, r.seed) * (b.maxTier - 1));
  const pickY = tier * TIER + 0.45;
  const laneY = TRAILER_Y + CONTAINER.H + 0.45;
  // even cycles: TT → stack, odd cycles: stack → TT
  const toStack = n % 2 === 0;
  let x = bayX(n);
  let tz = RTG_LANE_LOCAL_Z;
  let y = RTG_TOP_Y;
  let laden = false;
  let phase: string;
  let tone: Tone = "green";
  if (f < 0.3) {
    x = lerp(bayX(n - 1), bayX(n), smooth(f / 0.3));
    tz = RTG_LANE_LOCAL_Z;
    phase = `Gantry → bay ${String(bayOf(n) * 2 + 2).padStart(2, "0")}`;
    tone = "blue";
  } else {
    const s = (f - 0.3) / 0.7;
    const fromY = toStack ? laneY : pickY;
    const fromZ = toStack ? RTG_LANE_LOCAL_Z : rowZ;
    const toY = toStack ? pickY : laneY;
    const toZ = toStack ? rowZ : RTG_LANE_LOCAL_Z;
    if (s < 0.15) {
      tz = fromZ;
      y = lerp(RTG_TOP_Y, fromY, smooth(s / 0.15));
      phase = toStack ? "Spreader down · TT" : "Spreader down · stack";
    } else if (s < 0.3) {
      tz = fromZ;
      y = lerp(fromY, RTG_TOP_Y, smooth((s - 0.15) / 0.15));
      laden = s > 0.17;
      phase = "Hoisting box";
    } else if (s < 0.55) {
      tz = lerp(fromZ, toZ, smooth((s - 0.3) / 0.25));
      laden = true;
      phase = toStack ? `Trolley → row ${rowN + 1}` : "Trolley → truck lane";
    } else if (s < 0.72) {
      tz = toZ;
      y = lerp(RTG_TOP_Y, toY, smooth((s - 0.55) / 0.17));
      laden = true;
      phase = toStack ? `Stacking · tier ${tier + 1}` : "Landing on TT";
    } else if (s < 0.86) {
      tz = toZ;
      y = lerp(toY, RTG_TOP_Y, smooth((s - 0.72) / 0.14));
      phase = "Hoisting empty";
    } else {
      tz = lerp(toZ, RTG_LANE_LOCAL_Z, smooth((s - 0.86) / 0.14));
      phase = "Trolley → truck lane";
    }
  }
  return {
    x,
    trolleyZ: tz,
    spreaderY: y,
    laden,
    phase,
    tone,
    moves: r.baseMoves + n - Math.floor(r.offset / P),
    bay: bayOf(n) * 2 + 2,
    row: rowN + 1,
  };
}

export function rtgForBlock(blockId: string) {
  return RTGS.find((r) => r.block === blockId && r.status === "working");
}

// ------------------------------------------------------------------ terminal tractors

const TT_SPEED = 7.2; // m/s ≈ 26 km/h
const TT_STOP_STS = 16;
const TT_STOP_RTG = 14;

interface Route {
  path: LoopPath;
  dA: number;
  dB: number;
  T: number;
  stopA: number;
  stopB: number;
  speed: number;
}

const routeCache = new Map<string, Route>();

function makeRoute(corners: [number, number][], a: [number, number], b: [number, number], stopA: number, stopB: number, speed: number): Route {
  const path = buildLoop(corners, 7);
  const dA = distanceAt(path, a[0], a[1]);
  const dB = distanceAt(path, b[0], b[1]);
  const dAB = (((dB - dA) % path.length) + path.length) % path.length;
  return { path, dA, dB, stopA, stopB, speed, T: stopA + dAB / speed + stopB + (path.length - dAB) / speed };
}

function ttRoute(tt: TtDef): Route {
  const hit = routeCache.get(tt.id);
  if (hit) return hit;
  const c = STS[tt.sts];
  const b = blockById(tt.block);
  const lz = laneZ(b);
  const xIn = b.x < 0 ? -160 : 0;
  const xOut = b.x < 0 ? 0 : 160;
  const corners: [number, number][] = [
    [c.x + 30, QUAY.ttLaneZ],
    [c.x - 30, QUAY.ttLaneZ],
    [c.x - 30, QUAY.backRoadOutZ],
    [xIn - 3, QUAY.backRoadOutZ],
    [xIn - 3, lz],
    [xOut + 3, lz],
    [xOut + 3, QUAY.backRoadInZ],
    [c.x + 30, QUAY.backRoadInZ],
  ];
  const r = makeRoute(corners, [c.x, QUAY.ttLaneZ], [b.x + tt.stopDx, lz], TT_STOP_STS, TT_STOP_RTG, TT_SPEED);
  routeCache.set(tt.id, r);
  return r;
}

// trapezoidal speed profile: accelerate over `a` of the leg, cruise, decelerate
function trap(x: number, a = 0.12) {
  const v = 1 / (1 - a);
  if (x < a) return (v * x * x) / (2 * a);
  if (x > 1 - a) return 1 - (v * (1 - x) * (1 - x)) / (2 * a);
  return v * (a / 2) + v * (x - a);
}

interface RouteSample {
  x: number;
  z: number;
  heading: number;
  leg: "A" | "AB" | "B" | "BA";
  legFrac: number;
  trip: number;
  progress: number; // 0..1 around the loop
}

function sampleRoute(r: Route, t: number, offset: number): RouteSample {
  const { path, dA, stopA, stopB, speed } = r;
  const L = path.length;
  const dAB = (((r.dB - dA) % L) + L) % L;
  const tAB = dAB / speed;
  const tBA = (L - dAB) / speed;
  const local = t + offset * r.T;
  const trip = Math.floor(local / r.T);
  const u = local - trip * r.T;
  let d: number;
  let leg: RouteSample["leg"];
  let legFrac: number;
  if (u < stopA) {
    d = dA;
    leg = "A";
    legFrac = u / stopA;
  } else if (u < stopA + tAB) {
    legFrac = (u - stopA) / tAB;
    d = dA + dAB * trap(legFrac);
    leg = "AB";
  } else if (u < stopA + tAB + stopB) {
    d = dA + dAB;
    leg = "B";
    legFrac = (u - stopA - tAB) / stopB;
  } else {
    legFrac = (u - stopA - tAB - stopB) / tBA;
    d = dA + dAB + (L - dAB) * trap(legFrac);
    leg = "BA";
  }
  const s = sampleLoop(path, d);
  return { ...s, leg, legFrac, trip, progress: u / r.T };
}

export interface VehicleState {
  x: number;
  z: number;
  heading: number;
  laden: boolean;
  status: string;
  tone: Tone;
  speedKmh: number;
  progress: number;
  leg: RouteSample["leg"];
  legFrac: number;
  box: { id: string; color: string; weight: number };
  from: string;
  to: string;
}

export function ttState(tt: TtDef, t: number): VehicleState {
  const r = ttRoute(tt);
  const s = sampleRoute(r, t, tt.offset);
  const s2 = sampleRoute(r, t + 0.5, tt.offset);
  const speed = (Math.hypot(s2.x - s.x, s2.z - s.z) / 0.5) * 3.6;
  const sts = STS[tt.sts];
  const b = blockById(tt.block);
  const rtg = rtgForBlock(b.id);
  const disc = vesselMoves(t).mode === "Discharge";
  // discharge: box rides quay → yard; load: yard → quay
  let laden: boolean;
  if (disc) laden = s.leg === "AB" || (s.leg === "B" && s.legFrac < 0.5) || (s.leg === "A" && s.legFrac > 0.5);
  else laden = s.leg === "BA" || (s.leg === "A" && s.legFrac < 0.5) || (s.leg === "B" && s.legFrac > 0.5);
  const box = containerId(s.trip, 500 + tt.sts * 13 + tt.block.charCodeAt(0));
  let status: string;
  let tone: Tone;
  switch (s.leg) {
    case "A":
      status = `Under ${sts.id} · ${disc ? "receiving box" : "delivering box"}`;
      tone = "green";
      break;
    case "AB":
      status = `${laden ? "Laden" : "Empty"} → ${b.name}`;
      tone = "blue";
      break;
    case "B":
      status = `At ${rtg?.id ?? "RTG"} · ${b.name}`;
      tone = "green";
      break;
    default:
      status = `${laden ? "Laden" : "Empty"} → ${sts.id}`;
      tone = "blue";
  }
  if ((s.leg === "AB" || s.leg === "BA") && speed < 3 && s.legFrac > 0.1 && s.legFrac < 0.9) {
    tone = "amber";
    status += " · slowed";
  }
  return {
    ...s,
    laden,
    status,
    tone,
    speedKmh: speed,
    box: { id: box.id, color: box.line.color, weight: 8 + hash(s.trip, tt.sts + 40) * 22 },
    from: disc ? sts.id : b.name,
    to: disc ? b.name : sts.id,
  };
}

// ------------------------------------------------------------------ external trucks

const XT_SPEED = 5.5;

function xtRoute(xt: XtDef): Route {
  const hit = routeCache.get(xt.id);
  if (hit) return hit;
  const b = blockById(xt.block);
  const lz = laneZ(b);
  const corners: [number, number][] =
    b.x < 0
      ? [
          [-6, 300],
          [-6, 205],
          [-163, 205],
          [-163, lz],
          [3, lz],
          [3, 300],
        ]
      : [
          [-6, 300],
          [-6, lz],
          [163, lz],
          [163, 205],
          [6, 205],
          [6, 300],
        ];
  const r = makeRoute(corners, [-6, 232], [b.x + 0, lz], 12, 18, XT_SPEED);
  routeCache.set(xt.id, r);
  return r;
}

export function xtState(xt: XtDef, t: number): VehicleState {
  const r = xtRoute(xt);
  const s = sampleRoute(r, t, xt.offset);
  const s2 = sampleRoute(r, t + 0.5, xt.offset);
  const speed = (Math.hypot(s2.x - s.x, s2.z - s.z) / 0.5) * 3.6;
  const b = blockById(xt.block);
  const rtg = rtgForBlock(b.id);
  const laden = s.leg === "A" || s.leg === "AB" || (s.leg === "B" && s.legFrac < 0.5);
  const box = containerId(s.trip, 900 + xt.plate.charCodeAt(3));
  let status: string;
  let tone: Tone = "blue";
  if (s.leg === "A") {
    status = "In-gate · OCR & document check";
    tone = "amber";
  } else if (s.leg === "AB") status = `Export delivery → ${b.name}`;
  else if (s.leg === "B") {
    status = `At ${rtg?.id ?? "RTG"} · ${b.name}`;
    tone = "green";
  } else status = "Empty → out-gate";
  return {
    ...s,
    laden,
    status,
    tone,
    speedKmh: speed,
    box: { id: box.id, color: box.line.color, weight: 12 + hash(s.trip, 77) * 14 },
    from: "Gate",
    to: b.name,
  };
}

// ------------------------------------------------------------------ reach stackers / empty handlers

export const SHUTTLE_REACH = { rs: 8.6, eh: 5.9 };

export interface ShuttleState {
  x: number;
  z: number;
  heading: number;
  boxY: number; // bottom of the carried / handled box
  laden: boolean;
  phase: string;
  tone: Tone;
  moves: number;
  box: { id: string; color: string };
}

function areaOf(s: ShuttleDef): AreaDef {
  return s.area === REEFER_AREA.id ? REEFER_AREA : EMPTY_AREA;
}

export function shuttleState(s: ShuttleDef, t: number): ShuttleState {
  const a = areaOf(s);
  const reach = SHUTTLE_REACH[s.kind];
  const boxX = a.faceX + a.dir * (CONTAINER.W / 2);
  const pickX = boxX - a.dir * reach;
  const dropX = pickX - a.dir * 22;
  const z = AREA_SLOT_Z0 + s.slot * BAY;
  const heading = a.dir === 1 ? 0 : Math.PI;
  const box = containerId(Math.floor((t + s.offset) / s.cycle), s.slot + (s.kind === "rs" ? 300 : 600));
  const boxColor = s.kind === "rs" ? "#eef1f4" : box.line.color;
  if (s.status !== "working") {
    return { x: dropX - a.dir * 6, z, heading, boxY: 1.2, laden: false, phase: "Parked · awaiting job", tone: "grey", moves: s.baseMoves, box: { id: "—", color: boxColor } };
  }
  const local = t + s.offset;
  const n = Math.floor(local / s.cycle);
  const f = local / s.cycle - n;
  const tier = Math.floor(hash(n, s.slot + 1) * 3);
  const pickY = tier * TIER;
  const carryY = 0.9;
  let x = pickX;
  let y = carryY;
  let laden = false;
  let phase: string;
  let tone: Tone = "green";
  if (f < 0.08) {
    y = pickY;
    phase = `Locking on · tier ${tier + 1}`;
  } else if (f < 0.16) {
    y = lerp(pickY + 0.3, carryY, smooth((f - 0.08) / 0.08));
    laden = true;
    phase = "Lowering to travel height";
  } else if (f < 0.45) {
    x = lerp(pickX, dropX, smooth((f - 0.16) / 0.29));
    laden = true;
    phase = s.kind === "rs" ? "Reversing to truck bay" : "Reversing to stack lane";
    tone = "blue";
  } else if (f < 0.55) {
    x = dropX;
    y = lerp(carryY, 0.02, smooth((f - 0.45) / 0.1));
    laden = true;
    phase = s.kind === "rs" ? "Landing on chassis" : "Landing box";
  } else if (f < 0.6) {
    x = dropX;
    y = lerp(0.02, 1.4, smooth((f - 0.55) / 0.05));
    phase = "Releasing twistlocks";
  } else if (f < 0.85) {
    x = lerp(dropX, pickX, smooth((f - 0.6) / 0.25));
    y = 1.4;
    phase = "Driving to stack";
    tone = "blue";
  } else {
    y = lerp(1.4, pickY, smooth((f - 0.85) / 0.15));
    phase = "Positioning spreader";
  }
  return { x, z, heading, boxY: y, laden, phase, tone, moves: s.baseMoves + n - Math.floor(s.offset / s.cycle), box: { id: box.id, color: boxColor } };
}

export function shuttleArea(s: ShuttleDef): BlockDef {
  return areaOf(s);
}
