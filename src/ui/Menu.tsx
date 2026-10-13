import { useState, type FormEvent, type ReactNode } from 'react';
import type { ProtocolMode } from '../engine/triage';
import { getDeps } from '../game/deps';
import { MODE_LABEL, useGame, type GameMode, type ScenarioVariant } from '../game/store';
import { AboutScreen } from './About';
import { HowToScreen } from './HowTo';
import { IntroScreen } from './Intro';
import { SCENARIO_COLOR, ScenarioIcon } from './ScenarioIcon';
import './code.css';

const MODE_DESC: Record<GameMode, string> = {
  learn: 'Z podpowiedzią, bez limitu czasu.',
  practice: 'Bez podpowiedzi, z limitem czasu.',
};

const PROTOCOL_NAME: Record<ProtocolMode, string> = { START: 'START · JumpSTART', SALT: 'SALT' };
const PROTOCOL_DESC: Record<ProtocolMode, string> = {
  START: 'Dorośli START, dzieci JumpSTART.',
  SALT: 'Jeden dla dorosłych i dzieci.',
};

const VARIANT_NAME: Record<ScenarioVariant, string> = { random: 'Losowa', template: 'Stała' };
const VARIANT_DESC: Record<ScenarioVariant, string> = {
  random: 'Za każdym razem inni poszkodowani.',
  template: 'Zawsze ten sam zestaw.',
};

type Page = 'title' | 'setup' | 'intro' | 'howto' | 'about';

/** Remembered between visits (e.g. back from a game): returning players land on the setup screen. */
let lastPage: Page = 'title';
const LAST_CODE_KEY = 'triage.lastCode';

function readLastCode(): string | null {
  try {
    return localStorage.getItem(LAST_CODE_KEY);
  } catch {
    return null;
  }
}

