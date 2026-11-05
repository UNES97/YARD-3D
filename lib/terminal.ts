// Static layout + fleet definitions for the simulated APMT Mumbai terminal.
// World units are metres. x runs along the quay (west → east), z runs inland
// from the quay wall (z = 0) towards the gate, y is up. The sea is z < 0.

export const CONTAINER = { L40: 12.19, W: 2.44, H: 2.59 };
export const TIER = 2.62; // stacked height incl. corner-casting gap
export const BAY = 13.4; // 40' slot pitch along a block
export const ROW = 2.85; // row pitch across a block
export const TRAILER_Y = 1.55; // top of a TT / XT trailer deck

export const QUAY = {
  edgeZ: 0,
  waterY: -3,
  seaRailZ: 6,
  landRailZ: 36,
  ttLaneZ: 20,
  backRoadOutZ: 44,
  backRoadInZ: 52,
};

export const TERMINAL = {
  code: "INNSA",
  name: "APMT Mumbai",
  legal: "Gateway Terminals India",
  location: "Nhava Sheva, Navi Mumbai",
  timeZone: "Asia/Kolkata",
  berths: 2,
  reeferPlugs: 240,
};

export const OTHER_TERMINALS = [
  { code: "INPAV", name: "APMT Pipavav" },
  { code: "ESVLC", name: "APMT Valencia" },
  { code: "NLRTM", name: "APMT Maasvlakte II" },
  { code: "MAPTM", name: "APMT Tangier" },
];

// ---------------------------------------------------------------- carriers

export interface Line {
  name: string;
  prefix: string;
  color: string;
  weight: number;
}

export const LINES: Line[] = [
  { name: "Maersk", prefix: "MSKU", color: "#3ea6d3", weight: 34 },
  { name: "Hapag-Lloyd", prefix: "HLXU", color: "#e2762e", weight: 12 },
  { name: "MSC", prefix: "MSCU", color: "#d8b24a", weight: 11 },
  { name: "CMA CGM", prefix: "CMAU", color: "#2f5590", weight: 10 },
  { name: "ONE", prefix: "ONEU", color: "#c4467f", weight: 8 },
  { name: "Evergreen", prefix: "EGHU", color: "#2f7d52", weight: 8 },
  { name: "Leased", prefix: "TGHU", color: "#8a5a3c", weight: 9 },
  { name: "Other", prefix: "TCLU", color: "#9aa6b1", weight: 8 },
];
const LINE_TOTAL = LINES.reduce((s, l) => s + l.weight, 0);

export function pickLine(r: number): Line {
  let acc = 0;
  for (const l of LINES) {
    acc += l.weight / LINE_TOTAL;
    if (r < acc) return l;
  }
  return LINES[LINES.length - 1];
}

// ---------------------------------------------------------------- yard

export type BlockKind = "Import" | "Export" | "Transhipment" | "Reefer" | "Empty";

export interface BlockDef {
  id: string;
  name: string;
  kind: BlockKind;
  x: number; // centre
  z: number;
  bays: number;
  rows: number;
  maxTier: number;
  fill: number; // target fill 0..1
  seed: number;
  dwell: number; // avg dwell days
}

const ROW_Z = [78, 114, 150, 186];
const FILL = [0.82, 0.74, 0.69, 0.91, 0.62, 0.71, 0.56, 0.88];
const KINDS: BlockKind[] = ["Import", "Import", "Import", "Transhipment", "Export", "Export", "Export", "Export"];
const DWELL = [3.4, 3.9, 4.2, 2.1, 2.6, 2.4, 1.9, 2.2];

export const RTG_BLOCKS: BlockDef[] = ROW_Z.flatMap((z, i) =>
  (["A", "B"] as const).map((c, j) => {
    const k = i * 2 + j;
    return {
      id: `${i + 1}${c}`,
      name: `Block ${i + 1}${c}`,
      kind: KINDS[k],
      x: j === 0 ? -80 : 80,
      z,
      bays: 10,
      rows: 6,
      maxTier: 5,
      fill: FILL[k],
      seed: 11 + k * 7,
      dwell: DWELL[k],
    };
  }),
);

// Reefer + empty areas: containers stand with their long axis along z and are
// worked from the face of the stack by reach stackers / empty handlers.
export interface AreaDef extends BlockDef {
  faceX: number; // x of the working face
  dir: 1 | -1; // which way the stack grows from the face
}

