import { describe, expect, it } from 'vitest';
import { triage, type TriageCategory } from '../../engine/triage';
import { insidePropFootprint } from '../propSizes';
import { MIN_PATIENT_SPACING, SCENE_HALF_X, SCENE_HALF_Z, scenarioIssues } from '../validate';
import { APPEARS_CHILD, ARCHETYPES, archetypeById, type AgeGroup } from './archetypes';
import {
  CATEGORY_MIX,
  CODE_ALPHABET,
  MIN_RED,
  MIN_WALKING_GREEN,
  archetypesFor,
  categoryMixes,
  generateDetailed,
  generateScenario,
  parseCode,
  patientCountRange,
  randomCode,
  scenarioFromCode,
  scenarioIds,
  templateCode,
  vitalsCorners,
} from './index';
import { LAYOUTS, slotPoses } from './layouts';
import { createRng } from './rng';

const PREFIX: Record<string, string> = {
  bus: 'AUTOBUS',
  pileup: 'KARAMBOL',
  tenement: 'KAMIENICA',
  concert: 'KONCERT',
  festival: 'FESTYN',
  buses: 'ZDERZENIE',
  train: 'POCIAG',
};

/** Deterministyczne „losowe" kody do testu właściwości. */
function codesFor(id: string, n: number): string[] {
  const rng = createRng(`test-codes|${id}`);
  const out = new Set<string>();
  while (out.size < n) out.add(randomCode(id, () => rng.next()));
  return [...out];
}

describe('kody zadań', () => {
  it('prefiksy scenariuszy', () => {
    expect(scenarioIds().sort()).toEqual(Object.keys(PREFIX).sort());
    for (const id of scenarioIds()) expect(templateCode(id)).toBe(`${PREFIX[id]}-WZOR`);
  });

  it('randomCode: format PREFIKS-XXXX z alfabetu bez 0/O/1/I/L', () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    for (const id of scenarioIds()) {
      for (let i = 0; i < 50; i++) {
        const c = randomCode(id);
        expect(c).toMatch(new RegExp(`^${PREFIX[id]}-[${CODE_ALPHABET}]{4}$`));
        expect(parseCode(c)).toEqual({ scenarioId: id, code: c });
      }
    }
  });

  it.each([
    ['KAMIENICA-4F7K', 'tenement', 'KAMIENICA-4F7K'],
    ['kamienica-4f7k', 'tenement', 'KAMIENICA-4F7K'],
    ['  Kamienica-4F7k  ', 'tenement', 'KAMIENICA-4F7K'],
    ['KAMIENICA4F7K', 'tenement', 'KAMIENICA-4F7K'],
    ['kamienica 4f7k', 'tenement', 'KAMIENICA-4F7K'],
    ['autobus-wzor', 'bus', 'AUTOBUS-WZOR'],
    ['AUTOBUSWZOR', 'bus', 'AUTOBUS-WZOR'],
    ['karambol_X9ZZ', 'pileup', 'KARAMBOL-X9ZZ'],
    ['FESTYN–AB2C', 'festival', 'FESTYN-AB2C'],
    ['koncert-2345', 'concert', 'KONCERT-2345'],
    ['zderzenie wzor', 'buses', 'ZDERZENIE-WZOR'],
    ['Zderzenie-ab2c', 'buses', 'ZDERZENIE-AB2C'],
  ])('parseCode(%j) → %s / %s', (input, scenarioId, code) => {
    expect(parseCode(input)).toEqual({ scenarioId, code });
  });

  it.each([
    [''],
    ['   '],
    ['KAMIENICA'],
    ['KAMIENICA-'],
    ['KAMIENICA-4F7'],
    ['KAMIENICA-4F7KK'],
    ['KAMIENICA-0O1I'],
    ['KAMIENICA-4F7L'],
    ['KAMIENICA-4F#K'],
    ['SZPITAL-4F7K'],
    ['4F7K'],
    ['XYZ'],
  ])('parseCode(%j) → błąd po polsku', (input) => {
    const r = parseCode(input);
    expect('error' in r).toBe(true);
    if ('error' in r) expect(r.error.length).toBeGreaterThan(10);
  });

  it('komunikat o mylących znakach', () => {
    const r = parseCode('KAMIENICA-4F0K');
    expect('error' in r && r.error).toMatch(/0, O, 1, I ani L/);
  });

  it('scenarioFromCode: błąd albo scenariusz z kodem', () => {
    expect(scenarioFromCode('???')).toHaveProperty('error');
    const s = scenarioFromCode('festyn-ab2c');
    expect('error' in s).toBe(false);
    if (!('error' in s)) {
      expect(s.code).toBe('FESTYN-AB2C');
      expect(s.id).toBe('festival');
    }
  });
});

