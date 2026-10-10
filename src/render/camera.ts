import * as THREE from 'three';
import { FAR, NEAR } from './pixelPipeline';

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 12;
const DIST = 25; // odległość pozioma kamery od celu

export interface CamState {
  angle: number;
  /** Połowa wysokości widoku ortho w metrach. */
  zoom: number;
  target: THREE.Vector3;
  /** Wysokość kamery nad celem. */
  elev: number;
}

/**
 * Izometryczna kamera ortograficzna: kąt / zoom / cel / wysokość.
 * Stan bieżący płynnie dąży do docelowego (animowane przejścia).
 */
export class CameraRig {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
  readonly cur: CamState = { angle: Math.PI * 0.3, zoom: 4, target: new THREE.Vector3(0, 0, 3.5), elev: 20 };
  readonly goal: CamState = { angle: Math.PI * 0.3, zoom: 4, target: new THREE.Vector3(0, 0, 3.5), elev: 20 };
  aspect = 16 / 9;
  /** Szybkość dążenia do celu (1/s). */
  stiffness = 6;

  /**
   * Górna granica zoomu. Na ekranie pionowym (telefon) rośnie tak, by w poziomie mieścił się
   * ten sam wycinek sceny co na ekranie 16:9 — przegląd obejmuje wszystkich poszkodowanych.
   */
  get zoomMax(): number {
    return this.aspect >= 1 ? ZOOM_MAX : (ZOOM_MAX * 16) / 9 / this.aspect;
  }

  /** Obrót przeciągnięciem — natychmiastowy (bieżący i docelowy). */
  rotate(delta: number): void {
    this.cur.angle += delta;
    this.goal.angle += delta;
  }

  /** Zoom kółkiem — płynny, ograniczony. instant = także stan bieżący (szczypanie palcami). */
  zoomBy(factor: number, instant = false): void {
    this.goal.zoom = THREE.MathUtils.clamp(this.goal.zoom * factor, ZOOM_MIN, this.zoomMax);
    if (instant) this.cur.zoom = this.goal.zoom;
  }

  setGoal(target: THREE.Vector3, zoom: number, elev: number): void {
    this.goal.target.copy(target);
    this.goal.zoom = THREE.MathUtils.clamp(zoom, ZOOM_MIN, this.zoomMax);
    this.goal.elev = elev;
  }

  snap(): void {
    this.cur.angle = this.goal.angle;
    this.cur.zoom = this.goal.zoom;
    this.cur.elev = this.goal.elev;
    this.cur.target.copy(this.goal.target);
    this.apply();
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * this.stiffness);
    const c = this.cur;
    const g = this.goal;
    c.angle += (g.angle - c.angle) * k;
    // zoom interpolowany logarytmicznie — równe tempo przy zbliżaniu i oddalaniu
    c.zoom = Math.exp(Math.log(c.zoom) + (Math.log(g.zoom) - Math.log(c.zoom)) * k);
    c.elev += (g.elev - c.elev) * k;
    c.target.lerp(g.target, k);
    this.apply();
  }

  apply(): void {
    const { zoom: z, target: t, angle, elev } = this.cur;
    const cam = this.camera;
    cam.left = -z * this.aspect;
    cam.right = z * this.aspect;
    cam.top = z;
    cam.bottom = -z;
    cam.updateProjectionMatrix();
    cam.position.set(t.x + Math.cos(angle) * DIST, t.y + elev, t.z + Math.sin(angle) * DIST);
    cam.lookAt(t);
    cam.updateMatrixWorld();
  }

  /**
   * Kadr obejmujący wszystkie punkty przy danym kącie i wysokości kamery.
   * Zwraca cel na ziemi (y=0) i zoom z marginesem. fracW/fracH — ułamek szerokości/wysokości
   * ekranu, który pozostaje odsłonięty (reszta zasłonięta przez UI); kadr ma się zmieścić w nim.
   */
  frame(points: THREE.Vector3[], angle: number, elev: number, margin = 1.2, fracW = 1, fracH = 1): { target: THREE.Vector3; zoom: number } {
    if (points.length === 0) return { target: new THREE.Vector3(), zoom: 4 };
    const { dir, right, up } = viewAxes(angle, elev);
    let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity;
    for (const p of points) {
      const r = p.dot(right);
      const u = p.dot(up);
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    }
    const halfW = (maxR - minR) / 2 + margin;
    const halfH = (maxU - minU) / 2 + margin;
    const zoom = Math.max(halfW / (this.aspect * fracW), halfH / fracH, 2);
    // środek kadru w przestrzeni widoku → punkt na ziemi wzdłuż kierunku patrzenia
    const c = right.multiplyScalar((minR + maxR) / 2).add(up.multiplyScalar((minU + maxU) / 2));
    c.addScaledVector(dir, -c.y / dir.y);
    c.y = 0;
    return { target: c, zoom };
  }
}

/** Kierunek patrzenia oraz osie ekranu (prawo, góra) w świecie dla danego kąta i wysokości kamery. */
export function viewAxes(angle: number, elev: number): { dir: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3 } {
  const dir = new THREE.Vector3(-Math.cos(angle) * DIST, -elev, -Math.sin(angle) * DIST).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, dir).normalize();
  return { dir, right, up };
}
