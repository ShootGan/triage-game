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
- Skróty klawiszowe dla czynności i opasek (szybkość w trybie egzaminu).

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

| Tryb | Podpowiedzi | Schemat algorytmu | Ocena |
|---|---|---|---|
| **Nauka** | Tak | Podświetlany na żywo | Brak presji czasu |
| **Ćwiczenie** | Nie | Dostępny w debriefie | Pełny debrief |
| **Egzamin** | Nie | Nie | Wynik %, limit czasu, losowi pacjenci |

## 7. Ocena i debrief

- Trafność (% poprawnych opasek)
- **Overtriage** (zawyżenie) i **undertriage** (zaniżenie — cięższy błąd, większa kara)
- Średni czas na pacjenta (cel: ≤ 30–60 s)
- Pominięte czynności ratujące życie (niezatamowany krwotok, nieudrożnione drogi oddechowe)
- Zbędne czynności (np. pełne badanie urazowe w trakcie segregacji)
- Dla każdego pacjenta: ścieżka gracza vs poprawna ścieżka w algorytmie, z zaznaczonym krokiem błędu

## 8. Scenariusze

1. **Wypadek autobusu szkolnego** (MVP) — 10–12 osób, w tym 3–4 dzieci; kierowca, opiekunowie, kierowca drugiego auta.
2. **Wybuch / zawalenie w hali** — urazy wielonarządowe, zasypani.
3. **Panika na koncercie** — zmiażdżenia, dużo lekko rannych (test komendy „chodzący do mnie").

Scenariusz = plik JSON (lista pacjentów + układ sceny + parametry czasu) → w przyszłości edytor bez programowania.

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
- [ ] Szkielet projektu (Vite + Three.js + React), pipeline pixel art z prototypu
- [ ] Generator postaci i póz (przeniesiony z prototypu), scena „autobus"
- [ ] Silnik START + JumpSTART z testami
- [ ] Scenariusz „autobus" (10–12 pacjentów)
- [ ] Panel badania + opaski + zegar
- [ ] Debrief

**Etap 2**
- [ ] SALT
- [ ] Pogarszanie stanu, re-triage
- [ ] Dźwięk (oddechy, otoczenie, krzyki)
- [ ] Tryb egzaminu

**Etap 3**
- [ ] Kolejne scenariusze, edytor scenariuszy
- [ ] Statystyki postępów, ranking

## 11. Otwarte pytania

- Kto zweryfikuje merytorycznie algorytmy i przypadki?
- Źródło grafiki: własny pixel art (Aseprite), darmowe paczki, czy generowane placeholdery na start?
- Zapisywanie wyników — lokalnie czy z kontem/backendem?
- (Później) członkowie zespołu, którym gracz wydaje polecenia — poza zakresem na teraz.
