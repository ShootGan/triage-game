import { useEffect, useRef, useState } from 'react';
import { formatClock } from '../game/constants';
import { MODE_LABEL, timeLimitEnforced, useGame } from '../game/store';
import './code.css';

/** Kopiuje tekst do schowka; zwraca false, gdy przeglądarka nie pozwala. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* brak uprawnień / niebezpieczny kontekst — próbujemy starszej metody */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Kod zadania z przyciskiem „Kopiuj" — odprawa i debrief. */
export function CodeBadge({ code, note, className }: { code: string; note?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const template = code.endsWith('-WZOR');

  const onCopy = async () => {
    const ok = await copyText(code);
    setState(ok ? 'ok' : 'fail');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <div className={`code-badge ${className ?? ''}`}>
      <span className="code-badge-label">Kod zadania{template ? ' · wzorzec' : ''}</span>
      <span className="code-value">{code}</span>
      <button type="button" className="btn" onClick={onCopy}>
        Kopiuj
      </button>
      {state === 'ok' && <span className="code-copied" role="status">Skopiowano ✓</span>}
      {state === 'fail' && <span className="code-error" role="status">Zaznacz kod i skopiuj ręcznie</span>}
      {note && <span className="code-note">{note}</span>}
    </div>
  );
}

/** Komunikat dyspozytora — w stylu terminala/radiostacji, z efektem pisania. */
export function BriefingOverlay() {
  const scenario = useGame((s) => s.scenario)!;
  const mode = useGame((s) => s.mode);
  const startPlaying = useGame((s) => s.startPlaying);
  const text =
    scenario.protocol === 'SALT'
      ? `${scenario.briefing}
Segregacja wg SALT: najpierw sortowanie komendami, potem ocena — nieruchomi, machający, chodzący.`
      : scenario.briefing;
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
            Tryb: {MODE_LABEL[mode]} · Algorytm: {scenario.protocol === 'SALT' ? 'SALT' : 'START/JumpSTART'} · Limit:{' '}
            {timeLimitEnforced(mode) ? formatClock(scenario.timeLimitSec) : 'brak'}
          </span>
        </div>
        {scenario.code && (
          <CodeBadge code={scenario.code} note="Wpisz ten kod w menu, aby powtórzyć tę samą sytuację (np. całą grupą)." />
        )}
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
