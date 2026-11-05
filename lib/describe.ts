// Turns simulation state into the text the panels and 3D tags show.

import {
  ALL_BLOCKS,
  RTGS,
  SHUTTLES,
  STS,
  TERMINAL,
  TTS,
  VESSEL,
  XTS,
  blockById,
} from "./terminal";
import {
  rtgForBlock,
  rtgState,
  shuttleArea,
  shuttleState,
  stsState,
  ttState,
  vesselMoves,
  wallClock,
  xtState,
  type Tone,
} from "./sim";
import type { EntityKind, Selection } from "./store";
import { YARD, type BlockStats } from "./yardgen";

export interface Row {
  k: string;
  v: string;
  tone?: Tone;
  link?: { kind: EntityKind; id: string };
}

export interface Detail {
  kindLabel: string;
  title: string;
  subtitle: string;
  status: { text: string; tone: Tone };
  note: string;
  progress?: { label: string; value: number; right: string };
  rows: Row[];
  lines?: BlockStats["byLine"];
}

export interface Summary {
  id: string;
  kind: EntityKind;
  title: string;
  sub: string;
  desc: string;
  status: { text: string; tone: Tone };
  progress?: number;
  right?: string;
}

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TERMINAL.timeZone });
export const fmtTime = (d: Date) => timeFmt.format(d);
export const atMin = (t: number, minutes: number) => fmtTime(new Date(wallClock(t).getTime() - t * 1000 + minutes * 60000));
export const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => x.toLocaleString("en-IN");

function duration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function vesselTimeline(t: number) {
  const v = vesselMoves(t);
  const elapsedMin = t / 60;
  return {
    v,
    pilotOn: atMin(t, VESSEL.pilotOn),
    allFast: atMin(t, VESSEL.allFast),
    etd: atMin(t, VESSEL.etd),
    leftMin: Math.max(0, VESSEL.etd - elapsedMin),
  };
}