describe('determinizm', () => {
  it.each(scenarioIds())('%s: ten sam kod → identyczny scenariusz; inny kod → inny', (id) => {
    const [a, b] = codesFor(id, 2);
    const s1 = generateScenario(id, a);
    const s2 = generateScenario(id, a);
    expect(s2).toEqual(s1);
    expect(JSON.stringify(s2)).toBe(JSON.stringify(s1));
    // przez parseCode (małe litery, bez myślnika) — ten sam wynik
    expect(scenarioFromCode(a.toLowerCase().replace('-', ''))).toEqual(s1);
    const s3 = generateScenario(id, b);
    expect(s3.code).toBe(b);
    expect(s3.patients).not.toEqual(s1.patients);
  });

  it('stała wartość dla znanego kodu (wykrywa przypadkową zmianę generatora)', () => {
    const s = generateScenario('tenement', 'KAMIENICA-4F7K');
    expect(s.code).toBe('KAMIENICA-4F7K');
    // Jeżeli ten test pada po celowej zmianie generatora — podbij GENERATOR_VERSION i zaktualizuj odcisk.
    const fingerprint = s.patients.map((p) => `${p.label}|${p.vitals.breathing.rate}|${p.position.join(',')}`).join('\n');
    expect(fingerprint).toMatchSnapshot();
  });
});

describe('wzorce', () => {
  it.each(LAYOUTS.map((l) => [l.id, l] as const))('%s-WZOR → ręczny wzorzec bez zmian', (id, l) => {
    const s = generateScenario(id, templateCode(id));
    expect(s.code).toBe(`${PREFIX[id]}-WZOR`);
    const { code: _code, ...rest } = s;
    expect(rest).toEqual(l.template);
    // kopia — modyfikacja nie psuje wzorca
    s.patients[0].label = 'zmienione';
    expect(l.template.patients[0].label).not.toBe('zmienione');
    expect(scenarioIssues(s)).toEqual([]);
  });
});

describe('rozkład kategorii', () => {
  it.each([10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 26])('n = %i: istnieje co najmniej jeden dopuszczalny rozkład', (n) => {
    const mixes = categoryMixes(n);
    expect(mixes.length).toBeGreaterThan(0);
    for (const [g, y, r, b] of mixes) {
      expect(g + y + r + b).toBe(n);
      expect(r).toBeGreaterThanOrEqual(MIN_RED);
      expect(g).toBeGreaterThanOrEqual(MIN_WALKING_GREEN);
    }
  });
});

