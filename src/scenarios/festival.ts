import type { Scenario } from './types';

/**
 * Zawalenie tymczasowej trybuny na festynie szkolnym.
 * Kategorie NIE są tu wpisane — liczy je silnik triage z `vitals`.
 * Zamierzony rozkład (źródło prawdy: festival.test.ts): 2 ZIELONE, 3 ŻÓŁTE, 8 CZERWONYCH, 1 CZARNY.
 *
 * Scenariusz „JumpSTART-owy": większość poszkodowanych to dzieci 6–10 lat — każde kryterium
 * JumpSTART ma tu swojego pacjenta (oddechy < 15, > 45, nieregularne, brak tętna obwodowego,
 * AVPU P nieadekwatne, AVPU U, bezdech → oddycha po udrożnieniu, bezdech z tętnem → oddycha
 * po 5 oddechach ratowniczych, bezdech bez tętna → CZARNY, niemowlę z istotnymi obrażeniami).
 *
 * Układ: zawalona trybuna w centrum-tyle; dzieci leżą przed jej krawędzią (od strony boiska),
 * po bokach i za nią (tam, gdzie spadły z górnych rzędów). Punkt zbiórki na trawie z prawej z przodu.
 */
export const festivalScenario: Scenario = {
  id: 'festival',
  title: 'Zawalenie trybuny na festynie szkolnym',
  briefing: [
    'SWD PRM — zadysponowanie, kod 1.',
    'Zdarzenie masowe: podczas festynu sportowego szkoły podstawowej zawaliła się tymczasowa trybuna z widzami (boisko szkolne).',
    'Zgłaszający (dyrektor szkoły): na trybunie siedziały głównie dzieci z klas 1–4, są też rodzice i nauczyciele. Część dzieci przygnieciona elementami konstrukcji, kilkoro nie reaguje.',
    'PSP i Policja zadysponowane, kolejne ZRM w drodze, LPR powiadomione. Jesteś pierwszym zespołem na miejscu — przeprowadź segregację wstępną (START / JumpSTART).',
  ].join('\n'),
  timeLimitSec: 720,
  terrain: 'field',
  collectionPoint: [8, 6],
  props: [
    { kind: 'bleachers', position: [-2, -4], rotation: 0 },
    { kind: 'tent', position: [-9.5, -5.5], rotation: 0 },  // sklepik szkolny
    { kind: 'tent', position: [7.5, -5], rotation: 0 },     // stanowisko sędziowskie
    { kind: 'tent', position: [-9, 5], rotation: 0.2 },     // kiermasz ciast
    { kind: 'car', position: [9.5, 1], rotation: 1.5 },     // bus organizatora
  ],
  patients: [
    // ── ZIELONI ──────────────────────────────────────────────
    {
      // Dystraktor: głośno płaczące, lekko ranne dziecko — chodzi → ZIELONY.
      id: 'f01',
      label: 'Dziewczynka, ok. 7 lat',
      ageYears: 7,
      appearsChild: true,
      vitals: {
        canWalk: true,
        breathing: { spontaneous: true, afterAirway: true, rate: 32 },
        peripheralPulse: true,
        crtSeconds: 1.5,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['otarcia obu kolan', 'drzazga w dłoni prawej'],
      remark: 'Zanosi się płaczem i ciągnie za rękaw: „Proszę pani! Ola tam leży! Ola się nie rusza!"',
      appearance: { sex: 'f', child: true, skin: '#ffe0bd', hair: '#d9a441', hairStyle: 'ponytail', shirt: '#ffffff', pants: '#1f3a93', sleeves: 'short' },
      pose: 'standing',
      position: [5, 4],
      rotation: 2.8,
    },
    {
      // Matka niemowlęcia f03 — sama chodzi → ZIELONY (START), ale nie odchodzi od dziecka.
      id: 'f02',
      label: 'Kobieta, ok. 34 lat (matka)',
      ageYears: 34,
      appearsChild: false,
      vitals: {
        canWalk: true,
        breathing: { spontaneous: true, afterAirway: true, rate: 22 },
        peripheralPulse: true,
        crtSeconds: 1.5,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['otarcie przedramienia lewego', 'stłuczenie biodra prawego'],
      remark: 'Klęczy przy wózku, potem wstaje: „Ratujcie ją! Ona ma dopiero 9 miesięcy!"',
      appearance: { sex: 'f', child: false, skin: '#e8b98f', hair: '#4a2c1a', hairStyle: 'long', shirt: '#e74c3c', pants: '#2c3e50', sleeves: 'short' },
      pose: 'standing',
      position: [2.2, 3.8],
      rotation: -2.6,
    },

    // ── ŻÓŁCI ────────────────────────────────────────────────
    {
      // Niemowlę ok. 9 mies. — nie chodzi z powodu wieku (nie urazu) → pełna ocena JumpSTART;
      // parametry prawidłowe, ale istotne obrażenia zewnętrzne → ŻÓŁTY (krok „infant-injury").
      id: 'f03',
      label: 'Niemowlę, ok. 9 miesięcy',
      ageYears: 0.75,
      appearsChild: true,
      vitals: {
        canWalk: false,
        nonAmbulatoryByAge: true,
        breathing: { spontaneous: true, afterAirway: true, rate: 40 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'A',
        significantExternalInjury: true,
      },
      injuries: ['rana płatowata owłosionej skóry głowy, krwawiąca', 'obrzęk i zniekształcenie przedramienia prawego'],
      remark: 'Wózek przewrócony przez spadającą deskę. Niemowlę głośno płacze, wodzi wzrokiem.',
      appearance: { sex: 'f', child: true, skin: '#ffe0bd', hair: '#e8c07a', hairStyle: 'bald', shirt: '#f8c8dc', pants: '#f8c8dc', sleeves: 'long' },
      pose: 'back',
      position: [0.5, 2.8],
      rotation: 0.3,
    },
    {
      // Przypadek brzegowy: 12 lat, ale drobny, w stroju szkoły podstawowej, wygląda na dziecko → JumpSTART.
      // 34/min mieści się w normie JumpSTART (15–45) → ŻÓŁTY. Gdyby ocenić START-em (> 30/min) — CZERWONY.
      // Zasada: o algorytmie decyduje to, jak poszkodowany WYGLĄDA (dziecko vs młody dorosły), nie PESEL.
      id: 'f04',
      label: 'Chłopiec, ok. 12 lat',
      ageYears: 12,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 34 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['zniekształcenie podudzia lewego — podejrzenie złamania', 'otarcia łokci'],
      remark: 'Blady, zaciska pięści: „Spadłem z samej góry… Noga… nie mogę nią ruszyć."',
      appearance: { sex: 'm', child: true, skin: '#c68642', hair: '#1a1a1a', hairStyle: 'short', shirt: '#1f3a93', pants: '#ffffff', sleeves: 'short' },
      pose: 'back',
      position: [-2.5, 1.6],
      rotation: 1.1,
    },
    {
      id: 'f05',
      label: 'Kobieta, ok. 50 lat (nauczycielka WF)',
      ageYears: 50,
      appearsChild: false,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 20 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['zniekształcenie stawu skokowego prawego — podejrzenie złamania', 'otarcie czoła'],
      remark: 'Z gwizdkiem na szyi: „Policzcie dzieci! Było ich na trybunie ze czterdzieścioro!"',
      appearance: { sex: 'f', child: false, skin: '#f1c27d', hair: '#9e9e9e', hairStyle: 'short', shirt: '#c0392b', pants: '#1c1c1c', sleeves: 'long' },
      pose: 'sitting',
      position: [3.8, -0.8],
      rotation: -1.6,
    },

    // ── CZERWONI ─────────────────────────────────────────────
    {
      // Ciężki uraz głowy: bradypnoe 12/min (< 15) → CZERWONY.
      id: 'f06',
      label: 'Chłopiec, ok. 7 lat',
      ageYears: 7,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 12 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'V',
      },
      injuries: ['krwiak okolicy skroniowej lewej', 'krwawienie z ucha lewego'],
      remark: 'Na głos otwiera oczy, ale nie odpowiada i zaraz je zamyka.',
      appearance: { sex: 'm', child: true, skin: '#f3d2b8', hair: '#6b4423', hairStyle: 'short', shirt: '#ffffff', pants: '#1f3a93', sleeves: 'short' },
      pose: 'back',
      position: [-4.5, -0.9],
      rotation: 0.6,
    },
    {
      // Przygniecenie klatki piersiowej deską trybuny: tachypnoe 52/min (> 45) → CZERWONY.
      id: 'f07',
      label: 'Dziewczynka, ok. 6 lat',
      ageYears: 6,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 52 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['otarcia i zasinienie klatki piersiowej od deski', 'sinica warg', 'praca dodatkowych mięśni oddechowych'],
      remark: 'Szybko, płytko oddycha, szepcze: „Boli… w środku…"',
      appearance: { sex: 'f', child: true, skin: '#8d5524', hair: '#0f0f0f', hairStyle: 'ponytail', shirt: '#f1c40f', pants: '#1f3a93', sleeves: 'short' },
      pose: 'back',
      position: [-1.5, -0.8],
      rotation: -0.4,
    },
    {
      // Nieregularny oddech (uraz głowy/klatki) przy częstości w normie → CZERWONY.
      id: 'f08',
      label: 'Chłopiec, ok. 9 lat',
      ageYears: 9,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 24, irregular: true },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'V',
      },
      injuries: ['rana tłuczona potylicy', 'otarcia pleców od metalowej konstrukcji'],
      remark: 'Pojękuje, oddech raz szybki, raz z przerwami.',
      appearance: { sex: 'm', child: true, skin: '#ffe0bd', hair: '#b5651d', hairStyle: 'short', shirt: '#27ae60', pants: '#ffffff', sleeves: 'short' },
      pose: 'back',
      position: [1.5, -0.9],
      rotation: 2.0,
    },
    {
      // Masywny krwotok z rany podudzia (ostra krawędź blachy) — brak tętna obwodowego → CZERWONY (perfuzja).
      id: 'f09',
      label: 'Dziewczynka, ok. 8 lat',
      ageYears: 8,
      appearsChild: true,
      majorBleeding: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 36 },
        peripheralPulse: false,
        crtSeconds: 4,
        obeysCommands: true,
        avpu: 'A',
      },
      injuries: ['głęboka rana cięta podudzia prawego od krawędzi blachy, obfite krwawienie', 'skóra blada, zimna, marmurkowa'],
      remark: 'Cicha, apatyczna: „Chce mi się pić… zimno mi…"',
      appearance: { sex: 'f', child: true, skin: '#f0d5be', hair: '#3d2b1f', hairStyle: 'long', shirt: '#2e86c1', pants: '#2e86c1', sleeves: 'short' },
      pose: 'back',
      position: [3.4, -3],
      rotation: -1.0,
    },
    {
      // AVPU P z nieadekwatną reakcją (ułożenie wyprostne) → CZERWONY.
      id: 'f10',
      label: 'Chłopiec, ok. 6 lat',
      ageYears: 6,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 22 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'P',
        painResponseAppropriate: false,
      },
      injuries: ['rozległy krwiak czoła', 'nierówne źrenice'],
      remark: 'Nie reaguje na wołanie. Na ucisk prostuje kończyny.',
      appearance: { sex: 'm', child: true, skin: '#e0ac69', hair: '#1b1b1b', hairStyle: 'short', shirt: '#e67e22', pants: '#1f3a93', sleeves: 'short' },
      pose: 'back',
      position: [-7.2, -2.5],
      rotation: 1.3,
    },
    {
      // AVPU U (oddycha, tętno obecne) → CZERWONY.
      id: 'f11',
      label: 'Dziewczynka, ok. 7 lat',
      ageYears: 7,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: true, afterAirway: true, rate: 18 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'U',
      },
      injuries: ['krwiak okularowy obustronny', 'wyciek płynu z nosa podbarwiony krwią'],
      remark: 'Leży bez ruchu, nie reaguje na głos ani na ból.',
      appearance: { sex: 'f', child: true, skin: '#c68642', hair: '#2b1d0e', hairStyle: 'long', shirt: '#ffffff', pants: '#c0392b', sleeves: 'short' },
      pose: 'back',
      position: [-6.9, -0.4],
      rotation: 2.4,
    },
    {
      // Bezdech; po udrożnieniu dróg oddechowych oddycha → CZERWONY.
      id: 'f12',
      label: 'Chłopiec, ok. 8 lat',
      ageYears: 8,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: false, afterAirway: true, rate: 14 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'U',
      },
      injuries: ['otarcia twarzy', 'głowa w przygięciu — wyciągnięty spod desek za trybuną'],
      remark: 'Leży bez ruchu za trybuną, wargi sine.',
      appearance: { sex: 'm', child: true, skin: '#f5d0b0', hair: '#e5c07b', hairStyle: 'short', shirt: '#c0392b', pants: '#1c1c1c', sleeves: 'short' },
      pose: 'back',
      position: [-3, -7.2],
      rotation: -0.5,
    },
    {
      // Bezdech z tętnem; po udrożnieniu nadal nie oddycha, po 5 oddechach ratowniczych oddycha → CZERWONY.
      id: 'f13',
      label: 'Dziewczynka, ok. 6 lat',
      ageYears: 6,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: false, afterAirway: false, afterRescueBreaths: true, rate: 16 },
        peripheralPulse: true,
        crtSeconds: 2,
        obeysCommands: false,
        avpu: 'U',
      },
      injuries: ['ślad ucisku belki na szyi i klatce piersiowej', 'sinica twarzy'],
      remark: 'Leży wiotka za trybuną. Tętno na tętnicy ramiennej wyczuwalne.',
      appearance: { sex: 'f', child: true, skin: '#ffe0bd', hair: '#1a1a1a', hairStyle: 'ponytail', shirt: '#f1c40f', pants: '#1f3a93', sleeves: 'short' },
      pose: 'back',
      position: [0.5, -7.3],
      rotation: 1.0,
    },

    // ── CZARNY ───────────────────────────────────────────────
    {
      // Bezdech, brak tętna obwodowego → CZARNY (bez oddechów ratowniczych).
      id: 'f14',
      label: 'Chłopiec, ok. 10 lat',
      ageYears: 10,
      appearsChild: true,
      vitals: {
        canWalk: false,
        breathing: { spontaneous: false, afterAirway: false, afterRescueBreaths: false, rate: 0 },
        peripheralPulse: false,
        crtSeconds: 6,
        obeysCommands: false,
        avpu: 'U',
      },
      injuries: ['zmiażdżenie klatki piersiowej przez belkę konstrukcji', 'szerokie, niereagujące źrenice'],
      appearance: { sex: 'm', child: true, skin: '#8d5524', hair: '#0f0f0f', hairStyle: 'short', shirt: '#27ae60', pants: '#ffffff', sleeves: 'short' },
      pose: 'front',
      position: [-5.5, -7.4],
      rotation: 0.8,
    },
  ],
};
