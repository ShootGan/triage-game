import type { ExamActionId } from '../engine/exam/types';
import type { TriageCategory } from '../engine/triage/types';

/** A branch leaving a decision: either a final colour or a further step with its own outcomes. */
type Branch =
  | { cat: TriageCategory }
  | { text: string; outs: { label: string; to: Branch }[] };

interface FlowNode {
  text: string;
  /** Exam actions that answer this step (✓ once any of them was done). */
  needs: ExamActionId[];
  /** Plain action box (no question) — e.g. life-saving interventions. */
  action?: boolean;
  /** Branch drawn to the right; the main line continues down with the opposite answer. */
  side?: { label: string; to: Branch };
  /** Label on the line leading down to the next node. */
  down?: string;
}

export interface Flow {
  nodes: FlowNode[];
  /** Colour at the bottom of the main line. */
  end: TriageCategory;
  endLabel?: string;
}

const CAT_LABEL: Record<TriageCategory, string> = {
  green: 'ZIELONY',
  yellow: 'ŻÓŁTY',
  red: 'CZERWONY',
  black: 'CZARNY',
  grey: 'SZARY',
};

const BLEEDING: FlowNode = { text: 'Masywny krwotok? Tamuj od razu — staza', needs: ['bleeding'], action: true };

export const START_FLOW: Flow = {
  nodes: [
    BLEEDING,
    { text: 'Chodzi?', needs: [], side: { label: 'TAK', to: { cat: 'green' } }, down: 'NIE' },
    {
      text: 'Oddycha?',
      needs: ['breathing', 'airway'],
      side: {
        label: 'NIE',
        to: { text: 'Udrożnij drogi oddechowe', outs: [{ label: 'oddycha', to: { cat: 'red' } }, { label: 'nie', to: { cat: 'black' } }] },
      },
      down: 'TAK',
    },
    { text: 'Oddechy > 30/min?', needs: ['breathing'], side: { label: 'TAK', to: { cat: 'red' } }, down: 'NIE' },
    { text: 'Tętno promieniowe obecne i CRT ≤ 2 s?', needs: ['pulse', 'crt'], side: { label: 'NIE', to: { cat: 'red' } }, down: 'TAK' },
    { text: 'Wykonuje proste polecenia?', needs: ['commands'], side: { label: 'NIE', to: { cat: 'red' } }, down: 'TAK' },
  ],
  end: 'yellow',
};

export const JUMPSTART_FLOW: Flow = {
  nodes: [
    BLEEDING,
    { text: 'Chodzi?', needs: [], side: { label: 'TAK', to: { cat: 'green' } }, down: 'NIE' },
    {
      text: 'Oddycha?',
      needs: ['breathing', 'airway'],
      side: {
        label: 'NIE',
        to: {
          text: 'Udrożnij drogi oddechowe',
          outs: [
            { label: 'oddycha', to: { cat: 'red' } },
            {
              label: 'nie',
              to: {
                text: 'Tętno obwodowe?',
                outs: [
                  { label: 'brak', to: { cat: 'black' } },
                  {
                    label: 'jest',
                    to: { text: '5 oddechów ratowniczych', outs: [{ label: 'oddycha', to: { cat: 'red' } }, { label: 'nie', to: { cat: 'black' } }] },
                  },
                ],
              },
            },
          ],
        },
      },
      down: 'TAK',
    },
    { text: 'Oddechy 15–45/min i regularne?', needs: ['breathing'], side: { label: 'NIE', to: { cat: 'red' } }, down: 'TAK' },
    { text: 'Tętno obwodowe obecne?', needs: ['pulse'], side: { label: 'NIE', to: { cat: 'red' } }, down: 'TAK' },
    { text: 'AVPU: A, V lub P z adekwatną reakcją?', needs: ['avpu'], side: { label: 'NIE', to: { cat: 'red' } }, down: 'TAK' },
  ],
  end: 'yellow',
};

export const SALT_FLOW: Flow = {
  nodes: [
    {
      text: 'Sortowanie komendami: nieruchomi — pierwsi, machający — potem, chodzący — na końcu',
      needs: [],
      action: true,
    },
    {
      text: 'Czynności ratujące życie: staza na krwotok, udrożnienie dróg oddechowych (dziecko: 2 oddechy ratownicze), odbarczenie odmy prężnej',
      needs: ['bleeding', 'airway', 'rescue-breaths', 'decompression'],
      action: true,
    },
    { text: 'Oddycha?', needs: ['breathing', 'airway'], side: { label: 'NIE', to: { cat: 'black' } }, down: 'TAK' },
    {
      text: 'Wykonuje polecenia lub celowe ruchy? Tętno obwodowe? Bez duszności? Krwotok opanowany?',
      needs: ['commands', 'pulse', 'breathing'],
      side: {
        label: 'któreś NIE',
        to: {
          text: 'Przeżyje przy dostępnych siłach i środkach?',
          outs: [{ label: 'tak', to: { cat: 'red' } }, { label: 'nie', to: { cat: 'grey' } }],
        },
      },
      down: 'wszystkie TAK',
    },
    { text: 'Tylko drobne obrażenia?', needs: [], side: { label: 'TAK', to: { cat: 'green' } }, down: 'NIE' },
  ],
  end: 'yellow',
};

function Outcome({ cat }: { cat: TriageCategory }) {
  return <span className={`flow-out flow-out-${cat}`}>{CAT_LABEL[cat]}</span>;
}

function BranchView({ branch }: { branch: Branch }) {
  if ('cat' in branch) return <Outcome cat={branch.cat} />;
  return (
    <div className="flow-sub">
      <div className="flow-sub-text">{branch.text}</div>
      <ul className="flow-tree">
        {branch.outs.map((o) => (
          <li key={o.label}>
            <span className="flow-lbl">{o.label}</span>
            <BranchView branch={o.to} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The algorithm drawn as a flowchart: questions on the main line, side exits to the right.
 * Steps answered by an exam action get a ✓, like in the text list.
 */
export function AlgorithmFlow({ flow, done }: { flow: Flow; done: Set<ExamActionId> }) {
  return (
    <div className="flow" role="list">
      {flow.nodes.map((n, i) => {
        const checked = n.needs.some((a) => done.has(a));
        return (
          <div key={i} role="listitem">
            <div className="flow-row">
              <div className={`flow-box ${n.action ? 'action' : 'q'} ${checked ? 'checked' : ''}`}>
                {checked && <span className="hint-mark">✓</span>}
                {n.text}
              </div>
              {n.side && (
                <div className="flow-side">
                  <span className="flow-lbl">{n.side.label}</span>
                  <BranchView branch={n.side.to} />
                </div>
              )}
            </div>
            <div className="flow-down">{n.down && <span className="flow-lbl">{n.down}</span>}</div>
          </div>
        );
      })}
      <div className="flow-row">
        <div className="flow-end">
          <Outcome cat={flow.end} />
        </div>
      </div>
    </div>
  );
}
