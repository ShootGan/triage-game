import { useState } from 'react';
import type { PatientDebrief, Verdict } from '../engine/scoring/types';
import { CATEGORY_LABEL, type TriageCategory } from '../engine/triage';
import { CATEGORY_COLOR, CATEGORY_ORDER, formatClock } from '../game/constants';
import { getDeps } from '../game/deps';
import { MODE_LABEL, useGame } from '../game/store';

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'POPRAWNIE',
  over: 'ZAWYŻONO',
  under: 'ZANIŻONO',
  untagged: 'NIEOZNACZONY',
};

function Chip({ cat }: { cat: TriageCategory | null }) {
  if (!cat) return <span className="chip-lg chip-pending">—</span>;
  return (
    <span className={`chip-lg chip-${cat}`} style={{ background: CATEGORY_COLOR[cat] }}>
      {CATEGORY_LABEL[cat]}
    </span>
  );
}

export function DebriefScreen() {
  const score = useGame((s) => s.score);
  const scenario = useGame((s) => s.scenario);
  const mode = useGame((s) => s.mode);
  const tags = useGame((s) => s.tags);
  const restart = useGame((s) => s.restart);
  const toMenu = useGame((s) => s.toMenu);

  if (!score) return null;

  const report = CATEGORY_ORDER.map((c) => ({
    ...c,
    n: Object.values(tags).filter((t) => t === c.id).length,
  }));

  return (
    <div className="screen debrief">
      <div className="panel debrief-panel">
        <header className="debrief-head">
          <div>
            <div className="h-small">Debrief · {MODE_LABEL[mode]}</div>
            <h1 className="title-sm">{scenario?.title ?? 'Wynik'}</h1>
          </div>
          <div className="row">
            <button className="btn primary" onClick={restart}>
              Zagraj ponownie
            </button>
            <button className="btn" onClick={toMenu}>
              Menu
            </button>
          </div>
        </header>

        <div className="summary">
          <div className="big-stat">
            <span className="big-num">{Math.round(score.accuracyPct)}%</span>
            <span className="muted">trafność</span>
          </div>
          <div className="stats">
            <Stat label="Poprawne" value={`${score.correct} / ${score.total}`} cls="ok" />
            <Stat label="Zawyżone (overtriage)" value={score.over} cls="over" />
            <Stat label="Zaniżone (undertriage)" value={score.under} cls="under" />
            <Stat label="Nieoznaczone" value={score.untagged} />
            <Stat label="Czas całkowity" value={formatClock(score.elapsedSec)} />
            <Stat label="Średnio na pacjenta" value={`${Math.round(score.avgSecPerPatient)} s`} />
          </div>
          <div className="meldunek">
            <div className="h-small">Meldunek</div>
            <div className="row">
              {report.map((r) => (
                <span key={r.id} className="count">
                  <span className={`chip chip-${r.id}`} style={{ background: CATEGORY_COLOR[r.id] }}>
                    {r.short}
                  </span>
                  {r.n}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="debrief-list">
          <div className="debrief-row debrief-th">
            <span>Poszkodowany</span>
            <span>Twoja opaska</span>
            <span>Poprawna</span>
            <span>Ocena</span>
            <span />
          </div>
          {score.patients.map((p) => (
            <PatientRow key={p.patientId} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string | number; cls?: string }) {
  return (
    <div className={`stat ${cls ?? ''}`}>
      <span className="stat-val">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function PatientRow({ p }: { p: PatientDebrief }) {
  const [open, setOpen] = useState(p.verdict !== 'correct');
  const { ACTION_LABEL } = getDeps();

  return (
    <div className={`debrief-item verdict-${p.verdict}`}>
      <div className="debrief-row" onClick={() => setOpen((o) => !o)}>
        <span className="pd-label">
          {p.label} <span className="muted">· {p.protocol}</span>
        </span>
        <span>
          <Chip cat={p.given} />
        </span>
        <span>
          <Chip cat={p.expected} />
        </span>
        <span>
          <span className={`verdict v-${p.verdict}`}>{VERDICT_LABEL[p.verdict]}</span>
        </span>
        <span className="toggle">{open ? '▲' : '▼'}</span>
      </div>
      {(p.explanation || p.missedLifesaving.length > 0) && (
        <div className="pd-notes">
          {p.explanation && <p>{p.explanation}</p>}
          {p.missedLifesaving.map((m, i) => (
            <p key={i} className="missed">
              ⚠ {m}
            </p>
          ))}
        </div>
      )}
      {open && (
        <div className="pd-detail">
          <div>
            <div className="h-small">Poprawna ścieżka ({p.protocol})</div>
            <ol className="steps">
              {p.steps.map((s, i) => (
                <li key={i}>
                  <span className="q">{s.question}</span> → <span className="a">{s.answer}</span>
                  {s.result && (
                    <>
                      {' '}
                      ⇒ <Chip cat={s.result} />
                    </>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <div className="h-small">Twoje czynności</div>
            {p.actionsDone.length === 0 ? (
              <p className="muted">Brak czynności.</p>
            ) : (
              <ol className="steps">
                {p.actionsDone.map((a, i) => (
                  <li key={i}>{ACTION_LABEL[a]}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
