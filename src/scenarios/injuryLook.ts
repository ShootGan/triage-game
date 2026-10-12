import type { ScenarioPatient } from './types';

/** Patient's side: 0 = right (`legs[0]` / `arms[0]` in the model), 1 = left. */
export type Side = 0 | 1;

/** Limb segment: thigh, lower leg, foot, upper arm, forearm, hand. */
export type Segment = 'thigh' | 'shin' | 'foot' | 'arm' | 'forearm' | 'hand';

export interface LimbSite {
  segment: Segment;
  side: Side;
}

/** Body regions with visible burns. */
export type BurnRegion = 'face' | 'torso' | 'arms' | 'legs';

/**
 * What the 3D model should show, read from the injury texts (the texts are the single source:
 * archetype variants, hand-made templates and the generator all end up there).
 */
export interface InjuryLook {
  /** Where massive bleeding comes from (only with `majorBleeding`). */
  bleed?: LimbSite;
  /** Missing limb part — the stump is the bleeding site. */
  amputation?: LimbSite;
  burns: BurnRegion[];
  /** Burnt, smouldering clothes. */
  charred: boolean;
  soot: boolean;
  dust: boolean;
  /** Object stuck in the body (glass shard or metal rod). */
  impaled?: { site: LimbSite | 'buttock'; kind: 'glass' | 'metal' };
}

const LEFT = /(^|[^\p{L}])lew(ego|ej|e|a|ą|y)(?!\p{L})/u;

function side(text: string): Side {
  return LEFT.test(text) ? 1 : 0;
}

/** Limb segment named in a text; `przedramię` before `ramię`, `podudzie`/`łydka` before `udo`. */
function segmentOf(text: string): Segment | undefined {
  if (/stop(y|a|ę)|kostk|stawu skokowego/.test(text)) return 'foot';
  if (/przedrami|nadgarst/.test(text)) return 'forearm';
  if (/dło[nń]|palc/.test(text)) return 'hand';
  if (/rami(enia|ę)|bark/.test(text)) return 'arm';
  if (/podud|łydk|podkolan/.test(text)) return 'shin';
  if (/\bud(a|o|zie)\b|udow/.test(text)) return 'thigh';
  return undefined;
}

const BLEED_LINE = /obfit|pulsując|tryska|strumieniem|kałuża|kikut|masywn/;

export function injuryLook(p: Pick<ScenarioPatient, 'injuries' | 'majorBleeding'>): InjuryLook {
  const lines = p.injuries.map(l => l.toLowerCase());
  const all = lines.join(' | ');
  const look: InjuryLook = { burns: [], charred: false, soot: false, dust: false };

  const ampLine = lines.find(l => /amputacj/.test(l));
  if (ampLine) {
    const seg = segmentOf(ampLine);
    // "amputacja podudzia poniżej kolana" → the shin is gone; "częściowa amputacja przedramienia" → the hand is.
    const segment: Segment | undefined =
      seg === 'forearm' && /częściow/.test(ampLine) ? 'hand' : seg;
    if (segment) look.amputation = { segment, side: side(ampLine) };
  }

  if (p.majorBleeding) {
    if (look.amputation) look.bleed = look.amputation;
    else {
      const line = lines.find(l => BLEED_LINE.test(l)) ?? '';
      look.bleed = { segment: segmentOf(line) ?? 'thigh', side: side(line) };
    }
  }

  for (const l of lines) {
    if (!/oparze/.test(l) || /\bi stopnia\b/.test(l) && !/ii/.test(l)) continue; // 1st degree: just redness, not drawn
    if (/twarz|szyi/.test(l)) look.burns.push('face');
    if (/tułow|brzuch|klatk|plec|pośladk/.test(l)) look.burns.push('torso');
    if (/ramion|rąk|dłoni|przedrami/.test(l)) look.burns.push('arms');
    if (/podud|kończyn dolnych|stóp|stopy|\bud\b|nóg|nogi|całego ciała/.test(l)) look.burns.push('legs');
    if (/całego ciała/.test(l)) look.burns.push('face', 'torso', 'arms');
  }
  look.burns = [...new Set(look.burns)];
  look.charred = /zwęglon|nadpalon|osmalone ubranie|stopione/.test(all);
  look.soot = /sadz|okopcon|osmalon/.test(all);
  look.dust = /pył|zasypan|gruz/.test(all);

  const imp = lines.find(l => /wbit/.test(l));
  if (imp) {
    const seg = segmentOf(imp);
    look.impaled = {
      site: /pośladek|pośladk/.test(imp) || !seg ? 'buttock' : { segment: seg, side: side(imp) },
      kind: /szkł/.test(imp) ? 'glass' : 'metal',
    };
  }
  return look;
}
