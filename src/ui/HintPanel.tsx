import { useEffect } from 'react';
import { useGame } from '../game/store';
import { AlgorithmHint } from './AlgorithmHint';

/**
 * Zwijany panel podpowiedzi (tylko tryb Nauka), po lewej stronie.
 * Zwinięty = sam przycisk „Algorytm"; klawisz H przełącza.
 */
export function HintPanel() {
  const mode = useGame((s) => s.mode);
  const open = useGame((s) => s.hintOpen);
  const toggle = useGame((s) => s.toggleHint);
  const patient = useGame((s) => s.scenario?.patients.find((p) => p.id === (s.selectedId ?? s.approachingId)) ?? null);
  const exam = useGame((s) => (patient ? s.exams[patient.id] : undefined));

  useEffect(() => {
    if (mode !== 'learn') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, toggle]);

  if (mode !== 'learn') return null;

  return (
    <aside className={`hint-panel panel ${open ? 'open' : ''}`}>
      <button className="btn hint-toggle" onClick={toggle} aria-expanded={open}>
        <span className="key">H</span> Algorytm {open ? '◂' : '▸'}
      </button>
      {open && (
        <div className="hint-body">
          <AlgorithmHint patient={patient} exam={exam} />
        </div>
      )}
    </aside>
  );
}
