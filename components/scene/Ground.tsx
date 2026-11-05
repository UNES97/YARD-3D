"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { QUAY } from "@/lib/terminal";
import { mulberry32 } from "@/lib/yardgen";
import { Box, SignBoard, brandTexture, mat, unitBox, unitCyl } from "./primitives";

const PAVE = "#e2e7ec";
const ROAD = "#d0d7de";
const APRON = "#e9edf1";
const LAND = "#edf1f3";

type V3 = [number, number, number];

const treeGeo = new THREE.SphereGeometry(0.5, 10, 8);

/** Many copies of one mesh, given position + scale per instance. */
function Instances({ geo, color, items, shadow = true }: { geo: THREE.BufferGeometry; color: string; items: { p: V3; s: V3 }[]; shadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat(color), items.length]} castShadow={shadow} receiveShadow />;
}

/** Heights of the flat ground layers (metres). */
export const GL = { pave: 0.05, apron: 0.1, road: 0.15, mark: 0.22 };

function Slab({ x0, x1, z0, z1, y = GL.road, c }: { x0: number; x1: number; z0: number; z1: number; y?: number; c: string }) {
  return (
    <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[x1 - x0, z1 - z0]} />
      <meshStandardMaterial color={c} roughness={0.95} />
    </mesh>
  );
}

function useSignTexture(text: string, color: string, bg: string) {
  return useMemo(
    () =>
      brandTexture(1024, 160, (g, family) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, 1024, 160);
        g.fillStyle = color;
        g.textAlign = "center";
        g.textBaseline = "middle";
        // shrink the font until the text fits the board with some margin
        let size = 88;
        g.font = `700 ${size}px ${family}`;
        while (g.measureText(text).width > 1024 - 80 && size > 30) {
          size -= 4;
          g.font = `700 ${size}px ${family}`;
        }
        g.fillText(text, 512, 84);
      }),
    [text, color, bg],
  );
}

function Tug() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current!;
    g.position.y = -2.6 + Math.sin(clock.elapsedTime * 0.9) * 0.15;
    g.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.015;
  });
  return (
    <group ref={ref} position={[-178, -2.6, -30]} rotation={[0, 0.3, 0]}>
      <Box p={[0, 0, 0]} s={[22, 2.6, 8.5]} c="#1f2a35" />
      <Box p={[0, 1.6, 0]} s={[22.2, 0.6, 8.7]} c="#c0392b" />
      <Box p={[2, 3.6, 0]} s={[8, 3.6, 6]} c="#f3f5f7" />
      <Box p={[2.5, 6.4, 0]} s={[5, 2, 5]} c="#f3f5f7" />
      <Box p={[-1, 6.6, 0]} s={[1.6, 3.4, 1.6]} c="#3b9fcc" />
    </group>
  );
}

