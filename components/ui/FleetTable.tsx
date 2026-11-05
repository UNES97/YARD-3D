"use client";

import clsx from "clsx";
import { ChevronRight, LayoutList } from "lucide-react";
import { summarize } from "@/lib/describe";
import { simNow } from "@/lib/sim";
import { useApp, type EntityKind, type FleetTab } from "@/lib/store";
import { RTGS, SHUTTLES, STS, TERMINAL, TTS, XTS } from "@/lib/terminal";
import { Bar, Pill } from "./bits";

const ROWS: Record<FleetTab, { kind: EntityKind; id: string }[]> = {
  sts: STS.map((s) => ({ kind: "sts", id: s.id })),
  yard: [...RTGS.map((r) => ({ kind: "rtg" as const, id: r.id })), ...SHUTTLES.map((s) => ({ kind: s.kind, id: s.id }))],
  tt: [...TTS.map((t) => ({ kind: "tt" as const, id: t.id })), ...XTS.map((x) => ({ kind: "xt" as const, id: x.id }))],
};

const workingYard = RTGS.filter((r) => r.status === "working").length + SHUTTLES.filter((s) => s.status === "working").length;

const TABS: { key: FleetTab; label: string; count: string }[] = [
  { key: "sts", label: "Quay cranes", count: `${STS.length}/${STS.length}` },
  { key: "yard", label: "Yard", count: `${workingYard}/${ROWS.yard.length}` },
  { key: "tt", label: "TT & trucks", count: `${ROWS.tt.length}` },
];

export function FleetTable() {
  useApp((s) => s.tick);
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const select = useApp((s) => s.select);
  const selectedId = useApp((s) => s.selected?.id);
  const t = simNow();

  return (
    <section className="card absolute right-4 bottom-4 z-20 w-[400px] max-w-[calc(100vw-32px)] p-2.5">
      <div className="mb-1.5 flex items-center gap-1 px-1">
        <LayoutList className="mr-1 h-4 w-4 text-brand" />
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={clsx(
              "rounded-lg px-2 py-1 text-[11.5px] font-semibold whitespace-nowrap",
              tab === tb.key ? "bg-brand-50 text-ink" : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {tb.label} <span className="text-brand">{tb.count}</span>
          </button>
        ))}
        <span className="ml-auto hidden pr-1 text-[10.5px] text-slate-400 sm:inline">{TERMINAL.code}</span>
      </div>
      <div className="scroll-thin max-h-[164px] overflow-y-auto">
        {ROWS[tab].map((r) => {
          const s = summarize(r.kind, r.id, t);
          return (
            <button
              key={r.id}
              onClick={() => select(r)}
              className={clsx(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-left",
                selectedId === r.id ? "bg-brand-50" : "hover:bg-slate-50",
              )}
            >
              <div className="w-[62px] shrink-0 leading-tight">
                <div className="text-[12px] font-bold">{s.title}</div>
                <div className="truncate text-[10px] text-slate-400">{s.sub}</div>
              </div>
              <div className="min-w-0 flex-1 truncate text-[11.5px] text-slate-600">{s.desc}</div>
              <Pill tone={s.status.tone} className="w-[72px] justify-center">
                {s.status.text}
              </Pill>
              <div className="w-[52px] shrink-0">
                {s.progress != null && <Bar value={s.progress} tone="green" />}
                {s.right && <div className="mt-0.5 text-right text-[10px] font-medium text-slate-500 tabular-nums">{s.right}</div>}
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
