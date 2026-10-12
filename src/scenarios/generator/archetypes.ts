import type { Avpu, TriageCategory } from '../../engine/triage';
import type { PatientPose } from '../types';

/**
 * Archetypy poszkodowanych — „przypadki kliniczne z widełkami" (GDD 8.1).
 * Źródło: 65 ręcznie ułożonych pacjentów z 5 scenariuszy (pole `source` wskazuje wzorce).
 *
 * Zasady spójności:
 * - kategorie NIE są wpisywane pacjentom — generator sprawdza każdego wylosowanego pacjenta silnikiem triage
 *   i porównuje z `category` (testy sprawdzają też skrajne wartości widełek),
 * - teksty obrażeń/wypowiedzi nie podają liczb (oddechy/CRT) i opisują obraz zgodny z widełkami
 *   (np. „mówi pojedynczymi słowami" tylko przy oddechach > 30/min),
 * - formy rodzajowe w tekstach: „{męska|żeńska}" (patrz text.ts); teksty niemowląt są bezrodzajowe.
 */

export type AgeGroup = 'infant' | 'child' | 'teen' | 'adult' | 'elderly';

export const AGE_GROUPS: readonly AgeGroup[] = ['infant', 'child', 'teen', 'adult', 'elderly'];

/** Algorytm wg grupy wieku: niemowlę i dziecko wyglądają na dziecko → JumpSTART; od 13 lat → START. */
export const APPEARS_CHILD: Record<AgeGroup, boolean> = {
  infant: true,
  child: true,
  teen: false,
  adult: false,
  elderly: false,
};

/** 'kolejowy' — train derailment: like a road crash but no seat belts or steering wheels, thrown about the car. */
export type Mechanism = 'komunikacyjny' | 'zmiazdzenie' | 'wybuch' | 'upadek' | 'oparzenie' | 'tlum' | 'kolejowy';

export const ALL_MECHANISMS: readonly Mechanism[] = ['komunikacyjny', 'zmiazdzenie', 'wybuch', 'upadek', 'oparzenie', 'tlum', 'kolejowy'];

export type Range = readonly [number, number];

/**
 * Częstość oddechów:
 * - [min, max] — stałe widełki,
 * - 'normal'   — norma spoczynkowa dla wieku,
 * - 'stressed' — przyspieszony z bólu/stresu, ale wciąż w normie algorytmu (START ≤ 30, JumpSTART 15–45).
 */
export type RateSpec = Range | 'normal' | 'stressed';

/** Wariant tekstu; opcjonalnie tylko dla wybranych mechanizmów urazu / grup wieku / póz. */
export type Text =
  | string
  | {
      t: string;
      mech?: readonly Mechanism[];
      ages?: readonly AgeGroup[];
      poses?: readonly PatientPose[];
      /** Nie dla kobiety w ciąży (np. „ślad od kierownicy" — ciężarne jadą jako pasażerki). */
      notPregnant?: boolean;
    };

export interface VitalsSpec {
  walk: boolean;
  /**
   * 'spontaneous' — oddycha; 'airway' — bezdech, oddycha po udrożnieniu;
   * 'rescue' — bezdech, oddycha dopiero po 5 oddechach ratowniczych (JumpSTART); 'none' — nie oddycha.
   */
  breathing: 'spontaneous' | 'airway' | 'rescue' | 'none';
  rate: RateSpec;
  irregular?: boolean;
  pulse: boolean;
  /** Nawrót kapilarny w s (losowany co 0,5 s). */
  crt: Range;
  avpu: Avpu;
  obeys: boolean;
  painAppropriate?: boolean;
  /** Niemowlę: istotne obrażenia zewnętrzne (JumpSTART, krok „infant-injury"). */
  infantInjury?: boolean;
}

export interface Archetype {
  id: string;
  category: TriageCategory;
  /** Kryterium rozstrzygające (opis dydaktyczny). */
  criterion: string;
  /** Identyfikatory wzorcowych pacjentów, z których archetyp powstał. */
  source: readonly string[];
  ages: readonly AgeGroup[];
  /** Dodatkowe ograniczenie wieku w latach (część wspólna z widełkami grupy). */
  ageRange?: Range;
  sex?: 'm' | 'f';
  /** Rzeczownik w etykiecie zamiast domyślnego (np. „Kobieta w ciąży"). */
  labelNoun?: string;
  mechanisms: readonly Mechanism[];
  vitals: VitalsSpec;
  /** Linie obrażeń — z każdej linii jeden wariant (linie bez pasującego wariantu są pomijane). */
  injuries: readonly (readonly Text[])[];
  /** Opcjonalna dodatkowa linia obrażeń (dołączana losowo). */
  extraInjuries?: readonly Text[];
  /** Warianty wypowiedzi / zachowania (brak = bez opisu). */
  remarks?: readonly Text[];
  poses: readonly PatientPose[];
  majorBleeding?: boolean;
  /** Względna częstość (domyślnie 1). */
  weight?: number;
  /** Najwyżej raz w scenariuszu. */
  unique?: boolean;
  /**
   * Ciąża (tylko układy z `pregnancy`, np. „Zderzenie autobusów"):
   * 'ok' — archetyp pasuje do dorosłej kobiety w ciąży (teksty jej nie przeczą),
   * 'only' — wyłącznie dla kobiety w ciąży (np. y-ciaza). Brak = nie dla ciężarnej.
   * W układach bez `pregnancy` archetypy 'only' nie występują (bez widocznej ciąży etykieta by kłamała), 'ok' — jak zwykłe.
   */
  pregnancy?: 'ok' | 'only';
}

const ADULTLIKE: readonly AgeGroup[] = ['teen', 'adult', 'elderly'];
const ALL: readonly Mechanism[] = ALL_MECHANISMS;
const UPRIGHT: readonly PatientPose[] = ['standing', 'sitting'];

// Wspólne zestawy parametrów
const WALKER = (rate: RateSpec = 'stressed'): VitalsSpec => ({
  walk: true, breathing: 'spontaneous', rate, pulse: true, crt: [1, 2], avpu: 'A', obeys: true,
});
const STABLE = (rate: RateSpec = 'stressed'): VitalsSpec => ({
  walk: false, breathing: 'spontaneous', rate, pulse: true, crt: [1, 2], avpu: 'A', obeys: true,
});

