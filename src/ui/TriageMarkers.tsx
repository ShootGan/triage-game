import { useEffect, useRef } from 'react';
import { CATEGORY_LABEL, saltSortGroup } from '../engine/triage';
import { gameProtocol, useGame } from '../game/store';
import { useGameView } from './GameCanvas';

const MARKER_OFFSET = { x: 24, y: -20 };

/**
 * Znaczniki triage obok pacjentów. Pozycje aktualizowane co klatkę
 * bezpośrednio w DOM (view.onFrame → style.transform), bez re-renderu Reacta.
 */
export function TriageMarkers() {
  const view = useGameView();
  const patients = useGame((s) => s.scenario?.patients ?? []);
  const tags = useGame((s) => s.tags);
  const selectedId = useGame((s) => s.selectedId);
  const selectPatient = useGame((s) => s.selectPatient);
  const salt = useGame((s) => gameProtocol(s) === 'SALT');
  const walkersCalled = useGame((s) => s.walkersCalled);
  const waversCalled = useGame((s) => s.waversCalled);
  const els = useRef(new Map<string, HTMLButtonElement>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!view) return;
    const update = () => {
      if (!mounted.current) return;
      const pos = view.getPatientScreenPositions();
      // przy badaniu kółko badanego pacjenta zasłaniałoby go — kategorię widać w panelu
      const st = useGame.getState();
      const focused = st.selectedId ?? st.approachingId;
      for (const [id, el] of els.current) {
        const p = pos[id];
        if (!p || !p.visible || id === focused) {
          el.style.display = 'none';
          continue;
        }
        el.style.display = '';
        // Kółko obok pacjenta (u góry po prawej), żeby nie zasłaniało postaci.
        el.style.transform = `translate(${Math.round(p.x + MARKER_OFFSET.x)}px, ${Math.round(p.y + MARKER_OFFSET.y)}px)`;
      }
    };
    view.onFrame(update);
    update();
    return () => {
      // IGameView nie ma wyrejestrowania — callback staje się no-op.
      mounted.current = false;
    };
  }, [view]);

  return (
    <div className="markers">
      {patients.map((p) => {
        const tag = tags[p.id];
        // SALT sort group as far as the commands revealed it: walkers 3, then wavers 2, still ones 1.
        const g = salt ? saltSortGroup(p) : 0;
        const group = !salt || !walkersCalled ? null : g === 3 ? 3 : waversCalled ? g : null;
        const cls = tag ? `mk mk-${tag}` : group ? `mk mk-pending mk-sort${group}` : 'mk mk-pending';
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el) els.current.set(p.id, el);
              else els.current.delete(p.id);
            }}
            className={`${cls} ${selectedId === p.id ? 'mk-selected' : ''}`}
            style={{ display: 'none' }}
            title={`${p.label}${tag ? ' — ' + CATEGORY_LABEL[tag] : group ? ` — grupa sortowania ${group}` : ' — niezbadany'}`}
            onClick={() => selectPatient(p.id)}
          >
            {tag === 'black' ? '✝' : tag ? '' : group ?? '?'}
          </button>
        );
      })}
    </div>
  );
}
