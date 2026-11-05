"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { simNow, stsState } from "@/lib/sim";
import { registry } from "@/lib/store";
import { QUAY, type StsDef } from "@/lib/terminal";
import { Box, CONTAINER_GEO, Strut, mat, unitBox } from "./primitives";
import { Brackets, Tag, useIsSelected, usePick } from "./Selection";

const WHITE = "#eef2f6";
const BLUE = "#1a6fba";
const DARK = "#36414d";
const SPREADER = "#f0a920";

const SEA = QUAY.seaRailZ; // 6
const LAND = QUAY.landRailZ; // 36
const LEG_X = 9;
const BOOM_Y = 46.5;
const TROLLEY_Y = 49.4;
const APEX: [number, number, number] = [0, 70, LAND - 4];

export function StsCrane({ def }: { def: StsDef }) {
  const group = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const spreader = useRef<THREE.Group>(null);
  const ropes = useRef<THREE.Group>(null);
  const box = useRef<THREE.Mesh>(null);
  const pick = usePick("sts", def.id);
  const selected = useIsSelected(def.id);
  const boxMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.75 }), []);

  useEffect(() => {
    const g = group.current!;
    registry.set(def.id, g);
    return () => {
      registry.delete(def.id);
    };
  }, [def.id]);

  useFrame(() => {
    const s = stsState(def, simNow());
    trolley.current!.position.z = s.trolleyZ;
    spreader.current!.position.set(0, s.spreaderY, s.trolleyZ);
    const len = TROLLEY_Y - 1.2 - s.spreaderY;
    ropes.current!.position.set(0, s.spreaderY + len / 2, s.trolleyZ);
    ropes.current!.scale.y = Math.max(0.1, len);
    box.current!.visible = s.laden;
    boxMat.color.set(s.box.color);
  });

  return (
    <group ref={group} position={[def.x, 0, 0]} {...pick}>
      {/* portal legs + bogies */}
      {[-LEG_X, LEG_X].map((x) =>
        [SEA, LAND].map((z) => (
          <group key={`${x}${z}`}>
            <Box p={[x, 22.5, z]} s={[1.7, 45, 1.7]} c={WHITE} />
            <Box p={[x, 0.9, z]} s={[2.4, 1.8, 6]} c={DARK} />
          </group>
        )),
      )}
      {/* portal beams across the legs */}
      <Box p={[0, 44.2, SEA]} s={[LEG_X * 2 + 1.7, 2.2, 2]} c={WHITE} />
      <Box p={[0, 44.2, LAND]} s={[LEG_X * 2 + 1.7, 2.2, 2]} c={WHITE} />
      <Box p={[0, 14, SEA]} s={[LEG_X * 2, 1.2, 1.2]} c={WHITE} />
      <Box p={[0, 14, LAND]} s={[LEG_X * 2, 1.2, 1.2]} c={WHITE} />
      {/* side sill beams along the rails */}
      <Box p={[-LEG_X, 43, (SEA + LAND) / 2]} s={[1.4, 1.6, LAND - SEA]} c={WHITE} />
      <Box p={[LEG_X, 43, (SEA + LAND) / 2]} s={[1.4, 1.6, LAND - SEA]} c={WHITE} />
      <Strut a={[-LEG_X, 15, SEA]} b={[-LEG_X, 42, LAND]} r={0.45} c={WHITE} />
      <Strut a={[LEG_X, 15, SEA]} b={[LEG_X, 42, LAND]} r={0.45} c={WHITE} />

      {/* boom (seaward) + girder (landward) */}
      <Box p={[-4.5, BOOM_Y, -3.5]} s={[1.3, 3, 113]} c={WHITE} />
      <Box p={[4.5, BOOM_Y, -3.5]} s={[1.3, 3, 113]} c={WHITE} />
      <Box p={[0, BOOM_Y + 1.2, -59.5]} s={[10.3, 1.2, 1.6]} c={BLUE} />
      <Box p={[0, BOOM_Y + 1.2, -30]} s={[10.3, 0.8, 1]} c={WHITE} />
      <Box p={[0, BOOM_Y + 1.2, SEA - 4]} s={[10.3, 0.8, 1]} c={WHITE} />

      {/* A-frame apex and stays */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Strut a={[sx * LEG_X, 45, LAND]} b={[sx * 3.2, APEX[1], APEX[2]]} r={0.75} c={WHITE} />
          <Strut a={[sx * LEG_X, 45, SEA]} b={[sx * 3.2, APEX[1], APEX[2]]} r={0.6} c={WHITE} />
          <Strut a={[sx * 3.2, APEX[1], APEX[2]]} b={[sx * 4.5, BOOM_Y + 1.5, -59]} r={0.32} c={DARK} />
          <Strut a={[sx * 3.2, APEX[1], APEX[2]]} b={[sx * 4.5, BOOM_Y + 1.5, -28]} r={0.28} c={DARK} />
          <Strut a={[sx * 3.2, APEX[1], APEX[2]]} b={[sx * 4.5, BOOM_Y + 1.5, 52]} r={0.32} c={DARK} />
        </group>
      ))}
      <Box p={[0, APEX[1], APEX[2]]} s={[8, 1.6, 1.6]} c={BLUE} />

      {/* machinery house on the backreach */}
      <Box p={[0, 51.5, 47]} s={[12, 7, 11]} c={BLUE} />
      <Box p={[0, 55.3, 47]} s={[12.4, 0.6, 11.4]} c={WHITE} />

      {/* trolley + operator cab */}
      <group ref={trolley}>
        <Box p={[0, TROLLEY_Y, 0]} s={[10.5, 2.2, 7]} c={WHITE} />
        <Box p={[-3.2, TROLLEY_Y - 3.6, 0.5]} s={[2.6, 2.6, 3]} c={BLUE} />
        <Box p={[-3.2, TROLLEY_Y - 3.6, -1.05]} s={[2.4, 1.2, 0.1]} c="#1b2a38" shadow={false} />
      </group>

      {/* hoist ropes (scaled each frame) */}
      <group ref={ropes}>
        {[-3, 3].map((x) => (
          <mesh key={x} geometry={unitBox} material={mat(DARK)} position={[x, 0, 0]} scale={[0.12, 1, 0.12]} />
        ))}
      </group>

      {/* spreader + carried box */}
      <group ref={spreader}>
        <Box p={[0, 0.9, 0]} s={[3, 1.2, 2.2]} c={DARK} />
        <Box p={[0, 0, 0]} s={[12.4, 0.7, 2.7]} c={SPREADER} />
        <mesh ref={box} geometry={CONTAINER_GEO} material={boxMat} position={[0, -1.7, 0]} castShadow />
      </group>

      {selected && <Brackets min={[-12, 0, -61]} max={[12, 72, 54]} />}
      <Tag kind="sts" id={def.id} y={76} />
    </group>
  );
}
