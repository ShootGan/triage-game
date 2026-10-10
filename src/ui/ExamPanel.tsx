import { useEffect, useState } from 'react';
import { CATEGORY_LABEL } from '../engine/triage';
import { ACTION_ORDER, CATEGORY_COLOR, CATEGORY_ORDER } from '../game/constants';
import { getDeps } from '../game/deps';
import { useGame } from '../game/store';

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
  const { ACTION_LABEL } = getDeps();

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
      const act = ACTION_ORDER.find((a) => a.key === k);
      if (act) {
        e.preventDefault();
        doAction(act.id);
        return;
      }
      const cat = CATEGORY_ORDER.find((c) => c.key === e.key);
      if (cat) {
        e.preventDefault();
        tagPatient(selectedId, cat.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, doAction, tagPatient, selectPatient]);

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

      <section className="exam-actions">
        <div className="h-small">Czynności</div>
        <div className="actions-grid">
          {ACTION_ORDER.map((a) => (
            <button key={a.id} className="btn action" onClick={() => doAction(a.id)}>
              <span className="key">{a.key}</span>
              <span className="action-label">{ACTION_LABEL[a.id]}</span>
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
        {patient.remark && <blockquote className="remark">{quoteRemark(patient.remark)}</blockquote>}
      </div>

      <footer className="exam-tags">
        <div className="h-small">
          Kategoria triage {tag && <span className="current-tag">— obecnie: {CATEGORY_LABEL[tag]}</span>}
        </div>
        <div className="tags-row">
          {CATEGORY_ORDER.map((c) => (
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

/** Dodaje cudzysłów „…", chyba że tekst scenariusza już zawiera cytat. */
function quoteRemark(r: string): string {
  const t = r.trim();
  return /[„"“”]/.test(t) ? t : `„${t}"`;
}
