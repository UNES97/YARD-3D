"use client";

import { Html, Line } from "@react-three/drei";
import { useMemo } from "react";
import { describe } from "@/lib/describe";
import { simNow, type Tone } from "@/lib/sim";
import { useApp, type EntityKind } from "@/lib/store";

type V3 = [number, number, number];

/** Corner brackets around a bounding box, like the reference UI. */
export function Brackets({ min, max, color = "#1a6fba" }: { min: V3; max: V3; color?: string }) {
  const segments = useMemo(() => {
    const pts: V3[] = [];
    const k = 0.22;
    const dx = (max[0] - min[0]) * k;
    const dy = (max[1] - min[1]) * k;
    const dz = (max[2] - min[2]) * k;
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) {
          const sx = x === min[0] ? 1 : -1;
          const sy = y === min[1] ? 1 : -1;
          const sz = z === min[2] ? 1 : -1;
          pts.push([x, y, z], [x + sx * dx, y, z]);
          pts.push([x, y, z], [x, y + sy * dy, z]);
          pts.push([x, y, z], [x, y, z + sz * dz]);
        }
    return pts;
  }, [min, max]);
  return <Line points={segments} segments color={color} lineWidth={2.2} depthTest={false} renderOrder={10} />;
}

const TONE_DOT: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-brand",
  grey: "bg-slate-400",
  red: "bg-red-500",
};

/** Floating name tag, shown while an entity is hovered or selected. */
export function Tag({ kind, id, y, x = 0, z = 0 }: { kind: EntityKind; id: string; y: number; x?: number; z?: number }) {
  const selected = useApp((s) => s.selected?.id === id);
  const hovered = useApp((s) => s.hovered === id);
  useApp((s) => s.tick);
  if (!selected && !hovered) return null;
  const d = describe({ kind, id }, simNow());
  return (
    <Html position={[x, y, z]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div
        className={`flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold shadow-md ${
          selected ? "bg-brand text-white" : "bg-white text-slate-800"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[d.status.tone]} ${selected ? "ring-2 ring-white/70" : ""}`} />
        {kind === "xt" ? id : d.title}
        <span className={`font-medium ${selected ? "text-white/80" : "text-slate-500"}`}>{d.status.text}</span>
      </div>
    </Html>
  );
}

/** Shared pointer handlers for a clickable entity. */
export function usePick(kind: EntityKind, id: string) {
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  return {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      select({ kind, id });
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      hover(id);
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      hover(null);
      document.body.style.cursor = "";
    },
  };
}

export function useIsSelected(id: string) {
  return useApp((s) => s.selected?.id === id);
}
