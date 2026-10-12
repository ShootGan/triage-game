# Triage — Game Design Document

> Wersja robocza 0.1 · 2026-10-10

## 1. Założenia

| | |
|---|---|
| **Cel** | Ćwiczenie segregacji poszkodowanych w zdarzeniu masowym (START, JumpSTART, później SALT) |
| **Odbiorcy** | Studenci ratownictwa medycznego oraz czynni ratownicy (szkolenia doskonalące) |
| **Platforma** | Przeglądarka, desktop (mysz + klawiatura) |
| **Język** | Polski (terminologia PRM), struktura gotowa na tłumaczenia |
| **Styl** | 3D z filtrem pixel art (cieniowanie toon + kontur) |
| **Perspektywa** | Izometryczna kamera ortograficzna (obrót, zoom) + zbliżenie przy badaniu |
| **Gracz** | Działa sam — gra skupia się wyłącznie na segregacji |

## 2. Technologia

- **Vite + TypeScript**
- **Three.js** — scena 3D, render do małego bufora + post-process (kontur z głębokości)
- **React** — UI jako nakładka HTML (menu, panel badania, znaczniki triage, debrief)
- **Zustand** — stan gry
- **Vitest** — testy silnika algorytmów (krytyczne: poprawność medyczna)

### Grafika (prototyp: `art-preview/3d-v3.html`)
- Render do bufora **640×360**, skalowanie bez wygładzania → piksele.
- Cieniowanie toon (4 progi), cienie. **Bez konturu** (post-process konturu zostaje w kodzie jako opcja, domyślnie wyłączony).
- Włosy: jedna gładka powłoka na czaszce z linią włosów (czoło / boki / kark) + dodatkowe bryły dla długich włosów i kucyka.
- **Postacie generowane proceduralnie w kodzie**: szkielet ze stawów (barki, łokcie, biodra, kolana, kostki, głowa), tułów z profilu obrotowego, zwężające się kończyny, twarz (oczy, brwi, uszy, nos, usta), włosy z kosmyków (krótkie, długie, kucyk, łysina, broda), warianty: kobieta/mężczyzna/dziecko, kolor skóry, ubrania.
- Pozy z parametrów stawów: leżenie na plecach/brzuchu, siedzenie, klęczenie, stanie → bez rysowania nowych grafik.
- Ratownik: mundur z pasami odblaskowymi, rękawiczki, napis „RATOWNIK MEDYCZNY".
- **Znaczniki triage w UI**: kółko w kolorze kategorii obok pacjenta (nakładka HTML śledząca pozycję postaci); szare pulsujące „?" = niezbadany. Bez obiektów 3D typu chorągiewka.
- **Widok badania**: kamera robi zbliżenie na pacjenta (ten sam model).

### Sterowanie
- Kliknięcie na ziemi → gracz idzie; kliknięcie pacjenta → podejście i otwarcie widoku badania.
- Przeciąganie myszą obraca kamerę, kółko przybliża.
- Skróty klawiszowe: Q–I czynności, 1–4 kategorie triage, H podpowiedź, Esc zamyka panel.

## 3. Pętla rozgrywki

1. **Odprawa** — opis zdarzenia (dyspozytor), wybór algorytmu i trybu.
2. **Wejście na miejsce** — ocena bezpieczeństwa, komenda: *„Kto może chodzić — do mnie!"* → chodzący odchodzą do punktu zbiórki (ZIELONY).
3. **Segregacja** — gracz podchodzi kolejno do poszkodowanych i wykonuje czynności.
4. **Zakończenie** — wszyscy oznaczeni lub upływ czasu → przekazanie meldunku (liczba R/Ż/Z/C).
5. **Debrief** — analiza każdego pacjenta.

