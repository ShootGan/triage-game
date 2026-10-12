# Przegląd merytoryczny (medyczny) — Triage: ćwiczenia segregacji

Data przeglądu: 2026-10-11 · Zakres: algorytmy START/JumpSTART, teksty badania, punktacja i debrief, treść scenariuszy (6 wzorców + generator), test gry w przeglądarce.

Testy w przeglądarce (dev server, port 5183), łącznie 5 rozgrywek: `ZDERZENIE-WZOR` (Ćwiczenie), `FESTYN-WZOR` (Nauka), `KARAMBOL-H7MQ`, `KAMIENICA-8R8M`, `KONCERT-EHSN` (losowe kody; ostatni wygenerowany i przejrzany bez oznaczania). Część pacjentów oznaczyłem poprawnie, część celowo błędnie: CZARNY bez udrożnienia dróg oddechowych, CZARNY u dziecka bez 5 oddechów ratowniczych, CZARNY u oddychającego, CZERWONY bez żadnego badania, dziecko ≥ 10 lat oceniane „po dorosłemu”, niemowlę ZIELONE/ŻÓŁTE.

Oznaczenia pewności: **[pewne]** — zgodne ze źródłem pierwotnym/wtórnym, **[do decyzji]** — różnice między źródłami lub kwestia dydaktyczna, **[niepewne]** — moja ocena kliniczna bez twardego źródła.

---

## 0. Stan wdrożenia i decyzje (aktualizacja 2026-10-11)

**Decyzje autora:**
- **Źródło algorytmu:** oryginał L. Romig (JumpSTART) i START w wersji z 1996 r. Załącznik z gov.pl odrzucony jako podstawa. Nie wiadomo, kto go wydał ani do jakiego dokumentu należy, a dotyczy głównie segregacji wtórnej. Nie wprowadzamy „wariantu PL” (A1, A2: bez zmian w logice).
- **Wiek (A3):** u dziecka 9–12 lat zaliczany jest kolor zarówno wg JumpSTART, jak i START. Debrief pokazuje obie ścieżki. Twórczyni algorytmu podaje 1–8 lat, ale też zasadę „wygląda na dziecko → JumpSTART”.
- **Niemowlęta (A4):** wariant A (Romig). Treść dobrana tak, żeby nie budziła wątpliwości: ZIELONE niemowlę bez widocznych obrażeń, ŻÓŁTE tylko z obrażeniami z listy Romiga. Lista potwierdzona w dokumencie szkoleniowym z 2016 r., który cytuje stronę JumpSTART (z „mnogimi zasinieniami”).
- **Punktacja (S3, S4):** trafiony kolor bez oceny rozstrzygającej albo bez zatamowania masywnego krwotoku daje werdykt „niepełna procedura” i nie liczy się do trafności. **S5:** wyróżniony „błąd krytyczny”.
- **C12:** żart zostaje.

**Wdrożone:** S1, S2 (wcześniej), S3–S7, A3, A4, A2 (strażnik w walidatorze + dopisek przy CRT u dziecka < 9 lat), E1–E6, C1, C2, C6, C8 (wcześniej), C3 i C4 (uwagi dydaktyczne w debriefie), C5, C7, C9, C11, C13. C10 (polecenia przy AVPU „V” dozwolone, nowy archetyp `y-glowa-V`). Bez zmian: A1, A5, C12.

**Nowsze źródła (2021–2026) — skuteczność JumpSTART:** algorytm nie był zmieniany. Nowe prace oceniają jego trafność:
- Vassallo J i wsp. *Comparative analysis of major incident triage tools in children: a UK population-based analysis.* Emerg Med J 2022;39(10):779–785. JumpSTART do 8 lat, czułość dla czynności ratujących życie 45%, zaniżanie 55%. https://pmc.ncbi.nlm.nih.gov/articles/PMC9510399/
- Stefani L i wsp. *JumpSTART Triage Protocol in Disaster Pediatric Patients: A Systematic Literature Review.* Prehosp Disaster Med 2022. Najszybszy i najczęściej wybierany, ale za mało dowodów na trafność. https://www.cambridge.org/core/journals/prehospital-and-disaster-medicine/article/abs/jumpstart-triage-protocol-in-disaster-pediatric-patients-a-systematic-literature-review/3E7641AEC28B58AB723F0E5807E33AEF
- Preprint (Research Square, bez recenzji): systematyczne zaniżanie kategorii u ciężko rannych dzieci < 8 lat. https://www.researchsquare.com/article/rs-8126290/v1

Wniosek dodany do debriefu: JumpSTART często zaniża kategorię u ciężko rannych dzieci, więc po segregacji wstępnej dzieci wymagają szybkiej segregacji wtórnej.

---

## 0a. Zmiany po przeglądzie (2026-10-12) — do weryfikacji

