import { useEffect, useState } from 'react';
import { formatClock } from '../game/constants';
import { MODE_LABEL, timeLimitEnforced, useGame } from '../game/store';

/** Komunikat dyspozytora — w stylu terminala/radiostacji, z efektem pisania. */
export function BriefingOverlay() {
  const scenario = useGame((s) => s.scenario)!;
  const mode = useGame((s) => s.mode);
  const startPlaying = useGame((s) => s.startPlaying);
  const text = scenario.briefing;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    const t = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(t);
          return n;
        }
        return n + 3;
      });
    }, 20);
    return () => window.clearInterval(t);
  }, [text]);

  const done = shown >= text.length;

  return (
    <div className="screen overlay-dim">
      <div className="panel radio">
        <div className="radio-head">
          <span className="rec">●</span> SWD PRM · DYSPOZYTOR MEDYCZNY » ZRM
        </div>
        <div className="radio-meta">
          <span>Zdarzenie: {scenario.title}</span>
          <span>
            Tryb: {MODE_LABEL[mode]} · Limit:{' '}
            {timeLimitEnforced(mode) ? formatClock(scenario.timeLimitSec) : 'brak'}
          </span>
        </div>
        <div className="radio-text" onClick={() => setShown(text.length)}>
          {text.slice(0, shown)}
          {!done && <span className="caret">█</span>}
        </div>
        <div className="row end">
          <button className="btn primary big" onClick={startPlaying} autoFocus>
            Wjazd na miejsce ▶
          </button>
        </div>
      </div>
    </div>
  );
}