### Prezentacja wyników badania — etapy
- **MVP**: ekran badania (zbliżenie pacjenta, statyczny portret) jest, ale wynik czynności wyświetla się jako tekst po jej wykonaniu (np. „Oddech: 34/min", „Tętno promieniowe: niewyczuwalne", „CRT: 3 s"). Czas gry nadal płynie za każdą czynność.
- **Później**: wizualizacja objawów (animacja oddechu do policzenia, ucisk paznokcia, reakcje twarzy, dźwięk) zamiast gotowych liczb.

### Czynności przy pacjencie
| Czynność | Prezentacja | Uwagi |
|---|---|---|
| Ocena oddechu | Animacja klatki + dźwięk; gracz liczy z własnym stoperem (np. 15 s) | Brak gotowej liczby — trzeba policzyć |
| Udrożnienie dróg oddechowych | Animacja odgięcia głowy | Może „uruchomić" oddech |
| 5 oddechów ratowniczych | Tylko dzieci (JumpSTART) | |
| Tętno promieniowe | Wynik: wyczuwalne / niewyczuwalne (+ szybkie/słabe opisowo) | |
| Nawrót kapilarny | Animacja ucisku paznokcia, gracz ocenia czas | |
| Polecenie / AVPU | Gracz wybiera bodziec, obserwuje reakcję | |
| Tamowanie krwotoku | Opaska uciskowa / ucisk | Jedyna „pełna" interwencja w START |
| Ułożenie | Pozycja boczna | |
| Opaska triage | ZIELONA / ŻÓŁTA / CZERWONA / CZARNA (+ SZARA w SALT) | |

Każda czynność kosztuje czas gry (np. tętno 5 s, oddech 15 s, opaska 3 s).

### Mechaniki dodatkowe
- **Pogarszanie się stanu** — parametry pacjentów zmieniają się w czasie (np. narastająca tachypnoe, utrata tętna promieniowego). Oznaczenie jest oceniane względem stanu *w chwili badania*.
- **Re-triage** — możliwość ponownej oceny pacjenta (MVP+).
- **Dystraktory** — krzyczący, ale lekko ranni; rodzic przy dziecku; pacjenci przemieszczający się.

## 4. Algorytmy (silnik)

Silnik liczy poprawną kategorię z parametrów pacjenta — scenariusze **nie** zawierają ręcznie wpisanych odpowiedzi. Silnik zwraca też ścieżkę decyzji (do debriefu).

### START (dorośli)
1. Chodzi → **ZIELONY**
2. Oddycha? Nie → udrożnij drogi oddechowe → oddycha? Tak → **CZERWONY**, Nie → **CZARNY**
3. Oddechy > 30/min → **CZERWONY**
4. Brak tętna promieniowego lub CRT > 2 s → **CZERWONY** (tamuj krwotok)
5. Nie wykonuje prostych poleceń → **CZERWONY**
6. W przeciwnym razie → **ŻÓŁTY**

### JumpSTART (dzieci ~1–8 lat / „wygląda na dziecko")
1. Chodzi → **ZIELONY** (niechodzący z powodu wieku rozwojowego → pełna ocena)
2. Oddycha? Nie → udrożnij drogi oddechowe → oddycha? Tak → **CZERWONY**
   - Nie → tętno obwodowe? Brak → **CZARNY**; obecne → 5 oddechów ratowniczych → oddycha? Tak → **CZERWONY**, Nie → **CZARNY**
3. Oddechy < 15 lub > 45/min lub nieregularne → **CZERWONY**
4. Brak tętna obwodowego → **CZERWONY**
5. AVPU: „P" z nieadekwatną reakcją (np. ułożenie patologiczne) lub „U" → **CZERWONY**
6. W przeciwnym razie → **ŻÓŁTY**
   - Niemowlę/dziecko niechodzące rozwojowo, bez istotnych urazów zewnętrznych → **ZIELONY**

### SALT (etap 2)
- **Sort**: chodzi → ocena na końcu; macha/celowe ruchy → druga kolejność; nieruchomy / oczywiste zagrożenie życia → pierwszy.
- **Assess** — czynności ratujące życie: tamowanie krwotoku, udrożnienie dróg oddechowych (dziecko: 2 oddechy ratownicze), odbarczenie odmy, autostrzykawka z antidotum.
- Nie oddycha → **NIEŻYJĄCY (czarny)**
- Wszystkie TAK: wykonuje polecenia/celowe ruchy, ma tętno obwodowe, brak duszności, krwotok opanowany →
  - tylko drobne obrażenia → **MINIMALNY (zielony)**, inaczej → **ODROCZONY (żółty)**
- Którekolwiek NIE → prawdopodobnie przeżyje przy dostępnych siłach i środkach? Tak → **NATYCHMIASTOWY (czerwony)**, Nie → **OCZEKUJĄCY (szary)**

> Do weryfikacji przez osobę z uprawnieniami merytorycznymi przed użyciem dydaktycznym.

## 5. Model pacjenta

```ts
interface Patient {
  id: string;
  name: string;               // np. „Kobieta, ~40 lat"
  ageYears: number;
  appearsChild: boolean;      // decyduje START vs JumpSTART
  canWalk: boolean;
  nonAmbulatoryByAge?: boolean;
  breathing: {
    spontaneous: boolean;
    afterAirwayOpening: boolean;
    afterRescueBreaths?: boolean; // dzieci
    rate: number;               // /min
    irregular?: boolean;
    distress?: boolean;         // SALT
  };
  peripheralPulse: boolean;
  crtSeconds: number;
  avpu: 'A' | 'V' | 'P' | 'U';
  painResponseAppropriate?: boolean;
  obeysCommands: boolean;
  hemorrhage?: { major: boolean; controllable: boolean };
  injuries: Injury[];         // wizualne + opis
  minorInjuriesOnly?: boolean;  // SALT
  survivableWithResources?: boolean; // SALT
  deterioration?: DeteriorationStep[]; // zmiany w czasie
  visual: {
    body: { sex: 'm' | 'f'; child: boolean; skin: string; hair: string; hairStyle: string; shirt: string; pants: string };
    pose: 'back' | 'front' | 'sitting' | 'standing';
    position: [number, number];  // x, z na scenie
    rotation: number;
  };
}
```

## 6. Tryby

| Tryb | Podpowiedzi | Czas | Ocena |
|---|---|---|---|
| **Nauka** | Panel „Algorytm" (zwijany, klawisz H) | Stoper, bez limitu | Pełny debrief |
| **Ćwiczenie** | Nie | Stoper, limit scenariusza | Pełny debrief |

Czas = rzeczywisty stoper od wjazdu na miejsce (czynności nie doliczają sztucznych sekund). Tryb egzaminu — zrezygnowano.

## 7. Ocena i debrief

- **Liczą się ustalenia, nie kolejność**: kolor jest zaliczony, gdy to, co gracz ustalił przed opaską, rozstrzyga go
  wg algorytmu (np. brak tętna u oddychającego → CZERWONY bez liczenia oddechów). ŻÓŁTY wymaga wykluczenia wszystkich
  kryteriów czerwonych. Kolor trafiony bez rozstrzygających ustaleń = „zgadnięty". Inna kolejność niż w algorytmie —
  tylko uwaga dydaktyczna. Silnik: `scoring/findings.ts` (sprawdza wszystkie stany pacjenta zgodne z ustaleniami).
- **Punkty** na poszkodowanego (`scoring/points.ts`): poprawny 10, zgadnięty 3, zawyżony 2 (kolor żywego u zmarłego 0), zaniżony / brak opaski 0,
  CZARNY u żywego −5; każda pominięta czynność ratująca życie −3. Wynik = % maksimum.
- Trafność (% poprawnych opasek) — statystyka dodatkowa
- Średni czas na pacjenta — tylko informacyjnie, **bez wpływu na wynik**
- Pominięte czynności ratujące życie (niezatamowany krwotok, nieudrożnione drogi oddechowe)
- Zbędne czynności (np. pełne badanie urazowe w trakcie segregacji)
- Dla każdego pacjenta: ścieżka gracza vs poprawna ścieżka w algorytmie, z zaznaczonym krokiem błędu

## 8. Scenariusze

1. **Wypadek autobusu szkolnego** (MVP) — 12 osób, w tym ok. 5 dzieci; teren: droga.
2. **Karambol na drodze ekspresowej** — samochody + ciężarówka, rodzina z niemowlęciem (reguła niemowlęcia w JumpSTART); teren: droga.
3. **Wybuch gazu w kamienicy** — zawalona fasada, gruzowisko, oparzenia, zmiażdżenia; teren: ulica.
4. **Panika na koncercie plenerowym** — scena, barierki, zmiażdżenia, dużo chodzących; teren: plener.
5. **Zawalenie trybuny na festynie szkolnym** — głównie dzieci (pełne pokrycie JumpSTART); teren: plener.

Scenariusz = plik TS (`src/scenarios/*.ts`, typy w `types.ts`) + test; ogólne reguły poprawności w `validate.ts`. W przyszłości edytor bez programowania.

### 8.1 Losowość pacjentów (projekt)

**Cel:** każda rozgrywka to inna sytuacja, ale zawsze spójna klinicznie i poprawna względem algorytmu.

**Archetyp** = przypadek kliniczny z widełkami, nie konkretny pacjent:
- grupa wiekowa (niemowlę / dziecko / nastolatek / dorosły / senior), mechanizmy urazu (komunikacyjny, zmiażdżenie, wybuch, upadek, oparzenie…),
- widełki parametrów (np. oddechy 32–40, CRT 1–2 s, AVPU A), zamierzona kategoria i kryterium rozstrzygające,
- pule opisów obrażeń i wypowiedzi, dozwolone pozy, ew. masywny krwotok.
- Źródło: ręcznie ułożeni pacjenci z 5 scenariuszy (~60) → przerobieni na archetypy.

**Scenariusz** = scena + miejsca + reguły:
- teren, rekwizyty, odprawa (bez podawania dokładnej liczby poszkodowanych),
- **miejsca** na scenie z kontekstem („przy autobusie", „pod gruzem", „na chodniku") i dozwolonymi pozami,
- dozwolone mechanizmy urazu, liczba pacjentów (np. 10–14).

**Generator** (deterministyczny, z ziarna):
1. losuje liczbę pacjentów i rozkład kategorii — **realistyczny**, jak w prawdziwym zdarzeniu masowym (dużo zielonych, mało czarnych), bez poziomów trudności,
2. dobiera archetypy pasujące do mechanizmów scenariusza, losuje parametry w widełkach, wygląd (płeć, kolor skóry, fryzura, ubranie) i miejsce,
3. **weryfikuje**: silnik triage musi dać zamierzoną kategorię, `validate.ts` całą scenę — inaczej losuje ponownie.

**Kod zadania** = ziarno losowania, np. `AUTOBUS-4F7K`: widoczny w odprawie i debriefie, można go wpisać w menu → identyczna sytuacja (powtórka, to samo zadanie dla całej grupy).

**Proporcje grup (opcjonalnie w układzie):** `childShare` — udział dzieci (np. „Zderzenie autobusów": 45–55% uczniów 6–10 lat), `pregnancy` — udział kobiet w ciąży wśród poszkodowanych (30–40%, wiek 18–42, 20.–39. tydzień): etykieta „Kobieta w ciąży, ok. N lat (ok. W. tydzień)", objaw ciąży zgodny z kategorią (np. skurcze u chodzącej, krwawienie z dróg rodnych tylko przy zaburzonej perfuzji); ciąża nie zmienia algorytmu (START). Role obowiązkowe (`required`) — np. obaj kierowcy, wychowawca, położna.

**Wzorce:** każdy scenariusz zachowuje jeden ręcznie ułożony zestaw pacjentów — do testów i dostępny w grze pod stałym kodem (np. `AUTOBUS-WZOR`).

## 9. Architektura

```
src/
  engine/
    triage/        start.ts, jumpstart.ts, salt.ts, types.ts  (+ testy)
    patient/       model, pogarszanie stanu
    scoring/       ocena, debrief
  game/            stan gry, zegar, akcje gracza
  render/          Three.js: renderer, pipeline pixel art, kamera, światło
  world/           scena zdarzenia (teren, pojazdy), postacie proceduralne, pozy
  ui/              React: menu, panel badania, znaczniki triage, debrief
  scenarios/       *.json (pacjenci + układ sceny)
  assets/          dźwięki, czcionki
```

Zasada: `engine/` nie zna Three.js ani Reacta — czysta logika, w pełni testowalna.

## 10. Etapy

**MVP**
- [x] Szkielet projektu (Vite + Three.js + React), pipeline pixel art z prototypu
- [x] Generator postaci i póz (przeniesiony z prototypu), scena „autobus"
- [x] Silnik START + JumpSTART z testami
- [x] Scenariusz „autobus" (12 pacjentów)
- [x] Panel badania + opaski + zegar
- [x] Debrief
- [ ] 4 kolejne scenariusze (w toku, gałąź `scenariusze`)

**Etap 2**
- [ ] SALT
- [ ] Pogarszanie stanu, re-triage
- [ ] Dźwięk (oddechy, otoczenie, krzyki)

**Etap 3**
- [ ] Kolejne scenariusze, edytor scenariuszy
- [ ] Statystyki postępów, ranking

**TODO / pomysły na później**
- [~] ~~**Osobny scenariusz: poszkodowani uwięzieni w pojazdach + PSP.**~~ — odrzucone (2026-10-11): prototyp logiki
  działał, ale całość uznana za zbyt rozbudowaną i niepotrzebną; nie wracamy do tego. Pacjent siedzi w aucie; badanie przez okno/drzwi
  z ograniczonym dostępem (część czynności niedostępna: „brak dostępu — pacjent zakleszczony"); segregacja ustala
  kolejność wydobywania; gracz wskazuje PSP/KDR, kogo wydobyć najpierw; strażacy (postacie NPC) wydobywają
  po czasie → pacjent leży przy aucie i można go zbadać w pełni. Ocena w debriefie: kolejność wydobycia.
- [ ] **Miejsce na scenie zależne od stanu/mechanizmu**: sloty z kontekstem („w aucie", „wyrzucony przez szybę",
  „pobocze — chodzący"), archetypy dopasowane do kontekstu; drobniejsze pozy (duszność — na siedząco,
  nieprzytomny oddychający — pozycja boczna).
- [x] Decyzje merytoryczne z przeglądu (`docs/medical-review.md`, sekcja 0): oryginał JumpSTART (bez wariantu PL),
  9–12 lat — oba algorytmy, niemowlęta wg listy Romig, uwagi przy ciężarnych, easter egg zostaje.

### Wydania / wersjonowanie
- Wersje zgodne z [SemVer](https://semver.org/lang/pl/); bieżąca w `package.json`, widoczna w stopce menu.
- Historia zmian: [`CHANGELOG.md`](../CHANGELOG.md) (Keep a Changelog). Proces wydania opisany w `README.md`
  (podbicie wersji, przeniesienie wpisów z „Unreleased", tag `vX.Y.Z`; starsze tagi: `v0.1-mvp` = 0.1.0, `v0.2` = 0.2.0).

## 11. Otwarte pytania

- Kto zweryfikuje merytorycznie algorytmy i przypadki?
- Źródło grafiki: własny pixel art (Aseprite), darmowe paczki, czy generowane placeholdery na start?
- Zapisywanie wyników — lokalnie czy z kontem/backendem?
- (Później) członkowie zespołu, którym gracz wydaje polecenia — poza zakresem na teraz.
