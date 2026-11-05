"use client";

import { Gauge, Ship, Truck, Warehouse } from "lucide-react";
import { pct } from "@/lib/describe";
import { simNow, vesselMoves } from "@/lib/sim";
import { useApp } from "@/lib/store";
import { STS, TERMINAL, VESSEL } from "@/lib/terminal";
import { yardTotals } from "@/lib/yardgen";

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  deltaGood = true,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  deltaGood?: boolean;
  sub: string;
}) {
  return (
    <div className="card flex w-[196px] items-start gap-3 px-3.5 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50">
        <Icon className="h-[18px] w-[18px] text-brand" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-slate-500">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-headline text-[21px] font-bold tabular-nums">{value}</span>
          {delta && <span className={`text-[11px] font-semibold ${deltaGood ? "text-emerald-600" : "text-red-500"}`}>{delta}</span>}
        </div>
        <div className="truncate text-[10.5px] text-slate-400">{sub}</div>
      </div>
    </div>
  );
}

export function KpiCards() {
  useApp((s) => s.tick);
  const t = simNow();
  const v = vesselMoves(t);
  const y = yardTotals();
  const gcr = STS.reduce((s, c) => s + c.rate, 0) / STS.length;
  const gained = v.done - VESSEL.doneAtStart;
  const ttt = 38 - Math.min(3, Math.floor(t / 300));
  return (
    <div className="absolute top-[68px] left-4 z-20 hidden gap-3 lg:flex">
      <Kpi icon={Warehouse} label="Yard utilisation" value={pct(y.util)} delta="+0.6%" sub={`${y.teu.toLocaleString("en-IN")} TEU · ${TERMINAL.code}`} />
      <Kpi icon={Gauge} label="Gross crane rate" value={`${gcr.toFixed(1)} mph`} sub={`${STS.length} STS · ${VESSEL.berth}`} />
      <Kpi
        icon={Ship}
        label="Vessel moves"
        value={v.done.toLocaleString("en-IN")}
        delta={gained > 0 ? `+${gained}` : undefined}
        sub={`of ${v.total.toLocaleString("en-IN")} · ${VESSEL.name}`}
      />
      <Kpi icon={Truck} label="Truck turn time" value={`${ttt} min`} delta="−3 min" sub="External trucks · last 2 h" />
    </div>
  );
}
