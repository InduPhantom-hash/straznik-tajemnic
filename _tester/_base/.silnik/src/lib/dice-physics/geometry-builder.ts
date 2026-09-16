import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { PhysicalDieType } from '@/lib/dice-roll-trace';

interface ChamferResult {
  vectors: THREE.Vector3[];
  faces: number[][];
}

/**
 * Procedural chamfering algorithm (Teal / Anton Natarov).
 * Softens sharp polyhedral edges and corners, yielding realistic dice silhouettes
 * and separate material indices for die faces vs. chamfered borders.
 */
export function chamferGeometry(vectors: THREE.Vector3[], faces: number[][], chamfer: number): ChamferResult {
  const chamferVectors: THREE.Vector3[] = [];
  const chamferFaces: number[][] = [];
  const cornerFaces: number[][] = new Array(vectors.length).fill(null).map(() => []);

  for (let i = 0; i < faces.length; ++i) {
    const ii = faces[i];
    const fl = ii.length - 1; // last element is face ID / material index
    const centerPoint = new THREE.Vector3();
    const face: number[] = [];

    for (let j = 0; j < fl; ++j) {
      const vv = vectors[ii[j]].clone();
      centerPoint.add(vv);
      const vIndex = chamferVectors.push(vv) - 1;
      face.push(vIndex);
      cornerFaces[ii[j]].push(vIndex);
    }

    centerPoint.divideScalar(fl);

    for (let j = 0; j < fl; ++j) {
      const vv = chamferVectors[face[j]];
      vv.sub(centerPoint).multiplyScalar(chamfer).add(centerPoint);
    }

    face.push(ii[fl]);
    chamferFaces.push(face);
  }

  // Edge chamfer faces
  for (let i = 0; i < faces.length - 1; ++i) {
    for (let j = i + 1; j < faces.length; ++j) {
      const pairs: [number, number][] = [];
      let lastm = -1;
      for (let m = 0; m < faces[i].length - 1; ++m) {
        const n = faces[j].indexOf(faces[i][m]);
        if (n >= 0 && n < faces[j].length - 1) {
          if (lastm >= 0 && m !== lastm + 1) {
            pairs.unshift([i, m], [j, n]);
          } else {
            pairs.push([i, m], [j, n]);
          }
          lastm = m;
        }
      }
      if (pairs.length !== 4) continue;
      chamferFaces.push([
        chamferFaces[pairs[0][0]][pairs[0][1]],
        chamferFaces[pairs[1][0]][pairs[1][1]],
        chamferFaces[pairs[3][0]][pairs[3][1]],
        chamferFaces[pairs[2][0]][pairs[2][1]],
        -1 // -1 signifies border/chamfer material
      ]);
    }
  }

  // Corner chamfer faces
  for (let i = 0; i < cornerFaces.length; ++i) {
    const cf = cornerFaces[i];
    const face = [cf[0]];
    let count = cf.length - 1;
    while (count > 0) {
      for (let m = faces.length; m < chamferFaces.length; ++m) {
        let index = chamferFaces[m].indexOf(face[face.length - 1]);
        if (index >= 0 && index < 4) {
          index = (index - 1 + 4) % 4;
          const nextVertex = chamferFaces[m][index];
          if (cf.includes(nextVertex) && !face.includes(nextVertex)) {
            face.push(nextVertex);
            break;
          }
        }
      }
      --count;
    }
    face.push(-1);
    chamferFaces.push(face);
  }

  return { vectors: chamferVectors, faces: chamferFaces };
}

/**
 * Converts polygonal face descriptors into a modern Three.js BufferGeometry
 * with groups corresponding to face material indices.
 */
