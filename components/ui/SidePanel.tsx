"use client";

import clsx from "clsx";
import { ChevronRight, Crosshair, X } from "lucide-react";
import { describe, pct } from "@/lib/describe";
import { simNow, type Tone } from "@/lib/sim";
import { useApp, type EntityKind } from "@/lib/store";
import { ALL_BLOCKS, RTGS, SHUTTLES, STS, TERMINAL, TTS, XTS } from "@/lib/terminal";
import { YARD, yardTotals } from "@/lib/yardgen";
import { Bar, Pill, TEXT_TONE, utilTone } from "./bits";

function Stat({ label, value, sub, bar, tone = "green" }: { label: string; value: string; sub: string; bar: number; tone?: Tone }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-[10.5px] font-medium text-slate-500">{label}</div>
      <div className="font-headline text-[16px] font-bold tabular-nums">
        {value} <span className="text-[11px] font-medium text-slate-400">{sub}</span>
      </div>
      <Bar value={bar} tone={tone} className="mt-1.5" />
    </div>
  );
}

function TerminalCard() {
  useApp((s) => s.tick);
  const select = useApp((s) => s.select);
  const t = simNow();
  const y = yardTotals();
  const rf = YARD.stats.RF;
  const gate = 612 + Math.floor(t / 45);
  const fleet: { k: string; on: number; total: number }[] = [
    { k: "Quay cranes (STS)", on: STS.length, total: STS.length },
    { k: "RTGs", on: RTGS.filter((r) => r.status === "working").length, total: RTGS.length },
    { k: "Reach stackers", on: SHUTTLES.filter((s) => s.kind === "rs" && s.status === "working").length, total: SHUTTLES.filter((s) => s.kind === "rs").length },
    { k: "Empty handlers", on: SHUTTLES.filter((s) => s.kind === "eh" && s.status === "working").length, total: SHUTTLES.filter((s) => s.kind === "eh").length },
    { k: "Terminal tractors", on: TTS.length, total: TTS.length + 2 },
  ];
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-[11px] font-bold text-white">GTI</div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-wider text-brand uppercase">Terminal · {TERMINAL.code}</div>
          <div className="font-headline text-[17px] leading-tight font-bold">{TERMINAL.name}</div>
          <div className="truncate text-[11px] text-slate-500">
            {TERMINAL.legal} · {TERMINAL.location}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Pill tone="green">Operational</Pill>
        <span className="text-[11px] text-slate-500">
          1 vessel · {STS.length} STS · {TTS.length} TT · {XTS.length} trucks in yard
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Yard" value={pct(y.util)} sub={`${(y.teu / 1000).toFixed(1)}k TEU`} bar={y.util} tone={utilTone(y.util)} />
        <Stat label="Berths busy" value="1" sub={`/ ${TERMINAL.berths}`} bar={1 / TERMINAL.berths} tone="blue" />
        <Stat label="Reefer plugs" value={`${rf.reefers}`} sub={`/ ${TERMINAL.reeferPlugs}`} bar={rf.reefers / TERMINAL.reeferPlugs} />
        <Stat label="Gate moves today" value={gate.toLocaleString("en-IN")} sub="trucks" bar={gate / 1100} tone="blue" />
      </div>

      <div className="mt-4 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>Yard blocks</span>
        <span className="font-medium">fill</span>
      </div>
      <div className="space-y-0.5">
        {ALL_BLOCKS.map((b) => {
          const s = YARD.stats[b.id];
          return (
            <button
              key={b.id}
              onClick={() => select({ kind: "block", id: b.id })}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-slate-50"
            >
              <span className="w-[86px] truncate text-[12px] font-semibold">{b.name}</span>
              <span className="w-[78px] truncate text-[10.5px] text-slate-400">{b.kind}</span>
              <Bar value={s.util} tone={utilTone(s.util)} className="flex-1" />
              <span className={clsx("w-9 text-right text-[11px] font-semibold tabular-nums", s.util > 0.85 ? "text-amber-600" : "text-slate-600")}>{pct(s.util)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 mb-1.5 text-[11px] font-semibold text-slate-500">Equipment fleet</div>
      <div className="space-y-1.5">
        {fleet.map((f) => (
          <div key={f.k} className="flex items-center justify-between text-[12px]">
            <span className="text-slate-600">{f.k}</span>
            <span className="font-semibold tabular-nums">
              {f.on}/{f.total} <span className="font-medium text-slate-400">working</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function DetailCard({ kind, id }: { kind: EntityKind; id: string }) {
  useApp((s) => s.tick);
  const select = useApp((s) => s.select);
  const d = describe({ kind, id }, simNow());
  const lineTotal = d.lines?.reduce((s, l) => s + l.count, 0) ?? 0;
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-bold tracking-wider text-brand uppercase">{d.kindLabel}</div>
          <div className="font-headline truncate text-[18px] leading-tight font-bold">{d.title}</div>
          <div className="truncate text-[11px] text-slate-500">{d.subtitle}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => select({ kind, id })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand" title="Focus camera">
            <Crosshair className="h-4 w-4" />
          </button>
          <button onClick={() => select(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Pill tone={d.status.tone}>{d.status.text}</Pill>
        <span className="truncate text-[11.5px] text-slate-600">{d.note}</span>
      </div>

      {d.progress && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-slate-500">{d.progress.label}</span>
            <span className="font-semibold tabular-nums">{d.progress.right}</span>
          </div>
          <Bar value={d.progress.value} tone={d.status.tone === "red" ? "red" : d.progress.value > 0.85 && kind === "block" ? "amber" : "green"} />
        </div>
      )}

      <div className="mt-3 divide-y divide-slate-100">
        {d.rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3 py-[7px] text-[12px]">
            <span className="shrink-0 text-slate-500">{r.k}</span>
            {r.link ? (
              <button onClick={() => select(r.link!)} className="flex min-w-0 items-center gap-0.5 truncate font-semibold text-brand hover:underline">
                {r.v}
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : (
              <span className={clsx("truncate text-right font-semibold tabular-nums", r.tone && TEXT_TONE[r.tone])}>{r.v}</span>
            )}
          </div>
        ))}
      </div>

      {d.lines && lineTotal > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-semibold text-slate-500">Boxes by carrier</div>
          <div className="flex h-2 overflow-hidden rounded-full">
            {d.lines.map((l) => (
              <div key={l.name} style={{ width: `${(l.count / lineTotal) * 100}%`, background: l.color }} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {d.lines.slice(0, 6).map((l) => (
              <div key={l.name} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
                <span className="flex-1 truncate text-slate-600">{l.name}</span>
                <span className="font-semibold tabular-nums">{Math.round((l.count / lineTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function SidePanel() {
  const selected = useApp((s) => s.selected);
  return (
    <aside className="card scroll-thin absolute top-[68px] right-4 z-20 max-h-[calc(100vh-328px)] w-[308px] overflow-y-auto p-4">
      {selected ? <DetailCard kind={selected.kind} id={selected.id} /> : <TerminalCard />}
    </aside>
  );
}
