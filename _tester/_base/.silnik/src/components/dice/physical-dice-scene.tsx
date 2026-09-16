'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import * as THREE from 'three';
import type { DiceRollTraceDie } from '@/lib/dice-roll-trace';
import { PhysicalDiceSimulator } from '@/lib/dice-physics/dice-simulator';
import { playDiceClatter } from '@/lib/dice-physics/dice-audio';

export interface PhysicalDiceSceneProps {
  dice: DiceRollTraceDie[];
  rolling?: boolean;
  label?: string;
}

/**
 * Authentic 3D Art Déco physical dice tray powered by Three.js & CANNON-ES.
 * Features:
 * - Real polyhedra with chamfered edges (d4, d6, d8, d10, d12, d20, d100).
 * - Genuine Art Déco engraved numerals directly on face textures.
 * - Anton Natarov / Teal deterministic physics (the die physically rolls,
 *   bounces off walls, and naturally comes to rest showing the exact CoC 7e RAW result).
 * - Procedural clatter sound effect via Web Audio API.
 * - Accessible, high-contrast fallback for non-WebGL / prefers-reduced-motion environments.
 */
function disposeMesh(m: THREE.Mesh): void {
  m.geometry?.dispose();
  if (Array.isArray(m.material)) {
    for (const mat of m.material) {
      if ('map' in mat && mat.map) {
        (mat.map as THREE.Texture).dispose();
      }
      mat.dispose();
    }
  } else if (m.material) {
    const mat = m.material as THREE.Material & { map?: THREE.Texture };
    if (mat.map) {
      mat.map.dispose();
    }
    mat.dispose();
  }
}

export const PhysicalDiceScene: FC<PhysicalDiceSceneProps> = ({
  dice,
  rolling = false,
  label = 'Tacka na kości 3D',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState<boolean>(false);
  const [reduced, setReduced] = useState<boolean>(false);
  const [sceneReady, setSceneReady] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const canvas = document.createElement('canvas');
      const hasGl = Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
      setWebgl(hasGl);
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      setWebgl(false);
    }
  }, []);

  // Three.js & CANNON simulation runtime
  const simRef = useRef<PhysicalDiceSimulator | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const prevRollingRef = useRef<boolean>(rolling);

  useEffect(() => {
    if (!webgl || reduced || !containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || 320;
    let height = container.clientHeight || 190;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup looking down at the tray (Z-axis towards camera)
    const aspect = width / height;
    const cameraZ = 340;
    const fov = 26;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 1, 2000);
    camera.position.set(0, 0, cameraZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const radFov = (fov * Math.PI) / 180;
    const worldHeight = 2 * Math.tan(radFov / 2) * cameraZ;
    const worldWidth = worldHeight * aspect;

    // 3. Renderer setup
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);
    } catch {
      setWebgl(false);
      return;
    }

    // 4. Lighting: Dark Art Déco mood lighting with warm spotlights
    const ambientLight = new THREE.AmbientLight(0xfff5e6, 1.2);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xffecd1, 3.2);
    mainSpot.position.set(-worldWidth * 0.35, worldHeight * 0.45, 300);
    mainSpot.target.position.set(0, 0, 0);
    mainSpot.castShadow = true;
    mainSpot.shadow.bias = -0.001;
    scene.add(mainSpot);
    scene.add(mainSpot.target);

    const rimLight = new THREE.DirectionalLight(0xb59a57, 1.4);
    rimLight.position.set(worldWidth * 0.35, -worldHeight * 0.35, 200);
    scene.add(rimLight);

    // 5. Felt Tray Floor Plane
    const floorGeo = new THREE.PlaneGeometry(worldWidth * 1.5, worldHeight * 1.5);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x09140e, // deep dark green velvet
      roughness: 0.85,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, -0.5);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // 6. Initialize Simulator with actual visible world dimensions
    const sim = new PhysicalDiceSimulator(worldWidth, worldHeight);
    simRef.current = sim;

    // 7. Animation Frame Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      sim.step(dt);
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    // 8. Resize Observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          width = cr.width;
          height = cr.height;
          const newAspect = width / height;
          camera.aspect = newAspect;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
          const rFov = (camera.fov * Math.PI) / 180;
          const wH = 2 * Math.tan(rFov / 2) * camera.position.z;
          const wW = wH * newAspect;
          sim.updateBoundaries(wW, wH);
        }
      }
    });
    ro.observe(container);
    setSceneReady(true);

    // 9. Cleanup
    return () => {
      setSceneReady(false);
      cancelAnimationFrame(animId);
      ro.disconnect();
      sim.clear();
      for (const m of meshesRef.current) {
        scene.remove(m);
        disposeMesh(m);
      }
      scene.remove(floorMesh);
      floorGeo.dispose();
      floorMat.dispose();

      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      simRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      meshesRef.current = [];
    };
  }, [webgl, reduced]); // Re-run if webgl availability toggles

  // React to rolling prop change or dice update
  useEffect(() => {
    if (!sceneReady) return;
    const sim = simRef.current;
    const scene = sceneRef.current;
    if (!sim || !scene) return;

    // Clean up existing meshes
    for (const m of meshesRef.current) {
      scene.remove(m);
      disposeMesh(m);
    }

    const visibleDice = dice.slice(0, 10);
    const meshes = sim.initDice(visibleDice);
    meshesRef.current = meshes;
    for (const m of meshes) {
      scene.add(m);
    }

    if (rolling) {
      sim.startRoll();
      playDiceClatter(visibleDice.length);
    } else {
      sim.layoutStatic();
    }
    prevRollingRef.current = rolling;
  }, [dice, rolling, sceneReady]);

  // Non-WebGL or Reduced Motion Accessible Fallback
  if (!webgl || reduced) {
    return (
      <div
        data-testid="physical-dice-fallback"
        role="img"
        aria-label={label}
        className="flex min-h-24 flex-wrap items-center justify-center gap-2.5 rounded border border-brass/35 bg-[#0d0b08] p-3.5"
      >
        {dice.map((d) => (
          <span
            key={d.id}
            className={`rounded border px-3 py-1.5 font-bold font-serif shadow-sm ${
              d.role === 'units'
                ? 'border-emerald-600/70 bg-emerald-950/60 text-emerald-300'
                : d.role === 'tens' || d.role === 'bonus' || d.role === 'penalty'
                  ? 'border-brass/70 bg-black/80 text-brass'
                  : 'border-brass/40 bg-zinc-900/80 text-foreground'
            } ${d.selected === false ? 'opacity-35 line-through' : ''}`}
          >
            {d.role === 'tens' || d.role === 'bonus' || d.role === 'penalty'
              ? String(d.value).padStart(2, '0')
              : d.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="physical-dice-scene"
      role="img"
      aria-label={label}
      className="relative h-56 sm:h-64 w-full overflow-hidden rounded border border-brass/35 shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] bg-[radial-gradient(ellipse_at_center,_#0f1c15_0%,_#070d0a_65%,_#030504_100%)]"
    />
  );
};
