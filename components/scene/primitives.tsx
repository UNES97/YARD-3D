"use client";

import { forwardRef, useMemo } from "react";
import * as THREE from "three";

const mats = new Map<string, THREE.MeshStandardMaterial>();

/** Shared flat-shaded material per colour (keeps draw state small). */
export function mat(color: string, opts: { rough?: number; metal?: number; emissive?: string } = {}) {
  const key = `${color}|${opts.rough ?? 0.75}|${opts.metal ?? 0.05}|${opts.emissive ?? ""}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.75,
      metalness: opts.metal ?? 0.05,
      ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: 0.8 } : {}),
    });
    mats.set(key, m);
  }
  return m;
}

export const unitBox = new THREE.BoxGeometry(1, 1, 1);
export const unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
export const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 14).rotateX(Math.PI / 2);

type V3 = [number, number, number];

interface BoxProps {
  p?: V3;
  s: V3;
  c: string;
  rot?: V3;
  shadow?: boolean;
  rough?: number;
  metal?: number;
  emissive?: string;
}

export const Box = forwardRef<THREE.Mesh, BoxProps>(function Box(
  { p = [0, 0, 0], s, c, rot, shadow = true, rough, metal, emissive },
  ref,
) {
  return (
    <mesh
      ref={ref}
      geometry={unitBox}
      material={mat(c, { rough, metal, emissive })}
      position={p}
      scale={s}
      rotation={rot}
      castShadow={shadow}
      receiveShadow
    />
  );
});

/** A round member between two points (stays, braces, ropes). */
export function Strut({ a, b, r = 0.4, c }: { a: V3; b: V3; r?: number; c: string }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: va.add(vb).multiplyScalar(0.5), quat, len };
  }, [a, b]);
  return (
    <mesh
      geometry={unitCyl}
      material={mat(c)}
      position={pos}
      quaternion={quat}
      scale={[r * 2, len, r * 2]}
      castShadow
    />
  );
}

export function Wheel({ p }: { p: V3 }) {
  return <mesh geometry={wheelGeo} material={mat("#1f262e", { rough: 0.9 })} position={p} castShadow />;
}

export const CONTAINER_GEO = new THREE.BoxGeometry(12.19, 2.59, 2.44);

/**
 * Material for text/decal planes laid on another surface. polygonOffset pulls
 * it towards the camera in depth so it never z-fights with what's behind it.
 */
export function decalMaterial(map: THREE.Texture, transparent = false) {
  return new THREE.MeshBasicMaterial({
    map,
    transparent,
    depthWrite: !transparent,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

/** A sign board: solid backing with the text on both faces (readable from either side). */
export function SignBoard({ p, w, h, map, frame }: { p: V3; w: number; h: number; map: THREE.Texture; frame: string }) {
  const m = useMemo(() => decalMaterial(map), [map]);
  const depth = 0.6;
  return (
    <group position={p}>
      <Box s={[w + 0.6, h + 0.6, depth]} c={frame} />
      <mesh material={m} position={[0, 0, depth / 2 + 0.12]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh material={m} position={[0, 0, -depth / 2 - 0.12]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}

/**
 * Canvas texture painted with the Maersk Headline font. Canvas text can't wait
 * for web fonts, so it is painted once now and again when the font has loaded.
 */
export function brandTexture(width: number, height: number, paint: (g: CanvasRenderingContext2D, family: string) => void) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-maersk-headline").trim() || "Arial";
  const draw = () => {
    g.clearRect(0, 0, width, height);
    paint(g, `${family}, Arial, sans-serif`);
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.load(`700 40px ${family}`).then(draw, () => {});
  return tex;
}
