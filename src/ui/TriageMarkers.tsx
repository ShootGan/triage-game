import { useEffect, useRef } from 'react';
import { CATEGORY_LABEL } from '../engine/triage';
import { useGame } from '../game/store';
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
        const cls = tag ? `mk mk-${tag}` : 'mk mk-pending';
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el) els.current.set(p.id, el);
              else els.current.delete(p.id);
            }}
            className={`${cls} ${selectedId === p.id ? 'mk-selected' : ''}`}
            style={{ display: 'none' }}
            title={`${p.label}${tag ? ' — ' + CATEGORY_LABEL[tag] : ' — niezbadany'}`}
            onClick={() => selectPatient(p.id)}
          >
            {tag === 'black' ? '✝' : tag ? '' : '?'}
          </button>
        );
      })}
    </div>
  );
}
