import type { Object3D } from "three";
import { create } from "zustand";

export type EntityKind = "sts" | "rtg" | "tt" | "rs" | "eh" | "xt" | "block" | "vessel";
export type Selection = { kind: EntityKind; id: string } | null;
export type CamCmd = "in" | "out" | "rotL" | "rotR" | "home";
export type FleetTab = "sts" | "yard" | "tt";

interface AppState {
  selected: Selection;
  hovered: string | null;
  tick: number;
  cam: { type: CamCmd; n: number };
  tab: FleetTab;
  select: (s: Selection) => void;
  hover: (id: string | null) => void;
  bump: () => void;
  camCmd: (type: CamCmd) => void;
  setTab: (t: FleetTab) => void;
}

export const useApp = create<AppState>((set) => ({
  selected: null,
  hovered: null,
  tick: 0,
  cam: { type: "home", n: 0 },
  tab: "sts",
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  bump: () => set((s) => ({ tick: s.tick + 1 })),
  camCmd: (type) => set((s) => ({ cam: { type, n: s.cam.n + 1 } })),
  setTab: (tab) => set({ tab }),
}));

/** Scene objects by entity id, so the camera can find and follow them. */
export const registry = new Map<string, Object3D>();
