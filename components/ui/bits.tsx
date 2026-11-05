import clsx from "clsx";
import type { Tone } from "@/lib/sim";

const PILL: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-brand-50 text-brand",
  grey: "bg-slate-100 text-slate-500",
  red: "bg-red-50 text-red-600",
};

const BAR: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-brand",
  grey: "bg-slate-400",
  red: "bg-red-500",
};

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", PILL[tone], className)}>
      {children}
    </span>
  );
}

export function Bar({ value, tone = "green", className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={clsx("h-1.5 overflow-hidden rounded-full bg-slate-200/80", className)}>
      <div className={clsx("h-full rounded-full transition-[width] duration-700", BAR[tone])} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

export const TEXT_TONE: Record<Tone, string> = {
  green: "text-emerald-600",
  amber: "text-amber-600",
  blue: "text-brand",
  grey: "text-slate-500",
  red: "text-red-600",
};

export function utilTone(u: number): Tone {
  return u > 0.85 ? "amber" : "green";
}