export function describe(sel: NonNullable<Selection>, t: number): Detail {
  switch (sel.kind) {
    case "sts": {
      const c = STS.find((s) => s.id === sel.id)!;
      const s = stsState(c, t);
      const bayDone = Math.min(c.bayPlanned, c.bayDone + (s.moves - c.baseMoves));
      return {
        kindLabel: `Quay crane · ${VESSEL.berth}`,
        title: c.id,
        subtitle: `ZPMC 65 t ${c.twin ? "twin-lift" : "single-lift"} · ${c.operator}`,
        status: { text: "Working", tone: "green" },
        note: s.phase,
        progress: { label: `Bay ${c.bay} · ${s.mode.toLowerCase()}`, value: bayDone / c.bayPlanned, right: `${bayDone}/${c.bayPlanned}` },
        rows: [
          { k: "Vessel", v: VESSEL.name, link: { kind: "vessel", id: "VESSEL" } },
          { k: "Moves this shift", v: num(s.moves) },
          { k: "Gross crane rate", v: `${c.rate.toFixed(1)} mph`, tone: c.rate >= 30 ? "green" : c.rate < 28 ? "amber" : undefined },
          { k: "Spreader", v: s.laden ? `${s.box.id} · ${s.box.weight.toFixed(1)} t` : "Empty" },
          { k: "Trolley", v: `${s.trolleyZ < 0 ? `${Math.abs(s.trolleyZ).toFixed(0)} m outreach` : `${s.trolleyZ.toFixed(0)} m apron`}` },
          { k: "Hoist height", v: `${s.spreaderY.toFixed(1)} m` },
        ],
      };
    }
    case "rtg": {
      const r = RTGS.find((x) => x.id === sel.id)!;
      const s = rtgState(r, t);
      const b = blockById(r.block);
      const statusText = r.status === "working" ? "Working" : r.status === "idle" ? "Idle" : "Maintenance";
      return {
        kindLabel: `Yard crane · ${b.name}`,
        title: r.id,
        subtitle: `Konecranes RTG 16-wheel · ${r.operator === "—" ? "no operator" : r.operator}`,
        status: { text: statusText, tone: r.status === "working" ? "green" : r.status === "idle" ? "grey" : "red" },
        note: s.phase,
        progress: { label: "Fuel / battery", value: r.fuel / 100, right: `${r.fuel}%` },
        rows: [
          { k: "Block", v: b.name, link: { kind: "block", id: b.id } },
          { k: "Position", v: r.status === "working" ? `Bay ${String(s.bay).padStart(2, "0")} · row ${s.row}` : "Block end" },
          { k: "Moves this shift", v: num(s.moves) },
          { k: "Rate", v: r.rate ? `${r.rate.toFixed(1)} mph` : "—" },
          { k: "Spreader", v: s.laden ? "Box locked" : "Empty" },
        ],
      };
    }
    case "rs":
    case "eh": {
      const d = SHUTTLES.find((x) => x.id === sel.id)!;
      const s = shuttleState(d, t);
      const a = shuttleArea(d);
      return {
        kindLabel: `${d.kind === "rs" ? "Reach stacker" : "Empty handler"} · ${a.name}`,
        title: d.id,
        subtitle: `${d.model} · ${d.operator === "—" ? "no operator" : d.operator}`,
        status: { text: d.status === "working" ? "Working" : "Idle", tone: d.status === "working" ? "green" : "grey" },
        note: s.phase,
        progress: { label: "Fuel", value: d.fuel / 100, right: `${d.fuel}%` },
        rows: [
          { k: "Area", v: a.name, link: { kind: "block", id: a.id } },
          { k: "Stack slot", v: `${a.id}-${String(d.slot + 1).padStart(2, "0")}` },
          { k: "Moves this shift", v: num(s.moves) },
          { k: "Handling", v: s.laden ? s.box.id : "—" },
          { k: "Capacity", v: d.kind === "rs" ? "45 t · 5 high" : "10 t · 7 high" },
        ],
      };
    }
    case "tt": {
      const d = TTS.find((x) => x.id === sel.id)!;
      const s = ttState(d, t);
      return {
        kindLabel: "Terminal tractor",
        title: d.id,
        subtitle: `Terberg YT203 · ${d.driver}`,
        status: { text: s.leg === "A" || s.leg === "B" ? "Handling" : "Driving", tone: s.tone },
        note: s.status,
        progress: { label: "Job cycle", value: s.progress, right: pct(s.progress) },
        rows: [
          { k: "Job", v: `${vesselMoves(t).mode} · ${STS[d.sts].id}`, link: { kind: "sts", id: STS[d.sts].id } },
          { k: "Container", v: s.laden ? s.box.id : "—" },
          { k: "Gross weight", v: s.laden ? `${s.box.weight.toFixed(1)} t` : "—" },
          { k: "From → to", v: `${s.from} → ${s.to}` },
          { k: "Speed", v: `${s.speedKmh.toFixed(0)} km/h` },
          { k: "Fuel", v: `${d.fuel}%`, tone: d.fuel < 40 ? "amber" : undefined },
        ],
      };
    }
    case "xt": {
      const d = XTS.find((x) => x.id === sel.id)!;
      const s = xtState(d, t);
      const turn = 34 + ((d.plate.charCodeAt(4) * 7) % 19);
      return {
        kindLabel: `External truck · ${d.haulier}`,
        title: d.plate,
        subtitle: `${d.id} · slot ${d.slot}`,
        status: { text: s.leg === "A" ? "At gate" : s.leg === "B" ? "Handling" : "On terminal", tone: s.tone },
        note: s.status,
        progress: { label: "Visit", value: s.progress, right: pct(s.progress) },
        rows: [
          { k: "Transaction", v: "Export receipt" },
          { k: "Container", v: s.laden ? s.box.id : "Dropped" },
          { k: "Destination", v: blockById(d.block).name, link: { kind: "block", id: d.block } },
          { k: "Speed", v: `${s.speedKmh.toFixed(0)} km/h` },
          { k: "Expected turn time", v: `${turn} min` },
        ],
      };
    }
    case "block": {
      const b = blockById(sel.id);
      const st = YARD.stats[b.id];
      const rtg = rtgForBlock(b.id);
      const tone: Tone = st.util > 0.85 ? "amber" : "green";
      const handler =
        b.id === "RF" ? "RS-01 · RS-02 · RS-03" : b.id === "MT" ? "EH-01 · EH-02" : rtg?.id ?? "—";
      return {
        kindLabel: `Yard block · ${b.kind}`,
        title: b.name,
        subtitle: `${b.bays} bays × ${b.rows} rows × ${b.maxTier} high`,
        status: { text: st.util > 0.85 ? "High fill" : "Normal", tone },
        note: st.util > 0.85 ? "Above 85% — consider housekeeping moves" : "Within planned fill",
        progress: { label: "Utilisation", value: st.util, right: `${num(st.teu)} / ${num(st.capacityTeu)} TEU` },
        rows: [
          { k: "Boxes", v: num(st.boxes) },
          ...(b.kind === "Reefer" ? [{ k: "Plugged reefers", v: `${st.reefers} / ${TERMINAL.reeferPlugs}` }] : []),
          { k: "Average dwell", v: `${b.dwell.toFixed(1)} days`, tone: b.dwell > 4 ? ("amber" as Tone) : undefined },
          {
            k: b.id === "RF" ? "Reach stackers" : b.id === "MT" ? "Empty handlers" : "RTG",
            v: handler,
            link: rtg && b.id !== "RF" && b.id !== "MT" ? { kind: "rtg" as EntityKind, id: rtg.id } : undefined,
          },
        ],
        lines: st.byLine,
      };
    }
    case "vessel": {
      const tl = vesselTimeline(t);
      const v = tl.v;
      return {
        kindLabel: `Vessel · ${VESSEL.berth}`,
        title: VESSEL.name,
        subtitle: `IMO ${VESSEL.imo} · ${VESSEL.service} · voy ${VESSEL.voyage}`,
        status: { text: "Working", tone: "green" },
        note: `${v.mode} in progress · ${STS.length} STS assigned`,
        progress: { label: "Total moves", value: v.done / v.total, right: `${num(v.done)} / ${num(v.total)}` },
        rows: [
          { k: "Discharge", v: `${num(v.discharged)} / ${num(VESSEL.discharge)}`, tone: v.discharged >= VESSEL.discharge ? "green" : undefined },
          { k: "Load", v: `${num(v.loaded)} / ${num(VESSEL.load)}` },
          { k: "All fast", v: tl.allFast },
          { k: "ETD", v: `${tl.etd} · ${duration(tl.leftMin)} left`, tone: tl.leftMin < 60 ? "amber" : undefined },
          { k: "LOA / beam", v: `${VESSEL.loa} m / ${VESSEL.beam} m` },
          { k: "Rotation", v: `${VESSEL.prevPort} → Nhava Sheva → ${VESSEL.nextPort}` },
        ],
      };
    }
  }
}

