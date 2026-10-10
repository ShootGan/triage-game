import * as THREE from 'three';
import type { Kit } from './materials';
import { PROP_HALF_SIZE, type PropKind } from '../scenarios/propSizes';

export type { PropKind } from '../scenarios/propSizes';

/** Prostokątny obrys rekwizytu na ziemi (do omijania przy rozmieszczaniu ratownika). */
export interface Footprint {
  x: number;
  z: number;
  rotY: number;
  halfW: number; // wzdłuż lokalnej osi X
  halfD: number; // wzdłuż lokalnej osi Z
}

/** Obrys z kontraktu PROP_HALF_SIZE (wspólnego z walidacją scenariuszy). */
export function propFootprint(kind: PropKind, x: number, z: number, rotY: number): Footprint | null {
  const f = PROP_HALF_SIZE[kind];
  return f ? { x, z, rotY, halfW: f[0], halfD: f[1] } : null;
}

export function insideFootprint(f: Footprint, x: number, z: number, margin = 0): boolean {
  const dx = x - f.x;
  const dz = z - f.z;
  const c = Math.cos(f.rotY);
  const s = Math.sin(f.rotY);
  // obrót do układu lokalnego (odwrotność rotacji Y)
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.abs(lx) < f.halfW + margin && Math.abs(lz) < f.halfD + margin;
}

/** Autobus szkolny (przewrócony lekko na bok — pochylenie jak w prototypie). */
export function buildBus(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number, color = '#f2c230'): THREE.Group {
  const bus = new THREE.Group();
  parent.add(bus);
  kit.box(10, 2.6, 2.6, color, 0, 1.8, 0, bus);
  // r186: CapsuleGeometry(radius, height, capSegments, radialSegments) — `height` = długość części środkowej, jak `length` w r160
  const roof = kit.part(new THREE.CapsuleGeometry(1.3, 7.4, 6, 12), color, bus, 0, 2.9, 0);
  if (color !== '#f2c230') kit.box(10.04, 0.3, 2.64, '#2f5fb0', 0, 1.15, 0, bus); // pas boczny autokaru
  roof.rotation.z = Math.PI / 2;
  roof.scale.set(0.35, 1, 1);
  kit.box(10.05, 0.35, 2.65, '#2a2a2e', 0, 0.62, 0, bus);
  kit.box(10.06, 0.12, 2.66, '#2a2a2e', 0, 1.55, 0, bus);
  for (let i = 0; i < 7; i++) kit.box(1.0, 0.9, 2.66, '#3d5470', -4 + i * 1.25, 2.3, 0, bus);
  kit.box(0.1, 1.2, 2.2, '#3d5470', 5.0, 2.2, 0, bus);
  const wheel = kit.own(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 14));
  for (const wx of [-3.4, 3.4]) for (const wz of [-1.3, 1.3]) kit.part(wheel, '#22232a', bus, wx, 0.55, wz).rotation.x = Math.PI / 2;
  bus.position.set(x, 0.15, z);
  bus.rotation.set(0, rotY, 0.12);
  return bus;
}

const CAR_COLORS = ['#b03a3a', '#c8c8cc', '#2f4f8a', '#1e1e24', '#3f7a4a', '#d8d2c0', '#8a5a2a'];

export function buildCar(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const car = new THREE.Group();
  parent.add(car);
  // kolor nadwozia deterministycznie z pozycji — każde auto w scenie inne
  const body = CAR_COLORS[Math.abs(Math.round(x * 7 + z * 13)) % CAR_COLORS.length];
  kit.box(3.6, 0.7, 1.7, body, 0, 0.7, 0, car);
  kit.box(1.9, 0.6, 1.6, body, -0.3, 1.3, 0, car);
  kit.box(1.92, 0.42, 1.62, '#3d5470', -0.3, 1.32, 0, car);
  kit.box(0.1, 0.25, 1.4, '#e8e8d0', 1.8, 0.8, 0, car);
  const wheel = kit.own(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12));
  for (const wx of [-1.2, 1.2]) for (const wz of [-0.85, 0.85]) kit.part(wheel, '#22232a', car, wx, 0.34, wz).rotation.x = Math.PI / 2;
  car.position.set(x, 0, z);
  car.rotation.y = rotY;
  return car;
}

