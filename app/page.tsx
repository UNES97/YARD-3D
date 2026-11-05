"use client";

import dynamic from "next/dynamic";

// The whole view runs on the simulation clock in the browser, so skip SSR.
const YardApp = dynamic(() => import("@/components/YardApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-sm text-slate-500">Loading terminal…</div>
  ),
});

export default function Page() {
  return <YardApp />;
}