describe('archetypy', () => {
  it('unikalne id, niepuste teksty, poprawne szablony rodzajowe', () => {
    const ids = ARCHETYPES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ARCHETYPES) {
      expect(a.injuries.length, a.id).toBeGreaterThan(0);
      expect(a.poses.length, a.id).toBeGreaterThan(0);
      if (a.vitals.walk) for (const p of a.poses) expect(['sitting', 'standing'], a.id).toContain(p);
      if (a.vitals.breathing !== 'spontaneous') for (const p of a.poses) expect(['back', 'front'], a.id).toContain(p);
      if (a.majorBleeding) expect(a.vitals.walk, a.id).toBe(false);
      if (a.ages.includes('infant')) expect(a.ages, a.id).toEqual(['infant']);
      const texts = [...a.injuries.flat(), ...(a.extraInjuries ?? []), ...(a.remarks ?? [])].map((t) => (typeof t === 'string' ? t : t.t));
      for (const t of texts) {
        // tylko pełne pary {męska|żeńska}
        const stripped = t.replace(/\{[^{}|]*\|[^{}|]*\}/g, '');
        expect(stripped, `${a.id}: ${t}`).not.toMatch(/[{}|]/);
        // bez liczb (parametry losowane — tekst nie może im przeczyć); wyjątek: stopnie oparzeń, piętra
        expect(t.replace(/\b(I{1,3}|IV)\b/g, ''), `${a.id}: ${t}`).not.toMatch(/\d/);
      }
    }
  });

  it('wszystkie kategorie i oba algorytmy są reprezentowane', () => {
    const has = (cat: TriageCategory, child: boolean) => ARCHETYPES.some((a) => a.category === cat && a.ages.some((g) => APPEARS_CHILD[g] === child));
    for (const cat of ['green', 'yellow', 'red', 'black'] as TriageCategory[]) {
      expect(has(cat, true), `${cat} JumpSTART`).toBe(true);
      expect(has(cat, false), `${cat} START`).toBe(true);
    }
  });

  // Skrajne wartości widełek (oddechy min/max × CRT min/max) dla skrajnych wieków każdej grupy.
  const AGES: Record<AgeGroup, number[]> = { infant: [0.5, 0.92], child: [3, 5, 6, 10], teen: [13, 17], adult: [18, 64], elderly: [65, 88] };
  const cases = ARCHETYPES.flatMap((a) => a.ages.flatMap((g) => AGES[g].map((age) => [a.id, g, age] as const)));
  it.each(cases)('%s (%s, %s l.): skrajne widełki → zamierzona kategoria', (id, g, age) => {
    const a = archetypeById(id)!;
    for (const v of vitalsCorners(a, g, age)) {
      const r = triage(v, APPEARS_CHILD[g]);
      expect(r.category, JSON.stringify(v)).toBe(a.category);
    }
  });

  it('w każdym scenariuszu: każda kategoria ma archetypy, a każdy archetyp ma opis obrażeń', () => {
    for (const l of LAYOUTS) {
      const pool = archetypesFor(l);
      for (const cat of ['green', 'yellow', 'red', 'black'] as TriageCategory[]) {
        expect(pool.some((a) => a.category === cat), `${l.id}: ${cat}`).toBe(true);
      }
    }
  });
});

describe('układy scen (sloty)', () => {
  it.each(LAYOUTS.map((l) => [l.id, l] as const))('%s: sloty spełniają reguły validate.ts', (_id, l) => {
    const t = l.template;
    const slots = l.slots;
    expect(slots.length).toBeGreaterThanOrEqual(l.count[1] + 3);
    for (const s of slots) {
      const [x, z] = s.position;
      expect(Math.abs(x)).toBeLessThanOrEqual(SCENE_HALF_X);
      expect(Math.abs(z)).toBeLessThanOrEqual(SCENE_HALF_Z);
      for (const pr of t.props) {
        if (s.trapped && pr.kind === 'car') continue; // the driver's seat — inside its car by design (validate.ts checks it)
        expect(insidePropFootprint(pr.kind, pr.position[0], pr.position[1], pr.rotation, x, z, 0.4), `${x},${z} w ${pr.kind}`).toBe(false);
      }
      const dc = Math.hypot(x - t.collectionPoint[0], z - t.collectionPoint[1]);
      if (s.lying) expect(dc, `${x},${z} — za blisko punktu zbiórki`).toBeGreaterThanOrEqual(3);
      expect(slotPoses(s).length).toBeGreaterThan(0);
      expect(s.context.length).toBeGreaterThan(0);
    }
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const [a, b] = [slots[i].position, slots[j].position];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1]), `${a}–${b}`).toBeGreaterThanOrEqual(MIN_PATIENT_SPACING);
      }
    }
    // Miejsc do leżenia starczy dla maksymalnej liczby niechodzących.
    const maxNonWalking = l.count[1] - MIN_WALKING_GREEN;
    expect(slots.filter((s) => s.lying).length).toBeGreaterThanOrEqual(maxNonWalking);
  });
});

