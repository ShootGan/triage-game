import { useState } from 'react';
import { CATEGORY_COLOR, CATEGORY_ORDER, formatClock } from '../game/constants';
import { MODE_LABEL, timeLimitEnforced, useGame } from '../game/store';
import { CATEGORY_LABEL, type TriageCategory } from '../engine/triage';

export function Hud() {
  const scenario = useGame((s) => s.scenario)!;
  const mode = useGame((s) => s.mode);
  const clock = useGame((s) => s.clockSec);
  const tags = useGame((s) => s.tags);
  const walkersCalled = useGame((s) => s.walkersCalled);
  const walkersGroupTagged = useGame((s) => s.walkersGroupTagged);
  const callWalkers = useGame((s) => s.callWalkers);
  const tagWalkersGreen = useGame((s) => s.tagWalkersGreen);
  const endTriage = useGame((s) => s.endTriage);

  const counts: Record<TriageCategory, number> = { red: 0, yellow: 0, green: 0, black: 0, grey: 0 };
  let untagged = 0;
  for (const p of scenario.patients) {
    const t = tags[p.id];
    if (t) counts[t]++;
    else untagged++;
  }
  const limited = timeLimitEnforced(mode);
  const remaining = scenario.timeLimitSec - clock;
  const warn = limited && remaining <= 60;

  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`hud ${confirming ? 'confirming' : ''}`}>
      <div className={`hud-clock ${warn ? 'warn' : ''}`} title="Czas segregacji (rzeczywisty)">
        <span className="hud-label">CZAS</span>
        <span className="hud-time">{formatClock(clock)}</span>
        <span className="hud-limit">/ {limited ? formatClock(scenario.timeLimitSec) : '∞'}</span>
      </div>

      <div className="hud-counts">
        {CATEGORY_ORDER.map((c) => (
          <span key={c.id} className="count" title={CATEGORY_LABEL[c.id]}>
            <span className={`chip chip-${c.id}`} style={{ background: CATEGORY_COLOR[c.id] }}>
              {c.short}
            </span>
            {counts[c.id]}
          </span>
        ))}
        <span className="count untagged" title="Niezbadani">
          <span className="chip chip-pending">?</span>
          <span className="lbl-long">niezbadani: </span>
          {untagged}
        </span>
      </div>

      <div className="hud-mode">{MODE_LABEL[mode]}</div>

      <div className="hud-actions">
        {!walkersCalled ? (
          <button className="btn" onClick={callWalkers} title="Kto może chodzić — do mnie!">
            <span className="lbl-long">Kto może chodzić — do mnie!</span>
            <span className="lbl-short">Chodzący — do mnie!</span>
          </button>
        ) : !walkersGroupTagged ? (
          <button className="btn green" onClick={tagWalkersGreen} title="Oznacz grupę jako ZIELONI">
            <span className="lbl-long">Oznacz grupę jako ZIELONI</span>
            <span className="lbl-short">Grupa → ZIELONI</span>
          </button>
        ) : (
          <span className="hud-note">
            <span className="lbl-long">Grupa chodzących: ZIELONI ✓</span>
            <span className="lbl-short">Chodzący: ZIELONI ✓</span>
          </span>
        )}
        {!confirming ? (
          <button className="btn danger" onClick={() => setConfirming(true)} title="Zakończ segregację">
            <span className="lbl-long">Zakończ segregację</span>
            <span className="lbl-short">Zakończ</span>
          </button>
        ) : (
          <span className="confirm">
            <span className="confirm-q">
              {untagged > 0 ? `Nieoznaczonych: ${untagged}. Zakończyć?` : 'Przekazać meldunek?'}
            </span>
            <button className="btn danger" onClick={endTriage} autoFocus>
              Tak
            </button>
            <button className="btn" onClick={() => setConfirming(false)}>
              Nie
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