**Punktacja (zastępuje S3, S4):** kolor jest zaliczony, gdy ustalenia sprzed opaski go rozstrzygają — w dowolnej kolejności
(np. brak tętna promieniowego u oddychającego → CZERWONY bez liczenia oddechów; tętno promieniowe obecne albo CRT ≤ 2 s
zamiennie). Kolor bez rozstrzygających ustaleń = „zgadnięty” (połowa punktów). Niezatamowany masywny krwotok nie
unieważnia koloru, tylko kosztuje punkty jako pominięta czynność ratująca życie. Czas nie wpływa na wynik.

**Nowe archetypy (teksty i widełki do sprawdzenia):**
- ŻÓŁCI: `y-kostka` (złamanie stawu skokowego), `y-kolano` (zwichnięcie kolana / rzepki), `y-biodro-zwichniete`
  (tylne zwichnięcie biodra — „deska rozdzielcza”), `y-piety` (złamanie kości piętowych + ból lędźwiowy po upadku na nogi),
  `y-odlamek-uda` (ciało obce wbite w kończynę), `y-rana-brzucha` (rana powłok, brzuch miękki), `y-oparzenia-stop`,
  `y-wstrzasnienie` (wymioty, zawroty; A, wykonuje polecenia), dzieci: `y-dziecko-oparzenie`, `y-dziecko-noga`.
- CZERWONI START: `r-odma` (odma prężna, oddech > 30), `r-rana-ssaca` (otwarta odma, oddech > 30),
  `r-oparzenie-drog-oddechowych` (oddech > 30), `r-sledziona` (krwawienie do jamy brzusznej — brak tętna promieniowego,
  CRT > 2 s), `r-amputacja` (amputacja urazowa z masywnym krwotokiem), `r-splatany` (przytomny „A”, ale splątany —
  nie wykonuje poleceń). Masywny krwotok (`r-krwotok`, `r-krwotok-V`) ma teraz też lokalizacje: ramię, podudzie,
  przedramię, dół podkolanowy.
- CZARNI: `b-zmiazdzenie-tulowia`, `b-wyrzucony`, `b-oparzenia` (bezdech mimo udrożnienia).

Decyzje po przeglądzie dwóch recenzentów (2026-10-12): `y-rana-brzucha` zostaje ŻÓŁTA (wg START poprawnie) z uwagą
w debriefie o pilnej ocenie chirurgicznej; `r-amputacja` zostaje z brakiem tętna promieniowego (wstrząs krwotoczny
III–IV). Poprawione: dziecko 9–12 lat w bezdechu z tętnem — CZARNY nie jest zaliczany, gdy JumpSTART daje CZERWONY;
oddech po oddechach ratowniczych = krążenie; CRT w hali nie jest cytowany w debriefie; wypowiedzi dopasowane do urazu
i pozy; `r-sledziona` nie dla ciężarnych; etykieta „w ciąży” tylko z widoczną ciążą. Punkty: zgadnięty 3, zawyżony 2,
kolor żywego u zmarłego 0.

Otwarte: opisy bez cudzysłowu, które pokazują reakcję („otwiera oczy na głos”), nie są liczone jako dowód oddechu;
część starszych wypowiedzi zdradza wynik badania.

Dodane później (do weryfikacji): `g-oko` (ciało obce / rana powieki / pył / oparzenie spojówek — chodzi), `g-dym`
(kaszel, ból głowy po dymie — chodzi), `y-rdzen-szyjny` (porażenie kończyn dolnych, ±osłabienie rąk, oddech
przeponowy; parametry w normie START — ŻÓŁTY), `y-zmiazdzenie-dlugie` (długie przygniecenie kończyny; uwaga w debriefie
o zespole zmiażdżenia), `r-dym-co` (zatrucie dymem/CO: AVPU V, nie wykonuje poleceń — CZERWONY). [do decyzji]
`y-rdzen-szyjny`: wstrząs neurogenny (bradykardia, hipotensja) dawałby CZERWONY — tu świadomie wariant bez wstrząsu.

---

## 0b. SALT (2026-10-12) — do weryfikacji

Tryb SALT ocenia tych samych poszkodowanych co START. Decyzje, które gra podejmuje za ratownika:
- **Duszność** = dorosły > 30 lub < 10/min, dziecko < 15 lub > 45/min albo nieregularny. Wyjątek: hiperwentylacja z paniki
  (`g-hiperwentylacja`, wzorzec koncertu `c01`) — szybko, ale mówi pełnymi zdaniami → bez duszności → ZIELONY. [do decyzji]
- **Celowe ruchy** (zamiast poleceń) tylko u dzieci < 3 lat: AVPU A/V albo P z adekwatną reakcją. [do decyzji] Splątany dorosły
  (AVPU A, nie wykonuje poleceń, `r-splatany`) → CZERWONY.
- **Tylko drobne obrażenia** = zielony wg START/JumpSTART, z wyjątkami → ŻÓŁTY mimo chodzenia: `g-reka` (podejrzenie złamania
  nadgarstka/obojczyka), nowy `g-chodzi-powazne` (głęboka rana przedramienia ze ścięgnami, otwarte złamanie palców, zwichnięcie
  barku). [do decyzji] `g-dziecko-reka` zostaje „drobny” (warianty mieszane: obrzęk przedramienia / guz / krew z nosa).
