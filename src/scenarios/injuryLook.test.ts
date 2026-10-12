import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from './generator/archetypes';
import { injuryLook } from './injuryLook';

const look = (injuries: string[], majorBleeding = false) => injuryLook({ injuries, majorBleeding });

describe('injuryLook', () => {
  it('krwotok: miejsce i strona z opisu', () => {
    expect(look(['rana szarpana uda lewego z obfitym, pulsującym krwawieniem — kałuża krwi'], true).bleed).toEqual({ segment: 'thigh', side: 1 });
    expect(look(['głęboka rana ramienia prawego z tryskającym krwawieniem — kałuża krwi'], true).bleed).toEqual({ segment: 'arm', side: 0 });
    expect(look(['rana cięta przedramienia od szkła, krew tryska strumieniem'], true).bleed?.segment).toBe('forearm');
    expect(look(['rana szarpana podudzia lewego z obfitym krwawieniem — przesiąknięta nogawka'], true).bleed).toEqual({ segment: 'shin', side: 1 });
    expect(look(['rana dołu podkolanowego od blachy, obfite pulsujące krwawienie'], true).bleed?.segment).toBe('shin');
    expect(look(['coś bez lokalizacji'], true).bleed).toEqual({ segment: 'thigh', side: 0 });
    expect(look(['rana szarpana uda prawego z obfitym krwawieniem'], false).bleed).toBeUndefined();
  });

  it('amputacja: brakujący odcinek, kikut krwawi', () => {
    expect(look(['amputacja urazowa stopy prawej, obfite krwawienie z kikuta'], true)).toMatchObject({
      amputation: { segment: 'foot', side: 0 },
      bleed: { segment: 'foot', side: 0 },
    });
    expect(look(['amputacja urazowa podudzia lewego poniżej kolana, obfite krwawienie'], true).amputation).toEqual({ segment: 'shin', side: 1 });
    expect(look(['częściowa amputacja przedramienia prawego, tryskające krwawienie'], true).amputation).toEqual({ segment: 'hand', side: 0 });
  });

  it('oparzenia, sadza, pył, ciało obce', () => {
    const b = look(['oparzenia II stopnia podudzia lewego i stopy, nadpalone nogawki', 'osmalone brwi i włosy']);
    expect(b).toMatchObject({ burns: ['legs'], charred: true, soot: true });
    expect(look(['oparzenia I stopnia grzbietów dłoni']).burns).toEqual([]);
    expect(look(['rozległe oparzenia II i III stopnia tułowia i ramion']).burns).toEqual(['torso', 'arms']);
    expect(look(['twarz, usta i nos zasypane pyłem']).dust).toBe(true);
    expect(look(['metalowy odłamek wbity w łydkę lewą, krwawienie sączące']).impaled).toEqual({ site: { segment: 'shin', side: 1 }, kind: 'metal' });
    expect(look(['kawałek szkła wbity w udo prawe, niewielkie krwawienie wokół — nie usuwać']).impaled).toEqual({ site: { segment: 'thigh', side: 0 }, kind: 'glass' });
    expect(look(['pręt wbity w pośladek, niewielkie krwawienie — nie usuwać']).impaled).toEqual({ site: 'buttock', kind: 'metal' });
  });

  it('każdy wariant krwotoku w archetypach ma rozpoznane miejsce', () => {
    for (const a of ARCHETYPES.filter(x => x.majorBleeding)) {
      const line = a.injuries[0].map(t => (typeof t === 'string' ? t : t.t));
      for (const t of line) {
        const l = t.toLowerCase();
        expect(/stop|przedrami|dło|rami|podud|łydk|podkolan|ud/.test(l), `${a.id}: ${t}`).toBe(true);
        expect(injuryLook({ injuries: [t], majorBleeding: true }).bleed, `${a.id}: ${t}`).toBeDefined();
      }
    }
  });
});
