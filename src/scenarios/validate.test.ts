import { describe, expect, it } from 'vitest';
import { busScenario } from './bus';
import { scenarioIssues } from './validate';

describe('walidator scenariuszy', () => {
  it('scenariusz autobusu jest poprawny', () => {
    expect(scenarioIssues(busScenario)).toEqual([]);
  });

  it('wykrywa kolizje i niespójności', () => {
    const p = busScenario.patients[0];
    const broken = {
      ...busScenario,
      patients: [
        { ...p, id: 'x1', position: [0, 0] as [number, number] },
        { ...p, id: 'x1', position: [0.5, 0] as [number, number], vitals: { ...p.vitals, obeysCommands: true, avpu: 'P' as const } },
      ],
    };
    const issues = scenarioIssues(broken);
    expect(issues.some((i) => i.includes('powtórzony id'))).toBe(true);
    expect(issues.some((i) => i.includes('za blisko'))).toBe(true);
    expect(issues.some((i) => i.includes('AVPU = P'))).toBe(true);
  });

  it('AVPU „V" może wykonywać polecenia', () => {
    const p = busScenario.patients[0];
    const ok = { ...busScenario, patients: [{ ...p, vitals: { ...p.vitals, obeysCommands: true, avpu: 'V' as const } }] };
    expect(scenarioIssues(ok).some((i) => i.includes('AVPU'))).toBe(false);
  });

  it('dziecko < 9 lat z tętnem i CRT > 2 s — sprzeczne z JumpSTART', () => {
    const kid = busScenario.patients.find((p) => p.appearsChild && p.ageYears < 9 && p.vitals.breathing.spontaneous && p.vitals.peripheralPulse)!;
    const broken = { ...busScenario, patients: [{ ...kid, vitals: { ...kid.vitals, crtSeconds: 3 } }] };
    expect(scenarioIssues(broken).some((i) => i.includes('tętno obecne, ale CRT > 2 s'))).toBe(true);
  });
});

describe('SALT: szybki oddech u chodzących', () => {
  it('chodzący z oddechem poza normą ma jawną decyzję o duszności (np. hiperwentylacja → salt.distress = false)', async () => {
    const { respiratoryDistress } = await import('../engine/triage');
    const { ARCHETYPES } = await import('./generator/archetypes');
    for (const a of ARCHETYPES.filter((x) => x.vitals.walk)) {
      const r = a.vitals.rate;
      const fast = Array.isArray(r) && (r[1] > 30 || r[0] < 10);
      if (fast) expect(a.salt?.distress, a.id).toBeDefined();
    }
    const { LAYOUTS } = await import('./generator/layouts');
    for (const l of LAYOUTS) {
      for (const p of l.template.patients) {
        if (p.vitals.canWalk && respiratoryDistress(p.vitals, p.appearsChild)) expect(p.salt?.distress, `${l.id} ${p.id}`).toBeDefined();
      }
    }
  });
});

describe('SALT: chodzący z podejrzeniem złamania nie są „tylko drobni"', () => {
  it('archetypy i wzorce: tekst z podejrzeniem złamania/zwichnięcia ⇒ salt.minorOnly === false', async () => {
    const { ARCHETYPES } = await import('./generator/archetypes');
    const { LAYOUTS } = await import('./generator/layouts');
    const serious = /podejrzenie (złamania|zwichnięcia)|otwarte złamanie|ścięgna/;
    for (const a of ARCHETYPES.filter((x) => x.category === 'green')) {
      const texts = a.injuries.flat().map((t) => (typeof t === 'string' ? t : t.t));
      if (texts.some((t) => serious.test(t))) expect(a.salt?.minorOnly, a.id).toBe(false);
      // ...and the reverse: no mixed archetype where some variants are minor (the flag covers them all)
      if (a.salt?.minorOnly === false) for (const t of a.injuries[0].map((x) => (typeof x === 'string' ? x : x.t))) expect(t, a.id).toMatch(serious);
    }
    for (const l of LAYOUTS) {
      for (const p of l.template.patients) {
        if (p.vitals.canWalk && p.injuries.some((t) => serious.test(t))) expect(p.salt?.minorOnly, `${l.id} ${p.id}`).toBe(false);
      }
    }
  });
});
