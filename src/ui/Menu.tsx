import { getDeps } from '../game/deps';
import { MODE_LABEL, useGame, type GameMode } from '../game/store';

const MODE_DESC: Record<GameMode, string> = {
  learn: 'Panel z algorytmem (klawisz H), stoper bez limitu czasu.',
  practice: 'Bez podpowiedzi, limit czasu scenariusza, pełny debrief.',
};

export function MenuScreen() {
  const mode = useGame((s) => s.mode);
  const scenarioId = useGame((s) => s.scenarioId);
  const setMode = useGame((s) => s.setMode);
  const setScenario = useGame((s) => s.setScenario);
  const goToBriefing = useGame((s) => s.goToBriefing);
  const { scenarios, isStub } = getDeps();
  const selected = scenarioId ?? scenarios[0]?.id;

  return (
    <div className="screen menu">
      <div className="panel menu-panel">
        <h1 className="title">
          Triage
          <span className="subtitle">ćwiczenia segregacji</span>
        </h1>
        <p className="muted">START · JumpSTART — zdarzenie masowe</p>

        <h2 className="h-small">Tryb</h2>
        <div className="choice-list">
          {(['learn', 'practice'] as GameMode[]).map((m) => (
            <button key={m} className={`choice ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              <span className="choice-name">{MODE_LABEL[m]}</span>
              <span className="choice-desc">{MODE_DESC[m]}</span>
            </button>
          ))}
        </div>

        <h2 className="h-small">Scenariusz</h2>
        <div className="choice-list">
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`choice ${selected === s.id ? 'active' : ''}`}
              onClick={() => setScenario(s.id)}
            >
              <span className="choice-name">{s.title}</span>
              <span className="choice-desc">
                {s.patients.length} poszkodowanych · limit {Math.round(s.timeLimitSec / 60)} min
              </span>
            </button>
          ))}
        </div>

        <button className="btn primary big" disabled={!selected} onClick={goToBriefing}>
          Start ▶
        </button>
        {isStub && <p className="stub-note">TRYB STUB — atrapy modułów (src/ui/dev)</p>}
      </div>
    </div>
  );
}