/** Odłamki szkła rozsypane wokół punktu. */
export function buildGlass(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  const shard = kit.own(new THREE.BoxGeometry(0.12, 0.04, 0.1));
  for (let i = 0; i < 18; i++) {
    kit.part(shard, '#cfe3ea', g, Math.sin(i * 3) * 1.5, 0.02, Math.cos(i * 5) * 1.2);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  return g;
}

// ---------- Pomocnicze ----------

/** Deterministyczny generator pseudolosowy (ten sam wygląd przy każdym uruchomieniu). */
function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Grupa rekwizytu ustawiona w świecie. */
function propGroup(parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  return g;
}

/** Prostopadłościan z obrotem (rx, ry, rz). */
function rbox(
  kit: Kit, w: number, h: number, d: number, c: string, x: number, y: number, z: number, p: THREE.Object3D,
  rx = 0, ry = 0, rz = 0,
): THREE.Mesh {
  const m = kit.box(w, h, d, c, x, y, z, p);
  m.rotation.set(rx, ry, rz);
  return m;
}

/** Belka/pręt (przekrój t × t) między dwoma punktami (lokalnie). */
function beam(kit: Kit, t: number, c: string, a: THREE.Vector3Like, b: THREE.Vector3Like, p: THREE.Object3D): THREE.Mesh {
  const d = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const m = kit.box(t, d.length(), t, c, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, p);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/**
 * Rozrzut gruzu: bryły betonu i cegły na kopcu o promieniu `r` i wysokości `h`
 * (wysokość powierzchni maleje liniowo od środka). Wszystko w granicach |x|<=lim[0], |z|<=lim[1] (lokalnie).
 */
function scatterDebris(
  kit: Kit, g: THREE.Object3D, rand: () => number, cx: number, cz: number, r: number, h: number,
  chunks: number, bricks: number, lim: [number, number],
): void {
  const brickGeo = kit.own(new THREE.BoxGeometry(0.25, 0.07, 0.12));
  const place = (pad: number): [number, number, number] => {
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * r;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (Math.abs(x) <= lim[0] - pad && Math.abs(z) <= lim[1] - pad) return [x, z, h * Math.max(0, 1 - d / r)];
    }
    return [cx, cz, h];
  };
  const concrete = ['#a8a39a', '#8f8a82', '#b4ada2', '#7d7870'];
  for (let i = 0; i < chunks; i++) {
    const s = 0.25 + rand() * 0.45;
    const [x, z, y] = place(s * 0.6);
    rbox(kit, s, s * (0.4 + rand() * 0.4), s * (0.6 + rand() * 0.5), concrete[i % concrete.length], x, y + s * 0.15, z, g,
      rand() * 0.8 - 0.4, rand() * Math.PI, rand() * 0.8 - 0.4);
  }
  const brick = ['#a8553a', '#8e4630', '#b86448'];
  for (let i = 0; i < bricks; i++) {
    const [x, z, y] = place(0.15);
    const m = kit.part(brickGeo, brick[i % brick.length], g, x, y + 0.04, z);
    m.rotation.set(rand() * 0.9 - 0.45, rand() * Math.PI, rand() * 0.9 - 0.45);
  }
}

// ---------- Ciężarówka ----------

/** Ciężarówka: kabina (biała z niebieskim pasem, przód w +x) + skrzynia ładunkowa. 9 × 2.6 m, wys. ~3.8 m. */
export function buildTruck(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  kit.box(8.6, 0.3, 1.5, '#2a2a2e', -0.1, 0.78, 0, g); // rama
  // kabina x 2.55..4.45
  kit.box(1.9, 2.0, 2.45, '#e8ecf0', 3.5, 1.95, 0, g);
  kit.box(1.6, 0.45, 2.35, '#e8ecf0', 3.35, 3.17, 0, g); // owiewka dachowa
  kit.box(1.92, 0.28, 2.47, '#2f5fb0', 3.5, 1.45, 0, g); // pas
  kit.box(0.06, 0.85, 2.2, '#3d5470', 4.46, 2.45, 0, g); // szyba czołowa
  kit.box(0.8, 0.7, 2.47, '#3d5470', 3.75, 2.5, 0, g);   // szyby boczne
  kit.box(0.05, 0.55, 1.3, '#3a3a40', 4.47, 1.3, 0, g);  // grill
  kit.box(0.18, 0.35, 2.5, '#2a2a2e', 4.41, 0.9, 0, g);  // zderzak
  for (const s of [-1, 1]) {
    kit.box(0.05, 0.18, 0.4, '#f4f0c0', 4.48, 1.25, s * 0.85, g); // reflektory
    kit.box(0.12, 0.3, 0.06, '#2a2a2e', 4.0, 2.6, s * 1.27, g);  // lusterka
  }
  // skrzynia x -4.5..2.35, y 1.1..3.8
  kit.box(6.85, 2.7, 2.55, '#c8ccd2', -1.075, 2.45, 0, g);
  kit.box(6.87, 0.45, 2.57, '#e8641e', -1.075, 3.3, 0, g); // pas firmowy
  kit.box(6.87, 0.1, 2.57, '#9a9ea6', -1.075, 1.12, 0, g);
  kit.box(0.05, 2.5, 0.06, '#7a7e86', -4.53, 2.45, 0, g);  // szczelina drzwi tylnych
  kit.box(0.04, 0.12, 2.3, '#7a7e86', -4.53, 1.9, 0, g);   // rygle
  kit.box(0.04, 0.12, 2.3, '#7a7e86', -4.53, 3.0, 0, g);
  // koła
  const wheel = kit.own(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14));
  for (const wx of [3.55, -2.4, -3.5]) for (const wz of [-1.08, 1.08]) kit.part(wheel, '#22232a', g, wx, 0.5, wz).rotation.x = Math.PI / 2;
  return g;
}

