"use client";

import clsx from "clsx";
import { Anchor, ArrowDownToLine, ArrowUpFromLine, Check, ChevronRight, Ship, Navigation } from "lucide-react";
import { vesselTimeline } from "@/lib/describe";
import { simNow } from "@/lib/sim";
import { useApp } from "@/lib/store";
import { STS, VESSEL } from "@/lib/terminal";
import { Pill } from "./bits";

type StepState = "done" | "active" | "todo";

function Step({ icon: Icon, label, sub, state, last }: { icon: React.ComponentType<{ className?: string }>; label: string; sub: string; state: StepState; last?: boolean }) {
  return (
    <div className="relative flex flex-1 flex-col items-center">
      {!last && <div className={clsx("absolute top-[15px] left-1/2 h-[3px] w-full", state === "done" ? "bg-brand" : "bg-slate-200")} />}
      <div
        className={clsx(
          "relative z-10 flex h-[30px] w-[30px] items-center justify-center rounded-full",
          state === "done" && "bg-brand text-white",
          state === "active" && "bg-brand text-white ring-4 ring-brand/20",
          state === "todo" && "bg-slate-100 text-slate-400",
        )}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      </div>
      <div className={clsx("mt-1.5 text-center text-[11.5px] font-semibold whitespace-nowrap", state === "todo" && "text-slate-400")}>{label}</div>
      <div className="text-[10.5px] whitespace-nowrap text-slate-500 tabular-nums">{sub}</div>
    </div>
  );
}

export function VesselTracker() {
  useApp((s) => s.tick);
  const select = useApp((s) => s.select);
  const tl = vesselTimeline(simNow());
  const v = tl.v;
  const discDone = v.discharged >= VESSEL.discharge;
  const loadDone = v.loaded >= VESSEL.load;
  const left = `${Math.floor(tl.leftMin / 60)}h ${String(Math.round(tl.leftMin % 60)).padStart(2, "0")}m`;

  return (
    <section className="card absolute bottom-4 left-4 z-20 hidden w-[min(780px,calc(100vw-440px))] items-center gap-4 p-4 md:flex">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-headline flex items-center gap-2 text-[14px] font-bold">
            <Ship className="h-4 w-4 text-brand" /> Vessel visit
          </div>
          <div className="truncate text-[11px] font-medium text-slate-500">
            {VESSEL.service} · voy {VESSEL.voyage} · {VESSEL.berth}
          </div>
        </div>
        <div className="flex">
          <Step icon={Navigation} label="Pilot on board" sub={tl.pilotOn} state="done" />
          <Step icon={Anchor} label="All fast" sub={tl.allFast} state="done" />
          <Step
            icon={ArrowDownToLine}
            label={`Discharge ${v.discharged.toLocaleString("en-IN")}/${VESSEL.discharge.toLocaleString("en-IN")}`}
            sub={discDone ? "complete" : "in progress"}
            state={discDone ? "done" : "active"}
          />
          <Step
            icon={ArrowUpFromLine}
            label={`Load ${v.loaded.toLocaleString("en-IN")}/${VESSEL.load.toLocaleString("en-IN")}`}
            sub={loadDone ? "complete" : discDone ? "in progress" : "next"}
            state={loadDone ? "done" : discDone ? "active" : "todo"}
          />
          <Step icon={Ship} label="Sail" sub={`ETD ${tl.etd}`} state="todo" last />
        </div>
      </div>
      <button
        onClick={() => select({ kind: "vessel", id: "VESSEL" })}
        className="hidden w-[230px] shrink-0 items-center gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-brand-50 xl:flex"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#3b9fcc] text-white">
          <Ship className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-headline truncate text-[13px] font-bold">{VESSEL.name}</div>
          <div className="truncate text-[10.5px] text-slate-500">
            {STS.length} STS · {VESSEL.prevPort} → {VESSEL.nextPort}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Pill tone="green">{v.mode}</Pill>
            <span className="text-[10.5px] text-slate-500">{left} to ETD</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </section>
  );
}