describe('test właściwości: 300 losowych kodów na scenariusz', () => {
  const N = 300;
  it.each(LAYOUTS.map((l) => [l.id, l] as const))('%s', (id, l) => {
    const codes = codesFor(id, N);
    const seenArchetypes = new Set<string>();
    const sizes = new Set<number>();
    for (const code of codes) {
      const g = generateDetailed(id, code);
      const s = g.scenario;
      const where = `${code}`;
      expect(g.archetypeIds, `${where}: powrót do wzorca`).not.toBeNull();
      expect(s.code).toBe(code);
      expect(s.id).toBe(id);
      expect(scenarioIssues(s), where).toEqual([]);

      const n = s.patients.length;
      sizes.add(n);
      expect(n, where).toBeGreaterThanOrEqual(l.count[0]);
      expect(n, where).toBeLessThanOrEqual(l.count[1]);
      expect(patientCountRange(id)).toEqual([l.count[0], l.count[1]]);

      const ids = s.patients.map((p) => p.id);
      expect(new Set(ids).size, where).toBe(n);

      const counts: Record<TriageCategory, number> = { green: 0, yellow: 0, red: 0, black: 0 };
      s.patients.forEach((p, i) => {
        const arch = archetypeById(g.archetypeIds![i])!;
        seenArchetypes.add(arch.id);
        const cat = triage(p.vitals, p.appearsChild).category;
        expect(cat, `${where} ${p.id} (${arch.id})`).toBe(arch.category);
        counts[cat]++;

        // spójność tekstów
        const all = [p.label, ...p.injuries, p.remark ?? ''].join(' ');
        expect(all, `${where} ${p.id}`).not.toMatch(/[{}|]/);
        expect(p.injuries.length).toBeGreaterThan(0);
        expect(new Set(p.injuries).size).toBe(p.injuries.length);
        // rodzaj gramatyczny etykiety = płeć postaci
        if (/^(Mężczyzna|Chłopiec|Nastolatek)/.test(p.label)) expect(p.appearance.sex).toBe('m');
        if (/^(Kobieta|Dziewczynka|Nastolatka)/.test(p.label)) expect(p.appearance.sex).toBe('f');
        expect(p.label).toMatch(/^(Mężczyzna|Kobieta|Kobieta w ciąży|Chłopiec|Dziewczynka|Nastolatek|Nastolatka|Niemowlę), ok\. \d+ (lat|miesięcy)( \(.+\))?$/);
        // wiek ↔ algorytm
        if (p.appearsChild) expect(p.ageYears).toBeLessThanOrEqual(10);
        else expect(p.ageYears).toBeGreaterThanOrEqual(13);
        if (p.vitals.nonAmbulatoryByAge) expect(p.ageYears).toBeLessThan(1);
        expect(p.appearance.child).toBe(p.appearsChild);
      });

      for (const c of Object.keys(counts) as TriageCategory[]) {
        expect(counts[c], `${where}: ${c}`).toBeGreaterThanOrEqual(Math.ceil(CATEGORY_MIX[c][0] * n - 1e-9));
        expect(counts[c], `${where}: ${c}`).toBeLessThanOrEqual(Math.floor(CATEGORY_MIX[c][1] * n + 1e-9));
      }
      expect(counts.red).toBeGreaterThanOrEqual(1);
      expect(s.patients.filter((p) => p.vitals.canWalk).length, where).toBeGreaterThanOrEqual(MIN_WALKING_GREEN);
      const kids = s.patients.filter((p) => p.appearsChild && !p.vitals.nonAmbulatoryByAge).length;
      expect(kids, where).toBeGreaterThanOrEqual(l.minChildren ?? 0);
      expect(s.patients.filter((p) => !p.appearsChild).length, where).toBeGreaterThanOrEqual(l.minAdults ?? 0);
      expect(s.patients.filter((p) => p.ageYears < 1).length, where).toBeLessThanOrEqual(l.maxInfants);

      // odprawa nie podaje liczby poszkodowanych
      expect(s.briefing).not.toMatch(/\b\d+\s+(poszkodowanych|osób|rannych)/);
      if (s.patients.every((p) => !p.appearsChild)) expect(s.briefing).not.toMatch(/w tym dzieci/);
    }
    // różnorodność
    expect(sizes.size).toBeGreaterThanOrEqual(l.count[1] - l.count[0]);
    expect(seenArchetypes.size).toBeGreaterThanOrEqual(Math.min(15, archetypesFor(l).length - 3));
  });
});

