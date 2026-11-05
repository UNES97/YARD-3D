"use client";

import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registry, useApp } from "@/lib/store";
import {
  ALL_BLOCKS,
  AREA_SLOT_Z0,
  BAY,
  ROW,
  type AreaDef,
  type BlockDef,
  blockLen,
  blockWidth,
  laneZ,
} from "@/lib/terminal";
import { YARD, type Box as YardBox } from "@/lib/yardgen";
import { GL } from "./Ground";
import { CONTAINER_GEO } from "./primitives";
import { Brackets, Tag } from "./Selection";

export function footprint(b: BlockDef) {
  if ("faceX" in b) {
    const a = b as AreaDef;
    const depth = a.rows * ROW;
    const z0 = AREA_SLOT_Z0 - BAY / 2;
    const z1 = AREA_SLOT_Z0 + (a.bays - 0.5) * BAY;
    return { cx: a.faceX + (a.dir * depth) / 2, cz: (z0 + z1) / 2, hx: depth / 2, hz: (z1 - z0) / 2, h: a.maxTier * 2.62 };
  }
  return { cx: b.x, cz: b.z, hx: blockLen(b) / 2, hz: blockWidth(b) / 2, h: b.maxTier * 2.62 };
}

export function Containers({ boxes, onPick }: { boxes: YardBox[]; onPick: (owner: string | null, click: boolean) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04 }), []);

  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    boxes.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.rotation.set(0, b.alongZ ? Math.PI / 2 : 0, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [boxes]);

  const owner = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId != null ? boxes[e.instanceId].owner : null);

  return (
    <instancedMesh
      ref={ref}
      args={[CONTAINER_GEO, material, boxes.length]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onPick(owner(e), true);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        onPick(owner(e), false);
      }}
      onPointerOut={() => onPick(null, false)}
    />
  );
}

function BlockAnchor({ b }: { b: BlockDef }) {
  const ref = useRef<THREE.Group>(null);
  const f = footprint(b);
  const selected = useApp((s) => s.selected?.id === b.id);
  useEffect(() => {
    const g = ref.current!;
    registry.set(b.id, g);
    return () => {
      registry.delete(b.id);
    };
  }, [b.id]);
  return (
    <group ref={ref} position={[f.cx, 0, f.cz]}>
      {selected && <Brackets min={[-f.hx - 1.5, 0, -f.hz - 1.5]} max={[f.hx + 1.5, f.h + 1.5, f.hz + 1.5]} />}
      <Tag kind="block" id={b.id} y={f.h + 5} />
    </group>
  );
}

export function Yard() {
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  const last = useRef<string | null>(null);

  const onPick = (owner: string | null, click: boolean) => {
    if (click) {
      if (owner) select({ kind: "block", id: owner });
      return;
    }
    if (owner === last.current) return;
    last.current = owner;
    hover(owner);
    document.body.style.cursor = owner ? "pointer" : "";
  };

  // painted block outlines + truck lane markings
  const marks = useMemo(() => {
    const pts: [number, number, number][] = [];
    const y = GL.mark;
    for (const b of ALL_BLOCKS) {
      const f = footprint(b);
      const x0 = f.cx - f.hx - 0.8;
      const x1 = f.cx + f.hx + 0.8;
      const z0 = f.cz - f.hz - 0.8;
      const z1 = f.cz + f.hz + 0.8;
      pts.push([x0, y, z0], [x1, y, z0], [x1, y, z0], [x1, y, z1], [x1, y, z1], [x0, y, z1], [x0, y, z1], [x0, y, z0]);
      if (!("faceX" in b)) {
        const lz = laneZ(b);
        for (let x = x0; x < x1 - 4; x += 8) pts.push([x, y, lz - 1.8], [x + 4, y, lz - 1.8]);
      }
    }
    return pts;
  }, []);

  return (
    <group>
      <Containers boxes={YARD.boxes} onPick={onPick} />
      <Line points={marks} segments color="#e0b13a" lineWidth={1.4} />
      {ALL_BLOCKS.map((b) => (
        <BlockAnchor key={b.id} b={b} />
      ))}
    </group>
  );
}