// ---------- Gruz ----------

/** Gruzowisko ok. 3 × 3 m, wys. do ~0.9 m: kopiec pyłu, bryły betonu, cegły, dwie belki, pręty zbrojeniowe. */
export function buildRubble(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const rand = rng(1234);
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  kit.part(lump, '#8a857c', g, -0.15, 0.05, 0.1).scale.set(1.25, 0.6, 1.15);
  kit.part(lump, '#9b9488', g, 0.55, 0.0, -0.45).scale.set(0.8, 0.7, 0.8);
  kit.part(lump, '#a39c90', g, -0.6, 0.0, -0.6).scale.set(0.7, 0.4, 0.7);
  scatterDebris(kit, g, rand, 0, 0, 1.35, 0.6, 12, 28, [1.5, 1.5]);
  // belki
  rbox(kit, 2.6, 0.16, 0.18, '#7a5a38', 0.1, 0.55, 0.3, g, 0, 0.45, 0.28);
  rbox(kit, 2.1, 0.14, 0.16, '#6a4c2e', -0.2, 0.35, -0.4, g, 0.1, -0.9, -0.15);
  // pręty zbrojeniowe
  for (const [rx, rz, a] of [[0.4, 0.1, 0.5], [0.5, -0.1, 0.9], [-0.3, 0.6, -0.6]] as const) {
    rbox(kit, 0.03, 0.8, 0.03, '#5a4a40', rx, 0.75, rz, g, a * 0.6, 0, a);
  }
  return g;
}

// ---------- Kamienica ----------

/**
 * Kamienica 12 × 8 m (lokalnie x -6..6, z -4..4), 3 kondygnacje (~9 m), fasada od +z.
 * Prawy przedni narożnik (x > 1.5) zawalony: odsłonięte stropy, poszarpane krawędzie, gruz.
 * Tył (−z) prosty — rekwizyt stoi na skraju sceny.
 */