describe('zderzenie autobusów: ciężarne, dzieci, obsługa', () => {
  const l = LAYOUTS.find((x) => x.id === 'buses')!;
  const N = 300;

  it('układ: udział dzieci i ciężarnych, wzorzec specjalny, sloty', () => {
    expect(l.prefix).toBe('ZDERZENIE');
    expect(l.childShare).toEqual([0.45, 0.55]);
    expect(l.pregnancy?.share).toEqual([0.3, 0.4]);
    expect(l.template.special).toBe(true);
    expect(l.slots.length).toBeGreaterThanOrEqual(30);
    expect(patientCountRange('buses')).toEqual([20, 26]);
    // wzorzec: ≥ 8 ciężarnych, ≥ 9 dzieci
    expect(l.template.patients.filter((p) => p.appearance.pregnant).length).toBeGreaterThanOrEqual(8);
    expect(l.template.patients.filter((p) => p.appearsChild).length).toBeGreaterThanOrEqual(9);
    // sloty ≥ 0,6 m od obrysów obu autobusów
    for (const s of l.slots) {
      for (const pr of l.template.props) {
        const inside = insidePropFootprint(pr.kind, pr.position[0], pr.position[1], pr.rotation, s.position[0], s.position[1], 0.6);
        expect(inside, `${s.position}`).toBe(false);
      }
    }
  });

  it('WZOR = wzorzec (scenariusz specjalny)', () => {
    const s = generateScenario('buses', 'ZDERZENIE-WZOR');
    const { code: _c, ...rest } = s;
    expect(rest).toEqual(l.template);
    expect(s.special).toBe(true);
    expect(s.patients).toHaveLength(22);
  });

  it('determinizm i odcisk znanego kodu', () => {
    const a = generateScenario('buses', 'ZDERZENIE-4F7K');
    expect(generateScenario('buses', 'ZDERZENIE-4F7K')).toEqual(a);
    expect(generateScenario('buses', 'ZDERZENIE-9XQ2').patients).not.toEqual(a.patients);
    expect(a.special).toBe(true);
    const fingerprint = a.patients.map((p) => `${p.label}|${p.vitals.breathing.rate}|${p.position.join(',')}`).join('\n');
    expect(fingerprint).toMatchSnapshot();
  });

  it(`${N} kodów: proporcje, ciąża tylko u dorosłych kobiet (START), obsługa`, () => {
    const stat = { child: [] as number[], preg: [] as number[], n: [] as number[] };
    const pregCats = new Set<TriageCategory>();
    for (const code of codesFor('buses', N)) {
      const g = generateDetailed('buses', code);
      const s = g.scenario;
      const n = s.patients.length;
      expect(g.archetypeIds, code).not.toBeNull();
      expect(s.special, code).toBe(true);
      expect(scenarioIssues(s), code).toEqual([]);

      const kids = s.patients.filter((p) => p.appearsChild);
      const preg = s.patients.filter((p) => p.appearance.pregnant);
      stat.child.push(kids.length / n);
      stat.preg.push(preg.length / n);
      stat.n.push(n);
      expect(kids.length / n, code).toBeGreaterThanOrEqual(0.45 - 1e-9);
      expect(kids.length / n, code).toBeLessThanOrEqual(0.55 + 1e-9);
      expect(preg.length / n, code).toBeGreaterThanOrEqual(0.3 - 1e-9);
      expect(preg.length / n, code).toBeLessThanOrEqual(0.4 + 1e-9);
      for (const k of kids) {
        expect(k.ageYears, code).toBeGreaterThanOrEqual(6);
        expect(k.ageYears, code).toBeLessThanOrEqual(10);
        expect(triage(k.vitals, true).protocol).toBe('JumpSTART');
      }

      s.patients.forEach((p, i) => {
        const arch = archetypeById(g.archetypeIds![i])!;
        const r = triage(p.vitals, p.appearsChild);
        expect(r.category, `${code} ${p.id}`).toBe(arch.category);
        const text = p.injuries.join(' ');
        if (p.appearance.pregnant) {
          pregCats.add(r.category);
          expect(p.appearance.sex, code).toBe('f');
          expect(p.appearsChild, code).toBe(false);
          expect(p.ageYears, code).toBeGreaterThanOrEqual(18);
          expect(p.ageYears, code).toBeLessThanOrEqual(42);
          expect(r.protocol).toBe('START');
          expect(p.label, code).toContain('w ciąży');
          expect(p.label, code).toMatch(/^Kobieta w ciąży, ok\. \d+ lat \(ok\. [23]\d\. tydzień\)$/);
          expect(arch.pregnancy, `${code} ${arch.id}`).toBeTruthy();
          expect(text).not.toMatch(/kierownic/);
          // objaw ciąży zgodny z kryterium: krwawienie z dróg rodnych tylko przy zaburzonej perfuzji,
          // skurcze / ból podbrzusza tylko u zielonych i żółtych (bez cech wstrząsu)
          if (/dróg rodnych/.test(text)) expect(r.steps.at(-1)?.id, `${code} ${p.id}`).toBe('perfusion');
          if (/skurcze|podbrzusza/.test(text)) {
            expect(['green', 'yellow'], `${code} ${p.id}`).toContain(r.category);
            expect(p.vitals.peripheralPulse && p.vitals.crtSeconds <= 2, `${code} ${p.id}`).toBe(true);
          }
        } else {
          expect(p.label, code).not.toMatch(/ciąży/);
          expect(text).not.toMatch(/ciąż|dróg rodnych|skurcze/);
          expect(arch.pregnancy).not.toBe('only');
        }
      });

      // obsługa: obaj kierowcy, wychowawca/wychowawczyni, położna/położny
      const labels = s.patients.map((p) => p.label).join('\n');
      expect(labels, code).toMatch(/\((kierowca autokaru|kierująca autokarem)\)/);
      expect(labels, code).toMatch(/\((kierowca autobusu szkolnego|kierująca autobusem szkolnym)\)/);
      expect(labels, code).toMatch(/\(wychowaw(ca|czyni) klasy\)/);
      expect(labels, code).toMatch(/\(położn[ay] ze szkoły rodzenia\)/);
      expect(s.patients.filter((p) => !p.appearsChild && !p.appearance.pregnant).length, code).toBeGreaterThanOrEqual(4);
    }
    // ciąża nie zmienia START — ciężarna może mieć każdą kategorię, łącznie z czarną
    expect([...pregCats].sort()).toEqual(['black', 'green', 'red', 'yellow']);
    const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
    const fmt = (a: number[]) => `min ${Math.min(...a).toFixed(3)} / śr. ${(sum(a) / a.length).toFixed(3)} / max ${Math.max(...a).toFixed(3)}`;
    console.log(`[buses] n: ${fmt(stat.n)}; dzieci: ${fmt(stat.child)}; ciężarne: ${fmt(stat.preg)}`);
  });
});