export function buildBufferGeometry(
  vertices: THREE.Vector3[],
  faces: number[][],
  radius: number,
  tab: number,
  af: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const groups: { start: number; count: number; materialIndex: number }[] = [];

  let currentIndex = 0;

  for (let i = 0; i < faces.length; ++i) {
    const ii = faces[i];
    const fl = ii.length - 1;
    const matIndex = ii[fl] === -1 ? 0 : ii[fl] + 1; // 0 = border, 1..N = numbered faces
    const groupStartIndex = currentIndex;
    const aa = (Math.PI * 2) / fl;

    for (let j = 0; j < fl - 2; ++j) {
      const v0 = vertices[ii[0]].clone().multiplyScalar(radius);
      const v1 = vertices[ii[j + 1]].clone().multiplyScalar(radius);
      const v2 = vertices[ii[j + 2]].clone().multiplyScalar(radius);

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

      positions.push(v0.x, v0.y, v0.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);

      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);
      normals.push(normal.x, normal.y, normal.z);

      const uv0_x = (Math.cos(af) + 1 + tab) / 2 / (1 + tab);
      const uv0_y = (Math.sin(af) + 1 + tab) / 2 / (1 + tab);
      const uv1_x = (Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab);
      const uv1_y = (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab);
      const uv2_x = (Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab);
      const uv2_y = (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab);

      uvs.push(uv0_x, uv0_y);
      uvs.push(uv1_x, uv1_y);
      uvs.push(uv2_x, uv2_y);

      currentIndex += 3;
    }

    const groupCount = currentIndex - groupStartIndex;
    if (groupCount > 0) {
      groups.push({ start: groupStartIndex, count: groupCount, materialIndex: matIndex });
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  for (const grp of groups) {
    geometry.addGroup(grp.start, grp.count, grp.materialIndex);
  }
  geometry.computeBoundingSphere();

  return geometry;
}

export interface DieMeshAndShape {
  geometry: THREE.BufferGeometry;
  cannonShape: CANNON.ConvexPolyhedron;
  faceCount: number;
  faceUprightQuats: THREE.Quaternion[];
}

export function computeUprightQuaternions(
  normVectors: THREE.Vector3[],
  faces: number[][],
  af: number
): THREE.Quaternion[] {
  const quats: THREE.Quaternion[] = [];

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const fl = f.length - 1;
    const matIndex = f[fl];
    if (matIndex === -1) continue;

    const v0 = normVectors[f[0]];
    const v1 = normVectors[f[1]];
    const v2 = normVectors[f[2]];

    const aa = (Math.PI * 2) / fl;

    const uv0 = new THREE.Vector2((Math.cos(af) + 1) / 2, (Math.sin(af) + 1) / 2);
    const uv1 = new THREE.Vector2((Math.cos(aa + af) + 1) / 2, (Math.sin(aa + af) + 1) / 2);
    const uv2 = new THREE.Vector2((Math.cos(aa * 2 + af) + 1) / 2, (Math.sin(aa * 2 + af) + 1) / 2);

    const edge1 = new THREE.Vector3().subVectors(v1, v0);
    const edge2 = new THREE.Vector3().subVectors(v2, v0);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    const deltaU1 = uv1.x - uv0.x;
    const deltaV1 = uv1.y - uv0.y;
    const deltaU2 = uv2.x - uv0.x;
    const deltaV2 = uv2.y - uv0.y;
    const denom = deltaU1 * deltaV2 - deltaU2 * deltaV1;

    let bitangent = new THREE.Vector3(
      (deltaU1 * edge2.x - deltaU2 * edge1.x) / denom,
      (deltaU1 * edge2.y - deltaU2 * edge1.y) / denom,
      (deltaU1 * edge2.z - deltaU2 * edge1.z) / denom
    ).normalize();

    bitangent = bitangent.sub(normal.clone().multiplyScalar(bitangent.dot(normal))).normalize();
    const tangent = new THREE.Vector3().crossVectors(bitangent, normal).normalize();

    const m = new THREE.Matrix4();
    m.set(
      tangent.x, tangent.y, tangent.z, 0,
      bitangent.x, bitangent.y, bitangent.z, 0,
      normal.x, normal.y, normal.z, 0,
      0, 0, 0, 1
    );

    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    quats.push(q);
  }

  return quats;
}

export function createD4(radius: number): DieMeshAndShape {
  const vertices = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  const faces = [[1, 0, 2, 0], [0, 1, 3, 1], [0, 3, 2, 2], [1, 2, 3, 3]];
  const normVectors = vertices.map(v => new THREE.Vector3(...v).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.96);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, -0.1, (Math.PI * 7) / 6);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, (Math.PI * 7) / 6);

  return { geometry: geom, cannonShape, faceCount: 4, faceUprightQuats };
}

export function createD6(radius: number): DieMeshAndShape {
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ];
  const faces = [
    [0, 3, 2, 1, 0], [1, 2, 6, 5, 1], [0, 1, 5, 4, 2],
    [3, 7, 6, 2, 3], [0, 4, 7, 3, 4], [4, 5, 6, 7, 5]
  ];
  const normVectors = vertices.map(v => new THREE.Vector3(...v).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.96);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, 0.1, Math.PI / 4);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, Math.PI / 4);

  return { geometry: geom, cannonShape, faceCount: 6, faceUprightQuats };
}

export function createD8(radius: number): DieMeshAndShape {
  const vertices = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const faces = [
    [0, 2, 4, 0], [0, 4, 3, 1], [0, 3, 5, 2], [0, 5, 2, 3],
    [1, 3, 4, 4], [1, 4, 2, 5], [1, 2, 5, 6], [1, 5, 3, 7]
  ];
  const normVectors = vertices.map(v => new THREE.Vector3(...v).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.965);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, 0, -Math.PI / 8);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, -Math.PI / 8);

  return { geometry: geom, cannonShape, faceCount: 8, faceUprightQuats };
}