export const ARCHETYPES: readonly Archetype[] = [
  // ═════════════════════════ ZIELONI ═════════════════════════
  {
    id: 'g-otarcia',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['a01', 'f02', 'c03'],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [[
      'otarcia obu dłoni', 'otarcia przedramion', 'otarcie łokcia prawego', 'otarcie kolana lewego', 'drobne otarcia twarzy',
    ]],
    extraInjuries: [
      'zasinienie przedramienia', 'stłuczenie biodra prawego',
      { t: 'zasinienie barku od pasa bezpieczeństwa', mech: ['komunikacyjny'] },
      { t: 'twarz i ubranie pokryte pyłem', mech: ['wybuch', 'zmiazdzenie'] },
    ],
    remarks: [
      '„Nic mi nie jest, tylko ręce pieką. Pomóżcie innym!"',
      '„Co się stało? Wszystko działo się tak szybko…"',
      'Rozgląda się nerwowo i próbuje się do kogoś dodzwonić.',
      { t: '„Huknęło tak, że mnie przewróciło…"', mech: ['wybuch'] },
      { t: '„Ktoś mnie popchnął i upadł{em|am}… Gdzie są moi znajomi?"', mech: ['tlum'] },
      { t: '„Wagon zaczął się przechylać i wszyscy polecieliśmy na jedną stronę…"', mech: ['kolejowy'] },
      { t: '„Nogi mi się trzęsą, ale chodzę."', ages: ['elderly'] },
    ],
    poses: UPRIGHT,
    weight: 2,
  },
  {
    id: 'g-rana-cieta',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['p02', 't04'],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'wybuch', 'zmiazdzenie', 'upadek', 'kolejowy'],
    vitals: WALKER(),
    injuries: [[
      'rana cięta przedramienia lewego, krwawienie żylne niewielkie',
      'rana cięta grzbietu dłoni prawej, krwawienie niewielkie',
      { t: 'rana cięta przedramienia od szyby, krwawienie żylne niewielkie', mech: ['komunikacyjny', 'wybuch', 'kolejowy'] },
    ]],
    remarks: [
      'Uciska ranę chusteczką: „Dam radę, idźcie do ciężej rannych."',
      '„Krwawi, ale chyba nic poważnego."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-reka',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['p03'],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [[
      'bolesność i obrzęk nadgarstka prawego',
      'bolesność i zniekształcenie nadgarstka lewego — podejrzenie złamania',
      'bolesność obojczyka prawego, ręka przyciśnięta do tułowia',
    ]],
    extraInjuries: ['otarcie czoła', 'otarcia dłoni'],
    remarks: [
      'Trzyma się za rękę: „Chyba złamał{em|am} rękę…"',
      '„Upadł{em|am} na rękę. Strasznie boli, ale mogę iść."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-krwawa-glowa',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi (dystraktor: twarz zalana krwią)',
    source: ['a02'],
    ages: ['teen', 'adult'],
    mechanisms: ['komunikacyjny', 'wybuch', 'upadek', 'tlum', 'zmiazdzenie', 'kolejowy'],
    vitals: WALKER(),
    injuries: [[
      'rana cięta skóry owłosionej głowy — twarz i ubranie zalane krwią, krwawienie już niewielkie',
      'rana łuku brwiowego — twarz zalana krwią, krwawienie już niewielkie',
    ]],
    remarks: [
      'Przyciska do głowy zakrwawiony szalik: „Dużo krwi… ale chyba nic mi nie jest. Mogę iść."',
      '„Leje się ze mnie krew, ale czuję się dobrze."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-kark',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['a04'],
    ages: ['adult', 'elderly'],
    mechanisms: ['komunikacyjny'],
    vitals: WALKER('normal'),
    injuries: [['ból karku', 'ból karku i barku po szarpnięciu pasa bezpieczeństwa']],
    extraInjuries: ['otarcie przedramienia prawego', 'otarcia dłoni'],
    remarks: [
      'Trzyma się za kark: „Nic nie widział{em|am}, nagle uderzenie…"',
      { t: 'Siedzi na barierze, masuje kark i patrzy na rozbite auta.', poses: ['sitting'] },
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-uraz-akustyczny',
    category: 'green',
    criterion: 'chodzi',
    source: ['t02'],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch'],
    vitals: WALKER(),
    injuries: [[
      'krwawienie z ucha prawego — podejrzenie pęknięcia błony bębenkowej',
      'szum w uszach, krwawienie z ucha lewego',
    ]],
    extraInjuries: ['drobne rany cięte grzbietu dłoni', 'drobne rany cięte policzka od szkła'],
    remarks: ['Mówi bardzo głośno, trzyma się za ucho: „Co?! Nic nie słyszę! Piszczy mi w uszach!"'],
    poses: UPRIGHT,
  },
  {
    id: 'g-oparzenia-I',
    category: 'green',
    criterion: 'chodzi (dystraktor: osmalona twarz)',
    source: ['t03'],
    ages: ADULTLIKE,
    mechanisms: ['wybuch', 'oparzenie'],
    vitals: WALKER(),
    injuries: [['oparzenia I stopnia grzbietów dłoni', 'oparzenie I stopnia przedramienia prawego']],
    extraInjuries: ['osmalone brwi i grzywka, twarz pokryta sadzą', 'osmalone ubranie'],
    remarks: ['Kaszle: „Huknęło i buchnął ogień… Ręce mnie pieką."'],
    poses: UPRIGHT,
  },
  {
    id: 'g-hiperwentylacja',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi (mimo oddechów > 30/min — krok „chodzi" rozstrzyga)',
    source: ['c01'],
    ages: ['teen', 'adult'],
    mechanisms: ['tlum', 'wybuch', 'komunikacyjny'],
    vitals: { ...WALKER([32, 40]), crt: [1, 1.5] },
    injuries: [['mrowienie dłoni i okolicy ust']],
    extraInjuries: ['drobne otarcia przedramion', 'otarcie kolana prawego'],
    remarks: [
      'Oddycha szybko i płytko, trzęsie się: „Nie mogę… oddychać… zaraz umrę!"',
      'Drży, oddycha bardzo szybko: „Serce mi wali… zaraz zemdleję!"',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-skrecenie',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['c02'],
    ages: ['teen', 'adult'],
    mechanisms: ['tlum', 'upadek', 'komunikacyjny', 'kolejowy'],
    vitals: WALKER(),
    injuries: [[
      'obrzęk i bolesność stawu skokowego lewego — podejrzenie skręcenia',
      'obrzęk i bolesność kolana prawego',
    ]],
    remarks: [
      { t: 'Rozmasowuje kostkę: „Ktoś mi wskoczył na nogę… Dojdę sam{|a}, kuśtykając."', mech: ['tlum'], poses: ['sitting'] },
      '„Skręcił{em|am} nogę, ale dam radę iść."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-nos',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['c04'],
    ages: ['teen', 'adult'],
    mechanisms: ['tlum', 'komunikacyjny', 'upadek', 'kolejowy'],
    vitals: WALKER(),
    injuries: [['krwawienie z nosa (niewielkie)']],
    extraInjuries: ['otarcie policzka lewego', 'zasinienie wokół oka'],
    remarks: [
      { t: 'Przyciska chusteczkę do nosa: „Dostał{em|am} łokciem. Pomóżcie tamtym przy barierkach!"', mech: ['tlum'] },
      { t: '„Uderzył{em|am} twarzą w fotel przed sobą."', mech: ['komunikacyjny', 'kolejowy'] },
      '„To tylko nos. Zajmijcie się innymi."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-stluczenia',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['f02', 'p02'],
    ages: ['adult', 'elderly'],
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [['stłuczenie biodra prawego', 'stłuczenie kolana lewego', 'otarcie przedramienia lewego']],
    extraInjuries: ['otarcia dłoni', 'zasinienie uda'],
    remarks: [
      '„Ja mogę iść. Proszę zajrzeć do tamtych ludzi!"',
      '„Gdzie są dzieci? Ratujcie najpierw dzieci!"',
      '„Gdzie mam iść? Mogę jakoś pomóc?"',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-dziecko-krzyczy',
    category: 'green',
    criterion: 'chodzi (dystraktor: głośny płacz)',
    source: ['p01', 'f01', 'c05', 't01'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [['otarcia obu dłoni', 'otarcia obu kolan', 'otarcie kolana prawego', 'otarcie łokcia lewego']],
    extraInjuries: [
      'zabrudzone, zapłakane policzki',
      { t: 'drzazga w dłoni prawej', mech: ['upadek', 'zmiazdzenie'] },
      { t: 'drobne rany cięte policzka od szkła', mech: ['komunikacyjny', 'wybuch', 'kolejowy'] },
      { t: 'twarz i włosy pokryte pyłem', mech: ['wybuch'] },
    ],
    remarks: [
      'Krzyczy i płacze: „Mamo! Boli! Chcę do mamy!"',
      'Zanosi się płaczem: „Gdzie jest tata?! Tata!"',
      { t: 'Płacze i ciągnie za rękaw: „Mój kolega tam leży i się nie rusza!"', poses: ['standing'] },
      { t: 'Płacze: „Moja siostra została w domu! Ona jest mała!"', mech: ['wybuch'] },
      { t: 'Biega w kółko i krzyczy: „Pomocy! Pomocy!"', poses: ['standing'] },
      'Woła piskliwie: „Tam ktoś krwawi! Pomóżcie!"',
    ],
    poses: UPRIGHT,
    weight: 2,
  },
  {
    id: 'g-dziecko-reka',
    category: 'green',
    criterion: 'chodzi',
    source: ['p01', 't01'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [['bolesność i obrzęk przedramienia lewego', 'bolesność nadgarstka prawego', 'guz na czole', 'krwawienie z nosa (niewielkie)']],
    extraInjuries: ['otarcia dłoni'],
    remarks: [
      'Trzyma się za rękę i pochlipuje: „Boli mnie…"',
      { t: 'Siedzi cicho i rozgląda się za rodzicami.', poses: ['sitting'] },
      'Pokazuje rękę: „Upadł{em|am} i coś chrupnęło…"',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-dziecko-ciche',
    category: 'green',
    criterion: 'chodzi (dziecko ciche, przestraszone — nie mylić z zaburzeniami świadomości)',
    source: ['p01'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: WALKER(),
    injuries: [['drobne otarcia przedramion', 'guz na czole', 'otarcie policzka', 'zasinienie uda']],
    extraInjuries: ['podarte, zabrudzone ubranie'],
    remarks: [
      { t: 'Stoi bez słowa, kurczowo trzyma plecak. Na pytania kiwa głową.', poses: ['standing'] },
      { t: 'Siedzi skulon{y|a} i cicho płacze.', poses: ['sitting'] },
      '„Chcę do domu… Gdzie jest mama?"',
      'Drży, ale odpowiada na pytania: „Nic mnie nie boli… tylko się boję."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'g-niemowle',
    category: 'green',
    criterion: 'JumpSTART, niemowlę: parametry prawidłowe, bez istotnych obrażeń zewnętrznych',
    source: ['a03'],
    ages: ['infant'],
    mechanisms: ALL,
    vitals: {
      walk: false, breathing: 'spontaneous', rate: 'normal', pulse: true, crt: [1, 2], avpu: 'A', obeys: false, infantInjury: false,
    },
    // Romig's criteria: only no injury at all keeps it GREEN unambiguously.
    injuries: [['bez widocznych obrażeń']],
    remarks: [
      'Głośno płacze, żywo rusza wszystkimi kończynami.',
      { t: 'Leży w foteliku samochodowym wyjętym z auta. Głośno płacze, żywo rusza kończynami.', mech: ['komunikacyjny'] },
      'Leży na kocu podłożonym przez świadka. Płacze, wodzi wzrokiem.',
    ],
    poses: ['back'],
    unique: true,
  },

  // ═════════════════════════ ŻÓŁCI ═════════════════════════
  {
    id: 'y-podudzie',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; oddech, perfuzja i stan świadomości prawidłowe',
    source: ['p04', 'c06', 'f04'],
    ages: ['child', 'teen', 'adult', 'elderly'],
    mechanisms: ['komunikacyjny', 'upadek', 'tlum', 'zmiazdzenie', 'wybuch', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'zniekształcenie podudzia prawego — podejrzenie złamania',
      'zniekształcenie podudzia lewego — podejrzenie złamania',
      { t: 'zniekształcenie podudzia po stratowaniu — podejrzenie złamania', mech: ['tlum'] },
    ]],
    extraInjuries: ['otarcia twarzy', 'otarcia łokci', 'otarcia dłoni'],
    remarks: [
      '„Nie mogę stanąć na nogę… Boli strasznie."',
      'Zaciska zęby: „Noga… nie mogę nią ruszyć."',
      { t: '„Tłum przeszedł po mnie… Nie dam rady wstać."', mech: ['tlum'], ages: ['teen', 'adult'] },
      { t: 'Płacze cicho: „Noga mnie boli, nie mogę wstać."', ages: ['child'] },
      'Jęczy i trzyma się za nogę.',
      '„Proszę mi pomóc wstać… Nie, nie dam rady!"',
    ],
    poses: ['back', 'sitting'],
    weight: 0.7,
  },
  {
    id: 'y-udo',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['p05'],
    ages: ['child', 'teen', 'adult'],
    mechanisms: ['komunikacyjny', 'upadek', 'zmiazdzenie', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'bolesność i zniekształcenie uda lewego — podejrzenie złamania kości udowej',
      'bolesność i zniekształcenie uda prawego — podejrzenie złamania kości udowej',
    ]],
    remarks: [
      'Nie pozwala dotknąć nogi: „Nie ruszajcie! Boli!"',
      'Leży i jęczy, trzymając się za udo.',
      { t: 'Płacze cicho: „Noga mnie boli, nie mogę wstać."', ages: ['child'] },
    ],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'y-szyjka-udowa',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['a06'],
    ages: ['elderly'],
    mechanisms: ['komunikacyjny', 'upadek', 'tlum', 'wybuch', 'kolejowy'],
    vitals: STABLE('normal'),
    injuries: [[
      'skrócenie i rotacja zewnętrzna kończyny dolnej lewej — podejrzenie złamania szyjki kości udowej',
      'skrócenie i rotacja zewnętrzna kończyny dolnej prawej — podejrzenie złamania szyjki kości udowej',
    ]],
    remarks: ['„Nie mogę wstać… Biodro mi chyba pękło."'],
    poses: ['back'],
  },
  {
    id: 'y-otwarte-zlamanie',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['a07'],
    ages: ['teen', 'adult'],
    mechanisms: ['komunikacyjny', 'upadek', 'zmiazdzenie', 'wybuch', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'otwarte złamanie podudzia prawego, krwawienie żylne umiarkowane',
      'otwarte złamanie podudzia lewego, krwawienie żylne umiarkowane',
    ]],
    extraInjuries: ['otarcia twarzy'],
    remarks: ['Zaciska zęby: „Noga… widać kość. Ale żyję."'],
    poses: ['back', 'sitting'],
  },
  {
    id: 'y-brzuch-pas',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['a05'],
    ages: ['child', 'teen', 'adult'],
    mechanisms: ['komunikacyjny'],
    vitals: STABLE(),
    injuries: [['otarcie podbrzusza od pasa bezpieczeństwa, bolesność brzucha przy dotyku']],
    remarks: [
      'Leży skulon{y|a}: „Brzuch mnie boli…"',
      { t: 'Leży skulon{y|a}, płacze: „Brzuszek mnie boli… Gdzie mama?"', ages: ['child'] },
    ],
    poses: ['back'],
  },
  {
    id: 'y-zebra',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; oddechy ≤ 30/min, perfuzja i świadomość prawidłowe',
    source: ['c07'],
    ages: ADULTLIKE,
    mechanisms: ['tlum', 'komunikacyjny', 'upadek', 'zmiazdzenie', 'kolejowy'],
    vitals: STABLE([22, 28]),
    injuries: [[
      'bolesność uciskowa żeber po lewej — podejrzenie złamania żeber',
      'bolesność uciskowa żeber po prawej — podejrzenie złamania żeber',
    ]],
    extraInjuries: ['płytki oddech z powodu bólu', 'zasinienie klatki piersiowej'],
    remarks: ['Trzyma się za żebra: „Boli przy każdym wdechu…"', '„Uderzył{em|am} żebrami… Boli, jak kaszlę."'],
    poses: ['back', 'sitting'],
  },
  {
    id: 'y-ciaza',
    pregnancy: 'only',
    category: 'yellow',
    criterion: 'ciąża nie zmienia algorytmu (START); nie chodzi, parametry prawidłowe',
    source: ['t05'],
    ages: ['adult'],
    ageRange: [22, 40],
    sex: 'f',
    labelNoun: 'Kobieta w ciąży',
    mechanisms: ['wybuch', 'upadek', 'komunikacyjny'],
    vitals: STABLE(),
    injuries: [
      ['widoczna ciąża'],
      [
        'obrzęk i zniekształcenie stawu skokowego prawego',
        { t: 'obrzęk i zniekształcenie stawu skokowego prawego po skoku z okna', mech: ['wybuch'] },
        'bolesność i obrzęk kolana lewego',
      ],
    ],
    remarks: ['Obejmuje brzuch: „Dziecko się rusza… Ale nie mogę stanąć na nogę."'],
    poses: ['sitting', 'back'],
    unique: true,
    weight: 0.5,
  },
  {
    id: 'y-zmiazdzenie-konczyny',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['t06'],
    ages: ['teen', 'adult'],
    mechanisms: ['zmiazdzenie', 'wybuch'],
    vitals: STABLE(),
    injuries: [[
      'uraz zmiażdżeniowy podudzia lewego — obrzęk, zasinienie, deformacja',
      'uraz zmiażdżeniowy stopy prawej — obrzęk, zasinienie',
    ]],
    extraInjuries: ['otarcia rąk'],
    remarks: ['„Belka mi przygniotła nogę… ktoś ją zdjął. Nie czuję stopy."'],
    poses: ['back', 'sitting'],
  },
  {
    id: 'y-oparzenia-II',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: ['t07'],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch', 'oparzenie'],
    vitals: STABLE(),
    injuries: [['oparzenia II stopnia obu podudzi z pęcherzami', 'oparzenia II stopnia uda i podudzia prawego z pęcherzami']],
    extraInjuries: ['osmalone ubranie'],
    remarks: ['Leży i jęczy: „Pali… nogi mi płoną… nie dam rady wstać."'],
    poses: ['back'],
  },
  {
    id: 'y-kregoslup',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['upadek', 'zmiazdzenie', 'komunikacyjny', 'tlum', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'ból odcinka lędźwiowego kręgosłupa, drętwienie nóg',
      { t: 'silny ból pleców po upadku z wysokości', mech: ['upadek'] },
    ]],
    remarks: ['Leży nieruchomo: „Nie czuję dobrze nóg… boję się ruszyć."'],
    poses: ['back'],
    weight: 0.6,
  },
  {
    // Teaching case: AVPU "V" yet obeys commands — START asks about commands, not AVPU, so YELLOW.
    id: 'y-glowa-V',
    category: 'yellow',
    criterion: 'START: senny (AVPU „V"), ale wykonuje proste polecenia; parametry prawidłowe',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['upadek', 'zmiazdzenie', 'komunikacyjny', 'wybuch', 'tlum', 'kolejowy'],
    vitals: { ...STABLE(), avpu: 'V' },
    injuries: [['guz okolicy czołowej', 'krwiak okolicy potylicznej', 'rana tłuczona skóry głowy, niewielkie krwawienie']],
    extraInjuries: ['otarcia twarzy'],
    remarks: ['Leży z zamkniętymi oczami, cicho pojękuje.'],
    poses: ['back'],
    weight: 0.5,
  },
  {
    id: 'y-dziecko-stopa',
    category: 'yellow',
    criterion: 'JumpSTART: nie chodzi; parametry prawidłowe',
    source: ['c08'],
    ages: ['child'],
    mechanisms: ['tlum', 'upadek', 'zmiazdzenie'],
    vitals: STABLE(),
    injuries: [[
      { t: 'obrzęk i zniekształcenie stopy prawej po przydeptaniu', mech: ['tlum'] },
      'obrzęk i zniekształcenie stawu skokowego lewego',
      'obrzęk i zniekształcenie podudzia prawego, nie może się podnieść',
    ]],
    extraInjuries: ['otarcia dłoni'],
    remarks: ['Płacze cicho: „Nie mogę chodzić…"'],
    poses: ['sitting', 'back'],
  },
  {
    id: 'y-dziecko-glowa-V',
    category: 'yellow',
    criterion: 'JumpSTART: AVPU „V" (adekwatne) przy prawidłowym oddechu i tętnie',
    source: [],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: 'normal', pulse: true, crt: [1, 2], avpu: 'V', obeys: false },
    injuries: [['guz okolicy czołowej', 'krwiak okolicy potylicznej']],
    extraInjuries: ['otarcia twarzy'],
    remarks: ['Senn{y|a}, otwiera oczy na głos, ale nie odpowiada na pytania.'],
    poses: ['back'],
    weight: 0.5,
  },
  {
    id: 'y-niemowle',
    category: 'yellow',
    criterion: 'JumpSTART, niemowlę: parametry prawidłowe, ale istotne obrażenia zewnętrzne',
    source: ['f03'],
    ages: ['infant'],
    mechanisms: ALL,
    vitals: {
      walk: false, breathing: 'spontaneous', rate: 'normal', pulse: true, crt: [1, 2], avpu: 'A', obeys: false, infantInjury: true,
    },
    injuries: [[
      // Only signs from Romig's "significant external injury" list.
      'rana płatowata owłosionej skóry głowy, obficie krwawiąca',
      'mnogie zasinienia tułowia i kończyn',
      'wzdęty, tkliwy brzuch, zasinienie powłok brzusznych',
    ]],
    extraInjuries: ['otarcia twarzy'],
    remarks: [
      'Głośno płacze, wodzi wzrokiem.',
      { t: 'Wyjęte z fotelika przez świadków. Głośno płacze.', mech: ['komunikacyjny'] },
      { t: 'Wózek przewrócony i przysypany. Niemowlę głośno płacze, wodzi wzrokiem.', mech: ['upadek', 'zmiazdzenie', 'wybuch'] },
    ],
    poses: ['back'],
    unique: true,
  },

  {
    id: 'y-kostka',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'upadek', 'tlum', 'zmiazdzenie', 'wybuch', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'zniekształcenie stawu skokowego prawego, stopa ustawiona pod kątem — podejrzenie złamania z przemieszczeniem',
      'zniekształcenie stawu skokowego lewego, stopa ustawiona pod kątem — podejrzenie złamania z przemieszczeniem',
      { t: 'stopa lewa wykręcona do wewnątrz po przydeptaniu, silny obrzęk kostki', mech: ['tlum'] },
      { t: 'stopa prawa zakleszczona pod pedałami — obrzęk i zniekształcenie kostki', mech: ['komunikacyjny'], notPregnant: true },
    ]],
    remarks: [
      '„Kostka… chrupnęło coś. Nie stanę na tę nogę."',
      { t: 'Siedzi i trzyma się za stopę: „Nawet nie mogę nią ruszyć."', poses: ['sitting'] },
      'Trzyma się za nogę: „Nawet nie mogę ruszyć stopą."',
    ],
    poses: ['sitting', 'back'],
  },
  {
    id: 'y-kolano',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['teen', 'adult', 'elderly'],
    mechanisms: ['komunikacyjny', 'upadek', 'tlum', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'kolano prawe obrzęknięte, zniekształcone, zablokowane w zgięciu — podejrzenie zwichnięcia',
      'kolano lewe obrzęknięte, rzepka przemieszczona na zewnątrz',
      { t: 'rana tłuczona kolana od deski rozdzielczej, obrzęk, nie może stanąć na nogę — podejrzenie złamania rzepki', mech: ['komunikacyjny'] },
    ]],
    remarks: ['Nie pozwala wyprostować nogi: „Nie ruszajcie kolana!"', 'Syczy z bólu przy każdym ruchu nogą.'],
    poses: ['back', 'sitting'],
  },
  {
    id: 'y-biodro-zwichniete',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['komunikacyjny', 'kolejowy', 'upadek'],
    vitals: STABLE(),
    injuries: [[
      'kończyna dolna prawa skrócona, przywiedziona i zrotowana do wewnątrz — podejrzenie zwichnięcia stawu biodrowego',
      'kończyna dolna lewa skrócona, przywiedziona i zrotowana do wewnątrz — podejrzenie zwichnięcia stawu biodrowego',
    ]],
    extraInjuries: [{ t: 'rana tłuczona kolana od deski rozdzielczej', mech: ['komunikacyjny'] }, 'otarcia łokci'],
    remarks: ['Leży nieruchomo: „Biodro… jakby wyskoczyło. Nie ruszajcie mnie!"'],
    poses: ['back'],
    weight: 0.6,
  },
  {
    id: 'y-piety',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['upadek', 'wybuch', 'zmiazdzenie'],
    vitals: STABLE(),
    injuries: [
      ['obrzęk i zasinienie obu pięt — podejrzenie złamania kości piętowych', 'silny ból i obrzęk pięty prawej, nie może stanąć na stopie'],
      ['ból odcinka lędźwiowego kręgosłupa przy ruchu', 'bolesność kręgosłupa lędźwiowego'],
    ],
    remarks: [
      { t: '„Skoczył{em|am} z okna, jak zaczęło się walić… Nogi mnie nie trzymają."', mech: ['wybuch', 'zmiazdzenie'] },
      { t: '„Spadł{em|am} z wysokości prosto na nogi…"', mech: ['upadek'] },
    ],
    poses: ['back', 'sitting'],
    weight: 0.7,
  },
  {
    id: 'y-odlamek-uda',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['teen', 'adult', 'elderly'],
    mechanisms: ['wybuch', 'kolejowy', 'komunikacyjny'],
    vitals: STABLE(),
    injuries: [[
      'kawałek szkła wbity w udo prawe, niewielkie krwawienie wokół — nie usuwać',
      'metalowy odłamek wbity w łydkę lewą, krwawienie sączące',
      'pręt wbity w pośladek, niewielkie krwawienie — nie usuwać',
    ]],
    extraInjuries: ['drobne rany cięte przedramion od szkła', 'otarcia twarzy'],
    remarks: ['Patrzy na ranę z przerażeniem: „Wyciągnijcie to ze mnie!"', '„Nie mogę wstać… coś we mnie tkwi."'],
    poses: ['back', 'sitting', 'front'],
  },
  {
    id: 'y-rana-brzucha',
    category: 'yellow',
    criterion: 'nie chodzi; oddech, perfuzja i stan świadomości prawidłowe',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch', 'kolejowy', 'komunikacyjny', 'zmiazdzenie'],
    vitals: STABLE(),
    injuries: [[
      'rana brzucha od odłamka, niewielkie krwawienie, brzuch miękki',
      'rana cięta boku po prawej od blachy, sączące krwawienie, brzuch miękki',
    ]],
    remarks: ['Uciska ranę dłonią: „Boli przy każdym ruchu… boję się wstać."'],
    poses: ['back', 'sitting'],
    weight: 0.7,
  },
  {
    id: 'y-oparzenia-stop',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['teen', 'adult', 'elderly'],
    mechanisms: ['oparzenie', 'wybuch'],
    vitals: STABLE(),
    injuries: [[
      'oparzenia II stopnia obu stóp z pęcherzami — buty stopione',
      'oparzenia II stopnia podudzia lewego i stopy, nadpalone nogawki',
      'oparzenia II stopnia obu podudzi od rozlanego wrzątku',
    ]],
    extraInjuries: ['osmalone brwi i włosy', 'oparzenia I stopnia dłoni'],
    remarks: ['„Podłoga się paliła… nie mogę stanąć, nogi pieką!"', 'Polewa nogi wodą z butelki, jęczy z bólu.'],
    poses: ['sitting', 'back'],
    weight: 0.8,
  },
  {
    id: 'y-wstrzasnienie',
    pregnancy: 'ok',
    category: 'yellow',
    criterion: 'nie chodzi; oddech, perfuzja i stan świadomości prawidłowe',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: STABLE(),
    injuries: [
      ['guz okolicy ciemieniowej', 'rana tłuczona łuku brwiowego'],
      ['wymioty, silne zawroty głowy przy próbie wstania', 'nudności, zawroty głowy — pada przy próbie wstania'],
    ],
    remarks: [
      '„Wszystko mi wiruje… nie dam rady wstać."',
      'Pyta kilka razy: „Co się stało?" — nie pamięta zdarzenia.',
    ],
    poses: ['back', 'sitting'],
    weight: 0.8,
  },
  {
    id: 'y-dziecko-oparzenie',
    category: 'yellow',
    criterion: 'JumpSTART: nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['child'],
    mechanisms: ['oparzenie', 'wybuch'],
    vitals: STABLE(),
    injuries: [['oparzenia II stopnia obu podudzi z pęcherzami', 'oparzenie II stopnia stopy prawej z pęcherzami']],
    remarks: ['Płacze: „Piecze! Nie mogę iść!"'],
    poses: ['sitting', 'back'],
    weight: 0.7,
  },
  {
    id: 'y-dziecko-noga',
    category: 'yellow',
    criterion: 'JumpSTART: nie chodzi; parametry prawidłowe',
    source: [],
    ages: ['child'],
    mechanisms: ['komunikacyjny', 'upadek', 'tlum', 'zmiazdzenie', 'kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'obrzęk i bolesność kolana lewego, nie zgina nogi',
      'bolesność i obrzęk biodra prawego, nie porusza nogą',
      'rana tłuczona podudzia z niewielkim krwawieniem, nie staje na nogę',
    ]],
    remarks: ['Wtula się w opiekuna, płacze: „Boli! Nie stanę!"', 'Cicho popłakuje, nie chce ruszać nogą.'],
    poses: ['sitting', 'back'],
  },

  // ═════════════════════════ CZERWONI — START ═════════════════════════
  {
    id: 'r-tachypnoe',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: oddechy > 30/min',
    source: ['p06', 'a08'],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'tlum', 'upadek', 'zmiazdzenie', 'kolejowy'],
    vitals: { ...STABLE([32, 40]), crt: [1.5, 2] },
    injuries: [[
      { t: 'otarcie klatki piersiowej od pasa bezpieczeństwa', mech: ['komunikacyjny'] },
      { t: 'ślad od kierownicy na klatce piersiowej', mech: ['komunikacyjny'], notPregnant: true },
      { t: 'ślad ucisku barierki na klatce piersiowej', mech: ['tlum'] },
      'trzeszczenia przy ucisku żeber po lewej',
      'zasinienie klatki piersiowej po prawej',
    ]],
    extraInjuries: ['ból przy oddychaniu po prawej stronie', 'asymetryczne ruchy klatki piersiowej'],
    remarks: [
      'Mówi krótkimi zdaniami: „Nie mogę… złapać… powietrza."',
      'Oddycha szybko i płytko: „Boli… przy każdym… wdechu."',
    ],
    poses: ['sitting', 'back'],
  },
  {
    id: 'r-asfiksja-urazowa',
    category: 'red',
    criterion: 'START: oddechy > 30/min',
    source: ['c09'],
    ages: ['teen', 'adult'],
    mechanisms: ['tlum', 'zmiazdzenie', 'kolejowy'],
    vitals: { ...STABLE([32, 40]), crt: [1.5, 2] },
    injuries: [
      ['sinoniebieskie zabarwienie twarzy i szyi z licznymi wybroczynami'],
      ['wylewy podspojówkowe obustronnie'],
    ],
    extraInjuries: [{ t: 'ślad ucisku barierki na klatce piersiowej', mech: ['tlum'] }, 'ślad ucisku na klatce piersiowej'],
    remarks: ['Mówi pojedynczymi słowami: „Ścisnęło… mnie… nie mogę…"'],
    poses: ['back', 'sitting'],
  },
  {
    id: 'r-wiotka-klatka',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: oddechy > 30/min',
    source: ['c13'],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'tlum', 'zmiazdzenie', 'upadek', 'kolejowy'],
    vitals: { ...STABLE([34, 42]), crt: [1.5, 2] },
    injuries: [[
      'paradoksalny ruch fragmentu klatki piersiowej po prawej — podejrzenie wiotkiej klatki piersiowej',
      'paradoksalny ruch fragmentu klatki piersiowej po lewej — podejrzenie wiotkiej klatki piersiowej',
    ]],
    extraInjuries: ['wybroczyny na twarzy i szyi', 'otarcia klatki piersiowej'],
    remarks: ['Łapie powietrze: „Duszę… się…"'],
    poses: ['sitting', 'back'],
  },
  {
    id: 'r-pyl-dym',
    category: 'red',
    criterion: 'START: oddechy > 30/min',
    source: ['t12'],
    ages: ADULTLIKE,
    mechanisms: ['wybuch', 'oparzenie'],
    vitals: { ...STABLE([32, 40]), crt: [1.5, 2] },
    injuries: [
      [
        { t: 'duszność, kaszel z odkrztuszaniem pyłu', mech: ['wybuch'] },
        { t: 'chrypka, osmalone włoski w nosie, kaszel z sadzą', mech: ['wybuch', 'oparzenie'] },
      ],
      ['pozycja ortopnoiczna, sinica warg'],
    ],
    remarks: ['Siedzi wspart{y|a} na rękach, mówi pojedynczymi słowami: „Kurz… nie mogę… tchu."'],
    poses: ['sitting'],
  },
  {
    id: 'r-krwotok',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: brak tętna promieniowego / CRT > 2 s (masywny krwotok)',
    source: ['a09', 't11', 'c12'],
    ages: ['teen', 'adult'],
    mechanisms: ['komunikacyjny', 'wybuch', 'tlum', 'zmiazdzenie', 'upadek', 'kolejowy'],
    majorBleeding: true,
    vitals: { walk: false, breathing: 'spontaneous', rate: [22, 30], pulse: false, crt: [3, 5], avpu: 'A', obeys: true },
    injuries: [
      [
        'rana szarpana uda prawego z obfitym, pulsującym krwawieniem — kałuża krwi',
        'rana szarpana uda lewego z obfitym, pulsującym krwawieniem — kałuża krwi',
        { t: 'głęboka rana cięta uda od szyby wystawowej, obfite pulsujące krwawienie', mech: ['wybuch'] },
        { t: 'rana szarpana uda od krawędzi barierki z obfitym, pulsującym krwawieniem', mech: ['tlum'] },
        'głęboka rana ramienia prawego z tryskającym krwawieniem — kałuża krwi',
        'rana szarpana podudzia lewego z obfitym krwawieniem — przesiąknięta nogawka',
        { t: 'rana cięta przedramienia od szkła, krew tryska strumieniem', mech: ['wybuch', 'komunikacyjny', 'kolejowy'] },
        { t: 'rana dołu podkolanowego od blachy, obfite pulsujące krwawienie', mech: ['komunikacyjny', 'kolejowy', 'zmiazdzenie'] },
      ],
      ['skóra blada, zimna, spocona'],
    ],
    remarks: [
      'Blad{y|a}, niespokojn{y|a}, mówi słabym głosem: „Zimno mi… kręci mi się w głowie."',
      'Mówi słabo: „Dużo krwi… słabo mi."',
    ],
    poses: ['back'],
  },
  {
    id: 'r-krwotok-V',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: brak tętna promieniowego / CRT > 2 s (masywny krwotok)',
    source: ['p07'],
    ages: ['teen', 'adult', 'elderly'],
    mechanisms: ['komunikacyjny', 'wybuch', 'zmiazdzenie', 'kolejowy'],
    majorBleeding: true,
    vitals: { walk: false, breathing: 'spontaneous', rate: [24, 30], pulse: false, crt: [3.5, 5], avpu: 'V', obeys: false },
    injuries: [
      [
        'rana szarpana uda prawego z obfitym, pulsującym krwawieniem',
        'rana szarpana ramienia lewego z obfitym, pulsującym krwawieniem',
        'głęboka rana podudzia prawego, krew wypływa strumieniem',
      ],
      ['skóra blada, zimna, spocona'],
    ],
    remarks: ['Otwiera oczy na głos, mamrocze niezrozumiale.'],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'r-miednica',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: wstrząs — brak tętna promieniowego, CRT > 2 s',
    source: ['a12'],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'zmiazdzenie', 'upadek', 'kolejowy'],
    vitals: { walk: false, breathing: 'spontaneous', rate: [20, 28], pulse: false, crt: [2.5, 4], avpu: 'A', obeys: true },
    injuries: [['silny ból miednicy, niestabilność przy delikatnym ucisku'], ['skóra blada, chłodna']],
    remarks: ['Jęczy: „Wszystko mnie boli na dole… nie mogę się ruszyć."'],
    poses: ['back'],
  },
  {
    id: 'r-oparzenia-rozlegle',
    category: 'red',
    // Wstrząs oparzeniowy narasta godzinami — wczesny zły nawrót kapilarny tłumaczy uraz towarzyszący (krwawienie wewnętrzne).
    criterion: 'START: CRT > 2 s (oparzenia + krwawienie wewnętrzne)',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch', 'oparzenie'],
    vitals: { walk: false, breathing: 'spontaneous', rate: [22, 30], pulse: false, crt: [3, 4], avpu: 'A', obeys: true },
    injuries: [
      ['rozległe oparzenia II i III stopnia tułowia i ramion', 'oparzenia II–III stopnia obu kończyn dolnych i brzucha'],
      ['twardy, bolesny brzuch po uderzeniu odłamkiem; skóra poza oparzeniami blada, chłodna'],
    ],
    remarks: ['Drży, jęczy: „Pić… zimno mi…"'],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'r-glowa-V',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: nie wykonuje prostych poleceń',
    source: ['a10'],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: [12, 22], pulse: true, crt: [1.5, 2], avpu: 'V', obeys: false },
    injuries: [
      ['rana tłuczona okolicy skroniowej lewej', 'rozległy krwiak okolicy ciemieniowej', 'rana tłuczona czoła'],
      ['krwiak okularowy', 'krwawienie z nosa'],
    ],
    remarks: [
      'Otwiera oczy na głos, mamrocze bez sensu, nie wykonuje poleceń.',
      'Na głos otwiera oczy, ale odpowiada nielogicznie.',
    ],
    poses: ['back'],
  },
  {
    id: 'r-alkohol-glowa',
    category: 'red',
    criterion: 'START: nie wykonuje prostych poleceń',
    source: ['c11'],
    ages: ['adult'],
    mechanisms: ['tlum'],
    vitals: { walk: false, breathing: 'spontaneous', rate: [12, 18], pulse: true, crt: [1.5, 2], avpu: 'V', obeys: false },
    injuries: [['silna woń alkoholu'], ['guz okolicy potylicznej']],
    extraInjuries: ['zabrudzenie wymiocinami'],
    remarks: ['Na głos otwiera oczy i bełkocze: „Zostaw… mnie…", po czym zamyka oczy.'],
    poses: ['front', 'back'],
  },
  {
    id: 'r-glowa-P',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: nie wykonuje prostych poleceń',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: {
      walk: false, breathing: 'spontaneous', rate: [12, 22], pulse: true, crt: [1.5, 2], avpu: 'P', obeys: false, painAppropriate: false,
    },
    injuries: [['rozległy krwiak okolicy ciemieniowej', 'rana tłuczona potylicy'], ['nierówne źrenice', 'krwawienie z ucha']],
    remarks: ['Nie reaguje na głos.'],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'r-bezdech-udroznienie',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: bezdech, oddycha po udrożnieniu dróg oddechowych',
    source: ['p08', 'a11', 'c10'],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'airway', rate: [6, 12], pulse: true, crt: [2, 3], avpu: 'U', obeys: false },
    injuries: [
      ['krwiak czoła', 'rana tłuczona czoła', 'krwiak okolicy oczodołu lewego', { t: 'sinica twarzy, wybroczyny na szyi', mech: ['tlum', 'zmiazdzenie'] }],
      ['zapadnięta żuchwa, sinica warg'],
    ],
    remarks: [
      'Leży na plecach, nieruchomo. Bez reakcji.',
      { t: 'Wyrzucon{y|a} przez przednią szybę. Bez reakcji.', mech: ['komunikacyjny'] },
      { t: 'Leży nieruchomo przy barierce, ktoś krzyczy: „On{|a} nie oddycha!"', mech: ['tlum'] },
    ],
    poses: ['back'],
  },

  {
    id: 'r-odma',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: oddechy > 30/min (odma prężna)',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'upadek', 'zmiazdzenie', 'wybuch', 'kolejowy', 'tlum'],
    vitals: { ...STABLE([32, 42]), crt: [1.5, 2] },
    injuries: [
      [
        'asymetria ruchów — prawa połowa klatki piersiowej słabo unosi się przy wdechu',
        'asymetria ruchów — lewa połowa klatki piersiowej słabo unosi się przy wdechu',
      ],
      ['poszerzone żyły szyjne, narastająca duszność', 'trzeszczenie pod skórą szyi i klatki piersiowej przy ucisku (odma podskórna)'],
    ],
    remarks: [
      { t: 'Siedzi pochylon{y|a} do przodu: „Coraz… gorzej… się… oddycha."', poses: ['sitting'] },
      'Łapie powietrze ustami: „Coraz… gorzej… się… oddycha."',
    ],
    poses: ['sitting', 'back'],
  },
  {
    id: 'r-rana-ssaca',
    category: 'red',
    criterion: 'START: oddechy > 30/min (rana penetrująca klatki piersiowej)',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch', 'kolejowy', 'komunikacyjny', 'zmiazdzenie'],
    vitals: { ...STABLE([32, 40]), crt: [1.5, 2] },
    injuries: [[
      'rana klatki piersiowej po prawej od odłamka — przy wdechu słychać zasysanie powietrza, pieni się krew',
      'rana drążąca klatki piersiowej po lewej od odłamka — przy wdechu bulgocze krwisty płyn',
    ]],
    extraInjuries: ['drobne rany cięte twarzy od szkła', 'otarcia rąk'],
    remarks: ['Przyciska dłoń do klatki piersiowej: „Coś… mnie… dźgnęło…"'],
    poses: ['sitting', 'back'],
    weight: 0.7,
  },
  {
    id: 'r-oparzenie-drog-oddechowych',
    category: 'red',
    criterion: 'START: oddechy > 30/min (oparzenie dróg oddechowych)',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['oparzenie', 'wybuch'],
    vitals: { ...STABLE([32, 40]), crt: [1.5, 2] },
    injuries: [
      ['oparzenia twarzy i szyi, osmalone brwi i rzęsy', 'oparzenia twarzy, obrzęk warg, sadza w ustach'],
      ['chrypka, świst przy wdechu', 'kaszel z czarną plwociną, świst przy wdechu'],
    ],
    remarks: ['Mówi ochryple, urywanie: „Gardło… pali… nie mogę… oddychać."'],
    poses: ['sitting'],
    weight: 0.7,
  },
  {
    id: 'r-sledziona',
    category: 'red',
    criterion: 'START: wstrząs — brak tętna promieniowego, CRT > 2 s (krwawienie wewnętrzne)',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'kolejowy', 'upadek', 'tlum', 'zmiazdzenie'],
    vitals: { walk: false, breathing: 'spontaneous', rate: [22, 30], pulse: false, crt: [3, 4.5], avpu: 'A', obeys: true },
    injuries: [
      [
        'brzuch twardy, napięty, bolesny w lewym podżebrzu — podejrzenie pęknięcia śledziony',
        'brzuch wzdęty, twardy, rozlany ból — podejrzenie krwawienia do jamy brzusznej',
        { t: 'pręga od pasa bezpieczeństwa w poprzek brzucha, brzuch twardy i bolesny', mech: ['komunikacyjny'] },
      ],
      ['skóra blada, zimna, spocona', 'niepokój, wzmożone pragnienie, skóra blada'],
    ],
    remarks: ['Prosi słabym głosem: „Pić… Brzuch boli coraz bardziej."', 'Jęczy i podkurcza nogi: „Nie dotykajcie brzucha…"'],
    poses: ['back'],
  },
  {
    id: 'r-amputacja',
    category: 'red',
    criterion: 'START: brak tętna promieniowego / CRT > 2 s (amputacja urazowa z krwotokiem)',
    source: [],
    ages: ['teen', 'adult'],
    mechanisms: ['wybuch', 'kolejowy', 'zmiazdzenie', 'komunikacyjny'],
    majorBleeding: true,
    vitals: { walk: false, breathing: 'spontaneous', rate: [22, 30], pulse: false, crt: [3, 5], avpu: 'A', obeys: true },
    injuries: [
      [
        'amputacja urazowa stopy prawej, obfite krwawienie z kikuta',
        'amputacja urazowa podudzia lewego poniżej kolana, obfite krwawienie',
        'częściowa amputacja przedramienia prawego, tryskające krwawienie',
      ],
      ['skóra blada, zimna, spocona'],
    ],
    remarks: ['Patrzy na kikut w szoku, szepcze: „Gdzie… gdzie to jest…"', 'Blad{y|a}, drży: „Zimno… dużo krwi…"'],
    poses: ['back'],
    weight: 0.6,
  },
  {
    id: 'r-splatany',
    pregnancy: 'ok',
    category: 'red',
    criterion: 'START: nie wykonuje prostych poleceń (przytomny, splątany)',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: [14, 24], pulse: true, crt: [1.5, 2], avpu: 'A', obeys: false },
    injuries: [
      ['krwiak okolicy skroniowej prawej', 'rana tłuczona potylicy', 'krwiak za uchem lewym'],
      ['pobudzenie, próbuje wstać i się przewraca', 'wg świadków chwilę po urazie miał{|a} drgawki'],
    ],
    remarks: [
      'Pyta w kółko: „Gdzie ja jestem? Co tu się dzieje?"',
      'Odpycha ratownika, nie rozumie sytuacji: „Muszę iść do pracy, puśćcie mnie!"',
    ],
    poses: ['back', 'sitting'],
    weight: 0.8,
  },

  // ═════════════════════════ CZERWONI — JumpSTART ═════════════════════════
  {
    id: 'rc-bradypnoe',
    category: 'red',
    criterion: 'JumpSTART: oddechy < 15/min',
    source: ['p09', 'f06'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: [8, 13], pulse: true, crt: [1.5, 2], avpu: 'V', obeys: false },
    injuries: [
      ['krwiak okolicy skroniowej lewej', 'rozległy krwiak okolicy ciemieniowej prawej'],
      ['krwawienie z ucha lewego', 'krwawienie z nosa'],
    ],
    remarks: ['Na głos otwiera oczy, ale nie odpowiada i zaraz je zamyka.', 'Oddycha wolno i płytko, nie odzywa się.'],
    poses: ['back'],
  },
  {
    id: 'rc-tachypnoe',
    category: 'red',
    criterion: 'JumpSTART: oddechy > 45/min',
    source: ['f07', 't09'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { ...STABLE([48, 60]), crt: [1.5, 2] },
    injuries: [
      [
        { t: 'otarcia i zasinienie klatki piersiowej', mech: ['zmiazdzenie', 'upadek', 'tlum', 'komunikacyjny'] },
        { t: 'kaszel, świsty, pył w nosie i ustach', mech: ['wybuch', 'zmiazdzenie'] },
        { t: 'otarcie klatki piersiowej od pasa bezpieczeństwa', mech: ['komunikacyjny'] },
        { t: 'kaszel, chrypka, sadza w nosie i ustach', mech: ['oparzenie'] },
      ],
      ['sinica warg', 'praca dodatkowych mięśni oddechowych'],
    ],
    remarks: ['Szybko, płytko oddycha, szepcze: „Boli… w środku…"', { t: 'Siedzi pochylon{y|a} do przodu, z trudem łapie powietrze: „Nie… mogę…"', poses: ['sitting'] }],
    poses: ['back', 'sitting'],
  },
  {
    id: 'rc-nieregularny',
    category: 'red',
    criterion: 'JumpSTART: oddech nieregularny',
    source: ['f08'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: [18, 30], irregular: true, pulse: true, crt: [1.5, 2], avpu: 'V', obeys: false },
    injuries: [['rana tłuczona potylicy', 'krwiak okolicy skroniowej prawej'], ['otarcia pleców', 'otarcia twarzy']],
    remarks: ['Pojękuje, oddech raz szybki, raz z przerwami.'],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'rc-krwotok',
    category: 'red',
    criterion: 'JumpSTART: brak tętna obwodowego (masywny krwotok)',
    source: ['f09'],
    ages: ['child'],
    mechanisms: ['komunikacyjny', 'wybuch', 'zmiazdzenie', 'upadek', 'tlum', 'kolejowy'],
    majorBleeding: true,
    vitals: { walk: false, breathing: 'spontaneous', rate: [30, 40], pulse: false, crt: [3, 5], avpu: 'A', obeys: true },
    injuries: [
      ['głęboka rana cięta podudzia prawego, obfite krwawienie', 'rana szarpana uda lewego z obfitym, pulsującym krwawieniem'],
      ['skóra blada, zimna, marmurkowa'],
    ],
    remarks: ['Cich{y|a}, apatyczn{y|a}: „Chce mi się pić… zimno mi…"'],
    poses: ['back'],
  },
  {
    id: 'rc-P',
    category: 'red',
    criterion: 'JumpSTART: AVPU „P" z nieadekwatną reakcją',
    source: ['t10', 'f10', 'p09'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: {
      walk: false, breathing: 'spontaneous', rate: [18, 28], pulse: true, crt: [1.5, 2], avpu: 'P', obeys: false, painAppropriate: false,
    },
    injuries: [['rozległy krwiak czoła', 'rozległy krwiak okolicy potylicznej'], ['nierówne źrenice', 'krwawienie z nosa']],
    remarks: ['Nie reaguje na wołanie.', 'Nie płacze, oczy zamknięte.'],
    poses: ['back'],
  },
  {
    id: 'rc-U',
    category: 'red',
    criterion: 'JumpSTART: AVPU „U"',
    source: ['f11'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'spontaneous', rate: [16, 24], pulse: true, crt: [1.5, 2], avpu: 'U', obeys: false },
    injuries: [['krwiak okularowy obustronny', 'rozległy krwiak okolicy skroniowej'], ['wyciek płynu z nosa podbarwiony krwią', 'krwawienie z ucha']],
    remarks: ['Leży bez ruchu, oczy zamknięte.'],
    poses: ['back'],
    weight: 0.7,
  },
  {
    id: 'rc-bezdech-udroznienie',
    category: 'red',
    criterion: 'JumpSTART: bezdech, oddycha po udrożnieniu dróg oddechowych',
    source: ['f12'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'airway', rate: [12, 20], pulse: true, crt: [2, 2], avpu: 'U', obeys: false },
    injuries: [['otarcia twarzy', 'krwiak czoła'], ['sinica warg', 'głowa w przygięciu do klatki piersiowej']],
    remarks: ['Leży bez ruchu, wargi sine.'],
    poses: ['back'],
  },
  {
    id: 'rc-oddechy-ratownicze',
    category: 'red',
    criterion: 'JumpSTART: bezdech z tętnem, oddycha po 5 oddechach ratowniczych',
    source: ['p10', 't08', 'f13'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'rescue', rate: [12, 20], pulse: true, crt: [2, 2.5], avpu: 'U', obeys: false },
    injuries: [
      [
        { t: 'twarz, usta i nos zasypane pyłem', mech: ['wybuch', 'zmiazdzenie'] },
        { t: 'ślad ucisku na szyi i klatce piersiowej', mech: ['zmiazdzenie', 'tlum', 'upadek'] },
        'otarcia twarzy i szyi',
      ],
      ['sinica warg', 'sinica twarzy'],
    ],
    remarks: ['Leży bez ruchu.', 'Leży wiotk{i|a}, świadek krzyczy: „{On|Ona} nie oddycha!"'],
    poses: ['back'],
  },
  {
    id: 'rc-niemowle',
    category: 'red',
    criterion: 'JumpSTART, niemowlę: oddechy > 45/min',
    source: [],
    ages: ['infant'],
    mechanisms: ALL,
    vitals: {
      walk: false, breathing: 'spontaneous', rate: [50, 60], pulse: true, crt: [1.5, 2], avpu: 'A', obeys: false,
    },
    injuries: [['stękanie przy wydechu, zaciąganie międzyżebrowe'], ['otarcia klatki piersiowej', 'krwiak na plecach']],
    remarks: ['Nie płacze, oddycha bardzo szybko i stęka.'],
    poses: ['back'],
    unique: true,
    weight: 0.6,
  },

  // ═════════════════════════ CZARNI ═════════════════════════
  {
    id: 'b-glowa',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: ['p11', 'a13', 't14'],
    ages: ADULTLIKE,
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [['rozległa rana głowy z deformacją czaszki'], ['szerokie, niereagujące źrenice']],
    poses: ['back', 'front'],
    pregnancy: 'ok',
  },
  {
    id: 'b-klatka',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: ['t13'],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'zmiazdzenie', 'wybuch', 'upadek', 'kolejowy'],
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [
      ['zniekształcenie klatki piersiowej, sinica twarzy'],
      [{ t: 'zasypan{y|a} gruzem do pasa — wydobyt{y|a} przez świadków', mech: ['wybuch'] }, 'szerokie, niereagujące źrenice'],
    ],
    poses: ['back'],
    pregnancy: 'ok',
  },
  {
    id: 'b-asfiksja',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: ['c14'],
    ages: ['teen', 'adult'],
    mechanisms: ['tlum'],
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [['głęboka sinica twarzy i szyi z licznymi wybroczynami'], ['szerokie źrenice']],
    poses: ['front', 'back'],
  },
  {
    id: 'bc-bez-tetna',
    category: 'black',
    criterion: 'JumpSTART: bezdech, brak tętna obwodowego',
    source: ['p12', 'f14'],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [
      [
        'zniekształcenie klatki piersiowej',
        { t: 'zmiażdżenie klatki piersiowej przez belkę konstrukcji', mech: ['zmiazdzenie'] },
        'rozległy uraz głowy z deformacją czaszki',
      ],
      ['szerokie, niereagujące źrenice', 'bladość powłok, sinica'],
    ],
    poses: ['back', 'front'],
  },
  {
    id: 'bc-z-tetnem',
    category: 'black',
    criterion: 'JumpSTART: bezdech z tętnem, brak oddechu po 5 oddechach ratowniczych',
    source: [],
    ages: ['child'],
    mechanisms: ALL,
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: true, crt: [3, 4], avpu: 'U', obeys: false },
    injuries: [['rozległy uraz głowy', 'zmiażdżenie klatki piersiowej'], ['sinica twarzy', 'szerokie źrenice']],
    poses: ['back'],
    weight: 0.4,
  },

  {
    id: 'b-zmiazdzenie-tulowia',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['zmiazdzenie', 'kolejowy', 'wybuch', 'komunikacyjny'],
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [
      [
        { t: 'tułów przygnieciony elementem konstrukcji, zmiażdżona klatka piersiowa', mech: ['zmiazdzenie', 'wybuch'] },
        { t: 'zmiażdżenie tułowia między fotelami wagonu', mech: ['kolejowy'] },
        { t: 'zmiażdżenie tułowia w zgniecionej kabinie', mech: ['komunikacyjny'] },
      ],
      ['skóra szaroblada, leży bezwładnie', 'sinica twarzy i szyi'],
    ],
    poses: ['back', 'front'],
  },
  {
    id: 'b-wyrzucony',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['komunikacyjny', 'kolejowy', 'wybuch', 'upadek'],
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [
      ['nienaturalnie wygięte kończyny, rozległe obrażenia głowy', 'krwawienie z uszu i nosa, deformacja głowy'],
      ['szerokie, niereagujące źrenice', 'skóra szaroblada, leży bezwładnie'],
    ],
    remarks: [
      { t: 'Leży daleko od pojazdu — wyrzucon{y|a} przy zderzeniu.', mech: ['komunikacyjny'] },
      { t: 'Leży przy torach, wypadł{|a} przez okno wagonu.', mech: ['kolejowy'] },
      { t: 'Odrzucon{y|a} falą uderzeniową pod ścianę budynku.', mech: ['wybuch'] },
      { t: 'Leży bez ruchu u podnóża konstrukcji, z której spadł{|a}.', mech: ['upadek'] },
    ],
    poses: ['front', 'back'],
  },
  {
    id: 'b-oparzenia',
    category: 'black',
    criterion: 'START: bezdech mimo udrożnienia dróg oddechowych',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['oparzenie', 'wybuch'],
    vitals: { walk: false, breathing: 'none', rate: [0, 0], pulse: false, crt: [5, 6], avpu: 'U', obeys: false },
    injuries: [['rozległe oparzenia III stopnia niemal całego ciała, zwęglone ubranie'], ['sadza w ustach i nosie']],
    poses: ['back', 'front'],
    weight: 0.6,
  },

  // ═════════════════════════ TRAIN-SPECIFIC ('kolejowy') ═════════════════════════
  {
    id: 'g-kolej-okno',
    pregnancy: 'ok',
    category: 'green',
    criterion: 'chodzi',
    source: ['k02'],
    ages: ADULTLIKE,
    mechanisms: ['kolejowy'],
    vitals: WALKER(),
    injuries: [['otarcia dłoni i przedramion', 'stłuczenie kolana prawego', 'drobne rany cięte dłoni od szkła, krwawienie niewielkie']],
    remarks: [
      '„Wyszł{em|am} górą, przez okno przewróconego wagonu. Pomóżcie tym, co zostali w środku!"',
      'Otrzepuje się z odłamków szkła: „Nic mi nie jest, mogę iść."',
    ],
    poses: UPRIGHT,
  },
  {
    id: 'y-kolej-fotele',
    category: 'yellow',
    criterion: 'nie chodzi; parametry prawidłowe',
    source: [],
    ages: ADULTLIKE,
    mechanisms: ['kolejowy'],
    vitals: STABLE(),
    injuries: [[
      'uraz zmiażdżeniowy podudzia lewego — obrzęk, zasinienie, deformacja',
      'uraz zmiażdżeniowy stopy prawej — obrzęk, zasinienie',
    ]],
    extraInjuries: ['otarcia rąk', 'stłuczenie biodra lewego'],
    remarks: ['„Noga utknęła mi między fotelami… strażacy ją uwolnili. Nie dam rady stanąć."'],
    poses: ['back', 'sitting'],
  },
];

export function archetypeById(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}