describe('autobus: kierowca uwięziony w aucie', () => {
  it('każdy kod: dokładnie jeden uwięziony — siedzi, nie chodzi, oddycha, kieruje samochodem', () => {
    const rng = createRng('trapped');
    for (let i = 0; i < 60; i++) {
      const code = `AUTOBUS-${Array.from({ length: 4 }, () => rng.pick([...CODE_ALPHABET])).join('')}`;
      const s = generateScenario('bus', code);
      const trapped = s.patients.filter((p) => p.trapped);
      expect(trapped.length, code).toBe(1);
      const [p] = trapped;
      expect(p.pose, code).toBe('sitting');
      expect(p.vitals.canWalk, code).toBe(false);
      expect(p.vitals.breathing.spontaneous, code).toBe(true);
      expect(p.label, code).toMatch(/\((kierowca samochodu|kierująca samochodem)\)$/);
      expect(p.remark, code).toMatch(/^Zakleszczon[ya] w fotelu kierowcy/);
      expect(scenarioIssues(s), code).toEqual([]);
    }
  });

  it('inne układy nie mają uwięzionych', () => {
    for (const id of scenarioIds().filter((x) => x !== 'bus')) {
      expect(generateScenario(id, randomCode(id)).patients.some((p) => p.trapped), id).toBe(false);
    }
  });
});
