import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { DiceRollTraceDie } from '@/lib/dice-roll-trace';
import { createDieMeshAndShape } from './geometry-builder';
import { createDiceMaterials, getFaceLabels } from './texture-builder';

export interface SimulatedDie {
  die: DiceRollTraceDie;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  faceNormals: THREE.Vector3[];
  faceCount: number;
  faceUprightQuats: THREE.Quaternion[];
  targetUprightQuat?: THREE.Quaternion;
}

/**
 * High-performance deterministic 3D physics simulator for RPG dice trays.
 * Implements Anton Natarov / Teal's algorithm: pre-simulates roll trajectory,
 * maps landed face, and shifts face groups so the settled face strictly
 * matches the pre-calculated CoC 7e RAW outcome from DiceRollTrace.
 */
export class PhysicalDiceSimulator {
  private world: CANNON.World;
  private dice: SimulatedDie[] = [];
  private groundBody: CANNON.Body;
  private barrierBodies: CANNON.Body[] = [];
  private diceMaterial: CANNON.Material;
  private deskMaterial: CANNON.Material;
  private barrierMaterial: CANNON.Material;

  public width: number;
  public height: number;
  public isSettled: boolean = false;
  private iteration: number = 0;

  constructor(width: number = 320, height: number = 180) {
    this.width = width;
    this.height = height;

    this.world = new CANNON.World();
    // Heavy downward gravity towards the tray floor (-Z)
    this.world.gravity.set(0, 0, -980 * 2.5);
    this.world.allowSleep = true;

    this.diceMaterial = new CANNON.Material('dice');
    this.deskMaterial = new CANNON.Material('desk');
    this.barrierMaterial = new CANNON.Material('barrier');

    // Felt-on-dice contact: dampens bounce realistically
    const deskContact = new CANNON.ContactMaterial(this.deskMaterial, this.diceMaterial, {
      friction: 0.28,
      restitution: 0.38,
    });
    // Wood boundary-on-dice contact
    const barrierContact = new CANNON.ContactMaterial(this.barrierMaterial, this.diceMaterial, {
      friction: 0.1,
      restitution: 0.5,
    });
    // Die-on-die collision
    const diceContact = new CANNON.ContactMaterial(this.diceMaterial, this.diceMaterial, {
      friction: 0.2,
      restitution: 0.45,
    });

    this.world.addContactMaterial(deskContact);
    this.world.addContactMaterial(barrierContact);
    this.world.addContactMaterial(diceContact);

    // Floor plane at z = 0
    this.groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: this.deskMaterial,
    });
    this.world.addBody(this.groundBody);

    this.updateBoundaries(width, height);
  }

  public updateBoundaries(width: number, height: number): void {
    this.width = width;
    this.height = height;

    for (const b of this.barrierBodies) {
      this.world.removeBody(b);
    }
    this.barrierBodies = [];

    const hw = width / 2;
    const hh = height / 2;

    // +Y barrier
    const bTop = new CANNON.Body({ mass: 0, material: this.barrierMaterial, shape: new CANNON.Plane() });
    bTop.position.set(0, hh * 0.95, 0);
    bTop.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    this.world.addBody(bTop);
    this.barrierBodies.push(bTop);

    // -Y barrier
    const bBottom = new CANNON.Body({ mass: 0, material: this.barrierMaterial, shape: new CANNON.Plane() });
    bBottom.position.set(0, -hh * 0.95, 0);
    bBottom.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(bBottom);
    this.barrierBodies.push(bBottom);

    // +X barrier
    const bRight = new CANNON.Body({ mass: 0, material: this.barrierMaterial, shape: new CANNON.Plane() });
    bRight.position.set(hw * 0.95, 0, 0);
    bRight.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
    this.world.addBody(bRight);
    this.barrierBodies.push(bRight);

    // -X barrier
    const bLeft = new CANNON.Body({ mass: 0, material: this.barrierMaterial, shape: new CANNON.Plane() });
    bLeft.position.set(-hw * 0.95, 0, 0);
    bLeft.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
    this.world.addBody(bLeft);
    this.barrierBodies.push(bLeft);
  }

  public clear(): void {
    for (const d of this.dice) {
      this.world.removeBody(d.body);
      d.mesh.geometry?.dispose();
      if (Array.isArray(d.mesh.material)) {
        for (const mat of d.mesh.material) {
          if ('map' in mat && mat.map) {
            (mat.map as THREE.Texture).dispose();
          }
          mat.dispose();
        }
      } else if (d.mesh.material) {
        const mat = d.mesh.material as THREE.Material & { map?: THREE.Texture };
        if (mat.map) {
          mat.map.dispose();
        }
        mat.dispose();
      }
    }
    this.dice = [];
    this.isSettled = false;
    this.iteration = 0;
  }

  /**
   * Initializes the 3D meshes and rigid bodies for an array of trace dice.
   */
  public initDice(diceTrace: DiceRollTraceDie[]): THREE.Mesh[] {
    this.clear();
    const meshes: THREE.Mesh[] = [];
    const count = diceTrace.length;
    const baseRadius = count <= 2 ? 36 : count <= 4 ? 30 : count <= 6 ? 24 : 19;
    const radius = Math.min(baseRadius, (this.height * 0.44) / Math.ceil(count / 5));

    for (const die of diceTrace) {
      const typeRadius = radius * (die.type === 'd20' ? 0.98 : die.type === 'd10' ? 0.94 : 0.9);
      const built = createDieMeshAndShape(die.type, typeRadius);
      const materials = createDiceMaterials(die);

      const mesh = new THREE.Mesh(built.geometry, materials);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const body = new CANNON.Body({
        mass: 300,
        shape: built.cannonShape,
        material: this.diceMaterial,
        linearDamping: 0.14,
        angularDamping: 0.16,
      });

      // Compute face normals from cannonShape faces
      const faceNormals: THREE.Vector3[] = [];
      const cv = built.cannonShape.vertices;
      for (const f of built.cannonShape.faces) {
        const center = new THREE.Vector3();
        for (const idx of f) {
          center.add(new THREE.Vector3(cv[idx].x, cv[idx].y, cv[idx].z));
        }
        center.divideScalar(f.length).normalize();
        faceNormals.push(center);
      }

      const simDie: SimulatedDie = {
        die,
        mesh,
        body,
        faceNormals,
        faceCount: built.faceCount,
        faceUprightQuats: built.faceUprightQuats,
      };

      this.dice.push(simDie);
      this.world.addBody(body);
      meshes.push(mesh);
    }

    return meshes;
  }

  /**
   * Arranges dice neatly on the velvet tray when idle or settled.
   * Ensures the target value faces straight up (+Z towards camera) and completely upright.
   */
  public layoutStatic(): void {
    const count = this.dice.length;
    if (count === 0) return;

    const cols = Math.min(5, count);
    const rows = Math.ceil(count / cols);
    const simRadius = this.dice[0]?.mesh?.geometry?.boundingSphere?.radius || 32;

    const spacingX = Math.max(simRadius * 2.5, Math.min((this.width * 0.78) / cols, simRadius * 3.2));
    const spacingY = Math.max(simRadius * 2.4, Math.min((this.height * 0.75) / rows, simRadius * 2.8));

    for (let i = 0; i < count; i++) {
      const sim = this.dice[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = (col - (cols - 1) / 2) * spacingX;
      const y = ((rows - 1) / 2 - row) * spacingY;
      const z = simRadius * 0.82;

      sim.body.position.set(x, y, z);
      sim.body.velocity.set(0, 0, 0);
      sim.body.angularVelocity.set(0, 0, 0);

      // Find the normal vector for the target face
      const labels = getFaceLabels(sim.die.type, sim.die.role);
      let targetLabel = String(sim.die.value);
      if ((sim.die.role === 'tens' || sim.die.role === 'bonus' || sim.die.role === 'penalty') && sim.die.value === 0) {
        targetLabel = '00';
      }
      let targetFaceIndex = labels.indexOf(targetLabel);
      if (targetFaceIndex < 0) {
        targetFaceIndex = labels.indexOf(targetLabel + '.');
      }
      if (targetFaceIndex < 0) targetFaceIndex = 0;

      const quat = (sim.faceUprightQuats[targetFaceIndex] || new THREE.Quaternion()).clone();

      sim.body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
      sim.mesh.position.set(x, y, z);
      sim.mesh.quaternion.copy(quat);
    }

    this.isSettled = true;
  }

  /**
   * Prepares and starts a deterministic physical roll throw.
   * Runs the headless simulation forward to find landing face, shifts
   * face textures so the landed face strictly equals die.value,
   * then resets the bodies to initial throw trajectory.
   */
  public startRoll(): void {
    const count = this.dice.length;
    if (count === 0) return;

    interface ThrowState {
      pos: CANNON.Vec3;
      vel: CANNON.Vec3;
      angVel: CANNON.Vec3;
      quat: CANNON.Quaternion;
    }

    const initialStates: ThrowState[] = [];
    const hw = this.width / 2;
    const hh = this.height / 2;

    // 1. Generate randomized launch trajectories into the tray
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = Math.min(hw, hh) * 0.85;

      const posX = -Math.cos(angle) * dist + (Math.random() - 0.5) * 20;
      const posY = -Math.sin(angle) * dist + (Math.random() - 0.5) * 20;
      const posZ = 120 + Math.random() * 60;

      // Speed aimed towards tray center with randomized spin
      const speed = 260 + Math.random() * 120;
      const velX = (Math.cos(angle) * speed) + (Math.random() - 0.5) * 80;
      const velY = (Math.sin(angle) * speed) + (Math.random() - 0.5) * 80;
      const velZ = -50 - Math.random() * 80;

      const angVel = new CANNON.Vec3(
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 25
      );

      const quat = new CANNON.Quaternion();
      quat.setFromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);

      initialStates.push({
        pos: new CANNON.Vec3(posX, posY, posZ),
        vel: new CANNON.Vec3(velX, velY, velZ),
        angVel,
        quat,
      });

      const b = this.dice[i].body;
      b.position.copy(initialStates[i].pos);
      b.velocity.copy(initialStates[i].vel);
      b.angularVelocity.copy(initialStates[i].angVel);
      b.quaternion.copy(initialStates[i].quat);
      b.wakeUp();
    }

    // 2. Headless pre-simulation (Teal's emulate_throw)
    const fixedTimeStep = 1 / 60;
    const maxSteps = 240; // max 4 seconds simulation
    for (let step = 0; step < maxSteps; step++) {
      this.world.step(fixedTimeStep);

      let allSlow = true;
      for (const sim of this.dice) {
        const v = sim.body.velocity.length();
        const av = sim.body.angularVelocity.length();
        if (v > 3.0 || av > 2.0) {
          allSlow = false;
          break;
        }
      }
      if (allSlow && step > 60) break;
    }

    // 3. Find which face landed on top for each die & shift face materials
    for (let i = 0; i < count; i++) {
      const sim = this.dice[i];
      const landedFaceIndex = this.getLandedFaceIndex(sim);

      // Target face index in the labels array
      const labels = getFaceLabels(sim.die.type, sim.die.role);
      let targetLabel = String(sim.die.value);
      if ((sim.die.role === 'tens' || sim.die.role === 'bonus' || sim.die.role === 'penalty') && sim.die.value === 0) {
        targetLabel = '00';
      }
      let targetIndex = labels.indexOf(targetLabel);
      if (targetIndex < 0) {
        targetIndex = labels.indexOf(targetLabel + '.');
      }
      if (targetIndex < 0) targetIndex = 0;

      // Shift groups so the landed face gets targetIndex
      const shift = targetIndex - landedFaceIndex;
      this.shiftDieFaceGroups(sim.mesh.geometry, sim.faceCount, shift);

      // Store target upright quaternion for the landed face to ensure zero rotation (perfect readability)
      sim.targetUprightQuat = sim.faceUprightQuats[landedFaceIndex]?.clone() || new THREE.Quaternion();
    }

    // 4. Reset simulation to initial throw state for visible animation
    for (let i = 0; i < count; i++) {
      const b = this.dice[i].body;
      b.position.copy(initialStates[i].pos);
      b.velocity.copy(initialStates[i].vel);
      b.angularVelocity.copy(initialStates[i].angVel);
      b.quaternion.copy(initialStates[i].quat);
      b.wakeUp();
    }

    this.isSettled = false;
    this.iteration = 0;
  }

  private getLandedFaceIndex(sim: SimulatedDie): number {
    const upVector = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion(
      sim.body.quaternion.x,
      sim.body.quaternion.y,
      sim.body.quaternion.z,
      sim.body.quaternion.w
    );

    let maxDot = -Infinity;
    let bestIndex = 0;

    // Only scan numbered faces up to faceCount
    for (let i = 0; i < sim.faceCount; i++) {
      const normal = sim.faceNormals[i];
      if (!normal) continue;
      const worldNormal = normal.clone().applyQuaternion(quat);
      const dot = worldNormal.dot(upVector);
      if (dot > maxDot) {
        maxDot = dot;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private shiftDieFaceGroups(geom: THREE.BufferGeometry, faceCount: number, shift: number): void {
    for (const grp of geom.groups) {
      if (grp.materialIndex === undefined || grp.materialIndex === 0) continue; // Skip border chamfer material
      let idx = grp.materialIndex - 1;
      idx = (idx + shift) % faceCount;
      if (idx < 0) idx += faceCount;
      grp.materialIndex = idx + 1;
    }
  }

  /**
   * Advances the visual physics simulation by deltaTime and syncs Three.js meshes.
   * Smoothly eases resting dice into the upright orientation for crisp horizontal numbers.
   */
  public step(deltaTime: number): boolean {
    if (this.isSettled) return true;

    const timeStep = Math.min(deltaTime, 0.05);
    this.world.step(timeStep);
    this.iteration++;

    let allStopped = true;
    for (const sim of this.dice) {
      const v = sim.body.velocity.length();
      const av = sim.body.angularVelocity.length();

      // Smoothly slerp the die towards the upright orientation as it decelerates near rest
      if (sim.targetUprightQuat && this.iteration > 25) {
        if (v < 18 && av < 10) {
          const slerpFactor = Math.min(1.0, 0.16 * (60 * timeStep));
          sim.mesh.quaternion.slerp(sim.targetUprightQuat, slerpFactor);
          sim.body.quaternion.set(
            sim.mesh.quaternion.x,
            sim.mesh.quaternion.y,
            sim.mesh.quaternion.z,
            sim.mesh.quaternion.w
          );
          sim.body.angularVelocity.scale(0.85, sim.body.angularVelocity);
        } else {
          sim.mesh.quaternion.set(
            sim.body.quaternion.x,
            sim.body.quaternion.y,
            sim.body.quaternion.z,
            sim.body.quaternion.w
          );
        }
      } else {
        sim.mesh.quaternion.set(
          sim.body.quaternion.x,
          sim.body.quaternion.y,
          sim.body.quaternion.z,
          sim.body.quaternion.w
        );
      }

      sim.mesh.position.set(sim.body.position.x, sim.body.position.y, sim.body.position.z);

      if (v > 2.0 || av > 1.5) {
        allStopped = false;
      }
    }

    if (allStopped && this.iteration > 45) {
      this.isSettled = true;
      for (const sim of this.dice) {
        if (sim.targetUprightQuat) {
          sim.mesh.quaternion.copy(sim.targetUprightQuat);
          sim.body.quaternion.set(
            sim.targetUprightQuat.x,
            sim.targetUprightQuat.y,
            sim.targetUprightQuat.z,
            sim.targetUprightQuat.w
          );
          sim.body.velocity.set(0, 0, 0);
          sim.body.angularVelocity.set(0, 0, 0);
        }
      }
    }

    return this.isSettled;
  }
}
