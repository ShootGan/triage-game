import { useState } from 'react';
import type { ExamActionId, PatientExamState } from '../engine/exam/types';
import { INFANT_SIGNIFICANT_INJURIES, protocolFor } from '../engine/triage';
import type { ScenarioPatient } from '../scenarios/types';
import { AlgorithmFlow, JUMPSTART_FLOW, SALT_FLOW, START_FLOW, type Flow } from './AlgorithmFlow';

interface Criterion {
  text: string;
  /** Czynności dostarczające informacji do tego kroku (✓, gdy wykonano którąkolwiek). */
  needs: ExamActionId[];
}

/** Life-saving and done the moment it's seen — before any further assessment, not at the perfusion step. */
const BLEEDING: Criterion = { text: 'Masywny krwotok → tamuj od razu (staza), przed dalszą oceną', needs: ['bleeding'] };

const START: Criterion[] = [
  BLEEDING,
  { text: 'Chodzi? → ZIELONY', needs: [] },
  { text: 'Nie oddycha → udrożnij drogi oddechowe: oddycha → CZERWONY, nie → CZARNY', needs: ['breathing', 'airway'] },
  { text: 'Oddechy > 30/min → CZERWONY', needs: ['breathing'] },
  { text: 'Brak tętna promieniowego lub CRT > 2 s → CZERWONY', needs: ['pulse', 'crt'] },
  { text: 'Nie wykonuje prostych poleceń → CZERWONY', needs: ['commands'] },
  { text: 'W przeciwnym razie → ŻÓŁTY', needs: [] },
];

const JUMPSTART: Criterion[] = [
  BLEEDING,
  { text: 'Chodzi? → ZIELONY (niechodzący z powodu wieku → pełna ocena)', needs: [] },
  { text: 'Nie oddycha → udrożnij drogi oddechowe: oddycha → CZERWONY', needs: ['breathing', 'airway'] },
  {
    text: 'Nadal nie oddycha → tętno obwodowe? brak → CZARNY; jest → 5 oddechów ratowniczych: oddycha → CZERWONY, nie → CZARNY',
    needs: ['pulse', 'rescue-breaths'],
  },
  { text: 'Oddechy < 15 lub > 45/min albo nieregularne → CZERWONY', needs: ['breathing'] },
  { text: 'Brak tętna obwodowego → CZERWONY', needs: ['pulse'] },
  { text: 'AVPU: „P" z nieadekwatną reakcją lub „U" → CZERWONY', needs: ['avpu'] },
  { text: 'W przeciwnym razie → ŻÓŁTY', needs: [] },
  {
    text: `Niemowlę (nie chodzi z powodu wieku): istotne obrażenia → ŻÓŁTY, brak → ZIELONY. Istotne: ${INFANT_SIGNIFICANT_INJURIES.join(', ')}`,
    needs: [],
  },
];

const SALT: Criterion[] = [
  { text: 'Sortowanie: „Kto może chodzić — do mnie!" (ocena na końcu), „Kto mnie słyszy — pomachaj!" (druga kolejność); nieruchomi — oceniaj pierwszych', needs: [] },
  BLEEDING,
  { text: 'Bezdech → udrożnij drogi oddechowe; dziecko nadal bez oddechu → 2 oddechy ratownicze', needs: ['airway', 'rescue-breaths'] },
  { text: 'Odma prężna (jednostronnie słaby ruch klatki, poszerzone żyły szyjne) → odbarcz igłą', needs: ['decompression'] },
  { text: 'Nie oddycha mimo tych czynności → CZARNY', needs: ['breathing', 'airway'] },
  { text: 'Wykonuje polecenia lub celowe ruchy? Tętno obwodowe? Bez duszności? Krwotok opanowany?', needs: ['commands', 'pulse', 'breathing'] },
  { text: 'Wszystkie TAK: tylko drobne obrażenia → ZIELONY, inaczej → ŻÓŁTY (także u chodzących)', needs: [] },
  { text: 'Którekolwiek NIE: przeżyje przy dostępnych siłach i środkach → CZERWONY, nie → SZARY', needs: [] },
];