export function summarize(kind: EntityKind, id: string, t: number): Summary {
  const d = describe({ kind, id }, t);
  let desc = d.note;
  let right: string | undefined;
  let progress: number | undefined;
  if (kind === "sts") {
    const c = STS.find((s) => s.id === id)!;
    const s = stsState(c, t);
    desc = `Bay ${c.bay} · ${s.phase}`;
    progress = d.progress?.value;
    right = d.progress?.right;
  } else if (kind === "tt" || kind === "xt") {
    progress = d.progress?.value;
    right = kind === "tt" ? `${ttState(TTS.find((x) => x.id === id)!, t).speedKmh.toFixed(0)} km/h` : undefined;
  } else if (kind === "rtg" || kind === "rs" || kind === "eh") {
    const r = d.rows.find((x) => x.k === "Moves this shift");
    right = r ? `${r.v} mv` : undefined;
  }
  return {
    id,
    kind,
    title: kind === "xt" ? XTS.find((x) => x.id === id)!.id : d.title,
    sub: d.subtitle.split(" · ").pop() ?? "",
    desc,
    status: d.status,
    progress,
    right,
  };
}

export interface EntityRef {
  kind: EntityKind;
  id: string;
  label: string;
  hint: string;
}

export const ENTITIES: EntityRef[] = [
  { kind: "vessel", id: "VESSEL", label: VESSEL.name, hint: `Vessel · ${VESSEL.berth}` },
  ...STS.map((s) => ({ kind: "sts" as const, id: s.id, label: s.id, hint: "Quay crane" })),
  ...RTGS.map((r) => ({ kind: "rtg" as const, id: r.id, label: r.id, hint: `RTG · Block ${r.block}` })),
  ...SHUTTLES.map((s) => ({ kind: s.kind, id: s.id, label: s.id, hint: s.kind === "rs" ? "Reach stacker" : "Empty handler" })),
  ...TTS.map((tt) => ({ kind: "tt" as const, id: tt.id, label: tt.id, hint: `Terminal tractor · ${tt.driver}` })),
  ...XTS.map((x) => ({ kind: "xt" as const, id: x.id, label: `${x.id} · ${x.plate}`, hint: x.haulier })),
  ...ALL_BLOCKS.map((b) => ({ kind: "block" as const, id: b.id, label: b.name, hint: `${b.kind} block` })),
];
