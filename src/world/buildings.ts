import * as THREE from 'three';
import type { Kit } from './materials';
import { propGroup, rbox } from './propUtils';

/**
 * Intact neighbouring tenements for a street frontage. Same footprint as the collapsed 'building'
 * (12 × 8 m, facade towards +z), so they line up into a continuous row.
 *
 * Variant: `<palette>[-<floors>][-dmgL|-dmgR]`, e.g. 'ochre-4-dmgR':
 * - palette: 'ochre' | 'grey' | 'salmon' | 'green'
 * - floors: 3 (default) or 4
 * - dmgL / dmgR: windows on that side (−x / +x) blown out by the neighbouring explosion
 */
const PALETTES: Record<string, { wall: string; band: string; plinth: string; roof: string }> = {
  ochre: { wall: '#d9b98a', band: '#c49f6c', plinth: '#a08a6c', roof: '#8a4a36' },
  grey: { wall: '#b8c0c4', band: '#a0a8ae', plinth: '#8a9096', roof: '#5a5e66' },
  salmon: { wall: '#d8a890', band: '#c08c74', plinth: '#9c7e6c', roof: '#7a3e30' },
  green: { wall: '#b8c4a0', band: '#a0ac88', plinth: '#8a907a', roof: '#6a4a3a' },
};

const WIN = '#2e3a4f';
const HOLE = '#14161e';
const FRAME = '#f0ebe0';

export function buildTenement(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, variant = 'ochre'): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const [paletteName, ...flags] = variant.split('-');
  const p = PALETTES[paletteName] ?? PALETTES.ochre;
  const floors = flags.includes('4') ? 4 : 3;
  const dmg = flags.includes('dmgL') ? -1 : flags.includes('dmgR') ? 1 : 0;
  const H = floors * 3;

  kit.box(12, H, 8, p.wall, 0, H / 2, 0, g);
  kit.box(12.06, 1.0, 8.06, p.plinth, 0, 0.5, 0, g);
  for (let f = 1; f < floors; f++) kit.box(12.06, 0.18, 8.08, p.band, 0, f * 3, 0, g);
  kit.box(12.2, 0.4, 8.2, p.band, 0, H - 0.05, 0, g); // crowning cornice
  // pitched roof along x, chimneys
  for (const s of [-1, 1]) rbox(kit, 12.1, 0.15, 4.5, p.roof, 0, H + 0.95, s * 1.9, g, s * 0.45, 0, 0);
  kit.box(0.6, 1.3, 0.6, '#9a5a44', -3.5, H + 1.6, -1.2, g);
  kit.box(0.6, 1.1, 0.6, '#9a5a44', 2.8, H + 1.5, 0.8, g);

  // upper-floor windows: 5 per floor; the two nearest a damaged side are blown out
  const frameGeo = kit.own(new THREE.BoxGeometry(1.06, 1.62, 0.08));
  const glassGeo = kit.own(new THREE.BoxGeometry(0.9, 1.46, 0.1));
  const sillGeo = kit.own(new THREE.BoxGeometry(1.2, 0.1, 0.22));
  const cols = [-4.6, -2.3, 0, 2.3, 4.6];
  for (let f = 1; f < floors; f++) {
    const wy = f * 3 + 1.5;
    for (const wx of cols) {
      const broken = dmg !== 0 && Math.sign(wx) === dmg && Math.abs(wx) > 2;
      kit.part(frameGeo, FRAME, g, wx, wy, 4.0);
      kit.part(glassGeo, broken ? HOLE : WIN, g, wx, wy, 4.01);
      kit.part(sillGeo, p.band, g, wx, wy - 0.84, 4.08);
      if (!broken) kit.box(0.05, 1.46, 0.11, FRAME, wx, wy, 4.02, g);
    }
  }
  // one balcony on the first floor, centre
  kit.box(2.6, 0.15, 0.9, p.band, 0, 3.15, 4.45, g);
  for (let i = 0; i <= 8; i++) kit.box(0.04, 0.9, 0.04, '#3a3a40', -1.25 + i * 0.3125, 3.7, 4.86, g);
  kit.box(2.6, 0.05, 0.05, '#3a3a40', 0, 4.15, 4.86, g);

  // ground floor: shop window with awning on one side, gate in the middle, windows on the other side
  const shopX = paletteName === 'grey' || paletteName === 'green' ? 3.4 : -3.4;
  const awning = ['#2f8a3e', '#c0392b', '#2f5fb0', '#8a5a2a'][Object.keys(PALETTES).indexOf(paletteName) % 4];
  kit.box(3.6, 2.0, 0.08, FRAME, shopX, 1.6, 4.0, g);
  kit.box(3.4, 1.8, 0.1, dmg === Math.sign(shopX) ? HOLE : WIN, shopX, 1.6, 4.01, g);
  kit.box(3.9, 0.4, 0.2, awning, shopX, 2.75, 4.08, g);
  kit.box(1.5, 2.4, 0.1, '#5a3a24', 0, 1.2, 4.01, g);   // gate
  kit.box(1.7, 0.25, 0.14, FRAME, 0, 2.5, 4.03, g);
  for (const wx of [-shopX - 1, -shopX + 1]) {
    kit.part(frameGeo, FRAME, g, wx, 1.7, 4.0).scale.set(0.8, 0.8, 1);
    kit.part(glassGeo, WIN, g, wx, 1.7, 4.01).scale.set(0.8, 0.8, 1);
  }
  return g;
}