- **Dziecko w bezdechu**: SALT — 2 oddechy ratownicze po udrożnieniu (dane z JumpSTART: „oddycha po 5 oddechach” użyte też dla 2).
- **Odma prężna** (`r-odma`): odbarczenie igłą = czynność ratująca życie; po odbarczeniu kategoria bez zmian (CZERWONY).
- **SZARY**: reguła otwarta — na razie żaden pacjent nie jest „oczekujący”.

## 1. Podsumowanie — 5 najważniejszych problemów

1. **KRYTYCZNY — CZARNY bez wykonania procedury liczy się jako „POPRAWNIE”** (`scoring/index.ts:10–17`). Potwierdzone w grze: kierowca z bezdechem (z17) oznaczony jako CZARNY bez udrożnienia dróg oddechowych dostaje „POPRAWNIE” i tylko ostrzeżenie. Prawidłowa reguła jest w sekcji 3 (S1). Ten błąd poprawia już równoległy agent.
2. **KRYTYCZNY — pacjent z bezdechem oznaczony jako CZERWONY bez udrożnienia dróg oddechowych nie dostaje żadnej uwagi, a „trafienie w ciemno” liczy się jako poprawne** (`scoring/index.ts:113–116, 146`). W grze: dziecko f12 (bezdech, oddycha po udrożnieniu) oznaczone CZERWONYM bez ani jednej czynności — „POPRAWNIE”, bez uwag. Gra uczy, że zgadnięty kolor wystarczy, a czynność ratująca życie (udrożnienie, w wytycznych PL także ułożenie w pozycji bocznej) jest zbędna.
3. **ISTOTNY [do decyzji] — rozbieżność z polskim materiałem urzędowym.** Załącznik „Zdarzenia masowe – zasady segregacji poszkodowanych” (gov.pl) stawia granicę JumpSTART na 8. r.ż., a jego schemat JumpSTART różni się od oryginału Romiga: używa CRT u dzieci i daje „AVP → ŻÓŁTY, U → CZERWONY”, bez kryterium „P nieadekwatne”. Gra stosuje oryginał Romiga i JumpSTART u dzieci 9–12 lat (p05, f04, f14, z07, z22, generator do 10 lat). Polski instruktor oceni część takich przypadków inaczej (np. f04 12 lat: w grze ŻÓŁTY, wg PL START → CZERWONY).
4. **ISTOTNY — niemowlęta: niejednoznaczne „istotne obrażenia zewnętrzne”.** Teksty obrażeń niemowląt nie pokrywają się z listą Romiga (głębokie rany penetrujące, ciężkie krwawienie, rozległe oparzenia, amputacje, wzdęty tkliwy brzuch, mnogie zasinienia). ŻÓŁTE bywa niemowlę z samym „rozległym krwiakiem czoła” albo z „obrzękiem i zniekształceniem przedramienia”, a ZIELONE — z „drobnym otarciem” albo „zaczerwienieniem czoła”. Według załącznika gov.pl to drugie powinno być ŻÓŁTE (każde obrażenie u dziecka < 1 r.ż.). Rekomendacja w sekcji 4.
5. **ISTOTNY — sprzeczności kliniczne w treści.** a11 ma „chrapliwy oddech” (a więc oddycha), a w parametrach jest bezdech; tekst zdradza też wynik („po udrożnieniu słaby oddech własny”). Archetyp „wstrząs oparzeniowy” ma CRT > 2 s kilka minut po wybuchu, choć wstrząs oparzeniowy narasta godzinami. Ciężarne z objawami alarmowymi (brak ruchów płodu, ból podbrzusza, regularne skurcze) są ZIELONE bez żadnej uwagi w debriefie.

---

## 2. Tabela ustaleń

