/**
 * Literature the game's rules actually rely on. Every peer-reviewed entry was checked against PubMed and/or
 * the Crossref DOI record (authors, journal, volume, pages, DOI, PMID). Add nothing that has not been
 * verified the same way, and nothing the game does not use.
 */
export type SourceKind = 'original' | 'guideline' | 'review' | 'study' | 'trade' | 'polish';

export interface Source {
  citation: string;
  doi?: string;
  pmid?: string;
  url?: string;
  kind: SourceKind;
  /** What the source supports in the game (player-facing, Polish). */
  supports: string;
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  original: 'Opis algorytmu',
  guideline: 'Wytyczne',
  review: 'Przegląd systematyczny',
  study: 'Badanie',
  trade: 'Opis oryginalny · nierecenzowany',
  polish: 'Opracowanie polskie',
};

export const SOURCES: Source[] = [
  // START
  {
    citation:
      'Benson M, Koenig KL, Schultz CH. Disaster triage: START, then SAVE – a new method of dynamic triage for victims of a catastrophic earthquake. Prehosp Disaster Med. 1996;11(2):117-24.',
    doi: '10.1017/s1049023x0004276x',
    pmid: '10159733',
    kind: 'original',
    supports: 'START w wersji z 1996 r.: tętno promieniowe w miejsce nawrotu kapilarnego.',
  },
  {
    citation:
      'Malik NS, Chernbumroong S, Xu Y, Vassallo J, Lee J, Bowley DM, et al. The BCD Triage Sieve outperforms all existing major incident triage tools: comparative analysis using the UK national trauma registry population. EClinicalMedicine. 2021;36:100888.',
    doi: '10.1016/j.eclinm.2021.100888',
    pmid: '34308306',
    kind: 'study',
    supports: 'Kryteria START: chód, oddech po udrożnieniu dróg oddechowych, oddechy > 30/min, CRT > 2 s, wykonywanie poleceń.',
  },
  // JumpSTART
  {
    citation:
      'Romig LE. Pediatric triage. A system to JumpSTART your triage of young patients at MCIs. JEMS. 2002;27(7):52-8, 60-3.',
    pmid: '12141119',
    kind: 'trade',
    supports: 'Oryginalny opis JumpSTART; jedyne źródło modyfikacji dla niemowląt (istotne obrażenia zewnętrzne → ŻÓŁTY).',
  },
  {
    citation:
      'Cheng T, Staats K, Kaji AH, D’Arcy N, Niknam K, Donofrio-Odmann JJ. Comparison of prehospital professional accuracy, speed, and interrater reliability of six pediatric triage algorithms. J Am Coll Emerg Physicians Open. 2022;3(1):e12613.',
    doi: '10.1002/emp2.12613',
    pmid: '35059689',
    kind: 'study',
    supports: 'JumpSTART (5 oddechów ratowniczych, progi oddechu) i SALT u dzieci (2 oddechy ratownicze).',
  },
  {
    citation:
      'Vassallo J, Chernbumroong S, Malik N, Xu Y, Keene D, Gkoutos G, et al. Comparative analysis of major incident triage tools in children: a UK population-based analysis. Emerg Med J. 2022;39(10):779-85.',
    doi: '10.1136/emermed-2021-211706',
    pmid: '34706900',
    kind: 'study',
    supports:
      'Kryteria JumpSTART (oddechy < 15 lub > 45/min, 5 oddechów ratowniczych, AVPU, wiek do ok. 8 lat); JumpSTART często zaniża kategorię u ciężko rannych dzieci — uwaga w podsumowaniu gry.',
  },
  // SALT
  {
    citation:
      'Lerner EB, Schwartz RB, Coule PL, Weinstein ES, Cone DC, Hunt RC, et al. Mass casualty triage: an evaluation of the data and development of a proposed national guideline. Disaster Med Public Health Prep. 2008;2 Suppl 1:S25-34.',
    doi: '10.1097/DMP.0b013e318182194e',
    pmid: '18769263',
    kind: 'original',
    supports: 'SALT: sortowanie komendami, czynności ratujące życie, ocena indywidualna, kategoria SZARA.',
  },
  // Polish
  {
    citation: 'Koszowski M. Triaż – od START do SALT. Medycyna Praktyczna – Ratownictwo (mp.pl).',
    url: 'https://www.mp.pl/ratownictwo/algorytmy/168777,triaz-od-start-do-salt',
    kind: 'polish',
    supports: 'Historia START, zmiana CRT na tętno (1996), budowa SALT, porównanie START i SALT.',
  },
];
