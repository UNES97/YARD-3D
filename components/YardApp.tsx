"use client";

import { useEffect } from "react";
import { useApp, type EntityKind, type FleetTab } from "@/lib/store";
import Scene from "./scene/Scene";
import { FleetTable } from "./ui/FleetTable";
import { KpiCards } from "./ui/KpiCards";
import { MapControls } from "./ui/MapControls";
import { SidePanel } from "./ui/SidePanel";
import { TopBar } from "./ui/TopBar";
import { VesselTracker } from "./ui/VesselTracker";

const TAB_FOR: Partial<Record<EntityKind, FleetTab>> = { sts: "sts", rtg: "yard", rs: "yard", eh: "yard", tt: "tt", xt: "tt" };

export default function YardApp() {
  const bump = useApp((s) => s.bump);
  const selected = useApp((s) => s.selected);
  const setTab = useApp((s) => s.setTab);

  // panels refresh once a second; the 3D scene animates every frame
  useEffect(() => {
    const id = setInterval(bump, 1000);
    return () => clearInterval(id);
  }, [bump]);

  useEffect(() => {
    const tab = selected && TAB_FOR[selected.kind];
    if (tab) setTab(tab);
  }, [selected, setTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useApp.getState().select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <div className="absolute inset-0 top-14">
        <Scene />
      </div>
      <TopBar />
      <KpiCards />
      <MapControls />
      <SidePanel />
      <VesselTracker />
      <FleetTable />
    </main>
  );
}
