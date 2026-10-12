import type { ExamActionId, PatientExamState } from '../engine/exam/types';
import { INFANT_SIGNIFICANT_INJURIES, protocolFor } from '../engine/triage';
import type { ScenarioPatient } from '../scenarios/types';

interface Criterion {
  text: string;
  /** Czynności dostarczające informacji do tego kroku (✓, gdy wykonano którąkolwiek). */
  needs: ExamActionId[];
}

/** Life-saving and done the moment it's seen — before any further assessment, not at the perfusion step. */
const BLEEDING: Criterion = { text: 'Masywny krwotok → tamuj od razu (opaska uciskowa), przed dalszą oceną', needs: ['bleeding'] };

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

/**
 * Podpowiedź w trybie Nauka: lista kryteriów algorytmu, bez podawania odpowiedzi.
 * Z pacjentem — jego algorytm (✓ przy wykonanych czynnościach); bez pacjenta — oba algorytmy.
 */
export function AlgorithmHint({ patient, exam }: { patient: ScenarioPatient | null; exam?: PatientExamState }) {
  if (!patient) {
    const none = new Set<ExamActionId>();
    return (
      <div className="hint">
        <div className="h-small">START · dorośli</div>
        <CriteriaList list={START} done={none} />
        <div className="h-small">JumpSTART · wygląda na dziecko (zwykle do ok. 8 lat)</div>
        <CriteriaList list={JUMPSTART} done={none} />
        <p className="muted">Dziecko 9–12 lat: zaliczany jest kolor wg JumpSTART albo START.</p>
      </div>
    );
  }
  const protocol = protocolFor(patient.appearsChild);
  const done = new Set(exam?.log.map((r) => r.action) ?? []);
  return (
    <div className="hint">
      <div className="h-small">
        {protocol}
        <span className="muted"> · {patient.appearsChild ? 'wygląda na dziecko' : 'dorosły'}</span>
      </div>
      <CriteriaList list={protocol === 'JumpSTART' ? JUMPSTART : START} done={done} />
      {patient.ageYears >= 9 && patient.ageYears <= 12 && (
        <p className="muted">Wiek 9–12 lat: zaliczany jest kolor wg JumpSTART albo START.</p>
      )}
      {patient.majorBleeding && !exam?.bleedingControlled && (
        <p className="hint-warn">Widoczny masywny krwotok — czynność ratująca życie.</p>
      )}
    </div>
  );
}