export function buildBuilding(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const PL = '#d9c3a0';
  const BAND = '#c4ab86';
  const PLINTH = '#a89a84';
  const WIN = '#2e3a4f';
  const HOLE = '#14161e';
  const FR = '#f0ebe0';
  const SLAB = '#9a968e';
  const rand = rng(77);

  // --- część cała: x -6..1.5
  kit.box(7.5, 9, 8, PL, -2.25, 4.5, 0, g);
  kit.box(7.56, 1.0, 8.06, PLINTH, -2.25, 0.5, 0, g); // cokół
  for (const y of [3, 6]) kit.box(7.56, 0.18, 8.08, BAND, -2.25, y, 0, g); // gzymsy kondygnacji
  kit.box(7.7, 0.4, 8.2, BAND, -2.25, 8.95, 0, g); // gzyms wieńczący
  kit.box(0.6, 1.2, 0.6, '#9a5a44', -4.6, 9.6, -2.4, g); // kominy
  kit.box(0.6, 1.0, 0.6, '#9a5a44', -1.2, 9.5, -0.6, g);

  // okna fasady (piętra 1 i 2)
  const frameGeo = kit.own(new THREE.BoxGeometry(1.06, 1.62, 0.08));
  const glassGeo = kit.own(new THREE.BoxGeometry(0.9, 1.46, 0.1));
  const sillGeo = kit.own(new THREE.BoxGeometry(1.2, 0.1, 0.22));
  for (const wy of [4.5, 7.5]) {
    for (const wx of [-5.0, -3.4, -1.8, -0.2]) {
      const broken = wx > -1; // przy zawaleniu — wybite szyby
      kit.part(frameGeo, FR, g, wx, wy, 4.0);
      kit.part(glassGeo, broken ? HOLE : WIN, g, wx, wy, 4.01);
      kit.part(sillGeo, BAND, g, wx, wy - 0.84, 4.08);
      if (!broken) kit.box(0.05, 1.46, 0.11, FR, wx, wy, 4.02, g); // słupek okna
    }
  }
  // parter: witryna sklepu z markizą + brama
  kit.box(2.6, 2.0, 0.08, FR, -4.2, 1.6, 4.0, g);
  kit.box(2.4, 1.8, 0.1, WIN, -4.2, 1.6, 4.01, g);
  kit.box(2.9, 0.4, 0.2, '#2f8a3e', -4.2, 2.75, 4.08, g);
  kit.box(1.4, 2.4, 0.1, '#5a3a24', -1.2, 1.2, 4.01, g);
  kit.box(1.6, 0.25, 0.14, FR, -1.2, 2.5, 4.03, g);
  // okna boczne od strony −x (tylko kilka)
  for (const wy of [4.5, 7.5]) for (const wz of [-2, 1.5]) kit.box(0.1, 1.46, 0.9, WIN, -6.01, wy, wz, g);

  // --- strefa zawalenia: x 1.5..6
  // odsłonięte wnętrze na ścianie przy zawaleniu (tapety różnych mieszkań)
  kit.box(0.04, 2.7, 3.6, '#b9ab92', 1.52, 4.5, -1.8, g);
  kit.box(0.04, 2.7, 3.0, '#c9a77a', 1.52, 4.5, 2.2, g);
  kit.box(0.04, 2.7, 4.0, '#9fb0a0', 1.52, 7.5, -1.0, g);
  kit.box(0.04, 2.7, 2.8, '#b49aa8', 1.52, 7.5, 2.4, g);
  // wystające, połamane stropy
  kit.box(0.9, 0.25, 6.4, SLAB, 1.9, 6.0, -0.6, g);
  kit.box(0.6, 0.25, 7.2, SLAB, 1.75, 8.75, -0.3, g);
  rbox(kit, 2.0, 0.22, 2.6, SLAB, 2.4, 5.4, 2.3, g, 0.05, 0, -0.75); // zwisający fragment stropu
  // poszarpane krawędzie ścian frontowej i tylnej
  kit.box(1.0, 1.6, 0.45, PL, 2.0, 6.8, -3.78, g);
  kit.box(0.6, 0.9, 0.45, PL, 1.8, 8.0, -3.78, g);
  kit.box(0.7, 2.2, 0.45, PL, 1.85, 4.1, 3.78, g);
  kit.box(0.45, 1.0, 0.45, PL, 1.72, 7.3, 3.78, g);
  // tylna część parteru i resztka 1. piętra
  kit.box(4.5, 3, 4, PL, 3.75, 1.5, -2, g);
  kit.box(4.56, 1.0, 4.06, PLINTH, 3.75, 0.5, -2, g);
  kit.box(4.3, 2.6, 0.04, '#b9ab92', 3.75, 1.55, 0.01, g); // odsłonięta ściana wewnętrzna parteru
  kit.box(0.9, 2.0, 0.05, '#6a4a30', 4.6, 1.0, 0.03, g);   // drzwi wewnętrzne
  kit.box(2.7, 2.4, 2.5, PL, 2.85, 4.2, -2.75, g);
  kit.box(2.0, 0.6, 1.8, PL, 2.6, 5.7, -3.0, g);
  kit.box(4.6, 0.25, 4.2, SLAB, 3.8, 3.05, -2.0, g); // strop nad parterem
  for (const wz of [-3.0, -1.0]) kit.box(0.1, 1.3, 0.9, WIN, 6.01, 1.6, wz, g); // okna boczne parteru
  kit.box(0.1, 1.3, 0.9, HOLE, 4.21, 4.3, -2.2, g);
  // poszarpane wierzchołki murów
  for (let i = 0; i < 6; i++) {
    const s = 0.3 + rand() * 0.4;
    rbox(kit, s, s, s, PL, 1.7 + rand() * 2.4, 5.3 + rand() * 0.6, -3.6 + rand() * 2.0, g, rand(), rand(), rand());
  }
  // kikut ściany frontowej parteru
  kit.box(1.4, 1.5, 0.45, PL, 2.2, 0.75, 3.78, g);
  // gruzowisko w zawalonym narożniku (x 2.6..6, z 0..4)
  const lump = kit.own(new THREE.DodecahedronGeometry(1, 0));
  kit.part(lump, '#a09888', g, 4.3, 0.1, 1.9).scale.set(1.6, 1.15, 1.85);
  kit.part(lump, '#8f877a', g, 3.2, 0.0, 0.8).scale.set(1.1, 1.4, 1.0);
  kit.part(lump, '#b0a898', g, 5.1, 0.0, 3.0).scale.set(0.8, 0.6, 0.8);
  rbox(kit, 3.2, 0.25, 3.0, SLAB, 4.2, 1.9, 0.9, g, 0.5, 0.1, 0.15); // osunięty strop
  rbox(kit, 2.8, 0.16, 0.18, '#7a5a38', 4.0, 1.3, 2.6, g, 0.3, 0.6, 0.25); // belki
  rbox(kit, 2.4, 0.16, 0.18, '#6a4c2e', 4.8, 1.6, 1.4, g, -0.2, -0.8, 0.4);
  scatterDebris(kit, g, rand, 4.2, 2.0, 1.8, 1.1, 14, 30, [6, 4]);
  return g;
}