| ID | Waga | Obszar | Plik:linia | Problem | Rekomendacja | Źródło |
|---|---|---|---|---|---|---|
| S1 | krytyczny | Punktacja | `src/engine/scoring/index.ts:10–17` | `verdictFor` porównuje tylko kolory. CZARNY jest „poprawny” bez udrożnienia (START) i bez kontroli tętna lub 5 oddechów (JumpSTART). Potwierdzone w grze (z17). | Reguła z sekcji 3: CZARNY jest poprawny tylko po wykonaniu wymaganych kroków, w przeciwnym razie osobny werdykt (np. „błąd procedury”), który nie liczy się do trafności. | Illinois EMSC/JumpSTART 2016 (Step 2 START; Step 2b–c JumpSTART); załącznik gov.pl (schemat START) |
| S2 | krytyczny | Punktacja | `scoring/index.ts:113–116` | Ostrzeżenie „Nie udrożniono dróg oddechowych” pada tylko przy CZARNYM lub braku oznaczenia. Bezdech oznaczony CZERWONYM bez udrożnienia przechodzi bez uwag (f12 w grze). | Ostrzegać przy każdym oznaczeniu pacjenta z bezdechem bez `airwayOpened`. Rozważyć czynność „Ułóż w pozycji bocznej”, którą polski załącznik wymienia wśród czynności segregacji wstępnej. | gov.pl: „udrożnienie dróg oddechowych … ułożenie w pozycji bocznej bezpiecznej” |
| S3 | istotny | Punktacja | `scoring/index.ts:146` | Wyjaśnienie i lista „Nie wykonano” powstają tylko przy błędnym kolorze. Trafiony kolor bez oceny (np. z10: tylko CRT i opaska, wynik „POPRAWNIE”) nie dostaje żadnej informacji. | Dla poprawnych kolorów też liczyć `missing` z `actionsForStep` i pokazywać „poprawnie, ale bez oceny: …”, ewentualnie jako osobny licznik. | dydaktyka [do decyzji] |
| S4 | istotny | Punktacja | `scoring/index.ts:111`, `Debrief` | Niezatamowany masywny krwotok to tylko ostrzeżenie; CZERWONY nadal „POPRAWNIE” (z14 w grze). START wymaga próby zatamowania krwotoku przed przejściem dalej. | Liczyć pominięte czynności ratujące życie w podsumowaniu (kafel obok trafności). Werdykt bez zmian, ale z wyraźnym oznaczeniem. | Illinois 2016: „For all IMMEDIATE victims… attempt to control bleeding” |
| S5 | istotny | Punktacja | `scoring/index.ts:14` | CZARNY u pacjenta oddychającego (r01 KAMIENICA: oddycha 30/min) to zwykłe „zaniżenie”, tak samo jak ŻÓŁTY zamiast CZERWONEGO. | Osobna klasa „błąd krytyczny” (CZARNY u oddychającego / z tętnem bez oddechów ratowniczych), wyróżniona w debriefie. | START: CZARNY tylko przy bezdechu po udrożnieniu |
| S6 | drobny | Punktacja/czas | `src/engine/exam/index.ts:23` | 5 oddechów ratowniczych zajmuje 10 s; źródło podaje ok. 15 s. | Ustawić 15 s. | Illinois 2016, Step 2c („approximately 15 sec.”) |
| S7 | drobny | Debrief | `scoring/index.ts:93–96` | Krok niemowlęcy nie mówi, co jest „istotnym obrażeniem”. | Dopisać listę kryteriów (sekcja 4). | Illinois 2016 (Modifications for Non-Ambulatory Children) |
| A1 | istotny [do decyzji] | Algorytm | `src/engine/triage/jumpstart.ts:48–54`, `exam/index.ts:124–127` | Gra (zgodnie z Romigiem): „P nieadekwatne” lub U → CZERWONY. Schemat w załączniku gov.pl: AVP → ŻÓŁTY, U → CZERWONY. Pacjenci t10, f10, p09, z22 i archetyp rc-P są CZERWONI w grze, a ŻÓŁCI wg schematu PL. | Zostawić wersję Romiga (pierwotna, bardziej czuła). W debriefie dodać przypis: „uproszczone schematy PL mogą podawać AVP → ŻÓŁTY”. Ewentualnie opcja „wariant PL”. | Illinois 2016, Step 5; gov.pl (schemat JumpSTART) |
| A2 | istotny [do decyzji] | Algorytm | `jumpstart.ts:45–46` | Romig ocenia u dzieci tylko wyczuwalne tętno obwodowe; schemat PL: „nawrót kapilarny lub obecność tętna na obwodzie”. Treść gry obecnie nie zawiera dziecka z tętnem i CRT > 2 s, więc wynik się nie rozjeżdża, ale gracz może zbadać CRT u dziecka i wyciągnąć inne wnioski. | Zachować wersję Romiga. Strażnik w `validate.ts`: dziecko oddychające z tętnem → CRT ≤ 2 s. Po ocenie CRT u dziecka dopisać „(JumpSTART nie używa CRT)”. | Illinois 2016, Step 4; gov.pl; gov.pl: CRT u dzieci „na mostku lub czole” |
| A3 | istotny [do decyzji] | Algorytm/wiek | `src/scenarios/generator/index.ts:199–205`, `layouts.ts:139,191,241,296,345,409`; `bus.ts:113`, `festival.ts:106–127, 324`, `buses.ts:164, 483` | Dzieci 9–12 lat oceniane JumpSTART. Romig: „wygląda na dziecko → JumpSTART”. Załącznik PL i mp.pl: JumpSTART 1–8 lat, START > 8 lat. Podpowiedź w grze mówi „ok. 1–8 lat” (`src/ui/AlgorithmHint.tsx:60`), co przeczy treści. | Wybrać jedną konwencję. Proponuję: generator „child” 1–8 lat; wzorce 9–12 lat zostawić tylko jako świadomie opisane przypadki brzegowe (jak f04), z debriefem wyjaśniającym obie szkoły. | Illinois 2016 („If a victim appears to be a child, use JumpSTART”); gov.pl; mp.pl (Koszowski) |
| A4 | istotny | Algorytm/niemowlęta | `jumpstart.ts:56–60`, `archetypes.ts:392–409, 625–647`, `festival.ts:98`, `pileup.ts:97` | Logika „infant-injury” jest zgodna z Romigiem, ale teksty nie odpowiadają liście „significant external injury”, a ZIELONE niemowlęta mają drobne obrażenia (konflikt z załącznikiem PL). | Patrz sekcja 4 (wariant zalecany). | Illinois 2016; gov.pl |
| A5 | drobny | Algorytm | `start.ts`, `jumpstart.ts` (cały) | Kroki i progi zgodne ze źródłami: RR > 30; brak tętna promieniowego lub CRT > 2 s; polecenia; RR < 15 / > 45 / nieregularny; tętno obwodowe; bezdech → udrożnienie → tętno → 5 oddechów. Próg „dokładnie 30/min” (z08) i „CRT dokładnie 2 s” (z10) poprawnie dają ŻÓŁTY. | Bez zmian. Można dodać przypis, że CRT bywa niewiarygodny w zimnie i w ciemności; modyfikacja 1996 preferuje tętno promieniowe. | CHEMM START; Illinois 2016; mp.pl (modyfikacja 1996) |
| E1 | drobny | Badanie | `src/engine/exam/index.ts:12, 150–153` | Przycisk „Tętno promieniowe” także u dzieci i niemowląt (wynik słusznie mówi „obwodowe”). Wpis w debriefie („TWOJE CZYNNOŚCI”) też brzmi „Tętno promieniowe”. | Etykieta zależna od protokołu: „Tętno obwodowe” (JumpSTART), u niemowląt „(ramienne)”. | Illinois 2016 („peripheral preferred”) |
| E2 | drobny | Badanie | `exam/index.ts:150–153`; `buses.ts:324`; `archetypes.ts:761` | Przy krwotoku z przedramienia lub ramienia (z14, r-krwotok-V) brak tętna promieniowego może wynikać z urazu tej kończyny. | Wynik „Tętno promieniowe (kończyna niezraniona): niewyczuwalne”. | Illinois 2016 („palpating pulses on a (seemingly) uninjured limb”) |
| E3 | drobny | Badanie/terminologia | `exam/index.ts:125–127` | „Adekwatnie: lokalizuje” i „nieadekwatnie (ułożenie wyprostne)” to zawężenie. Wg Romiga adekwatne jest też odsunięcie lub cofnięcie kończyny, a nieadekwatne — jęk lub ruchy nielokalizujące, nie tylko ułożenie wyprostne. | „P — reaguje na ból adekwatnie (lokalizuje / odsuwa bodziec)” oraz „P — reakcja nieadekwatna (jęk, ruchy bezcelowe, ułożenie zgięciowe/wyprostne)”. | Illinois 2016, Step 5 |
| E4 | drobny | Badanie | `exam/index.ts:154–155`; `bus.ts:248` i inne | U zmarłych (bezdech, brak tętna) wynik CRT to liczba („6 s”). | „Nawrót kapilarny: brak / nieoznaczalny”. | [niepewne] |
| E5 | drobny | Język | `src/engine/triage/start.ts:32` | W ścieżce debriefu: „CRT 1.5 s” z kropką; reszta gry używa przecinka. | Użyć `num()` jak w `scoring`. | PL zapis dziesiętny |
| E6 | drobny | UI/język | `src/ui/ExamPanel.tsx:177–180` | `quoteRemark` ujmuje w cudzysłów także opisy narratora („„Wózek przewrócony… wodzi wzrokiem.""”), co wygląda jak wypowiedź; zamyka też prostym `"` zamiast `”`. | Rozróżnić wypowiedź od opisu (np. pole `remarkKind` albo kursywa dla opisu). Polski cudzysłów „…”. | typografia PL |
| C1 | istotny | Treść | `src/scenarios/pileup.ts:267` | a11: „chrapliwy oddech przy zapadniętej żuchwie” oznacza oddech (z niedrożnością), a parametry mówią bezdech. Dopisek „po udrożnieniu słaby oddech własny” zdradza wynik przed badaniem. | Np. „zapadnięta żuchwa, sinica warg, brak widocznych ruchów oddechowych”. | START (definicja bezdechu) |
| C2 | istotny | Treść | `archetypes.ts:781–796` | r-oparzenia-rozlegle: CRT 3–4 s kilka minut po wybuchu „wstrząs oparzeniowy”. Wstrząs oparzeniowy rozwija się w ciągu godzin; wczesny wstrząs sugeruje inny uraz albo krwotok. | Zmienić uzasadnienie (dodać uraz towarzyszący, np. „uraz brzucha/miednicy”) albo kryterium (RR > 30 przy oparzeniu dróg oddechowych). W debriefie: oparzeni po START/JumpSTART mają segregację wtórną wg % TBSA (WHO). | [niepewne — wiedza kliniczna]; gov.pl (tabela WHO dla oparzeń) |
| C3 | istotny [do decyzji] | Treść/ciąża | `buses.ts:54–55, 74`; `generator/index.ts:257–259, 272–278` | ZIELONE ciężarne z „Nie czuję ruchów!”, „pobolewanie podbrzusza” lub „skurcze co 5 min”. START daje ZIELONY (to poprawne i dydaktycznie wartościowe), ale komunikat „ciąża nie zmienia kategorii” bez komentarza może utrwalić bagatelizowanie objawów alarmowych (oddzielenie łożyska po urazie). | Komunikat zawęzić do „w segregacji wstępnej”. W debriefie ciężarnej (≥ 20 tyg.) z bólem brzucha, skurczami, brakiem ruchów płodu lub krwawieniem dodać „wymaga pilnej segregacji wtórnej i oceny położniczej”. | [do decyzji]; wytyczne ogólne urazów u ciężarnych (nie MCI) |
| C4 | drobny | Treść/ciąża | `buses.ts:303–307`; `generator/index.ts:263–264` | Ciężarna ~30 tyg. we wstrząsie leży na plecach (z13). Ucisk aortalno-żylny pogłębia hipotensję. | W debriefie lub uwadze: „ułóż na lewym boku / unieś prawe biodro” (prosta czynność; poza algorytmem START). | [pewne klinicznie, poza START] |
| C5 | drobny | Treść/ciąża | `layouts.ts:411`; `archetypes.ts:535`; `generator/index.ts:267–268` | Ciąża od 20. tygodnia opisana jako „widoczna zaawansowana ciąża”. | Widełki 24–39 tyg. albo tekst zależny od tygodnia („widoczna ciąża”). | [niepewne] |
| C6 | drobny | Treść | `archetypes.ts:604` | y-dziecko-stopa: wariant „obrzęk i zniekształcenie przedramienia prawego, nie może się podnieść” — złamanie przedramienia nie tłumaczy niechodzenia. | Usunąć wariant albo dodać uraz kończyny dolnej. | [niepewne] |
| C7 | drobny | Treść (spoilery) | `concert.ts:332`; `festival.ts:314, 251, 272`; `buses.ts:496`; `archetypes.ts:841, 942, 954` | Widoczne obrażenia lub uwagi zdradzają wynik badania: „brak oddechu”, „Tętno na tętnicy ramiennej wyczuwalne”, „Na ucisk prostuje kończyny”, „nie reaguje na głos ani na ból”. U 6-latki tętno ramienne jest nietypowe (raczej niemowlęta). | Przenieść te informacje do wyników czynności. W uwagach zostawić to, co widać bez badania. | dydaktyka |
| C8 | drobny | Treść | `concert.ts:175, 177` | c07: „Leży na boku”, a poza to `back`. | Zmienić tekst albo pozę. | — |
| C9 | drobny | Treść | `buses.ts:411`; `generator/index.ts:258` | „niepokój o dziecko” na liście „Widoczne obrażenia”. | Przenieść do uwagi albo zmienić nagłówek na „Obrażenia i objawy”. | — |
| C10 | drobny | Walidacja | `src/scenarios/validate.ts:60` | Reguła „wykonuje polecenia ⇒ AVPU = A” jest zbyt sztywna (pacjent V może wykonywać polecenia). Nie powoduje błędu, ale ogranicza realizm. | Zostawić albo złagodzić. | AVPU (definicja) |
| C11 | drobny | Język | `pileup.ts:192, 256`; `tenement.ts:188, 230, 297`; `buses.ts:208, 292` vs `generator/text.ts:19` | Niespójnie „ok. 32 lata” (wzorce) i „ok. 32 lat” (generator). Po „około” wymagany jest dopełniacz, więc „ok. 32 lat” jest poprawne. | Ujednolicić wzorce do „lat”. | norma PL (około + D.) |
| C12 | drobny | UI/ton | `src/ui/ExamPanel.tsx:101–113` | Easter egg „Ratunkowe cięcie cesarskie → PROKURATOR PATRZY”. Resuscytacyjna histerotomia to realna procedura lekarska przy NZK u ciężarnej ≥ 20 tyg.; żart może sugerować, że sama procedura jest przestępstwem. | Np. „Poza kompetencjami ZRM w segregacji wstępnej”. Decyzja autora. | [do decyzji] |
| C13 | drobny | UI | `AlgorithmHint.tsx:21, 30` | „niemowlę bez istotnych urazów → ZIELONY” bez definicji „istotnych”. | Krótki dopisek z listą (sekcja 4). | Illinois 2016 |

