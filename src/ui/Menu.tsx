import { useState, type FormEvent } from 'react';
import type { ProtocolMode } from '../engine/triage';
import { getDeps } from '../game/deps';
import { MODE_LABEL, VARIANT_LABEL, useGame, type GameMode, type ScenarioVariant } from '../game/store';
import './code.css';

const MODE_DESC: Record<GameMode, string> = {
  learn: 'Panel z algorytmem (klawisz H), stoper bez limitu czasu.',
  practice: 'Bez podpowiedzi, limit czasu scenariusza, pełny debrief.',
};

const PROTOCOL_NAME: Record<ProtocolMode, string> = { START: 'START · JumpSTART', SALT: 'SALT' };
const PROTOCOL_DESC: Record<ProtocolMode, string> = {
  START: 'Dorośli START, dzieci JumpSTART. Chodzący → ZIELONI grupowo.',
  SALT: 'Sortowanie komendami, czynności ratujące życie, kategoria SZARA. Chodzących ocenia się na końcu.',
};

const VARIANT_DESC: Record<ScenarioVariant, string> = {
  random: 'Inni poszkodowani przy każdym starcie — jak w prawdziwym zdarzeniu.',
  template: 'Stały, ręcznie ułożony zestaw scenariusza.',
};

export function MenuScreen() {
  const mode = useGame((s) => s.mode);
  const scenarioId = useGame((s) => s.scenarioId);
  const variant = useGame((s) => s.variant);
  const loadedCode = useGame((s) => s.loadedCode);
  const setMode = useGame((s) => s.setMode);
  const setScenario = useGame((s) => s.setScenario);
  const setVariant = useGame((s) => s.setVariant);
  const protocolMode = useGame((s) => s.protocolMode);
  const setProtocol = useGame((s) => s.setProtocol);
  const loadCode = useGame((s) => s.loadCode);
  const clearLoadedCode = useGame((s) => s.clearLoadedCode);
  const goToBriefing = useGame((s) => s.goToBriefing);
  const { scenarios, codes, isStub } = getDeps();
  const selected = scenarioId ?? scenarios[0]?.id;

  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const onLoad = (e: FormEvent) => {
    e.preventDefault();
    const err = loadCode(codeInput);
    setCodeError(err);
    if (!err) setCodeInput('');
  };

  const countText = (id: string, templateCount: number) => {
    if (loadedCode ? !loadedCode.endsWith('-WZOR') : variant === 'random') {
      const r = codes.patientCountRange(id);
      if (r && r[0] !== r[1]) return `${r[0]}–${r[1]} poszkodowanych`;
    }
    return `${templateCount} poszkodowanych`;
  };

  return (
    <div className="screen menu">
      <div className="panel menu-panel">
        <h1 className="title">Triage</h1>
        <p className="muted">START · JumpSTART · SALT — zdarzenie masowe</p>

        <h2 className="h-small">Tryb</h2>
        <div className="choice-list">
          {(['learn', 'practice'] as GameMode[]).map((m) => (
            <button key={m} className={`choice ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
              <span className="choice-name">{MODE_LABEL[m]}</span>
              <span className="choice-desc">{MODE_DESC[m]}</span>
            </button>
          ))}
        </div>

        <h2 className="h-small">Algorytm</h2>
        <div className="variant-row" role="radiogroup" aria-label="Algorytm">
          {(['START', 'SALT'] as ProtocolMode[]).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={protocolMode === m}
              className={`choice ${protocolMode === m ? 'active' : ''}`}
              onClick={() => setProtocol(m)}
            >
              <span className="choice-name">{PROTOCOL_NAME[m]}</span>
              <span className="choice-desc">{PROTOCOL_DESC[m]}</span>
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
              <span className="choice-name">
                {s.title} {s.special && <span className="badge special">Specjalny</span>}
              </span>
              <span className="choice-desc">
                {countText(s.id, s.patients.length)} · limit ok. {Math.round(s.timeLimitSec / 60)} min
                {s.special && ' · klasyk szkoleń ratowniczych'}
              </span>
            </button>
          ))}
        </div>

        <h2 className="h-small">Sytuacja</h2>
        <div className="variant-row" role="radiogroup" aria-label="Sytuacja">
          {(['random', 'template'] as ScenarioVariant[]).map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={!loadedCode && variant === v}
              className={`choice ${!loadedCode && variant === v ? 'active' : ''} ${loadedCode ? 'dimmed' : ''}`}
              onClick={() => setVariant(v)}
            >
              <span className="choice-name">{VARIANT_LABEL[v]}</span>
              <span className="choice-desc">{VARIANT_DESC[v]}</span>
            </button>
          ))}
        </div>

        <h2 className="h-small">
          <label htmlFor="task-code">Kod zadania</label>
        </h2>
        <form className="code-form" onSubmit={onLoad}>
          <input
            id="task-code"
            className="code-input"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              if (codeError) setCodeError(null);
            }}
            placeholder="np. KAMIENICA-4F7K"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? 'task-code-error' : undefined}
          />
          <button type="submit" className="btn" disabled={!codeInput.trim()}>
            Wczytaj
          </button>
        </form>
        {codeError && (
          <p id="task-code-error" className="code-error" role="alert">
            {codeError}
          </p>
        )}
        {loadedCode && (
          <div className="code-loaded">
            <span className="code-value">{loadedCode}</span>
            <span className="muted">wczytany — Start uruchomi dokładnie tę sytuację</span>
            <button type="button" className="btn icon" onClick={clearLoadedCode} title="Usuń kod" aria-label="Usuń wczytany kod">
              ✕
            </button>
          </div>
        )}

        <button className="btn primary big" disabled={!selected} onClick={goToBriefing}>
          Start ▶
        </button>
        {isStub && <p className="stub-note">TRYB STUB — atrapy modułów (src/ui/dev)</p>}
        <p className="app-version" title="Wersja aplikacji">
          v{__APP_VERSION__}
        </p>
      </div>
    </div>
  );
}
