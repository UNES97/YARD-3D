// Deterministic container inventory for the yard and the vessel, shared by the
// 3D scene (instanced meshes) and the side panels (block statistics).

import {
  AREA_SLOT_Z0,
  BAY,
  CONTAINER,
  EMPTY_AREA,
  LINES,
  REEFER_AREA,
  ROW,
  RTG_BLOCKS,
  STS,
  TIER,
  VESSEL,
  type AreaDef,
  type BlockDef,
  blockLen,
  blockWidth,
  pickLine,
} from "./terminal";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Box {
  x: number;
  y: number; // centre
  z: number;
  alongZ: boolean; // long axis along z instead of x
  color: string;
  owner: string; // block id, or "VESSEL"
}

export interface BlockStats {
  boxes: number;
  teu: number;
  capacityTeu: number;
  util: number;
  byLine: { name: string; color: string; count: number }[];
  reefers: number;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function genRtgBlock(b: BlockDef, out: Box[], stats: Record<string, BlockStats>) {
  const rnd = mulberry32(b.seed);
  const counts = new Map<string, number>();
  let n = 0;
  const x0 = b.x - blockLen(b) / 2;
  const z0 = b.z - blockWidth(b) / 2;
  for (let bay = 0; bay < b.bays; bay++) {
    for (let row = 0; row < b.rows; row++) {
      // rows nearest the truck lane are kept a little lower, like a real plan
      const bias = row === 0 ? -1 : 0;
      const h = Math.max(0, Math.min(b.maxTier, Math.round(b.fill * b.maxTier + (rnd() - 0.5) * 2.6 + bias)));
      for (let t = 0; t < h; t++) {
        const line = pickLine(rnd());
        counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
        out.push({
          x: x0 + BAY * (bay + 0.5),
          y: CONTAINER.H / 2 + t * TIER,
          z: z0 + ROW * (row + 0.5),
          alongZ: false,
          color: shade(line.color, 0.9 + rnd() * 0.18),
          owner: b.id,
        });
        n++;
      }
    }
  }
  stats[b.id] = finish(n, b, counts, 0);
}

function genArea(a: AreaDef, out: Box[], stats: Record<string, BlockStats>) {
  const rnd = mulberry32(a.seed);
  const counts = new Map<string, number>();
  let n = 0;
  let reefers = 0;
  for (let slot = 0; slot < a.bays; slot++) {
    for (let row = 0; row < a.rows; row++) {
      // keep the stack face low where the machines work
      const h = Math.max(0, Math.min(a.maxTier, Math.round(a.fill * a.maxTier + (rnd() - 0.5) * 2.4 - (row === 0 ? 1 : 0))));
      for (let t = 0; t < h; t++) {
        let color: string;
        if (a.kind === "Reefer") {
          const r = rnd();
          color = r < 0.78 ? shade("#eef1f4", 0.96 + rnd() * 0.05) : shade("#3ea6d3", 1);
          counts.set(r < 0.78 ? "Maersk" : "Other", (counts.get(r < 0.78 ? "Maersk" : "Other") ?? 0) + 1);
          reefers++;
        } else {
          const line = pickLine(rnd());
          counts.set(line.name, (counts.get(line.name) ?? 0) + 1);
          color = shade(line.color, 0.86 + rnd() * 0.18);
        }
        out.push({
          x: a.faceX + a.dir * (CONTAINER.W / 2 + row * ROW),
          y: CONTAINER.H / 2 + t * TIER,
          z: AREA_SLOT_Z0 + slot * BAY,
          alongZ: true,
          color,
          owner: a.id,
        });
        n++;
      }
    }
  }
  stats[a.id] = finish(n, a, counts, reefers);
}

function finish(n: number, b: BlockDef, counts: Map<string, number>, reefers: number): BlockStats {
  const capacityTeu = b.bays * b.rows * b.maxTier * 2;
  return {
    boxes: n,
    teu: n * 2,
    capacityTeu,
    util: (n * 2) / capacityTeu,
    reefers,
    byLine: LINES.map((l) => ({ name: l.name, color: l.color, count: counts.get(l.name) ?? 0 }))
      .filter((l) => l.count > 0)
      .sort((p, q) => q.count - p.count),
  };
}

// Vessel bays are numbered like a real stowage plan (odd = 20', even = 40').
// We only render 40' bays on deck.
export const VESSEL_BAYS: { x: number; bay: number }[] = (() => {
  const res: { x: number; bay: number }[] = [];
  let bay = 2;
  for (let x = VESSEL.x0 + 18; x < VESSEL.x1 - 26; x += BAY) {
    if (x > -68 && x < -44) continue; // deckhouse / bridge
    res.push({ x, bay });
    bay += 4;
  }
  return res;
})();

function genVessel(out: Box[]) {
  const rnd = mulberry32(4242);
  const rows = 14;
  const z0 = (VESSEL.zIn + VESSEL.zOut) / 2 - ((rows - 1) * 2.55) / 2;
  for (const vb of VESSEL_BAYS) {
    // bays under a working crane have been partly discharged
    const worked = STS.some((c) => Math.abs(c.x - vb.x) < 8);
    for (let r = 0; r < rows; r++) {
      const edge = r === 0 || r === rows - 1 ? 1 : 0;
      const base = worked ? 2 : 5;
      const h = Math.max(1, base - edge + Math.floor(rnd() * (worked ? 2 : 3)));
      for (let t = 0; t < h; t++) {
        const line = pickLine(rnd() * 0.85); // carrier-heavy mix on a Maersk ship
        out.push({
          x: vb.x,
          y: VESSEL.deckY + 0.6 + CONTAINER.H / 2 + t * TIER,
          z: z0 + r * 2.55,
          alongZ: false,
          color: shade(line.color, 0.88 + rnd() * 0.2),
          owner: "VESSEL",
        });
      }
    }
  }
}

export const YARD = (() => {
  const boxes: Box[] = [];
  const stats: Record<string, BlockStats> = {};
  for (const b of RTG_BLOCKS) genRtgBlock(b, boxes, stats);
  genArea(REEFER_AREA, boxes, stats);
  genArea(EMPTY_AREA, boxes, stats);
  const vessel: Box[] = [];
  genVessel(vessel);
  return { boxes, stats, vessel };
})();

export function yardTotals() {
  let teu = 0;
  let cap = 0;
  for (const s of Object.values(YARD.stats)) {
    teu += s.teu;
    cap += s.capacityTeu;
  }
  return { teu, cap, util: teu / cap };
}