---

## 3. Prawidłowa reguła dla CZARNEGO (do S1) i inne zasady punktacji

**START (dorośli):** CZARNY jest prawidłowy tylko wtedy, gdy gracz udrożnił drogi oddechowe (ułożenie, odgięcie głowy / wysunięcie żuchwy) i pacjent nadal nie oddycha. Bez udrożnienia CZARNY to błąd procedury, nawet jeśli kolor zgadza się z prawdą. Oddechy ratownicze i badanie tętna nie są w START wymagane.

**JumpSTART (dzieci):**
1. udrożnienie dróg oddechowych → brak oddechu,
2. badanie tętna obwodowego:
   - brak tętna → CZARNY (bez oddechów ratowniczych — gra robi to dobrze, f14),
   - tętno obecne → 5 oddechów ratowniczych (ok. 15 s) → nadal bezdech → CZARNY.

CZARNY jest prawidłowy tylko po pełnej sekwencji odpowiedniej dla stanu tętna. Brak udrożnienia, brak kontroli tętna albo brak 5 oddechów przy obecnym tętnie oznacza błąd procedury.

**Proponowane zasady uzupełniające:**
- Pacjent z bezdechem, który oddycha po udrożnieniu: CZERWONY bez wcześniejszego udrożnienia to również błąd procedury, a przynajmniej ostrzeżenie (S2). Polski załącznik wymienia też ułożenie w pozycji bocznej bezpiecznej jako czynność segregacji wstępnej.
- Masywny krwotok: brak próby zatamowania to pominięta czynność ratująca życie, liczona w podsumowaniu (S4).
- CZARNY u pacjenta oddychającego lub z tętnem bez oddechów ratowniczych to błąd krytyczny (S5).
- Zawyżenie/zaniżenie: definicje w `verdictFor` są poprawne (CZARNY u żywego = zaniżenie; nie-CZARNY u zmarłego = zawyżenie).
- Autowstrzykiwacze i odbarczanie odmy (czynności ratujące życie w SALT) w START/JumpSTART nie występują i nie powinny być punktowane.

