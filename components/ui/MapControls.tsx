"use client";

import { Home, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useApp, type CamCmd } from "@/lib/store";

const BUTTONS: { cmd: CamCmd; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { cmd: "in", icon: Plus, label: "Zoom in" },
  { cmd: "out", icon: Minus, label: "Zoom out" },
  { cmd: "rotL", icon: RotateCcw, label: "Rotate left" },
  { cmd: "rotR", icon: RotateCw, label: "Rotate right" },
  { cmd: "home", icon: Home, label: "Reset view" },
];

export function MapControls() {
  const camCmd = useApp((s) => s.camCmd);
  return (
    <div className="card absolute top-[68px] right-[336px] z-20 hidden flex-col p-1 md:flex">
      {BUTTONS.map(({ cmd, icon: Icon, label }) => (
        <button key={cmd} onClick={() => camCmd(cmd)} title={label} aria-label={label} className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand">
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
