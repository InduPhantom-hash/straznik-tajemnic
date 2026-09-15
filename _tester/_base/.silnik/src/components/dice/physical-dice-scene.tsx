'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import type { DiceRollTraceDie } from '@/lib/dice-roll-trace';

function d10Trapezohedron() {
  // Ten kite-shaped facets around alternating equatorial vertices form the
  // familiar RPG d10 silhouette; it is deliberately not a decagonal prism.
  const vertices = [0, 0, 1.16, 0, 0, -1.16];
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2;
    vertices.push(Math.cos(angle) * .82, Math.sin(angle) * .82, index % 2 ? -.22 : .22);
  }
  const indices: number[] = [];
  for (let index = 0; index < 10; index++) {
    const current = 2 + index;
    const next = 2 + ((index + 1) % 10);
    indices.push(0, current, 1, 0, 1, next);
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  // The two polar tips must be vertical in the tray. Looking down the polar
  // axis makes a perfectly valid d10 read as a star instead of its familiar
  // kite-faced, elongated silhouette.
  shape.rotateX(Math.PI / 2);
  return shape;
}

function geometry(type: DiceRollTraceDie['type']) {
  if (type === 'd3') return new THREE.CylinderGeometry(.72, .72, .55, 3);
  if (type === 'd4') return new THREE.TetrahedronGeometry(.82);
  if (type === 'd6') return new THREE.BoxGeometry(1, 1, 1);
  if (type === 'd8') return new THREE.OctahedronGeometry(.82);
  if (type === 'd10') return d10Trapezohedron();
  if (type === 'd12') return new THREE.DodecahedronGeometry(.82);
  return new THREE.IcosahedronGeometry(.86);
}

function dieLabel(die: DiceRollTraceDie) {
  if ((die.role === 'tens' || die.role === 'bonus' || die.role === 'penalty') && die.value === 0) return '00';
  return String(die.value);
}

function DieValue({ die }: { die: DiceRollTraceDie }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) return new THREE.CanvasTexture(canvas);
    context.beginPath();
    context.arc(96, 96, 68, 0, Math.PI * 2);
    context.fillStyle = die.role === 'units' ? '#0b382f' : '#4a2d10';
    context.fill();
    context.lineWidth = 6;
    context.strokeStyle = '#d7ae55';
    context.stroke();
    context.fillStyle = '#f7e7bc';
    context.font = 'bold 76px Georgia';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(dieLabel(die), 96, 101);
    return new THREE.CanvasTexture(canvas);
  }, [die]);

  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, 0, .92]} scale={[.72, .72, 1]}>
    <spriteMaterial map={texture} transparent opacity={die.selected === false ? .28 : 1} depthTest={false} />
  </sprite>;
}

function Die({ die, index, diceCount, rolling }: { die: DiceRollTraceDie; index: number; diceCount: number; rolling: boolean }) {
  const ref = useRef<Group>(null);
  const shape = useMemo(() => geometry(die.type), [die.type]);
  const lastRolling = useRef(rolling);
  const startRotation = useRef(new THREE.Euler());
  const settleAt = useRef(0);
  const columns = Math.min(5, diceCount);
  const rows = Math.ceil(diceCount / columns);
  const x = (index % columns - (columns - 1) / 2) * 1.25;
  const baseY = ((rows - 1) / 2 - Math.floor(index / columns)) * 1.15;
  useEffect(() => () => shape.dispose(), [shape]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const time = clock.getElapsedTime();
    if (rolling) {
      ref.current.rotation.set(time * 9 + index * .7, time * 7 + index, time * 5 + index * .4);
      ref.current.position.y = baseY + Math.abs(Math.sin(time * 13 + index)) * .72;
    } else {
      if (lastRolling.current) {
        startRotation.current.copy(ref.current.rotation);
        settleAt.current = time;
      }
      const progress = Math.min(1, (time - settleAt.current) / .32);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      ref.current.rotation.set(
        THREE.MathUtils.lerp(startRotation.current.x, 0, easeOut),
        THREE.MathUtils.lerp(startRotation.current.y, 0, easeOut),
        THREE.MathUtils.lerp(startRotation.current.z, 0, easeOut),
      );
      ref.current.position.y = baseY + (1 - easeOut) * .14;
    }
    lastRolling.current = rolling;
  });
  return <group ref={ref} position={[x, baseY, 0]}>
    <mesh geometry={shape}><meshStandardMaterial color={die.role === 'units' ? '#176054' : '#a77a2b'} metalness={.55} roughness={.3} transparent opacity={die.selected === false ? .28 : 1} /></mesh>
    <DieValue die={die} />
  </group>;
}

export function PhysicalDiceScene({ dice, rolling = false, label = 'Tacka kości' }: { dice: DiceRollTraceDie[]; rolling?: boolean; label?: string }) {
  const [webgl, setWebgl] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    setWebgl(Boolean(window.WebGLRenderingContext && canvas.getContext('webgl')));
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  if (!webgl || reduced) return <div data-testid="physical-dice-fallback" role="img" aria-label={label} className="flex min-h-24 flex-wrap justify-center gap-2 rounded border border-brass/35 bg-[#0d0b08] p-3">{dice.map(d => <span key={d.id} className="rounded border border-brass/40 px-3 py-2 text-brass">{d.role === 'tens' || d.role === 'bonus' || d.role === 'penalty' ? String(d.value).padStart(2, '0') : d.value}</span>)}</div>;
  const visibleDice = dice.slice(0, 10);
  return <div data-testid="physical-dice-scene" role="img" aria-label={label} className="h-44 overflow-hidden rounded border border-brass/35"><Canvas camera={{ position: [0, 0, 5.2], fov: 38 }}><color attach="background" args={['#0d0b08']} /><ambientLight intensity={.8} /><directionalLight position={[3, 4, 5]} intensity={2} />{visibleDice.map((die, index) => <Die key={die.id} die={die} index={index} diceCount={visibleDice.length} rolling={rolling} />)}</Canvas></div>;
}