// ---------- Scena koncertowa ----------

/** Scena 10 × 6 m: podest 1.2 m, kratownica z dachem (~7.6 m), kolumny głośnikowe, baner. Przód od +z. */
export function buildStage(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const TRUSS = '#b0b4bc';
  kit.box(10, 1.2, 6, '#2a2a30', 0, 0.6, 0, g);
  kit.box(10.02, 0.06, 6.02, '#3a3a42', 0, 1.23, 0, g);
  kit.box(10.04, 1.1, 0.04, '#18181c', 0, 0.58, 3.01, g); // osłona przodu

  // słupy kratownicy (4 pręty + szczeble)
  const rod = kit.own(new THREE.BoxGeometry(0.05, 7.2, 0.05));
  const rung = kit.own(new THREE.BoxGeometry(0.34, 0.04, 0.04));
  const rungZ = kit.own(new THREE.BoxGeometry(0.04, 0.04, 0.34));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * 4.75;
    const cz = sz * 2.75;
    for (const dx of [-0.15, 0.15]) for (const dz of [-0.15, 0.15]) kit.part(rod, TRUSS, g, cx + dx, 3.6, cz + dz);
    for (let y = 0.4; y < 7.0; y += 0.6) {
      kit.part(rung, TRUSS, g, cx, y, cz + 0.15);
      kit.part(rungZ, TRUSS, g, cx + 0.15, y + 0.3, cz);
    }
    kit.box(0.6, 0.06, 0.6, '#55585f', cx, 0.03, cz, g); // stopa
  }
  // belki górne (kratownice wzdłuż x i z)
  const chordX = kit.own(new THREE.BoxGeometry(9.8, 0.06, 0.06));
  const chordZ = kit.own(new THREE.BoxGeometry(0.06, 0.06, 5.8));
  for (const s of [-1, 1]) {
    for (const dy of [6.75, 7.05]) for (const d of [-0.15, 0.15]) {
      kit.part(chordX, TRUSS, g, 0, dy, s * 2.75 + d);
      kit.part(chordZ, TRUSS, g, s * 4.75 + d, dy, 0);
    }
  }
  // dach dwuspadowy
  for (const s of [-1, 1]) rbox(kit, 10.0, 0.12, 3.2, '#202026', 0, 7.45, s * 1.5, g, s * 0.2, 0, 0);
  // reflektory na przedniej belce
  const lamp = kit.own(new THREE.CylinderGeometry(0.13, 0.11, 0.3, 8));
  for (let i = 0; i < 6; i++) {
    kit.part(lamp, i % 2 ? '#2a2a2e' : '#3a3a42', g, -3.5 + i * 1.4, 6.5, 2.75).rotation.x = 0.6;
    kit.box(0.14, 0.03, 0.03, '#f2c230', -3.5 + i * 1.4, 6.43, 2.87, g);
  }
  // tło sceny
  kit.box(9.0, 5.4, 0.08, '#141418', 0, 3.95, -2.75, g);
  // baner pod przednią belką
  kit.box(5.7, 1.0, 0.04, '#5a2a6a', 0, 5.7, 2.88, g);
  for (const sx of [-2.6, 2.6]) kit.box(0.02, 0.9, 0.02, '#55585f', sx, 6.6, 2.88, g); // linki
  const ban = new THREE.Mesh(kit.own(new THREE.PlaneGeometry(5.6, 0.9)), kit.textMaterial(['FESTIWAL'], '#7a3b8a', '#f2c230'));
  ban.position.set(0, 5.7, 2.91);
  g.add(ban);
  // kolumny głośnikowe
  const cone = kit.own(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12));
  for (const sx of [-1, 1]) {
    kit.box(1.0, 2.0, 0.8, '#1a1a1e', sx * 4.0, 2.25, 2.3, g);
    kit.box(1.0, 0.8, 0.8, '#1a1a1e', sx * 4.0, 3.65, 2.3, g);
    for (const cy of [1.75, 2.65, 3.65]) kit.part(cone, '#3a3a42', g, sx * 4.0, cy, 2.71).rotation.x = Math.PI / 2;
  }
  // podest perkusji, bęben, wzmacniacz, statyw mikrofonu
  kit.box(2.6, 0.4, 1.8, '#2a2a30', 0, 1.45, -1.5, g);
  kit.part(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 10), '#c02828', g, -0.5, 1.8, -1.2);
  kit.box(0.7, 0.5, 0.4, '#e8641e', 0.4, 1.9, -1.4, g);
  kit.box(0.8, 0.7, 0.45, '#1a1a1e', 2.3, 1.6, -1.8, g);
  kit.box(0.03, 1.5, 0.03, '#55585f', 0.4, 2.0, 1.2, g);
  return g;
}

