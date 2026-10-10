import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useGame } from '../game/store';
import type { ViewInsets } from '../render/types';
import { ExamPanel } from './ExamPanel';
import { useGameView } from './GameCanvas';
import { HintPanel } from './HintPanel';
import { Hud } from './Hud';
import { TriageMarkers } from './TriageMarkers';

/** Musi odpowiadać regule panelu-szuflady (bottom sheet) w styles.css. */
const SHEET_MQ = '(orientation: portrait) and (max-width: 1100px)';
/** Niski ekran poziomy (telefon) — węższy panel z prawej; jak w styles.css. */
const SHORT_MQ = '(max-height: 500px)';

export function PlayingUI() {
  const rootRef = useRef<HTMLDivElement>(null);
  useViewInsets(rootRef);
  return (
    <>
      <TriageMarkers />
      <div className="play-layout" ref={rootRef}>
        <Hud />
        <div className="play-body">
          <HintPanel />
          <ExamPanel />
        </div>
      </div>
    </>
  );
}

/**
 * Mierzy, jaką część ekranu zasłania UI (HUD u góry; panel badania z prawej albo — na wąskim,
 * pionowym ekranie — od dołu) i przekazuje to widokowi 3D, który centruje kadr w odsłoniętej części.
 */
function useViewInsets(rootRef: RefObject<HTMLDivElement | null>): void {
  const view = useGameView();
  const selectedId = useGame((s) => s.selectedId);
  const approachingId = useGame((s) => s.approachingId);
  const focused = selectedId !== null || approachingId !== null;
  /** Ostatnio zmierzony panel (px od prawej / od dołu) — kadr już w trakcie podchodzenia. */
  const lastPanel = useRef<{ w: number; h: number; right: number; bottom: number } | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!view?.setViewInsets || !root) return;
    const setInsets = view.setViewInsets.bind(view);
    const hud = root.querySelector<HTMLElement>('.hud');
    const panel = root.querySelector<HTMLElement>('.exam-panel');

    const measure = () => {
      const r = root.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const ins: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0 };
      if (hud) ins.top = Math.max(0, hud.getBoundingClientRect().bottom - r.top);
      if (focused) {
        if (panel) {
          const p = panel.getBoundingClientRect();
          // panel przy lewej krawędzi = szuflada od dołu; inaczej panel z prawej
          if (p.left - r.left < r.width * 0.25) ins.bottom = Math.max(0, r.bottom - p.top);
          else ins.right = Math.max(0, r.right - p.left);
          lastPanel.current = { w: r.width, h: r.height, right: ins.right, bottom: ins.bottom };
        } else {
          // podchodzenie: panelu jeszcze nie ma — zakładamy jego miejsce, by kadr nie skakał po dojściu
          const lp = lastPanel.current;
          if (lp && lp.w === r.width && lp.h === r.height) {
            ins.right = lp.right;
            ins.bottom = lp.bottom;
          } else if (window.matchMedia(SHEET_MQ).matches) {
            ins.bottom = Math.min((r.height - ins.top) * 0.74, 620); // jak .exam-panel w trybie szuflady (styles.css)
          } else if (window.matchMedia(SHORT_MQ).matches) {
            ins.right = Math.min(340, window.innerWidth * 0.44) + 8;
          } else {
            ins.right = Math.min(440, window.innerWidth * 0.46) + 12;
          }
        }
      }
      setInsets(ins);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (hud) ro.observe(hud);
    if (panel) ro.observe(panel);
    measure();
    return () => ro.disconnect();
  }, [view, rootRef, focused, selectedId]);
}
