import { useState } from 'react';
import { CATEGORY_COLOR, CATEGORY_ORDER, formatClock } from '../game/constants';
import { MODE_LABEL, timeLimitEnforced, useGame } from '../game/store';
import { CATEGORY_LABEL } from '../engine/triage';

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

  const counts = { red: 0, yellow: 0, green: 0, black: 0 };
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
    <div className="hud">
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
        <span className="count untagged">
          <span className="chip chip-pending">?</span>
          niezbadani: {untagged}
        </span>
      </div>

      <div className="hud-mode">{MODE_LABEL[mode]}</div>

      <div className="hud-actions">
        {!walkersCalled ? (
          <button className="btn" onClick={callWalkers}>
            Kto może chodzić — do mnie!
          </button>
        ) : !walkersGroupTagged ? (
          <button className="btn green" onClick={tagWalkersGreen}>
            Oznacz grupę jako ZIELONI
          </button>
        ) : (
          <span className="hud-note">Grupa chodzących: ZIELONI ✓</span>
        )}
        {!confirming ? (
          <button className="btn danger" onClick={() => setConfirming(true)}>
            Zakończ segregację
          </button>
        ) : (
          <span className="confirm">
            {untagged > 0 ? `Nieoznaczonych: ${untagged}. Zakończyć?` : 'Przekazać meldunek?'}
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