export const REEFER_AREA: AreaDef = {
  id: "RF",
  name: "Reefer yard",
  kind: "Reefer",
  x: -206,
  z: 130,
  bays: 9,
  rows: 4,
  maxTier: 4,
  fill: 0.72,
  seed: 91,
  dwell: 2.8,
  faceX: -200,
  dir: -1,
};

export const EMPTY_AREA: AreaDef = {
  id: "MT",
  name: "Empty depot",
  kind: "Empty",
  x: 207,
  z: 130,
  bays: 9,
  rows: 5,
  maxTier: 7,
  fill: 0.7,
  seed: 57,
  dwell: 6.5,
  faceX: 200,
  dir: 1,
};

export const AREA_SLOT_Z0 = 76;

export const ALL_BLOCKS: BlockDef[] = [...RTG_BLOCKS, REEFER_AREA, EMPTY_AREA];

export const blockById = (id: string) => ALL_BLOCKS.find((b) => b.id === id)!;
export const blockLen = (b: BlockDef) => b.bays * BAY;
export const blockWidth = (b: BlockDef) => b.rows * ROW;
/** z of the truck lane that runs inside an RTG block, beside the container rows */
export const laneZ = (b: BlockDef) => b.z - blockWidth(b) / 2 - 3.4;
/** RTG leg lines (relative to block centre z) */
export const RTG_LEG_Z = { a: -14.9, b: 10.6 };

// ---------------------------------------------------------------- vessel

export const VESSEL = {
  name: "MAERSK SAHYADRI",
  imo: "9810432",
  callSign: "OZXY2",
  flag: "Denmark",
  service: "ME11",
  voyage: "642W",
  loa: 274,
  beam: 40,
  berth: "Berth 1",
  prevPort: "Salalah",
  nextPort: "Colombo",
  discharge: 1240,
  load: 1160,
  doneAtStart: 1176,
  // timeline offsets from app start, in minutes
  pilotOn: -612,
  allFast: -548,
  etd: 395,
  // geometry
  x0: -137,
  x1: 135,
  zIn: -3,
  zOut: -43,
  deckY: 11,
};
export const VESSEL_CZ = (VESSEL.zIn + VESSEL.zOut) / 2;

// ---------------------------------------------------------------- quay cranes

export interface StsDef {
  id: string;
  x: number;
  bay: number;
  operator: string;
  rate: number; // reported gross moves / hr
  cycle: number; // animation cycle seconds
  offset: number;
  twin: boolean;
  baseMoves: number;
  bayPlanned: number;
  bayDone: number;
}

export const STS: StsDef[] = [
  { id: "STS-01", x: -84, bay: 14, operator: "R. Patil", rate: 29.6, cycle: 42, offset: 0, twin: false, baseMoves: 214, bayPlanned: 118, bayDone: 64 },
  { id: "STS-02", x: -28, bay: 30, operator: "S. Naik", rate: 31.2, cycle: 38, offset: 13, twin: true, baseMoves: 251, bayPlanned: 132, bayDone: 97 },
  { id: "STS-03", x: 28, bay: 46, operator: "A. Shaikh", rate: 27.8, cycle: 44, offset: 27, twin: false, baseMoves: 198, bayPlanned: 104, bayDone: 41 },
  { id: "STS-04", x: 84, bay: 62, operator: "V. Shinde", rate: 30.4, cycle: 40, offset: 6, twin: false, baseMoves: 236, bayPlanned: 126, bayDone: 88 },
];

// ---------------------------------------------------------------- yard cranes

export type FleetStatus = "working" | "idle" | "maintenance";

export interface RtgDef {
  id: string;
  block: string;
  status: FleetStatus;
  operator: string;
  offset: number;
  seed: number;
  rate: number;
  baseMoves: number;
  fuel: number;
}

const RTG_OPS = ["M. Jadhav", "K. Pawar", "P. Kadam", "N. Gaikwad", "S. More", "D. Salunkhe", "R. Bhosale", "A. Chavan", "—", "—"];

export const RTGS: RtgDef[] = [
  ...RTG_BLOCKS.map((b, i) => ({
    id: `RTG-${String(i + 1).padStart(2, "0")}`,
    block: b.id,
    status: "working" as FleetStatus,
    operator: RTG_OPS[i],
    offset: i * 9.3,
    seed: 3 + i * 5,
    rate: [21.4, 19.8, 18.6, 23.1, 17.9, 20.6, 16.4, 22.2][i],
    baseMoves: [142, 128, 117, 156, 109, 133, 98, 147][i],
    fuel: [72, 64, 58, 81, 47, 69, 53, 77][i],
  })),
  { id: "RTG-09", block: "2A", status: "idle", operator: "—", offset: 0, seed: 1, rate: 0, baseMoves: 61, fuel: 88 },
  { id: "RTG-10", block: "4B", status: "maintenance", operator: "—", offset: 0, seed: 2, rate: 0, baseMoves: 0, fuel: 34 },
];