---

## 4. Niemowlęta (dzieci niechodzące z powodu wieku) — warianty i rekomendacja

**Stan w grze:** niemowlę (6–11 mies.) przechodzi pełny JumpSTART od kroku „oddycha?”. Spełnia kryteria CZERWONE → CZERWONY. Jeśli nie spełnia: istotne obrażenia zewnętrzne → ŻÓŁTY, brak takich obrażeń → ZIELONY. To wiernie odtwarza modyfikację Romiga.

**Co mówią źródła:**
- **Romig / JumpSTART** (cytowane w dokumencie szkoleniowym z 2016 r., opartym na materiałach jumpstarttriage.com): dzieci niechodzące z powodów rozwojowych są oceniane algorytmem od kroku 2. Spełnione kryteria IMMEDIATE → CZERWONY. Następnie szybki przegląd „significant external signs of injury”: głębokie rany penetrujące, ciężkie krwawienie, rozległe oparzenia, amputacje, wzdęty tkliwy brzuch, mnogie zasinienia. Obecne → DELAYED (ŻÓŁTY), brak → MINOR (ZIELONY). Niemowlęta przyniesione do strefy zielonej trzeba ocenić w pierwszej kolejności. **[pewne]**
- **Załącznik gov.pl „Zdarzenia masowe – zasady segregacji poszkodowanych”:** dzieci < 1 r.ż. zakwalifikowane wstępnie do grupy zielonej, „jeżeli mają obrażenia ciała, muszą być przekwalifikowane do grupy żółtej”. Próg jest niższy: każde obrażenie, nie tylko „istotne”. **[pewne co do treści; nie ustaliłem, który organ wydał załącznik]**
- **mp.pl (dr M. Koszowski, „Triaż – od START do SALT”):** wg cytowanej literatury do 1. r.ż. „nie stosować systemów triażu i wszystkich pacjentów oznaczać jako czerwonych”. Skrajnie zachowawcze i prowadzi do dużego zawyżania. **[pewne co do treści; opinia, nie wytyczna]**

