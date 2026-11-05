"use client";

import clsx from "clsx";
import { Bell, Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENTITIES, fmtTime, pct } from "@/lib/describe";
import { useApp } from "@/lib/store";
import { OTHER_TERMINALS, TERMINAL } from "@/lib/terminal";
import { yardTotals } from "@/lib/yardgen";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect width="30" height="30" rx="7" fill="#1a6fba" />
        <rect x="6" y="15" width="8" height="8" rx="1.2" fill="#ffffff" />
        <rect x="16" y="15" width="8" height="8" rx="1.2" fill="#f26522" />
        <rect x="11" y="6" width="8" height="8" rx="1.2" fill="#9fd0f0" />
      </svg>
      <div className="leading-tight">
        <div className="font-headline text-[16px] font-bold">APMT Yard & Quay</div>
        <div className="text-[10.5px] font-medium text-slate-500">Compass · Live operations</div>
      </div>
    </div>
  );
}

function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const select = useApp((s) => s.select);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    // name matches rank above matches on the hint text
    const score = (e: (typeof ENTITIES)[number]) => {
      const label = e.label.toLowerCase();
      if (label === s || e.id.toLowerCase() === s) return 0;
      if (label.startsWith(s)) return 1;
      if (label.includes(s)) return 2;
      if (e.hint.toLowerCase().includes(s)) return 3;
      return 9;
    };
    return ENTITIES.map((e) => ({ e, sc: score(e) }))
      .filter((x) => x.sc < 9)
      .sort((p, q) => p.sc - q.sc)
      .slice(0, 8)
      .map((x) => x.e);
  }, [q]);

  const go = (i: number) => {
    const r = results[i];
    if (!r) return;
    select({ kind: r.kind, id: r.id });
    setQ("");
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="relative hidden w-[340px] md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(0);
          if (e.key === "Escape") input.current?.blur();
        }}
        placeholder="Search cranes, RTGs, tractors, blocks, vessel…"
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-9 text-[13px] outline-none placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
      <kbd className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-slate-200 px-1.5 text-[10px] text-slate-400">/</kbd>
      {open && results.length > 0 && (
        <div className="card absolute top-11 left-0 z-50 w-full overflow-hidden p-1">
          {results.map((r, i) => (
            <button
              key={r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(i)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] hover:bg-brand-50"
            >
              <span className="font-semibold">{r.label}</span>
              <span className="text-[11px] text-slate-500">{r.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TerminalSwitcher() {
  const [open, setOpen] = useState(false);
  const totals = yardTotals();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1 pr-2 pl-1 hover:border-slate-300"
      >
        <span className="rounded-lg bg-brand px-1.5 py-1 text-[10px] font-bold text-white">{TERMINAL.code}</span>
        <span className="text-left leading-tight">
          <span className="block text-[13px] font-semibold">{TERMINAL.name}</span>
          <span className="block text-[10.5px] text-slate-500">
            {pct(totals.util)} yard · 1/{TERMINAL.berths} berths busy
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="card absolute top-12 left-0 z-50 w-64 p-1.5" onMouseLeave={() => setOpen(false)}>
          <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-[13px] font-semibold">
            <span>
              {TERMINAL.name} <span className="text-[11px] font-medium text-slate-500">· {TERMINAL.code}</span>
            </span>
            <Check className="h-4 w-4 text-brand" />
          </div>
          {OTHER_TERMINALS.map((t) => (
            <div key={t.code} className="flex cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-[13px] text-slate-400">
              <span>
                {t.name} <span className="text-[11px]">· {t.code}</span>
              </span>
              <span className="text-[10px] font-medium">Soon</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  useApp((s) => s.tick);
  return (
    <header className="absolute inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <Logo />
        <SearchBox />
      </div>
      <div className="flex items-center gap-3">
        <TerminalSwitcher />
        <span className="hidden rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 lg:inline">Simulated data</span>
        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live {fmtTime(new Date())} IST
        </span>
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className={clsx("hidden items-center gap-2.5 sm:flex")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-sky-400 text-[12px] font-bold text-white">DM</div>
          <div className="hidden leading-tight xl:block">
            <div className="text-[13px] font-semibold">Duty Manager</div>
            <div className="text-[10.5px] text-slate-500">Control tower</div>
          </div>
        </div>
      </div>
    </header>
  );
}
