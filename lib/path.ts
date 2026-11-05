// Closed driving loops on the ground plane (x, z) with rounded corners, sampled
// by distance so vehicles move at a constant speed.

export interface LoopPath {
  xs: number[];
  zs: number[];
  cum: number[];
  length: number;
}

export function buildLoop(corners: [number, number][], radius = 8): LoopPath {
  const n = corners.length;
  const xs: number[] = [];
  const zs: number[] = [];
  const push = (x: number, z: number) => {
    const m = xs.length;
    if (m && Math.abs(xs[m - 1] - x) < 1e-3 && Math.abs(zs[m - 1] - z) < 1e-3) return;
    xs.push(x);
    zs.push(z);
  };

  for (let i = 0; i < n; i++) {
    const p0 = corners[(i - 1 + n) % n];
    const p1 = corners[i];
    const p2 = corners[(i + 1) % n];
    const d1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const d2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    if (r < 0.05) {
      push(p1[0], p1[1]);
      continue;
    }
    const ax = p1[0] - ((p1[0] - p0[0]) / d1) * r;
    const az = p1[1] - ((p1[1] - p0[1]) / d1) * r;
    const bx = p1[0] + ((p2[0] - p1[0]) / d2) * r;
    const bz = p1[1] + ((p2[1] - p1[1]) / d2) * r;
    const SEG = 8;
    for (let k = 0; k <= SEG; k++) {
      const s = k / SEG;
      const u = 1 - s;
      push(u * u * ax + 2 * u * s * p1[0] + s * s * bx, u * u * az + 2 * u * s * p1[1] + s * s * bz);
    }
  }

  const cum = [0];
  for (let i = 1; i < xs.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
  }
  const last = xs.length - 1;
  const length = cum[last] + Math.hypot(xs[0] - xs[last], zs[0] - zs[last]);
  return { xs, zs, cum, length };
}

export interface PathSample {
  x: number;
  z: number;
  /** rotation.y for a model whose forward axis is +x */
  heading: number;
}

export function sampleLoop(p: LoopPath, dist: number): PathSample {
  const d = ((dist % p.length) + p.length) % p.length;
  const m = p.xs.length;
  let lo = 0;
  let hi = m - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (p.cum[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const i = lo;
  const j = (i + 1) % m;
  const segLen = (j === 0 ? p.length : p.cum[j]) - p.cum[i];
  const t = segLen > 0 ? (d - p.cum[i]) / segLen : 0;
  const dx = p.xs[j] - p.xs[i];
  const dz = p.zs[j] - p.zs[i];
  return {
    x: p.xs[i] + dx * t,
    z: p.zs[i] + dz * t,
    heading: Math.atan2(-dz, dx),
  };
}

/** Distance along the loop of the point closest to (x, z). */
export function distanceAt(p: LoopPath, x: number, z: number): number {
  const m = p.xs.length;
  let best = Infinity;
  let bestD = 0;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const ax = p.xs[i];
    const az = p.zs[i];
    const dx = p.xs[j] - ax;
    const dz = p.zs[j] - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    const px = ax + dx * t;
    const pz = az + dz * t;
    const e = (px - x) ** 2 + (pz - z) ** 2;
    if (e < best) {
      best = e;
      bestD = p.cum[i] + Math.sqrt(l2) * t;
    }
  }
  return bestD;
}
