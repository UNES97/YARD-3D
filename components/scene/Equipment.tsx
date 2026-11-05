"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  SHUTTLE_REACH,
  rtgState,
  shuttleState,
  simNow,
  ttState,
  xtState,
  type VehicleState,
} from "@/lib/sim";
import { registry, type EntityKind } from "@/lib/store";
import {
  CONTAINER,
  RTG_LEG_Z,
  TRAILER_Y,
  blockById,
  type RtgDef,
  type ShuttleDef,
  type TtDef,
  type XtDef,
} from "@/lib/terminal";
import { Box, CONTAINER_GEO, Wheel, mat, unitBox, wheelGeo } from "./primitives";
import { Brackets, Tag, useIsSelected, usePick } from "./Selection";

const WHITE = "#f1f4f7";
const BLUE = "#1a6fba";
const DARK = "#36414d";
const SPREADER = "#f0a920";

function useRegister(id: string, ref: React.RefObject<THREE.Object3D | null>) {
  useEffect(() => {
    const o = ref.current!;
    registry.set(id, o);
    return () => {
      registry.delete(id);
    };
  }, [id, ref]);
}

function useBoxMat() {
  return useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75 }), []);
}

// ------------------------------------------------------------------ RTG

export function Rtg({ def }: { def: RtgDef }) {
  const b = blockById(def.block);
  const group = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const spreader = useRef<THREE.Group>(null);
  const ropes = useRef<THREE.Group>(null);
  const box = useRef<THREE.Mesh>(null);
  const boxMat = useBoxMat();
  const pick = usePick("rtg", def.id);
  const selected = useIsSelected(def.id);
  useRegister(def.id, group);

  const TOP = 23;
  const span = RTG_LEG_Z.b - RTG_LEG_Z.a;
  const midZ = (RTG_LEG_Z.a + RTG_LEG_Z.b) / 2;
  const accent = def.status === "maintenance" ? "#d94033" : BLUE;

  useFrame(() => {
    const s = rtgState(def, simNow());
    group.current!.position.x = s.x;
    trolley.current!.position.z = s.trolleyZ;
    spreader.current!.position.set(0, s.spreaderY, s.trolleyZ);
    const len = TOP + 0.6 - s.spreaderY;
    ropes.current!.position.set(0, s.spreaderY + len / 2, s.trolleyZ);
    ropes.current!.scale.y = Math.max(0.1, len);
    box.current!.visible = s.laden;
    boxMat.color.set(def.seed % 2 ? "#3ea6d3" : "#e2762e");
  });

  return (
    <group ref={group} position={[b.x, 0, b.z]} {...pick}>
      {[RTG_LEG_Z.a, RTG_LEG_Z.b].map((z) => (
        <group key={z}>
          {[-3.6, 3.6].map((x) => (
            <Box key={x} p={[x, TOP / 2, z]} s={[1.2, TOP, 1.2]} c={WHITE} />
          ))}
          <Box p={[0, 1.6, z]} s={[10.4, 1.3, 1.8]} c={DARK} />
          <Box p={[0, TOP, z]} s={[8.6, 1.6, 1.6]} c={accent} />
          <Box p={[0, 9, z]} s={[7.2, 0.7, 0.7]} c={WHITE} />
          {[-4.4, 4.4].map((x) => (
            <Wheel key={x} p={[x, 0.55, z]} />
          ))}
        </group>
      ))}
      {[-3.6, 3.6].map((x) => (
        <Box key={x} p={[x, TOP + 0.3, midZ]} s={[1.2, 2, span + 1.2]} c={accent} />
      ))}
      {/* e-house / genset */}
      <Box p={[0, 4.2, RTG_LEG_Z.a - 1.6]} s={[6, 3.6, 2.4]} c={WHITE} />
      {def.status === "maintenance" && <Box p={[0, TOP + 1.8, RTG_LEG_Z.a]} s={[0.8, 0.8, 0.8]} c="#ff5a3c" emissive="#ff3b1f" />}

      <group ref={trolley}>
        <Box p={[0, TOP + 1.9, 0]} s={[8.2, 1.8, 5]} c={WHITE} />
        <Box p={[-2.6, TOP - 1.4, 0]} s={[2, 2.2, 2.4]} c={accent} />
      </group>
      <group ref={ropes}>
        {[-2.4, 2.4].map((x) => (
          <mesh key={x} geometry={unitBox} material={mat(DARK)} position={[x, 0, 0]} scale={[0.1, 1, 0.1]} />
        ))}
      </group>
      <group ref={spreader}>
        <Box p={[0, 0, 0]} s={[12.4, 0.6, 2.6]} c={SPREADER} />
        <mesh ref={box} geometry={CONTAINER_GEO} material={boxMat} position={[0, -1.6, 0]} castShadow />
      </group>

      {selected && <Brackets min={[-6.5, 0, RTG_LEG_Z.a - 3]} max={[6.5, TOP + 3, RTG_LEG_Z.b + 1]} />}
      <Tag kind="rtg" id={def.id} y={TOP + 6} />
    </group>
  );
}

// ------------------------------------------------------------------ road vehicles