function CriteriaList({ list, done }: { list: Criterion[]; done: Set<ExamActionId> }) {
  return (
    <ol className="hint-list">
      {list.map((c, i) => {
        const checked = c.needs.length > 0 && c.needs.some((a) => done.has(a));
        return (
          <li key={i} className={checked ? 'checked' : ''}>
            <span className="hint-mark">{checked ? '✓' : '·'}</span>
            {c.text}
          </li>
        );
      })}
    </ol>
  );
}

type HintView = 'flow' | 'list';
const VIEW_KEY = 'triage.hintView';

function loadView(): HintView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'flow';
  } catch {
    return 'flow';
  }
}

/** The algorithm as a flowchart or as the text list, depending on the chosen view. */
function Algorithm({ view, flow, list, done }: { view: HintView; flow: Flow; list: Criterion[]; done: Set<ExamActionId> }) {
  return view === 'flow' ? <AlgorithmFlow flow={flow} done={done} /> : <CriteriaList list={list} done={done} />;
}

function ViewSwitch({ view, onChange }: { view: HintView; onChange: (v: HintView) => void }) {
  return (
    <div className="hint-view" role="radiogroup" aria-label="Widok algorytmu">
      {(['flow', 'list'] as HintView[]).map((v) => (
        <button key={v} role="radio" aria-checked={view === v} className={`btn small ${view === v ? 'active' : ''}`} onClick={() => onChange(v)}>
          {v === 'flow' ? 'Schemat' : 'Lista'}
        </button>
      ))}
    </div>
  );
}

const INFANT_NOTE = `Niemowlę (nie chodzi z powodu wieku): pełna ocena, a na końcu zamiast ŻÓŁTEGO: istotne obrażenia → ŻÓŁTY, brak → ZIELONY. Istotne: ${INFANT_SIGNIFICANT_INJURIES.join(', ')}`;

/**
 * Podpowiedź w trybie Nauka: algorytm jako schemat lub lista kryteriów, bez podawania odpowiedzi.
 * Z pacjentem — jego algorytm (✓ przy wykonanych czynnościach); bez pacjenta — oba algorytmy.
 */
export function AlgorithmHint({ patient, exam, salt = false }: { patient: ScenarioPatient | null; exam?: PatientExamState; salt?: boolean }) {
  const [view, setViewState] = useState<HintView>(loadView);
  const setView = (v: HintView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable — the choice just isn't remembered
    }
  };
  const done = new Set(exam?.log.map((r) => r.action) ?? []);
  const bleedingWarn = patient?.majorBleeding && !exam?.bleedingControlled && (
    <p className="hint-warn">Widoczny masywny krwotok — czynność ratująca życie.</p>
  );

  if (salt) {
    return (
      <div className="hint">
        <ViewSwitch view={view} onChange={setView} />
        <div className="h-small">SALT · dorośli i dzieci</div>
        <Algorithm view={view} flow={SALT_FLOW} list={SALT} done={done} />
        {bleedingWarn}
      </div>
    );
  }
  if (!patient) {
    return (
      <div className="hint">
        <ViewSwitch view={view} onChange={setView} />
        <div className="h-small">START · dorośli</div>
        <Algorithm view={view} flow={START_FLOW} list={START} done={done} />
        <div className="h-small">JumpSTART · wygląda na dziecko (zwykle do ok. 8 lat)</div>
        <Algorithm view={view} flow={JUMPSTART_FLOW} list={JUMPSTART} done={done} />
        {view === 'flow' && <p className="muted">{INFANT_NOTE}</p>}
        <p className="muted">Dziecko 9–12 lat: zaliczany jest kolor wg JumpSTART albo START.</p>
      </div>
    );
  }
  const jump = protocolFor(patient.appearsChild) === 'JumpSTART';
  return (
    <div className="hint">
      <ViewSwitch view={view} onChange={setView} />
      <div className="h-small">
        {jump ? 'JumpSTART' : 'START'}
        <span className="muted"> · {patient.appearsChild ? 'wygląda na dziecko' : 'dorosły'}</span>
      </div>
      <Algorithm view={view} flow={jump ? JUMPSTART_FLOW : START_FLOW} list={jump ? JUMPSTART : START} done={done} />
      {jump && view === 'flow' && <p className="muted">{INFANT_NOTE}</p>}
      {patient.ageYears >= 9 && patient.ageYears <= 12 && (
        <p className="muted">Wiek 9–12 lat: zaliczany jest kolor wg JumpSTART albo START.</p>
      )}
      {bleedingWarn}
    </div>
  );
}
