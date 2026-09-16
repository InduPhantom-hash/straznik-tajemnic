import * as THREE from 'three';
import type { DiceRollTraceDie } from '@/lib/dice-roll-trace';

export interface DicePalette {
  name: string;
  faceBg: string;
  faceBorder: string;
  textColor: string;
  textShadow: string;
  edgeColor: number;
  roughness: number;
  metalness: number;
}

export const PALETTES: Record<'ebony' | 'malachite' | 'ivory' | 'discarded', DicePalette> = {
  ebony: {
    name: 'Ebony & Gold (Tens)',
    faceBg: '#14110e',
    faceBorder: '#c9a227',
    textColor: '#f5d97f',
    textShadow: 'rgba(0, 0, 0, 0.85)',
    edgeColor: 0x1f1912,
    roughness: 0.35,
    metalness: 0.55,
  },
  malachite: {
    name: 'Malachite & Brass (Units)',
    faceBg: '#092a21',
    faceBorder: '#d4af37',
    textColor: '#fae6a2',
    textShadow: 'rgba(0, 0, 0, 0.85)',
    edgeColor: 0x0f2b24,
    roughness: 0.35,
    metalness: 0.55,
  },
  ivory: {
    name: 'Antique Ivory (Combat/Stats)',
    faceBg: '#e6dcce',
    faceBorder: '#8a7353',
    textColor: '#241a12',
    textShadow: 'rgba(255, 255, 255, 0.4)',
    edgeColor: 0xb5a691,
    roughness: 0.45,
    metalness: 0.2,
  },
  discarded: {
    name: 'Discarded Penalty/Bonus',
    faceBg: '#1a1817',
    faceBorder: '#4a443b',
    textColor: '#70695e',
    textShadow: 'rgba(0, 0, 0, 0.9)',
    edgeColor: 0x151413,
    roughness: 0.65,
    metalness: 0.2,
  },
};

export function getDiePalette(die: DiceRollTraceDie): DicePalette {
  if (die.selected === false) return PALETTES.discarded;
  if (die.role === 'tens' || die.role === 'bonus' || die.role === 'penalty') {
    return PALETTES.ebony;
  }
  if (die.role === 'units') {
    return PALETTES.malachite;
  }
  return PALETTES.ivory;
}

export function getFaceLabels(type: DiceRollTraceDie['type'], role: DiceRollTraceDie['role']): string[] {
  if (type === 'd10' && (role === 'tens' || role === 'bonus' || role === 'penalty')) {
    // 00 to 90 for tens die
    return ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90'];
  }
  if (type === 'd10') {
    // 0 to 9 for units die (CoC standard)
    return ['0', '1', '2', '3', '4', '5', '6.', '7', '8', '9.'];
  }
  if (type === 'd4') {
    return ['1', '2', '3', '4'];
  }
  if (type === 'd6' || type === 'd3') {
    if (type === 'd3') return ['1', '2', '3', '1', '2', '3'];
    return ['1', '2', '3', '4', '5', '6'];
  }
  if (type === 'd8') {
    return ['1', '2', '3', '4', '5', '6', '7', '8'];
  }
  if (type === 'd12') {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }
  if (type === 'd20') {
    return [
      '1', '2', '3', '4', '5', '6.', '7', '8', '9.', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
    ];
  }
  return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
}

/**
 * Creates a high-res Art Déco Canvas texture for an individual die face.
 */
export function createFaceTexture(label: string, palette: DicePalette): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // 1. Background fill
  ctx.fillStyle = palette.faceBg;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle marble/lacquer grain gradient
  const grad = ctx.createRadialGradient(w / 2, h / 2, 35, w / 2, h / 2, w / 1.3);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 3. Art Déco Geometric Border (outer ring & inner diamond)
  ctx.strokeStyle = palette.faceBorder;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.43, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.37, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Numeral typography
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = label.length > 2 ? 165 : label.length === 2 ? 195 : 230;
  ctx.font = `bold ${fontSize}px "Georgia", "Cinzel", "Times New Roman", serif`;

  // Drop shadow
  ctx.fillStyle = palette.textShadow;
  ctx.fillText(label, w / 2 + 5, h / 2 + 7);

  // Main engraved numeral
  ctx.fillStyle = palette.textColor;
  ctx.fillText(label, w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the full array of Three.js materials for a die mesh:
 * [0] = Chamfer/border edge material
 * [1..N] = Face materials with textures for each side
 */
export function createDiceMaterials(die: DiceRollTraceDie): THREE.Material[] {
  const palette = getDiePalette(die);
  const labels = getFaceLabels(die.type, die.role);

  // Index 0: border edge material
  const borderMaterial = new THREE.MeshStandardMaterial({
    color: palette.edgeColor,
    roughness: palette.roughness,
    metalness: palette.metalness,
  });

  const materials: THREE.Material[] = [borderMaterial];

  for (let i = 0; i < labels.length; ++i) {
    const texture = createFaceTexture(labels[i], palette);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: palette.roughness,
      metalness: palette.metalness,
    });
    materials.push(mat);
  }

  return materials;
}