// ---------------------------------------------------------------- horizontal transport

export interface TtDef {
  id: string;
  sts: number; // index into STS
  block: string;
  driver: string;
  offset: number; // 0..1 phase offset
  stopDx: number; // where along the block lane it meets the RTG
  fuel: number;
}

const TT_BLOCKS = ["1A", "2A", "3A", "1A", "2B", "3B", "1B", "2B", "4A", "1B", "3B", "4B"];
const TT_DRIVERS = [
  "S. Kamble", "V. Mhatre", "A. Patil", "R. Thakur", "J. Shaikh", "H. Pandey",
  "M. Gharat", "L. Koli", "T. Naik", "B. Yadav", "G. Mane", "Y. Kharat",
];

export const TTS: TtDef[] = TT_BLOCKS.map((block, k) => ({
  id: `TT-${101 + k}`,
  sts: Math.floor(k / 3),
  block,
  driver: TT_DRIVERS[k],
  offset: (k % 3) / 3 + k * 0.017,
  stopDx: [-30, 10, 35, -10, 25, -35, 0, -25, 20, 30, -20, 5][k],
  fuel: [68, 54, 77, 42, 81, 63, 59, 71, 36, 85, 66, 49][k],
}));

export interface XtDef {
  id: string;
  plate: string;
  haulier: string;
  block: string;
  offset: number;
  stopDx: number;
  slot: string;
  cab: string;
}

export const XTS: XtDef[] = [
  { id: "XT-4471", plate: "MH 46 BU 7731", haulier: "Konkan Logistics", block: "4A", offset: 0, stopDx: -20, slot: "10:00–11:00", cab: "#2563c9" },
  { id: "XT-4486", plate: "MH 04 KF 2290", haulier: "Sahyadri Freight", block: "4B", offset: 0.25, stopDx: 15, slot: "10:00–11:00", cab: "#e9edf2" },
  { id: "XT-4492", plate: "GJ 12 BX 6105", haulier: "Kutch Carriers", block: "4A", offset: 0.5, stopDx: 30, slot: "11:00–12:00", cab: "#c0392b" },
  { id: "XT-4503", plate: "MH 43 AT 9518", haulier: "Uran Transport Co.", block: "4B", offset: 0.75, stopDx: -30, slot: "11:00–12:00", cab: "#2f7d52" },
];

// ---------------------------------------------------------------- reach stackers / empty handlers

export interface ShuttleDef {
  id: string;
  kind: "rs" | "eh";
  area: string;
  slot: number; // slot index along the area face
  operator: string;
  status: FleetStatus;
  offset: number;
  cycle: number;
  fuel: number;
  baseMoves: number;
  model: string;
}

export const SHUTTLES: ShuttleDef[] = [
  { id: "RS-01", kind: "rs", area: "RF", slot: 1, operator: "F. Ansari", status: "working", offset: 0, cycle: 34, fuel: 62, baseMoves: 74, model: "Kalmar DRG450" },
  { id: "RS-02", kind: "rs", area: "RF", slot: 4, operator: "K. Mokal", status: "working", offset: 11, cycle: 38, fuel: 49, baseMoves: 66, model: "Kalmar DRG450" },
  { id: "RS-03", kind: "rs", area: "RF", slot: 7, operator: "P. Tandel", status: "working", offset: 23, cycle: 36, fuel: 71, baseMoves: 58, model: "Konecranes SMV 4531" },
  { id: "EH-01", kind: "eh", area: "MT", slot: 1, operator: "S. Bhoir", status: "working", offset: 5, cycle: 30, fuel: 57, baseMoves: 91, model: "Kalmar DCG100-45E" },
  { id: "EH-02", kind: "eh", area: "MT", slot: 4, operator: "A. Vartak", status: "working", offset: 17, cycle: 32, fuel: 44, baseMoves: 83, model: "Kalmar DCG100-45E" },
  { id: "EH-03", kind: "eh", area: "MT", slot: 7, operator: "—", status: "idle", offset: 0, cycle: 30, fuel: 90, baseMoves: 12, model: "Hyster H22XM-12EC" },
];

export const SHIFT_START_HOUR = 6; // shift runs 06:00–14:00 IST
