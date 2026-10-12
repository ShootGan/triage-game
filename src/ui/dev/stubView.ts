// ATRAPA (tylko tryb ?stub) — zastępczy IGameView rysujący płaski widok 2D z góry.
import type { TriageCategory } from '../../engine/triage';
import type { IGameView, ScreenPoint } from '../../render/types';
import type { Scenario } from '../../scenarios/types';

const COLORS: Record<TriageCategory, string> = { red: '#d6303a', yellow: '#f2c230', green: '#3fa34d', black: '#1a1c2c', grey: '#8a8f98' };

export function createStubGameView(canvas: HTMLCanvasElement, scenario: Scenario): IGameView {
  const ctx = canvas.getContext('2d')!;
  const frameCbs: (() => void)[] = [];
  const clickCbs: ((id: string) => void)[] = [];
  const pos = new Map(scenario.patients.map((p) => [p.id, { x: p.position[0], z: p.position[1] }]));
  const targets = new Map<string, { x: number; z: number }>();
  const tags = new Map<string, TriageCategory | null>();
  const controlled = new Set<string>();
  let focused: string | null = null;
  let raf = 0;
  let disposed = false;

  const layout = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const scale = Math.min(w / 26, h / 14);
    return { w, h, scale, cx: w / 2, cy: h / 2 + 20 };
  };
  const toScreen = (x: number, z: number) => {
    const L = layout();
    return { x: L.cx + x * L.scale, y: L.cy + z * L.scale };
  };

  const draw = () => {
    if (disposed) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(canvas.clientWidth * dpr), ch = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = layout();
    ctx.fillStyle = '#3e5a3a'; ctx.fillRect(0, 0, L.w, L.h);
    // droga
    const r0 = toScreen(0, -3), r1 = toScreen(0, 3);
    ctx.fillStyle = '#4a4e5c'; ctx.fillRect(0, r0.y, L.w, r1.y - r0.y);
    ctx.fillStyle = '#d8d8d8';
    for (let x = 0; x < L.w; x += 40) ctx.fillRect(x, L.cy - 2, 20, 4);
    // autobus
    for (const pr of scenario.props) {
      const c = toScreen(pr.position[0], pr.position[1]);
      ctx.fillStyle = pr.kind === 'bus' ? '#e8a33d' : '#8899aa';
      ctx.fillRect(c.x - L.scale * 1.5, c.y - L.scale * 4, L.scale * 3, L.scale * 2.2);
    }
    // punkt zbiórki
    const cp = toScreen(scenario.collectionPoint[0], scenario.collectionPoint[1]);
    ctx.strokeStyle = '#3fa34d'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.strokeRect(cp.x - L.scale * 1.5, cp.y - L.scale * 1.5, L.scale * 3, L.scale * 3); ctx.setLineDash([]);
    // pacjenci
    for (const p of scenario.patients) {
      const cur = pos.get(p.id)!;
      const t = targets.get(p.id);
      if (t) { cur.x += (t.x - cur.x) * 0.03; cur.z += (t.z - cur.z) * 0.03; }
      const c = toScreen(cur.x, cur.z);
      if (p.majorBleeding) {
        ctx.fillStyle = '#7a1018';
        ctx.beginPath(); ctx.ellipse(c.x + 10, c.y + 6, controlled.has(p.id) ? 12 : 18, 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = p.appearance.shirt;
      ctx.fillRect(c.x - 8, c.y - 8, 16, 16);
      const tg = tags.get(p.id);
      if (tg) { ctx.fillStyle = COLORS[tg]; ctx.fillRect(c.x - 8, c.y - 2, 16, 4); }
      if (focused === p.id) { ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 13, c.y - 13, 26, 26); }
    }
    ctx.fillStyle = '#f4f4f4'; ctx.font = '14px monospace';
    ctx.fillText('STUB VIEW (atrapa 2D)' + (focused ? ` · focus: ${focused}` : ''), 12, L.h - 12);
    for (const cb of frameCbs) cb();
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best: string | null = null, bd = 18 * 18;
    for (const [id, p] of pos) {
      const c = toScreen(p.x, p.z);
      const d = (c.x - mx) ** 2 + (c.y - my) ** 2;
      if (d < bd) { bd = d; best = id; }
    }
    if (best) for (const cb of clickCbs) cb(best);
  };
  canvas.addEventListener('click', onClick);

  return {
    getPatientScreenPositions() {
      const out: Record<string, ScreenPoint> = {};
      for (const [id, p] of pos) {
        const c = toScreen(p.x, p.z);
        out[id] = { x: c.x + 18, y: c.y - 20, visible: true };
      }
      return out;
    },
    focusPatient(id, onArrive) { focused = id; if (id) setTimeout(() => { if (focused === id) onArrive?.(); }, 400); },
    onPatientClick(cb) { clickCbs.push(cb); },
    onFrame(cb) { frameCbs.push(cb); },
    wave() {},
    sendWalkersToCollectionPoint() {
      let i = 0;
      for (const p of scenario.patients) {
        if (!p.vitals.canWalk) continue;
        targets.set(p.id, { x: scenario.collectionPoint[0] + (i % 3) - 1, z: scenario.collectionPoint[1] + Math.floor(i / 3) });
        i++;
      }
    },
    setBleedingControlled(id) { controlled.add(id); },
    setTag(id, category) { tags.set(id, category); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('click', onClick);
    },
  };
}
