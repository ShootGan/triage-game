import { useState } from 'react';
import { POINTS } from '../engine/scoring/points';
import type { PatientDebrief, Verdict } from '../engine/scoring/types';
import { CATEGORY_LABEL, type TriageCategory } from '../engine/triage';
import { CATEGORY_COLOR, CATEGORY_ORDER, formatClock } from '../game/constants';
import { getDeps } from '../game/deps';
import { MODE_LABEL, useGame } from '../game/store';
import { CodeBadge } from './Briefing';
import './code.css';

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: 'POPRAWNIE',
  procedure: 'ZGADNIĘTY',
  over: 'ZAWYŻONO',
  under: 'ZANIŻONO',
  untagged: 'NIEOZNACZONY',
};

/** Pełne znaczenie werdyktu (legenda, podpowiedź na plakietce). */
const VERDICT_HINT: Record<Verdict, string> = {
  correct: 'kolor rozstrzygnięty tym, co ustalono przed opaską (kolejność dowolna)',
  procedure: 'kolor poprawny, ale ustalenia go nie rozstrzygały — połowa punktów',
  over: 'kolor zawyżony',
  under: 'kolor zaniżony',
  untagged: 'brak opaski',
};

const VERDICT_ORDER: Verdict[] = ['correct', 'procedure', 'over', 'under', 'untagged'];

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
  const newRandom = useGame((s) => s.newRandom);
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
          <div className="debrief-actions">
            <button className="btn primary" onClick={restart}>
              {scenario?.code ? 'Zagraj ten sam kod' : 'Zagraj ponownie'}
            </button>
            {scenario?.code && (
              <button className="btn" onClick={newRandom}>
                Nowy losowy
              </button>
            )}
            <button className="btn" onClick={toMenu}>
              Menu
            </button>
          </div>
        </header>
        {scenario?.code && (
          <CodeBadge
            className="debrief-code"
            code={scenario.code}
            note="Podaj ten kod innym — po wpisaniu w menu dostaną identyczną sytuację."
          />
        )}

        <div className="summary">
          <div className="big-stat">
            <span className="big-num">{Math.round(score.scorePct ?? score.accuracyPct)}%</span>
            <span className="muted">
              {score.maxPoints ? `wynik · ${score.points} / ${score.maxPoints} pkt` : 'trafność'}
            </span>
          </div>
          <div className="stats">
            <Stat label="Poprawne" value={`${score.correct} / ${score.total}`} cls="ok" />
            <Stat label="Trafność" value={`${Math.round(score.accuracyPct)}%`} />
            <Stat label="Kolor zgadnięty (bez rozstrzygających ustaleń)" value={score.procedure ?? 0} cls="procedure" />
            <Stat label="Błędy krytyczne (CZARNY u żywego)" value={score.critical ?? 0} cls="under" />
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

        <div className="verdict-legend">
          {VERDICT_ORDER.map((v) => (
            <span key={v} className="legend-item">
              <span className={`verdict v-${v}`}>{VERDICT_LABEL[v]}</span> {VERDICT_HINT[v]}
            </span>
          ))}
        </div>

        {score.maxPoints !== undefined && (
          <p className="debrief-note muted">
            Punkty na poszkodowanego: poprawny kolor {POINTS.correct}, zgadnięty {POINTS.guessed}, zawyżony{' '}
            {POINTS.over}, zaniżony lub brak opaski 0, CZARNY u żywego {POINTS.critical}; każda pominięta czynność
            ratująca życie {POINTS.missedLifesaving}. Czas nie wpływa na wynik.
          </p>
        )}

        {score.patients.some((p) => p.protocol === 'JumpSTART' || p.alternative) && (
          <p className="debrief-note muted">
            JumpSTART: badania (Vassallo i wsp., Emerg Med J 2022; Stefani i wsp., Prehosp Disaster Med 2022) pokazują, że
            algorytm często zaniża kategorię u ciężko rannych dzieci. Po segregacji wstępnej dzieci wymagają szybkiej
            segregacji wtórnej. Dzieci 9–12 lat: źródła różnią się granicą wieku (JumpSTART do ok. 8 lat albo „wygląda na
            dziecko”), więc zaliczamy kolor zarówno wg JumpSTART, jak i START.
          </p>
        )}

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
  const tagAt = p.actionsBeforeTag ?? null;
  // Matches the exam panel: children get "peripheral pulse" even when START's colour was accepted.
  const child = p.protocol === 'JumpSTART' || p.alternative?.protocol === 'JumpSTART';

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
        <span className="pd-verdict">
          <span className={`verdict v-${p.verdict}`} title={VERDICT_HINT[p.verdict]}>
            {VERDICT_LABEL[p.verdict]}
          </span>
          {p.critical && (
            <span className="verdict v-under critical" title="CZARNY u poszkodowanego z szansą przeżycia">
              KRYTYCZNY
            </span>
          )}
          {p.points !== undefined && <span className="pd-points">{p.points > 0 ? `+${p.points}` : p.points} pkt</span>}
        </span>
        <span className="toggle">{open ? '▲' : '▼'}</span>
      </div>
      {(p.explanation || p.missedLifesaving.length > 0) && (
        <div className="pd-notes">
          {p.explanation && <p className={p.verdict === 'procedure' ? 'procedure-note' : undefined}>{p.explanation}</p>}
          {p.missedLifesaving.map((m, i) => (
            <p key={i} className="missed">
              ⚠ {m}
            </p>
          ))}
        </div>
      )}
      {(p.notes?.length ?? 0) > 0 && (
        <div className="pd-notes">
          {p.notes!.map((n, i) => (
            <p key={i} className="teaching-note">
              ℹ {n}
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
            {p.alternative && (
              <>
                <div className="h-small">
                  Też zaliczane: {p.alternative.protocol} (dziecko 9–12 lat) → <Chip cat={p.alternative.expected} />
                </div>
                <ol className="steps">
                  {p.alternative.steps.map((s, i) => (
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
              </>
            )}
          </div>
          <div>
            <div className="h-small">Twoje czynności</div>
            {p.actionsDone.length === 0 ? (
              <p className="muted">Brak czynności.</p>
            ) : (
              <ol className="steps">
                {p.actionsDone.map((a, i) => (
                  <li key={i} className={tagAt !== null && i >= tagAt ? 'after-tag' : undefined}>
                    {a === 'pulse' && child ? 'Tętno obwodowe' : ACTION_LABEL[a]}
                    {tagAt !== null && i >= tagAt && ' · po opasce'}
                  </li>
                ))}
              </ol>
            )}
            {tagAt !== null && p.given && p.actionsDone.length > 0 && (
              <p className="tag-moment muted">
                Opaska {CATEGORY_LABEL[p.given]} założona{' '}
                {tagAt === 0
                  ? 'przed jakąkolwiek czynnością'
                  : tagAt >= p.actionsDone.length
                    ? 'po wszystkich czynnościach'
                    : `po ${tagAt}. czynności (późniejsze nie liczą się do oceny)`}
                .
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