// ---------- Barierka ----------

/** Segment barierek koncertowych 4 × 0.6 m (dwa przęsła po 2 m), wys. 1.1 m, stopy w poprzek. */
export function buildBarrier(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const MET = '#b8bcc4';
  const rail = kit.own(new THREE.BoxGeometry(1.95, 0.05, 0.05));
  const post = kit.own(new THREE.BoxGeometry(0.05, 1.08, 0.05));
  const bar = kit.own(new THREE.BoxGeometry(0.025, 0.86, 0.025));
  const foot = kit.own(new THREE.BoxGeometry(0.06, 0.04, 0.6));
  for (const cx of [-1, 1]) {
    kit.part(rail, MET, g, cx, 1.07, 0);
    kit.part(rail, MET, g, cx, 0.18, 0);
    for (const ex of [-0.95, 0.95]) {
      kit.part(post, MET, g, cx + ex, 0.56, 0);
      kit.part(foot, '#6a6e76', g, cx + ex, 0.02, 0);
    }
    for (let i = 1; i < 13; i++) kit.part(bar, MET, g, cx - 0.95 + i * 0.146, 0.625, 0);
  }
  return g;
}

// ---------- Zawalona trybuna ----------

/**
 * Trybuna 8 × 4 m (widownia patrzy w +z, najwyższy rząd przy −z, do ~2.2 m).
 * Lewa połowa (x < 0) stoi przekrzywiona, prawa zawalona: połamane deski, wygięte podpory.
 */
