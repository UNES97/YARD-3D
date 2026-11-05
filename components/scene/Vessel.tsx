"use client";

import { Line } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registry, useApp } from "@/lib/store";
import { VESSEL, VESSEL_CZ } from "@/lib/terminal";
import { VESSEL_BAYS, YARD } from "@/lib/yardgen";
import { Box, brandTexture, decalMaterial, mat } from "./primitives";
import { Brackets, Tag } from "./Selection";
import { Containers } from "./Yard";

const HULL_BLUE = "#3b9fcc";
const HALF = VESSEL.beam / 2;

function hullShape() {
  const s = new THREE.Shape();
  s.moveTo(VESSEL.x1, -HALF);
  s.lineTo(VESSEL.x1, HALF);
  s.lineTo(VESSEL.x0 + 42, HALF);
  s.quadraticCurveTo(VESSEL.x0 + 8, HALF - 2, VESSEL.x0, 0);
  s.quadraticCurveTo(VESSEL.x0 + 8, -HALF + 2, VESSEL.x0 + 42, -HALF);
  s.closePath();
  return s;
}

function starShape(r: number, inner: number, points = 7) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function useHullText() {
  return useMemo(
    () =>
      brandTexture(2048, 200, (g, family) => {
        g.fillStyle = "#ffffff";
        g.font = `700 150px ${family}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        // spread the letters like the real hull lettering
        const word = "MAERSK";
        const step = 200;
        [...word].forEach((ch, i) => g.fillText(ch, 1024 + (i - (word.length - 1) / 2) * step, 105));
      }),
    [],
  );
}

export function Vessel() {
  const ref = useRef<THREE.Group>(null);
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  const selected = useApp((s) => s.selected?.id === "VESSEL");
  const text = useHullText();
  const textMat = useMemo(() => decalMaterial(text, true), [text]);

  const geo = useMemo(() => {
    const shape = hullShape();
    const lower = new THREE.ExtrudeGeometry(shape, { depth: 5, bevelEnabled: false });
    const upper = new THREE.ExtrudeGeometry(shape, { depth: VESSEL.deckY + 2.4, bevelEnabled: false });
    const deck = new THREE.ShapeGeometry(shape);
    const star = new THREE.ShapeGeometry(starShape(3.2, 1.35));
    return { lower, upper, deck, star };
  }, []);

  useEffect(() => {
    const g = ref.current!;
    registry.set("VESSEL", g);
    return () => {
      registry.delete("VESSEL");
    };
  }, []);

  const pick = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      select({ kind: "vessel", id: "VESSEL" });
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      hover("VESSEL");
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      hover(null);
      document.body.style.cursor = "";
    },
  };

  const rot: [number, number, number] = [-Math.PI / 2, 0, 0];
  const BRIDGE_X = -56;
  const FUNNEL_X = 116;
  const D = VESSEL.deckY;

  return (
    <group>
      <group ref={ref} position={[0, 0, VESSEL_CZ]} {...pick}>
        <mesh geometry={geo.lower} material={mat("#8f2f2c")} rotation={rot} position={[0, -7.4, 0]} receiveShadow />
        <mesh geometry={geo.upper} material={mat(HULL_BLUE, { rough: 0.55 })} rotation={rot} position={[0, -2.4, 0]} castShadow receiveShadow />
        <mesh geometry={geo.deck} material={mat("#b9c2cc")} rotation={rot} position={[0, D + 0.02, 0]} receiveShadow />
        <mesh position={[10, 4.6, HALF + 0.3]} material={textMat}>
          <planeGeometry args={[90, 8.8]} />
        </mesh>

        {/* hatch covers */}
        {VESSEL_BAYS.map((b) => (
          <Box key={b.bay} p={[b.x, D + 0.3, 0]} s={[12.8, 0.6, VESSEL.beam - 4]} c="#6f7d8a" />
        ))}

        {/* deckhouse + bridge */}
        <Box p={[BRIDGE_X, D + 13, 0]} s={[11, 26, 30]} c="#f3f5f7" />
        <Box p={[BRIDGE_X - 5.55, D + 22, 0]} s={[0.1, 1.8, 29]} c="#1b2a38" shadow={false} />
        <Box p={[BRIDGE_X, D + 27.3, 0]} s={[9, 2.6, VESSEL.beam + 2]} c="#f3f5f7" />
        <Box p={[BRIDGE_X - 4.55, D + 27.3, 0]} s={[0.1, 1.2, VESSEL.beam + 1.6]} c="#1b2a38" shadow={false} />
        <Box p={[BRIDGE_X + 1, D + 32, 0]} s={[0.6, 7, 0.6]} c="#d9dee3" />

        {/* engine casing + funnel with the seven-pointed star */}
        <Box p={[FUNNEL_X, D + 4, 0]} s={[20, 8, 28]} c="#f3f5f7" />
        <Box p={[FUNNEL_X + 2, D + 14, 0]} s={[10, 14, 9]} c={HULL_BLUE} />
        <Box p={[FUNNEL_X + 2, D + 21.5, 0]} s={[10.2, 1.2, 9.2]} c="#1d242b" />
        <mesh geometry={geo.star} material={mat("#ffffff", { emissive: "#ffffff" })} position={[FUNNEL_X + 2, D + 15, 4.52]} />
        <mesh geometry={geo.star} material={mat("#ffffff", { emissive: "#ffffff" })} position={[FUNNEL_X + 2, D + 15, -4.52]} rotation={[0, Math.PI, 0]} />

        {selected && <Brackets min={[VESSEL.x0 - 2, -3, -HALF - 2]} max={[VESSEL.x1 + 2, D + 34, HALF + 2]} />}
        <Tag kind="vessel" id="VESSEL" y={D + 40} x={BRIDGE_X} />
      </group>

      <Containers
        boxes={YARD.vessel}
        onPick={(owner, click) => {
          if (click && owner) select({ kind: "vessel", id: "VESSEL" });
          else if (!click) hover(owner ? "VESSEL" : null);
        }}
      />

      {/* mooring lines to the quay bollards */}
      {[
        [VESSEL.x0 + 30, -150],
        [VESSEL.x0 + 52, -122],
        [VESSEL.x1 - 20, 152],
        [VESSEL.x1 - 40, 120],
      ].map(([sx, bx]) => (
        <Line key={sx} points={[[sx, D - 0.5, VESSEL.zIn], [bx, 0.9, 1.6]]} color="#4b5562" lineWidth={1.2} />
      ))}
    </group>
  );
}