**Warianty:**

| Wariant | Reguła | Plusy | Minusy |
|---|---|---|---|
| A (obecny, Romig) | brak kryteriów CZERWONYCH: istotne obrażenia → ŻÓŁTY, inaczej ZIELONY | wierny źródłu pierwotnemu, uczy myślenia | „istotne” bywa nieostre; konflikt z PL przy drobnych obrażeniach |
| B (załącznik PL) | każde obrażenie → ŻÓŁTY; ZIELONY tylko bez obrażeń | zgodny z polskim dokumentem, prosty | szersze zawyżanie |
| C (mp.pl) | każde niemowlę → CZERWONY | maksymalnie bezpieczny | sprzeczny z JumpSTART, duże zawyżanie, mała wartość dydaktyczna |

**Rekomendacja:** zostawić logikę A, ale tak dobrać treść, żeby A i B zawsze dawały ten sam wynik:
1. ZIELONE niemowlęta (`g-niemowle`, a03 i podobne): wyłącznie „bez widocznych obrażeń”. Usunąć „niewielkie zaczerwienienie czoła” i „drobne otarcie policzka” (`archetypes.ts:401`, `pileup.ts:97`).
2. ŻÓŁTE niemowlęta (`y-niemowle`, f03): tylko obrażenia z listy Romiga, np. „obfite krwawienie z rany płatowatej skóry głowy”, „mnogie zasinienia tułowia i kończyn”, „wzdęty, tkliwy brzuch”, „oparzenie … rozległe”. Usunąć warianty jednoelementowe spoza listy: sam „rozległy krwiak czoła”, samo „zniekształcenie przedramienia” (`archetypes.ts:634–638`, `festival.ts:98`).
3. W debriefie kroku „infant-injury” i w podpowiedzi pokazać listę kryteriów oraz krótki przypis: „Polskie materiały (załącznik gov.pl): niemowlę z jakimikolwiek obrażeniami → ŻÓŁTY; część instruktorów oznacza wszystkie niemowlęta jako CZERWONE — sprawdź lokalny standard.”
4. Opcjonalnie przełącznik „wariant PL” (B) w ustawieniach dla instruktorów.