export function buildBleachers(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const WOOD = ['#b08850', '#9c7644', '#c09a60'];
  const MET = '#8a8e96';
  const rand = rng(4242);
  const ROWS = 5;
  const rowZ = (i: number): number => 1.55 - i * 0.78;
  const rowY = (i: number): number => 0.42 + i * 0.42;

  // lewa część — stoi, lekko przechylona
  const left = kit.joint(g, -2.0, 0, 0);
  left.rotation.z = 0.05;
  for (let i = 0; i < ROWS; i++) {
    kit.box(3.9, 0.07, 0.34, WOOD[i % 3], 0, rowY(i), rowZ(i), left);
    kit.box(3.9, 0.05, 0.3, WOOD[(i + 1) % 3], 0, rowY(i) - 0.32, rowZ(i) + 0.32, left); // podnóżek
  }
  for (const px of [-1.85, 0, 1.85]) {
    // podpory: pionowe słupki + skośna belka
    for (let i = 0; i < ROWS; i++) kit.box(0.07, rowY(i), 0.07, MET, px, rowY(i) / 2, rowZ(i) - 0.1, left);
    beam(kit, 0.07, MET, { x: px, y: 0, z: rowZ(0) + 0.1 }, { x: px, y: rowY(ROWS - 1), z: rowZ(ROWS - 1) - 0.1 }, left);
  }
  // pęknięte końce desek nad strefą zawalenia (zwisają w dół)
  for (let i = 1; i < ROWS; i++) {
    rbox(kit, 1.1, 0.07, 0.32, WOOD[i % 3], 0.4, rowY(i) - 0.25 - i * 0.05, rowZ(i), g, 0, 0, -0.45 - rand() * 0.3);
  }

  // prawa część — zawalona: każdy rząd złamany na 2 kawałki pod różnymi kątami
  for (let i = 0; i < ROWS; i++) {
    const base = 0.12 + i * 0.1;
    const split = 1.2 + rand() * 1.4;
    for (const [cx, len] of [[0.5 + split / 2, split], [0.5 + split + (3.4 - split) / 2, 3.4 - split]]) {
      rbox(kit, len - 0.1, 0.07, 0.34, WOOD[(i + Math.round(cx)) % 3], cx, base + rand() * 0.25, rowZ(i) * 0.85 + (rand() - 0.5) * 0.3, g,
        (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.35, (rand() - 0.5) * 0.5);
    }
  }
  // wygięte podpory
  for (const [px, pz, h, rx, rz] of [
    [1.4, -1.5, 1.6, 0.5, -0.7], [3.4, -1.4, 1.4, -0.3, 0.9], [2.4, 0.2, 1.1, 0.9, 0.3], [3.6, 1.1, 0.9, -0.6, -0.5],
  ] as const) {
    rbox(kit, 0.07, h, 0.07, MET, px, h * 0.35, pz, g, rx, 0, rz);
  }
  // sterczący fragment tylnej ramy
  beam(kit, 0.07, MET, { x: 0.3, y: 0, z: -1.7 }, { x: 0.8, y: 1.9, z: -1.7 }, g);
  beam(kit, 0.07, MET, { x: 0.8, y: 1.9, z: -1.7 }, { x: 2.8, y: 0.4, z: -1.6 }, g);
  // deski na ziemi
  for (let i = 0; i < 6; i++) {
    const px = 0.9 + rand() * 2.4;
    const pz = -1.4 + rand() * 2.8;
    rbox(kit, 1.0 + rand() * 0.6, 0.06, 0.3, WOOD[i % 3], px, 0.04, pz, g, 0, rand() * Math.PI, 0);
  }
  return g;
}

// ---------- Namiot ----------

/** Pawilon 3 × 3 m: 4 słupki, dach czterospadowy (biały), lambrekin w czerwono-białe pasy, stół w środku. */
export function buildTent(kit: Kit, parent: THREE.Object3D, x: number, z: number, rotY: number): THREE.Group {
  const g = propGroup(parent, x, z, rotY);
  const pole = kit.own(new THREE.BoxGeometry(0.06, 2.2, 0.06));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.part(pole, '#b0b4bc', g, sx * 1.42, 1.1, sz * 1.42);
  // ConeGeometry z 4 segmentami ma wierzchołki na osiach — obrót o 45° daje kwadrat 3 × 3 m
  kit.part(new THREE.ConeGeometry(2.12, 0.9, 4), '#f2f2ee', g, 0, 2.2 + 0.45, 0).rotation.y = Math.PI / 4;
  // lambrekin — pasy po 0.5 m
  const flap = kit.own(new THREE.BoxGeometry(0.5, 0.28, 0.02));
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 6; i++) {
      const t = -1.25 + i * 0.5;
      const m = kit.part(flap, i % 2 ? '#f2f2ee' : '#d6303a', g);
      // bok 0: +z, 1: +x, 2: −z, 3: −x
      const ox = side === 1 ? 1.49 : side === 3 ? -1.49 : t;
      const oz = side === 0 ? 1.49 : side === 2 ? -1.49 : t;
      m.position.set(ox, 2.08, oz);
      m.rotation.y = (side * Math.PI) / 2;
    }
  }
  // stół z kartonami
  kit.box(1.6, 0.05, 0.7, '#f4f4f4', 0, 0.75, -0.3, g);
  for (const sx of [-0.72, 0.72]) for (const sz of [-0.6, 0.0]) kit.box(0.04, 0.73, 0.04, '#7a7e86', sx, 0.37, sz, g);
  kit.box(0.4, 0.25, 0.3, '#c8a070', -0.4, 0.9, -0.35, g);
  kit.box(0.3, 0.2, 0.25, '#2f5fb0', 0.35, 0.88, -0.25, g);
  return g;
}

