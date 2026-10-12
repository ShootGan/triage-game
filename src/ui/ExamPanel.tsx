import { useEffect, useMemo, useState } from 'react';
import { actionsFor, pulseLabel } from '../engine/exam';
import { CATEGORY_LABEL } from '../engine/triage';
import { ACTION_ORDER, CATEGORY_COLOR, categoriesFor } from '../game/constants';
import { getDeps } from '../game/deps';
import { collectionWalkers, gameProtocol, useGame } from '../game/store';

export function ExamPanel() {
  const selectedId = useGame((s) => s.selectedId);
  const approaching = useGame((s) => s.scenario?.patients.find((p) => p.id === s.approachingId) ?? null);
  const patient = useGame((s) => s.scenario?.patients.find((p) => p.id === s.selectedId) ?? null);
  const exam = useGame((s) => (s.selectedId ? s.exams[s.selectedId] : undefined));
  const tag = useGame((s) => (s.selectedId ? s.tags[s.selectedId] : undefined));
  const doAction = useGame((s) => s.doAction);
  const tagPatient = useGame((s) => s.tagPatient);
  const selectPatient = useGame((s) => s.selectPatient);
  const special = useGame((s) => !!s.scenario?.special);
  const mode = useGame(gameProtocol);
  const scenario = useGame((s) => s.scenario);
  const walkersCalled = useGame((s) => s.walkersCalled);
  // derived, not selected: a fresh array from a zustand v5 selector would re-render forever
  const walkers = useMemo(() => collectionWalkers({ scenario, walkersCalled }), [scenario, walkersCalled]);
  const nextWalker = useGame((s) => s.nextWalker);
  const walkerIdx = walkers.findIndex((p) => p.id === selectedId);
  const { ACTION_LABEL } = getDeps();
  // SALT: no CRT/AVPU, adds needle decompression, GREY tag; 2 (not 5) rescue breaths.
  const actions = ACTION_ORDER.filter((a) => actionsFor(mode).includes(a.id));
  const categories = categoriesFor(mode);
  const label = (id: (typeof ACTION_ORDER)[number]['id']) =>
    id === 'pulse' && patient ? pulseLabel(patient.appearsChild, patient.ageYears) : id === 'rescue-breaths' && mode === 'SALT' ? '2 oddechy ratownicze' : ACTION_LABEL[id];

  // Easter egg (scenariusz specjalny): „ratunkowe cięcie cesarskie" → komunikat; bez wpływu na ocenę.
  const [egg, setEgg] = useState(false);
  useEffect(() => {
    if (!egg) return;
    const t = setTimeout(() => setEgg(false), 3200);
    return () => clearTimeout(t);
  }, [egg]);

  // Esc w trakcie podchodzenia — rezygnacja.
  useEffect(() => {
    if (!approaching) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); selectPatient(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [approaching, selectPatient]);

  // Skróty klawiszowe: Q–I czynności, 1–4 kategorie triage, Esc zamyka.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        selectPatient(null);
        return;
      }
      const k = e.key.toUpperCase();
      if (walkerIdx >= 0 && (k === 'N' || k === 'B')) {
        e.preventDefault();
        nextWalker(k === 'N' ? 1 : -1);
        return;
      }
      const act = actions.find((a) => a.key === k);
      if (act) {
        e.preventDefault();
        doAction(act.id);
        return;
      }
      const cat = categories.find((c) => c.key === e.key);
      if (cat) {
        e.preventDefault();
        tagPatient(selectedId, cat.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, doAction, tagPatient, selectPatient, actions, categories, walkerIdx, nextWalker]);

  if (!patient) {
    if (!approaching) return null;
    return (
      <aside className="approach-box panel">
        <span className="approach-dots">Podchodzisz do:</span> {approaching.label}
        <span className="muted kbd-only"> · Esc — rezygnuj</span>
        <button className="btn icon touch-only" onClick={() => selectPatient(null)}>
          ✕ Rezygnuj
        </button>
      </aside>
    );
  }
  const log = exam?.log ?? [];

  return (
    <aside className="exam-panel panel">
      <header className="exam-head">
        <div>
          <div className="h-small">Poszkodowany</div>
          <h2 className="exam-title">{patient.label}</h2>
        </div>
        <button className="btn icon" onClick={() => selectPatient(null)} title="Zamknij (Esc)">
          ✕<span className="key">Esc</span>
        </button>
      </header>
      {walkerIdx >= 0 && walkers.length > 1 && (
        <div className="walker-nav">
          <button className="btn" onClick={() => nextWalker(-1)} title="Poprzedni chodzący (B)">
            <span className="key">B</span> ◀ Poprzedni
          </button>
          <span className="muted">
            Punkt zbiórki {walkerIdx + 1}/{walkers.length}
          </span>
          <button className="btn" onClick={() => nextWalker(1)} title="Następny chodzący (N)">
            Następny ▶ <span className="key">N</span>
          </button>
        </div>
      )}

      <section className="exam-actions">
        <div className="h-small">Czynności</div>
        <div className="actions-grid">
          {actions.map((a) => (
            <button key={a.id} className="btn action" onClick={() => doAction(a.id)}>
              <span className="key">{a.key}</span>
              <span className="action-label">{label(a.id)}</span>
            </button>
          ))}
          {special && patient.appearance.pregnant && (
            <button className="btn action egg-btn" onClick={() => setEgg(true)}>
              <span className="action-label">Ratunkowe cięcie cesarskie</span>
            </button>
          )}
        </div>
      </section>
      {egg && (
        <div className="egg-overlay" role="alert" onClick={() => setEgg(false)}>
          <div className="egg-box">
            <div className="egg-title">⚖ PROKURATOR PATRZY</div>
          </div>
        </div>
      )}

      {/* Ostatni wynik — stały pasek (widoczny na telefonie, gdzie lista wyników jest mała); miga po każdej czynności */}
      <div className="exam-last" aria-live="polite">
        {log.length === 0 ? (
          <span className="muted">Wynik pojawi się tutaj po wykonaniu czynności.</span>
        ) : (
          <span key={log.length} className="exam-last-text">{log[log.length - 1].text}</span>
        )}
      </div>

      <div className="exam-scroll">
        <section className="exam-results">
          <div className="h-small">Wyniki</div>
          {log.length === 0 ? (
            <p className="muted">Brak — wykonaj czynność.</p>
          ) : (
            <ol className="results-log">
              {[...log].reverse().map((r, i) => (
                <li key={log.length - i} className={i === 0 ? 'latest' : ''}>
                  <span className="log-text">{r.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {patient.injuries.length > 0 && (
          <section>
            <div className="h-small">Widoczne obrażenia</div>
            <ul className="injuries">
              {patient.injuries.map((i, n) => (
                <li key={n}>{i}</li>
              ))}
            </ul>
          </section>
        )}
        {patient.remark && <Remark text={patient.remark} />}
      </div>

      <footer className="exam-tags">
        <div className="h-small">
          Kategoria triage {tag && <span className="current-tag">— obecnie: {CATEGORY_LABEL[tag]}</span>}
        </div>
        <div className="tags-row">
          {categories.map((c) => (
            <button
              key={c.id}
              className={`btn tag tag-${c.id} ${tag === c.id ? 'active' : ''}`}
              style={{ background: CATEGORY_COLOR[c.id] }}
              onClick={() => tagPatient(patient.id, c.id)}
            >
              <span className="key">{c.key}</span>
              {CATEGORY_LABEL[c.id]}
            </button>
          ))}
        </div>
      </footer>
    </aside>
  );
}

/**
 * A remark with a quote is speech; without one it's the narrator describing the patient, shown
 * in italics instead of being put in quotes. Straight closing quotes become Polish „…”.
 */
function Remark({ text }: { text: string }) {
  const t = text.trim();
  if (!/[„"“”]/.test(t)) return <blockquote className="remark remark-narration">{t}</blockquote>;
  return <blockquote className="remark">{t.replace(/(„[^"”]*)"/g, '$1”')}</blockquote>;
}