Wariant C odradzam jako domyślny.

---

## 5. Co jest dobrze

- Silnik START i JumpSTART jest poprawny co do kolejności kroków i progów, łącznie z przypadkami brzegowymi (30/min, CRT 2 s, bezdech z tętnem → 5 oddechów, brak tętna → CZARNY bez oddechów).
- Debrief pokazuje pełną ścieżkę algorytmu i rozstrzygające ustalenie. Wyjaśnienia błędów w testowanych grach były merytorycznie trafne (f13, z16, z15, f10, r11, r01).
- Dobre przypadki dydaktyczne: chodzący z hiperwentylacją (ZIELONY), „krwawa głowa” chodząca, nastolatek oceniany START-em, 12-latek „wyglądający na dziecko”, progi 30/min i 2 s, ciężarna we wstrząsie z krwawieniem z dróg rodnych.
- Parametry są w większości spójne z obrazem klinicznym (asfiksja urazowa, wiotka klatka, miednica z CRT > 2 s, uraz czaszkowo-mózgowy z krwiakiem okularowym i płynotokiem). Zakresy RR dla wieku w generatorze (`generator/index.ts:294–300`) są rozsądne i mieszczą się w progach algorytmu.
- Komunikat przy oddechach ratowniczych u dorosłych („nie są elementem START”) i u niemowląt („za małe na polecenia — oceń AVPU”) jest poprawny.
- Terminologia polska jest zasadniczo poprawna: „nawrót kapilarny”, „tętno obwodowe/promieniowe”, „krwiak okularowy”, „ułożenie wyprostne”, „zadysponowanie, kod 1”.

---

## 6. Źródła

- CHEMM (U.S. HHS/ASPR), START Triage: https://chemm.hhs.gov/incident-primer/triage/start-triage (pochodzenie: Newport Beach Fire & Marine / Hoag Hospital 1983, aktualizacja 1996; START dla wyglądających na > 8 lat).
- CHEMM, JumpSTART Triage: https://chemm.hhs.gov/incident-primer/triage/jumpstart-triage (wygląda na < 8 lat; RR 15–45; wyczuwalne tętno; AVPU).
- „Pediatric Disaster Triage Training Scenarios: Utilizing the JumpSTART© Method” (2016; dokument powołuje się na przepisy Illinois Department of Public Health; treść JumpSTART wg jumpstarttriage.com, autor algorytmu Lou Romig, M.D.). Kopia: https://eclass-b.uoa.gr/modules/document/file.php/NURS519/jumpstarttrainingscenarios20164.pdf ; katalog: https://resources.pedspandemicnetwork.org/library/8545/pediatric-disaster-triage-training-scenarios-utilizing-the-jumpstart-method-8545 . Źródło kroków START/JumpSTART, 5 oddechów ok. 15 s, kryteriów „P nieadekwatne”, modyfikacji dla dzieci niechodzących i listy „significant external injury”.
- jumpstarttriage.com (oficjalna strona JumpSTART) — w tej sesji nie udało się pobrać treści, cytuję za dokumentem powyżej.
- Załącznik nr 2 „Zdarzenia masowe – zasady segregacji poszkodowanych” (gov.pl): https://www.gov.pl/attachment/f4c280a1-540a-43e6-9021-151e82f10ab1 (docx) oraz wersja PDF „Segregacja poszkodowanych w zdarzeniach masowych”: https://www.gov.pl/attachment/a78f2f7d-276a-4b7b-86fa-feae1b54af1c . Organu wydającego nie zidentyfikowałem (prawdopodobnie część wojewódzkiego planu działania systemu PRM — **niepewne**).
- M. Koszowski, „Triaż – od START do SALT”, Medycyna Praktyczna — Ratownictwo: https://www.mp.pl/ratownictwo/algorytmy/168777,triaz-od-start-do-salt
- Wikipedia, „JumpSTART triage” (źródło wtórne, przegląd walidacji): https://en.wikipedia.org/wiki/JumpSTART_triage
- Cytowane z pamięci, niepobrane w tej sesji: Benson M, Koenig KL, Schultz CH. Disaster triage: START, then SAVE. Prehosp Disaster Med. 1996;11(2):117–124 · Romig LE. Pediatric triage: a system to JumpSTART your triage of young patients at MCIs. JEMS. 2002;27(7):52–58 · Lerner EB i wsp. Mass casualty triage: an evaluation of the data and development of a proposed national guideline (SALT). Disaster Med Public Health Prep. 2008;2(Suppl 1):S25–S34.