export function buildProp(kit: Kit, parent: THREE.Object3D, kind: PropKind, x: number, z: number, rotY: number, color?: string): THREE.Group {
  switch (kind) {
    case 'bus': return buildBus(kit, parent, x, z, rotY, color);
    case 'car': return buildCar(kit, parent, x, z, rotY);
    case 'glass': return buildGlass(kit, parent, x, z, rotY);
    case 'truck': return buildTruck(kit, parent, x, z, rotY);
    case 'rubble': return buildRubble(kit, parent, x, z, rotY);
    case 'building': return buildBuilding(kit, parent, x, z, rotY);
    case 'stage': return buildStage(kit, parent, x, z, rotY);
    case 'barrier': return buildBarrier(kit, parent, x, z, rotY);
    case 'bleachers': return buildBleachers(kit, parent, x, z, rotY);
    case 'tent': return buildTent(kit, parent, x, z, rotY);
  }
}

/**
 * Punkt zbiórki poszkodowanych: zielona plandeka, pachołki w narożnikach,
 * tablica „PUNKT ZBIÓRKI". size = bok plandeki w metrach.
 */
export function buildCollectionPoint(kit: Kit, parent: THREE.Object3D, x: number, z: number, size: number, rotY = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  const tarp = kit.box(size, 0.02, size, '#2f8a3e', 0, 0.012, 0, g);
  tarp.castShadow = false;
  // obszycie plandeki
  for (const s of [-1, 1]) {
    kit.box(size, 0.025, 0.08, '#1f6a2c', 0, 0.014, s * (size / 2 - 0.04), g).castShadow = false;
    kit.box(0.08, 0.025, size, '#1f6a2c', s * (size / 2 - 0.04), 0.014, 0, g).castShadow = false;
  }
  // pachołki
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = kit.joint(g, sx * (size / 2 + 0.25), 0, sz * (size / 2 + 0.25));
    kit.box(0.3, 0.03, 0.3, '#e8641e', 0, 0.015, 0, c);
    kit.part(new THREE.ConeGeometry(0.12, 0.45, 10), '#e8641e', c, 0, 0.25, 0);
    kit.part(new THREE.CylinderGeometry(0.075, 0.095, 0.08, 10), '#f4f4f4', c, 0, 0.26, 0);
  }
  // tablica na słupku (przy przedniej krawędzi)
  const post = kit.joint(g, -size / 2 + 0.3, 0, size / 2 + 0.35);
  kit.box(0.06, 1.7, 0.06, '#9a9a9a', 0, 0.85, 0, post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.04), kit.toon('#2f8a3e'));
  board.position.set(0, 1.55, 0);
  board.castShadow = true;
  post.add(board);
  kit.own(board.geometry);
  for (const side of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.49), kit.textMaterial(['PUNKT', 'ZBIÓRKI'], '#2f8a3e', '#f4f4f4'));
    kit.own(face.geometry);
    face.position.set(0, 1.55, side * 0.022);
    if (side < 0) face.rotation.y = Math.PI;
    post.add(face);
  }
  return g;
}

/** Torba medyczna (czerwona z białym krzyżem). Lokalny środek na ziemi. */
export function buildMedBag(kit: Kit, parent: THREE.Object3D): THREE.Group {
  const g = new THREE.Group();
  parent.add(g);
  kit.box(0.45, 0.28, 0.25, '#c02828', 0, 0.14, 0, g);
  kit.box(0.12, 0.12, 0.26, '#f4f4f4', 0, 0.16, 0, g);
  kit.box(0.04, 0.12, 0.27, '#f4f4f4', 0, 0.16, 0, g);
  return g;
}