/** Labelled radio group shown as a segmented switch, with a one-line description of the chosen option. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
  desc,
  disabled,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  name: (v: T) => string;
  desc: (v: T) => ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={`setting ${disabled ? 'dimmed' : ''}`}>
      <div className="setting-label">{label}</div>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o} role="radio" aria-checked={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>
            {name(o)}
          </button>
        ))}
      </div>
      <div className="setting-desc">{desc(value)}</div>
    </div>
  );
}

function InfoButtons({ go }: { go: (p: Page) => void }) {
  return (
    <div className="title-buttons">
      <button className="btn big" onClick={() => go('intro')}>
        Co to jest segregacja?
      </button>
      <button className="btn big" onClick={() => go('howto')}>
        Jak grać
      </button>
      <button className="btn big" onClick={() => go('about')}>
        O grze i źródła
      </button>
    </div>
  );
}

function TitleScreen({ go }: { go: (p: Page) => void }) {
  const { isStub } = getDeps();
  return (
    <div className="panel title-screen">
      <h1 className="title">Triage</h1>
      <p className="title-sub">Gra szkoleniowa: segregacja poszkodowanych w zdarzeniu masowym</p>
      <button className="btn primary big title-play" onClick={() => go('setup')}>
        ▶ Graj
      </button>
      <InfoButtons go={go} />
      {isStub && <p className="stub-note">TRYB STUB — atrapy modułów (src/ui/dev)</p>}
      <p className="app-version" title="Wersja aplikacji">
        v{__APP_VERSION__}
      </p>
    </div>
  );
}

function SetupScreen({ go }: { go: (p: Page) => void }) {
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
  const { scenarios, codes } = getDeps();
  const selected = scenarioId ?? scenarios[0]?.id;
  const selectedScenario = scenarios.find((s) => s.id === selected);

  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [lastCode] = useState(readLastCode);

  const load = (input: string) => {
    const err = loadCode(input);
    setCodeError(err);
    if (err) return;
    setCodeInput('');
    setCodeOpen(false);
    try {
      localStorage.setItem(LAST_CODE_KEY, input.trim().toUpperCase());
    } catch {
      // storage unavailable — the code just isn't remembered
    }
  };
  const onLoad = (e: FormEvent) => {
    e.preventDefault();
    load(codeInput);
  };

  const countText = (id: string, templateCount: number) => {
    if (loadedCode ? !loadedCode.endsWith('-WZOR') : variant === 'random') {
      const r = codes.patientCountRange(id);
      if (r && r[0] !== r[1]) return `${r[0]}–${r[1]} poszkodowanych`;
    }
    return `${templateCount} poszkodowanych`;
  };

  const start = () => {
    lastPage = 'setup';
    goToBriefing();
  };

  return (
    <div className="panel setup">
      <div className="setup-head">
        <button className="btn" onClick={() => go('title')}>
          ◂ Menu
        </button>
        <h1 className="title setup-title">Triage</h1>
      </div>

      <div className="settings">
        <Segmented
          label="Tryb"
          options={['learn', 'practice'] as GameMode[]}
          value={mode}
          onChange={setMode}
          name={(m) => MODE_LABEL[m]}
          desc={(m) => MODE_DESC[m]}
        />
        <Segmented
          label="Algorytm"
          options={['START', 'SALT'] as ProtocolMode[]}
          value={protocolMode}
          onChange={setProtocol}
          name={(p) => PROTOCOL_NAME[p]}
          desc={(p) => PROTOCOL_DESC[p]}
        />
        <Segmented
          label="Sytuacja"
          options={['random', 'template'] as ScenarioVariant[]}
          value={variant}
          onChange={setVariant}
          name={(v) => VARIANT_NAME[v]}
          desc={(v) => (loadedCode ? 'Ustala ją kod zadania.' : VARIANT_DESC[v])}
          disabled={!!loadedCode}
        />
      </div>

      <div className="code-area">
        {loadedCode ? (
          <div className="code-loaded" role="status">
            <span className="setting-label">Zadanie</span>
            <span className="code-value">{loadedCode}</span>
            <span className="code-what">
              {selectedScenario?.title} · {loadedCode.endsWith('-SALT') ? 'SALT' : 'START · JumpSTART'} · {MODE_LABEL[mode]}
            </span>
            <button type="button" className="btn icon" onClick={clearLoadedCode} title="Usuń kod" aria-label="Usuń wczytany kod">
              ✕
            </button>
          </div>
        ) : (
          <button type="button" className="btn info-btn" aria-expanded={codeOpen} onClick={() => setCodeOpen(!codeOpen)}>
            Mam kod zadania {codeOpen ? '▾' : '▸'}
          </button>
        )}
        {codeOpen && !loadedCode && (
          <>
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
                aria-label="Kod zadania"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
                aria-invalid={codeError ? true : undefined}
                aria-describedby={codeError ? 'task-code-error' : undefined}
              />
              <button type="submit" className="btn" disabled={!codeInput.trim()}>
                Wczytaj
              </button>
            </form>
            {lastCode && (
              <button type="button" className="link-btn last-code" onClick={() => load(lastCode)}>
                Ostatni kod: {lastCode} ▸
              </button>
            )}
            {codeError && (
              <p id="task-code-error" className="code-error" role="alert">
                {codeError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="setting-label">Scenariusz</div>
      <div className={`tiles ${loadedCode ? 'locked' : ''}`} role="radiogroup" aria-label="Scenariusz">
        {scenarios.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={selected === s.id}
            className={`tile ${selected === s.id ? 'on' : ''}`}
            disabled={!!loadedCode && selected !== s.id}
            onClick={() => setScenario(s.id)}
          >
            <span className="tile-pic" style={{ background: SCENARIO_COLOR[s.id] ?? 'var(--panel)' }}>
              <ScenarioIcon id={s.id} />
              {s.special && <span className="badge special">Specjalny</span>}
            </span>
            <span className="tile-name">{s.title}</span>
            <span className="tile-meta">
              {countText(s.id, s.patients.length)} · ok. {Math.round(s.timeLimitSec / 60)} min
            </span>
          </button>
        ))}
      </div>

      <div className="setup-start">
        <button className="btn primary big" disabled={!selected} onClick={start}>
          Start ▶
        </button>
      </div>
    </div>
  );
}

export function MenuScreen() {
  const [page, setPageState] = useState<Page>(lastPage);
  const go = (p: Page) => {
    if (p === 'title' || p === 'setup') lastPage = p;
    setPageState(p);
  };
  // Info pages return to where they were opened from.
  const back = () => setPageState(lastPage);

  return (
    <div className="screen menu">
      {page === 'title' && <TitleScreen go={go} />}
      {page === 'setup' && <SetupScreen go={go} />}
      {page === 'intro' && <IntroScreen onClose={back} onAbout={() => go('about')} />}
      {page === 'howto' && <HowToScreen onClose={back} />}
      {page === 'about' && <AboutScreen onClose={back} />}
    </div>
  );
}