export function createD10(radius: number): DieMeshAndShape {
  const a = (Math.PI * 2) / 10;
  const h = 0.105;
  const v = -1;
  const vertices: number[][] = [];
  for (let i = 0, b = 0; i < 10; ++i, b += a) {
    vertices.push([Math.cos(b), Math.sin(b), h * (i % 2 ? 1 : -1)]);
  }
  vertices.push([0, 0, -1]);
  vertices.push([0, 0, 1]);

  const faces = [
    [5, 7, 11, 0], [4, 2, 10, 1], [1, 3, 11, 2], [0, 8, 10, 3], [7, 9, 11, 4],
    [8, 6, 10, 5], [9, 1, 11, 6], [2, 0, 10, 7], [3, 5, 11, 8], [6, 4, 10, 9],
    [1, 0, 2, v], [1, 2, 3, v], [3, 2, 4, v], [3, 4, 5, v], [5, 4, 6, v],
    [5, 6, 7, v], [7, 6, 8, v], [7, 8, 9, v], [9, 8, 0, v], [9, 0, 1, v]
  ];

  const normVectors = vertices.map(vert => new THREE.Vector3(...vert).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.945);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, 0, (Math.PI * 6) / 5);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, (Math.PI * 6) / 5);

  return { geometry: geom, cannonShape, faceCount: 10, faceUprightQuats };
}

export function createD12(radius: number): DieMeshAndShape {
  const p = (1 + Math.sqrt(5)) / 2;
  const q = 1 / p;
  const vertices = [
    [0, q, p], [0, q, -p], [0, -q, p], [0, -q, -p], [p, 0, q],
    [p, 0, -q], [-p, 0, q], [-p, 0, -q], [q, p, 0], [q, -p, 0], [-q, p, 0],
    [-q, -p, 0], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1],
    [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
  ];
  const faces = [
    [2, 14, 4, 12, 0, 0], [15, 9, 11, 19, 3, 1], [16, 10, 17, 7, 6, 2], [6, 7, 19, 11, 18, 3],
    [6, 18, 2, 0, 16, 4], [18, 11, 9, 14, 2, 5], [1, 17, 10, 8, 13, 6], [1, 13, 5, 15, 3, 7],
    [13, 8, 12, 4, 5, 8], [5, 4, 14, 9, 15, 9], [0, 12, 8, 10, 16, 10], [3, 19, 7, 17, 1, 11]
  ];
  const normVectors = vertices.map(v => new THREE.Vector3(...v).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.968);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, 0.2, -Math.PI / 8);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, -Math.PI / 8);

  return { geometry: geom, cannonShape, faceCount: 12, faceUprightQuats };
}

export function createD20(radius: number): DieMeshAndShape {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
  ];
  const faces = [
    [0, 11, 5, 0], [0, 5, 1, 1], [0, 1, 7, 2], [0, 7, 10, 3], [0, 10, 11, 4],
    [1, 5, 9, 5], [5, 11, 4, 6], [11, 10, 2, 7], [10, 7, 6, 8], [7, 1, 8, 9],
    [3, 9, 4, 10], [3, 4, 2, 11], [3, 2, 6, 12], [3, 6, 8, 13], [3, 8, 9, 14],
    [4, 9, 5, 15], [2, 4, 11, 16], [6, 2, 10, 17], [8, 6, 7, 18], [9, 8, 1, 19]
  ];
  const normVectors = vertices.map(v => new THREE.Vector3(...v).normalize());
  const cg = chamferGeometry(normVectors, faces, 0.955);
  const geom = buildBufferGeometry(cg.vectors, cg.faces, radius, -0.2, -Math.PI / 8);

  const cannonVertices = normVectors.map(v => new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius));
  const cannonFaces = faces.map(f => f.slice(0, f.length - 1));
  const cannonShape = new CANNON.ConvexPolyhedron({ vertices: cannonVertices, faces: cannonFaces });
  const faceUprightQuats = computeUprightQuaternions(normVectors, faces, -Math.PI / 8);

  return { geometry: geom, cannonShape, faceCount: 20, faceUprightQuats };
}

export function createDieMeshAndShape(type: PhysicalDieType, radius: number): DieMeshAndShape {
  switch (type) {
    case 'd4':
      return createD4(radius);
    case 'd6':
    case 'd3':
      return createD6(radius);
    case 'd8':
      return createD8(radius);
    case 'd10':
      return createD10(radius);
    case 'd12':
      return createD12(radius);
    case 'd20':
      return createD20(radius);
    default:
      return createD10(radius);
  }
}
