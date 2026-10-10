import * as THREE from 'three';

/** Kolor jako string hex (cache'owany materiał toon) albo gotowy materiał. */
export type ColorOrMat = string | THREE.Material;

interface Disposable {
  dispose(): void;
}

/**
 * Zestaw narzędzi do budowania sceny: wspólny gradient toon (4 stopnie),
 * cache materiałów po kolorze i rejestr zasobów do zwolnienia w dispose().
 */
export class Kit {
  readonly gradientMap: THREE.DataTexture;
  private readonly mats = new Map<string, THREE.MeshToonMaterial>();
  private readonly owned = new Set<Disposable>();

  constructor() {
    const gm = new THREE.DataTexture(new Uint8Array([70, 140, 200, 255]), 4, 1, THREE.RedFormat);
    gm.minFilter = THREE.NearestFilter;
    gm.magFilter = THREE.NearestFilter;
    gm.needsUpdate = true;
    this.gradientMap = gm;
  }

  /** Materiał toon dla koloru (współdzielony). */
  toon(c: ColorOrMat): THREE.Material {
    if (typeof c !== 'string') return c;
    let m = this.mats.get(c);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color: c, gradientMap: this.gradientMap });
      this.mats.set(c, m);
    }
    return m;
  }

  /** Rejestruje zasób (geometria, materiał, tekstura) do zwolnienia w dispose(). */
  own<T extends Disposable>(x: T): T {
    this.owned.add(x);
    return x;
  }

  /** Zwalnia zasób od razu (np. usunięta opaska) i wyrejestrowuje go. */
  release(x: Disposable): void {
    if (this.owned.delete(x)) x.dispose();
  }

  /** Siatka z cieniami, dodana do rodzica. */
  part(geo: THREE.BufferGeometry, color: ColorOrMat, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Mesh {
    this.owned.add(geo);
    const m = new THREE.Mesh(geo, this.toon(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  box(w: number, h: number, d: number, c: ColorOrMat, x: number, y: number, z: number, p: THREE.Object3D): THREE.Mesh {
    return this.part(new THREE.BoxGeometry(w, h, d), c, p, x, y, z);
  }

  sphere(r: number, c: ColorOrMat, p: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): THREE.Mesh {
    const m = this.part(new THREE.SphereGeometry(r, 16, 12), c, p, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  }

  joint(p: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    p.add(g);
    return g;
  }

  /** Bryła obrotowa z profilu [promień, wysokość], spłaszczona w z (sz) i x (sx). */
  lathe(profile: ReadonlyArray<readonly [number, number]>, color: ColorOrMat, parent: THREE.Object3D, sz = 1, sx = 1): THREE.Mesh {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const m = this.part(new THREE.LatheGeometry(pts, 20), color, parent);
    m.scale.set(sx, 1, sz);
    return m;
  }

  /** Zwężająca się kończyna wisząca w dół od stawu. */
  limb(parent: THREE.Object3D, r0: number, r1: number, len: number, color: ColorOrMat): void {
    const g = new THREE.CylinderGeometry(r0, r1, len, 12);
    g.translate(0, -len / 2, 0);
    this.part(g, color, parent);
    this.sphere(r0, color, parent, 0, 0, 0);
  }

  /** Materiał z napisem (np. „RATOWNIK MEDYCZNY" na plecach). */
  textMaterial(lines: string[], bg = '#d6303a', fg = '#f4f4f4'): THREE.Material {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 48;
    const x = c.getContext('2d');
    if (x) {
      x.fillStyle = bg;
      x.fillRect(0, 0, 128, 48);
      x.fillStyle = fg;
      x.font = 'bold 15px sans-serif';
      x.textAlign = 'center';
      lines.forEach((l, i) => x.fillText(l, 64, 20 + i * 18));
    }
    const t = this.own(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace;
    return this.own(new THREE.MeshToonMaterial({ map: t, gradientMap: this.gradientMap }));
  }

  dispose(): void {
    for (const m of this.mats.values()) m.dispose();
    this.mats.clear();
    for (const o of this.owned) o.dispose();
    this.owned.clear();
    this.gradientMap.dispose();
  }
}