function Vehicle({
  kind,
  id,
  state,
  cab,
  tall,
}: {
  kind: EntityKind;
  id: string;
  state: (t: number) => VehicleState;
  cab: string;
  tall?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const box = useRef<THREE.Mesh>(null);
  const boxMat = useBoxMat();
  const pick = usePick(kind, id);
  const selected = useIsSelected(id);
  useRegister(id, group);

  useFrame(() => {
    const s = state(simNow());
    const g = group.current!;
    g.position.set(s.x, 0, s.z);
    // ease the heading so corners look natural
    let dh = s.heading - g.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.rotation.y += dh * 0.35;
    box.current!.visible = s.laden;
    boxMat.color.set(s.box.color);
  });

  const cabH = tall ? 3.1 : 2.5;
  return (
    <group ref={group} {...pick}>
      <Box p={[5.3, 0.9 + cabH / 2, 0]} s={[2.4, cabH, 2.5]} c={cab} />
      <Box p={[6.52, 1.3 + cabH / 2, 0]} s={[0.06, cabH * 0.42, 2.1]} c="#1b2a38" shadow={false} />
      {tall && <Box p={[4.0, 2.2, 0]} s={[0.4, 2.6, 2.3]} c={DARK} />}
      <Box p={[-1.2, 1.2, 0]} s={[13, 0.45, 2.4]} c={DARK} />
      {[5.6, 3.7, -5.4, -6.6].map((x) =>
        [-1.05, 1.05].map((z) => <Wheel key={`${x}${z}`} p={[x, 0.55, z]} />),
      )}
      <mesh ref={box} geometry={CONTAINER_GEO} material={boxMat} position={[-1.4, TRAILER_Y + CONTAINER.H / 2, 0]} castShadow />
      {selected && <Brackets min={[-8.2, 0, -1.7]} max={[6.8, 4.8, 1.7]} />}
      <Tag kind={kind} id={id} y={7} />
    </group>
  );
}

export function Tractor({ def }: { def: TtDef }) {
  const state = useMemo(() => (t: number) => ttState(def, t), [def]);
  return <Vehicle kind="tt" id={def.id} state={state} cab="#f0a920" />;
}

export function Truck({ def }: { def: XtDef }) {
  const state = useMemo(() => (t: number) => xtState(def, t), [def]);
  return <Vehicle kind="xt" id={def.id} state={state} cab={def.cab} tall />;
}

// ------------------------------------------------------------------ reach stacker / empty handler

const bigWheel = wheelGeo.clone().scale(1.7, 1.7, 1.4);

export function Shuttle({ def }: { def: ShuttleDef }) {
  const group = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Group>(null);
  const carriage = useRef<THREE.Group>(null);
  const box = useRef<THREE.Mesh>(null);
  const boxMat = useBoxMat();
  const pick = usePick(def.kind, def.id);
  const selected = useIsSelected(def.id);
  useRegister(def.id, group);

  const rs = def.kind === "rs";
  const reach = SHUTTLE_REACH[def.kind];
  const body = rs ? "#f26522" : "#d94033";
  const PIVOT: [number, number] = [-2.8, 3.6];

  useFrame(() => {
    const s = shuttleState(def, simNow());
    group.current!.position.set(s.x, 0, s.z);
    group.current!.rotation.y = s.heading;
    const topY = s.boxY + CONTAINER.H;
    carriage.current!.position.y = s.boxY;
    box.current!.visible = s.laden;
    boxMat.color.set(s.box.color);
    if (rs && boom.current) {
      const dx = reach - PIVOT[0];
      const dy = topY + 0.8 - PIVOT[1];
      boom.current.rotation.z = Math.atan2(dy, dx);
      boom.current.scale.x = Math.hypot(dx, dy);
    }
  });

  return (
    <group ref={group} {...pick}>
      <Box p={[0, 1.7, 0]} s={[rs ? 7.6 : 5.8, 1.7, 3.2]} c={body} />
      <Box p={[rs ? -3.9 : -3.1, 2.3, 0]} s={[1.3, 2.7, 3.2]} c={DARK} />
      <Box p={[rs ? 0.4 : -0.6, 3.9, rs ? -0.9 : 0]} s={[2, 2.4, 1.6]} c={body} />
      <Box p={[rs ? 1.42 : 0.42, 4.2, rs ? -0.9 : 0]} s={[0.06, 1.2, 1.4]} c="#1b2a38" shadow={false} />
      {[rs ? 2.5 : 1.8, rs ? -2.4 : -2].map((x) =>
        [-1.55, 1.55].map((z) => (
          <mesh key={`${x}${z}`} geometry={bigWheel} material={mat("#1f262e", { rough: 0.9 })} position={[x, 0.95, z]} castShadow />
        )),
      )}

      {rs ? (
        <group ref={boom} position={[PIVOT[0], PIVOT[1], 0]}>
          <mesh geometry={unitBox} material={mat(body)} position={[0.5, 0, 0]} scale={[1, 1.1, 1.1]} castShadow />
        </group>
      ) : (
        <>
          {[-1.3, 1.3].map((z) => (
            <Box key={z} p={[3.4, 9.5, z]} s={[0.5, 19, 0.5]} c={DARK} />
          ))}
          <Box p={[3.4, 19, 0]} s={[0.6, 0.6, 3.1]} c={DARK} />
        </>
      )}

      <group ref={carriage}>
        {rs ? (
          <Box p={[reach, CONTAINER.H + 0.35, 0]} s={[2.6, 0.6, 12.4]} c={SPREADER} />
        ) : (
          <Box p={[reach - CONTAINER.W / 2 - 0.35, CONTAINER.H / 2 + 0.3, 0]} s={[0.5, CONTAINER.H + 0.6, 12.2]} c={SPREADER} />
        )}
        <mesh
          ref={box}
          geometry={CONTAINER_GEO}
          material={boxMat}
          position={[reach, CONTAINER.H / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        />
      </group>

      {selected && <Brackets min={[-5, 0, -6.6]} max={[reach + 1.6, rs ? 12 : 20, 6.6]} />}
      <Tag kind={def.kind} id={def.id} y={rs ? 14 : 22} />
    </group>
  );
}