export function Ground() {
  const gateSign = useSignTexture("APM TERMINALS · MUMBAI", "#ffffff", "#1a6fba");
  const adminSign = useSignTexture("APM TERMINALS", "#f26522", "#ffffff");

  const scenery = useMemo(() => {
    const rnd = mulberry32(7);
    const trees: { p: V3; s: V3 }[] = [];
    const trunks: { p: V3; s: V3 }[] = [];
    const addTree = (x: number, z: number) => {
      const k = 0.8 + rnd() * 0.5;
      trees.push({ p: [x, 7 * k, z], s: [7 * k, 8 * k, 7 * k] });
      trunks.push({ p: [x, 2 * k, z], s: [0.7, 4 * k, 0.7] });
    };
    for (let x = -270; x <= 270; x += 17) if (Math.abs(x) > 34) addTree(x + rnd() * 4, 326 + rnd() * 6);
    for (let z = 70; z <= 320; z += 18) {
      addTree(-288 - rnd() * 6, z);
      addTree(288 + rnd() * 6, z);
    }
    for (let i = 0; i < 8; i++) addTree(-150 + i * 9, 278 + rnd() * 4);

    const posts: { p: V3; s: V3 }[] = [];
    for (let z = 40; z <= 315; z += 7) {
      posts.push({ p: [-276, 1.4, z], s: [0.25, 2.8, 0.25] });
      posts.push({ p: [276, 1.4, z], s: [0.25, 2.8, 0.25] });
    }
    for (let x = -276; x <= 276; x += 7) if (Math.abs(x) > 26) posts.push({ p: [x, 1.4, 315], s: [0.25, 2.8, 0.25] });

    const city: { p: V3; s: V3 }[] = [];
    for (let gx = -640; gx <= 640; gx += 46)
      for (let gz = 360; gz <= 760; gz += 46) {
        if (rnd() < 0.18) continue;
        const h = 8 + rnd() * rnd() * 70;
        const w = 22 + rnd() * 16;
        const d = 22 + rnd() * 16;
        city.push({ p: [gx + rnd() * 6, h / 2, gz + rnd() * 6], s: [w, h, d] });
      }
    for (const side of [-1, 1])
      for (let gz = 30; gz <= 340; gz += 52)
        for (let gx = 330; gx <= 620; gx += 58) {
          if (rnd() < 0.25) continue;
          const h = 9 + rnd() * 14;
          city.push({ p: [side * (gx + rnd() * 8), h / 2, gz], s: [40 + rnd() * 12, h, 36] });
        }

    const masts: V3[] = [];
    for (const x of [-240, -160, 0, 160, 240]) {
      masts.push([x + 7, 0, 58]);
      masts.push([x + 7, 0, 203]);
    }
    for (const z of [96, 132, 168]) masts.push([7, 0, z]);

    const dashes: { p: V3; s: V3 }[] = [];
    for (let x = -255; x < 255; x += 10) dashes.push({ p: [x, GL.mark, 48], s: [5, 0.04, 0.3] });
    for (let x = -255; x < 255; x += 10) dashes.push({ p: [x, GL.mark, 205], s: [5, 0.04, 0.3] });
    for (const cx of [-160, 0, 160]) for (let z = 60; z < 198; z += 10) dashes.push({ p: [cx, GL.mark, z], s: [0.3, 0.04, 5] });
    for (let z = 214; z < 330; z += 10) dashes.push({ p: [0, GL.mark, z], s: [0.3, 0.04, 5] });
    // zebra crossing in front of the gate
    for (let x = -12; x <= 12; x += 2.4) dashes.push({ p: [x, GL.mark, 246], s: [1.2, 0.04, 6] });

    const bollards: { p: V3; s: V3 }[] = [];
    const fenders: { p: V3; s: V3 }[] = [];
    for (let x = -250; x <= 250; x += 20) {
      bollards.push({ p: [x, 0.6, 1.6], s: [0.9, 1.2, 0.9] });
      fenders.push({ p: [x, -1.8, -0.5], s: [3, 2.6, 1] });
    }
    return { trees, trunks, posts, city, masts, dashes, bollards, fenders };
  }, []);

  return (
    <group>
      {/* sea + quay wall */}
      <mesh position={[0, QUAY.waterY, -500]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2400, 1000]} />
        <meshStandardMaterial color="#a8d2ea" roughness={0.35} metalness={0.1} />
      </mesh>
      <Box p={[0, -2.2, 1]} s={[560, 4.4, 2]} c="#c5ced7" shadow={false} />
      {/* land mass around the terminal */}
      <mesh position={[0, -2.2, 500]} receiveShadow>
        <boxGeometry args={[2400, 4.4, 1000]} />
        <meshStandardMaterial color={LAND} roughness={0.95} />
      </mesh>
      {/* ground layers are stacked a few cm apart so they never z-fight */}
      <Slab x0={-280} x1={280} z0={0} z1={318} y={GL.pave} c={PAVE} />
      <Slab x0={-280} x1={280} z0={0} z1={40} y={GL.apron} c={APRON} />

      {/* roads */}
      <Slab x0={-275} x1={275} z0={40} z1={56} c={ROAD} />
      <Slab x0={-275} x1={275} z0={199} z1={211} c={ROAD} />
      {[-160, 0, 160].map((x) => (
        <Slab key={x} x0={x - 7} x1={x + 7} z0={56} z1={199} c={ROAD} />
      ))}
      <Slab x0={-14} x1={14} z0={211} z1={900} c={ROAD} />
      <Slab x0={-192} x1={-168} z0={60} z1={199} c={ROAD} />
      <Slab x0={168} x1={192} z0={60} z1={199} c={ROAD} />
      <Instances geo={unitBox} color="#ffffff" items={scenery.dashes} shadow={false} />

      {/* quay edge, crane rails, TT lanes */}
      <Box p={[0, GL.mark, 1.1]} s={[560, 0.06, 0.5]} c="#f0b429" shadow={false} />
      {[QUAY.seaRailZ, QUAY.landRailZ].map((z) => (
        <Box key={z} p={[0, GL.mark + 0.02, z]} s={[540, 0.1, 0.5]} c="#5d6772" shadow={false} />
      ))}
      {[14, 26].map((z) => (
        <Box key={z} p={[0, GL.mark, z]} s={[540, 0.06, 0.25]} c="#ffffff" shadow={false} />
      ))}
      <Instances geo={unitCyl} color="#2b333b" items={scenery.bollards} />
      <Instances geo={unitBox} color="#20262c" items={scenery.fenders} shadow={false} />

      {/* gate complex */}
      <group position={[0, 0, 232]}>
        <Box p={[0, 8.2, 0]} s={[54, 0.9, 16]} c="#f3f5f7" />
        <Box p={[0, 7.5, 0]} s={[54.2, 0.5, 16.2]} c="#1a6fba" />
        {[-24, -12, 0, 12, 24].map((x) => (
          <group key={x}>
            <Box p={[x, 3.8, -6]} s={[0.8, 7.6, 0.8]} c="#d6dce2" />
            <Box p={[x, 3.8, 6]} s={[0.8, 7.6, 0.8]} c="#d6dce2" />
            <Box p={[x, 1.4, 0]} s={[2.2, 2.8, 4]} c="#ffffff" />
          </group>
        ))}
        {[-18, -6, 6, 18].map((x) => (
          <Box key={x} p={[x - 2, 1.1, 7.2]} s={[5, 0.25, 0.25]} c="#d94033" />
        ))}
        <SignBoard p={[0, 10.9, 7.6]} w={30} h={4.7} map={gateSign} frame="#1a6fba" />
      </group>

      {/* admin building */}
      <group position={[-110, 0, 252]}>
        <Box p={[0, 11, 0]} s={[52, 22, 20]} c="#f4f6f8" />
        {[4, 9, 14, 19].map((y) => (
          <Box key={y} p={[0, y, -10.2]} s={[48, 2, 0.4]} c="#7fb3d9" shadow={false} />
        ))}
        <Box p={[0, 22.4, 0]} s={[53, 0.8, 21]} c="#d6dce2" />
        <SignBoard p={[0, 26.2, 0]} w={30} h={4.7} map={adminSign} frame="#d6dce2" />
        {[-12, 12].map((x) => (
          <Box key={x} p={[x, 23.4, 0]} s={[0.5, 1.6, 0.5]} c="#9aa6b1" />
        ))}
      </group>

      {/* M&R workshop */}
      <group position={[120, 0, 254]}>
        <Box p={[0, 8, 0]} s={[60, 16, 30]} c="#e9edf1" />
        <Box p={[0, 16.4, 0]} s={[61, 0.8, 31]} c="#1a6fba" />
        {[-20, 0, 20].map((x) => (
          <Box key={x} p={[x, 5, -15.2]} s={[12, 10, 0.4]} c="#9aa6b1" shadow={false} />
        ))}
      </group>

      {/* reefer substation + racks */}
      <Box p={[-245, 3, 214]} s={[18, 6, 10]} c="#dfe4e9" />
      {Array.from({ length: 8 }, (_, i) => (
        <Box key={i} p={[-212.5, 5, 82.7 + i * 13.4]} s={[14, 0.5, 0.6]} c="#8c98a4" />
      ))}

      {/* light masts */}
      {scenery.masts.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={unitCyl} material={mat("#a9b4bf")} position={[0, 16, 0]} scale={[0.7, 32, 0.7]} castShadow />
          <Box p={[0, 32.5, 0]} s={[3.6, 1, 3.6]} c="#5d6772" />
          <Box p={[0, 31.9, 0]} s={[3.2, 0.2, 3.2]} c="#fff6d6" emissive="#fff1b8" shadow={false} />
        </group>
      ))}

      {/* fence, trees, city */}
      <Instances geo={unitBox} color="#9aa6b1" items={scenery.posts} shadow={false} />
      <Box p={[-276, 2.6, 177]} s={[0.12, 0.12, 276]} c="#9aa6b1" shadow={false} />
      <Box p={[276, 2.6, 177]} s={[0.12, 0.12, 276]} c="#9aa6b1" shadow={false} />
      <Box p={[-151, 2.6, 315]} s={[250, 0.12, 0.12]} c="#9aa6b1" shadow={false} />
      <Box p={[151, 2.6, 315]} s={[250, 0.12, 0.12]} c="#9aa6b1" shadow={false} />
      <Instances geo={treeGeo} color="#7cc68a" items={scenery.trees} />
      <Instances geo={unitCyl} color="#8a6a4f" items={scenery.trunks} shadow={false} />
      <Instances geo={unitBox} color="#e4e9ee" items={scenery.city} />

      <Tug />
    </group>
  );
}
