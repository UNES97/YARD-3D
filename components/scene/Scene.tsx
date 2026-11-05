"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { registry, useApp, type EntityKind } from "@/lib/store";
import { RTGS, SHUTTLES, STS, TTS, XTS } from "@/lib/terminal";
import { Rtg, Shuttle, Tractor, Truck } from "./Equipment";
import { Ground } from "./Ground";
import { StsCrane } from "./StsCrane";
import { Vessel } from "./Vessel";
import { Yard } from "./Yard";

const HOME_TARGET = new THREE.Vector3(-10, 0, 78);
const HOME_POS = new THREE.Vector3(285, 345, 480);

// how close the camera settles when an entity is selected
const FOCUS_DIST: Record<EntityKind, number> = {
  vessel: 430,
  sts: 230,
  rtg: 130,
  block: 220,
  tt: 95,
  xt: 95,
  rs: 90,
  eh: 90,
};

// camera elevation (radians above the horizon) when focusing; small machines
// need a steeper view so the container stacks don't hide them
const FOCUS_PITCH: Record<EntityKind, number> = {
  vessel: 0.55,
  sts: 0.5,
  rtg: 0.85,
  block: 0.9,
  tt: 1.1,
  xt: 1.1,
  rs: 0.95,
  eh: 0.95,
};

interface Controls {
  target: THREE.Vector3;
  object: THREE.Camera;
  update(): void;
  addEventListener(type: "start", fn: () => void): void;
  removeEventListener(type: "start", fn: () => void): void;
}

function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const selected = useApp((s) => s.selected);
  const cam = useApp((s) => s.cam);
  const anim = useRef({
    dist: null as number | null,
    pitch: null as number | null,
    rot: 0,
    home: false,
  });
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    if (selected) {
      anim.current.dist = FOCUS_DIST[selected.kind];
      anim.current.pitch = FOCUS_PITCH[selected.kind];
      anim.current.home = false;
    }
  }, [selected]);

  useEffect(() => {
    if (cam.n === 0 || !controls) return;
    const a = anim.current;
    const cur = controls.object.position.distanceTo(controls.target);
    if (cam.type === "in") a.dist = Math.max(40, (a.dist ?? cur) * 0.7);
    if (cam.type === "out") a.dist = Math.min(1100, (a.dist ?? cur) * 1.4);
    if (cam.type === "rotL") a.rot += Math.PI / 4;
    if (cam.type === "rotR") a.rot -= Math.PI / 4;
    if (cam.type === "home") {
      a.home = true;
      a.dist = null;
      a.pitch = null;
      a.rot = 0;
      useApp.getState().select(null);
    }
  }, [cam, controls]);

  // user drags cancel any pending zoom/rotate/home animation
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      anim.current.home = false;
      anim.current.dist = null;
      anim.current.pitch = null;
      anim.current.rot = 0;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((state, dt) => {
    if (!controls) return;
    const a = anim.current;
    const camera = state.camera;
    const target = controls.target;
    const k = 1 - Math.exp(-dt * 3.2);

    if (a.home) {
      target.lerp(HOME_TARGET, k);
      camera.position.lerp(HOME_POS, k);
      if (camera.position.distanceTo(HOME_POS) < 1) a.home = false;
    } else if (selected) {
      const obj = registry.get(selected.id);
      if (obj) {
        obj.getWorldPosition(tmp.current);
        tmp.current.y = Math.min(tmp.current.y, 25);
        const delta = tmp.current.clone().sub(target).multiplyScalar(k);
        target.add(delta);
        camera.position.add(delta);
      }
    }

    const offset = camera.position.clone().sub(target);
    if (a.dist != null) {
      const len = offset.length();
      const next = THREE.MathUtils.lerp(len, a.dist, k);
      offset.setLength(next);
      if (Math.abs(next - a.dist) < 0.5) a.dist = null;
    }
    if (a.pitch != null) {
      const len = offset.length();
      const flat = Math.hypot(offset.x, offset.z) || 1e-6;
      const cur = Math.atan2(offset.y, flat);
      const next = THREE.MathUtils.lerp(cur, a.pitch, k);
      const h = len * Math.cos(next);
      offset.set((offset.x / flat) * h, len * Math.sin(next), (offset.z / flat) * h);
      if (Math.abs(next - a.pitch) < 0.005) a.pitch = null;
    }
    if (Math.abs(a.rot) > 1e-3) {
      const step = a.rot * k;
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), step);
      a.rot -= step;
    }
    camera.position.copy(target).add(offset);
    controls.update();
  });

  return null;
}

export default function Scene() {
  const select = useApp((s) => s.select);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: HOME_POS.toArray(), fov: 32, near: 2, far: 5000 }}
      // log depth keeps precision at long range, so close surfaces don't flicker
      gl={{ antialias: true, logarithmicDepthBuffer: true }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={["#e8eef4"]} />
      <fog attach="fog" args={["#e8eef4", 900, 2200]} />
      <hemisphereLight args={["#ffffff", "#d5dde6", 1.35]} />
      <directionalLight
        position={[-220, 380, 260]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-340}
        shadow-camera-right={340}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-camera-near={10}
        shadow-camera-far={1200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <ambientLight intensity={0.25} />

      <Ground />
      <Vessel />
      <Yard />
      {STS.map((s) => (
        <StsCrane key={s.id} def={s} />
      ))}
      {RTGS.map((r) => (
        <Rtg key={r.id} def={r} />
      ))}
      {SHUTTLES.map((s) => (
        <Shuttle key={s.id} def={s} />
      ))}
      {TTS.map((tt) => (
        <Tractor key={tt.id} def={tt} />
      ))}
      {XTS.map((x) => (
        <Truck key={x.id} def={x} />
      ))}

      <OrbitControls
        makeDefault
        target={HOME_TARGET.toArray()}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={1.38}
        minDistance={30}
        maxDistance={1200}
      />
      <CameraRig />
    </Canvas>
  );
}
