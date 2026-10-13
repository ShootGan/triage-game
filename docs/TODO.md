# TODO — co zostało (stan po 1.0.0, 2026-10-13)

Lista otwartych spraw po wydaniu 1.0.0. Decyzje medyczne mają szczegóły w [`medical-review.md`](medical-review.md)
(sekcje 0a i 0b), plan rozwoju w [`GDD.md`](GDD.md) (rozdział 10).

## Do dokończenia (kolejna sesja)

- [ ] Ekran „Segregacja”: rozpisać START, JumpSTART i SALT (do czego służą, dla kogo, różnice) ze schematami
      z panelu podpowiedzi.
- [ ] Zasady gry i punktacja (tryby, przebieg rozgrywki, kody zadań, punkty, błędy krytyczne, „zgadnięty” kolor) —
      zgodnie z `src/engine/scoring/points.ts`; osobna pozycja w menu („Jak grać”) albo część ekranu „Segregacja”.
- [ ] Źródło recenzowane dla „ocena jednej osoby trwa zwykle krócej niż minutę” (ekran „Segregacja”).
- [ ] **Na koniec:** przeprojektować menu (obecne jest przeciętne) — razem z wejściami do „Segregacja”, „Jak grać”
      i „O grze i źródła”.

## SALT — decyzje i braki

- [ ] **Reguła SZAREGO (oczekujący).** Infrastruktura jest (`salt.expectant`, opaska, ocena), ale żaden poszkodowany nie
      jest szary. Do decyzji: zasoby w odprawie (np. „2 zespoły, szpital 40 km”) a ciężkie archetypy (oparzenia ~90%,
      otwarty uraz czaszki z U).
- [ ] **Decyzje medyczne z `medical-review.md` 0b:**
  - jak gra czyta duszność (dorosły > 30 lub < 10/min, dziecko poza 15–45/min albo nieregularny oddech),
  - celowe ruchy zamiast poleceń tylko u dzieci < 3 lat (splątany dorosły → CZERWONY),
  - którzy chodzący nie mają „tylko drobnych” urazów (`g-reka`, `g-dziecko-reka`, `g-chodzi-powazne`),
  - u dziecka w bezdechu dane „oddycha po 5 oddechach” (JumpSTART) użyte też dla 2 oddechów w SALT.
- [ ] **Autostrzykawka z antidotum** — tylko razem z nowym scenariuszem CBRN (zatrucie chemiczne).
- [ ] „Tylko drobne obrażenia” ustawiane per wariant tekstu, nie per archetyp (dziś test pilnuje, żeby archetyp nie
      mieszał drobnych i poważnych wariantów).

## Ocena

- [ ] Opisy reakcji bez cudzysłowu (np. „otwiera oczy na głos”) nie liczą się jako dowód oddechu — potrzebna flaga
      w danych pacjenta.
- [ ] Część starszych wypowiedzi zdradza wynik badania (np. „wykonuje polecenia”, „nie reaguje na polecenia”) —
      przejrzeć archetypy i wzorce.
- [ ] Wagi punktów (`src/engine/scoring/points.ts`) i kara za kolejność sortowania w SALT (−1) — do weryfikacji
      na większej liczbie rozgrywek.

## Przegląd medyczny (`medical-review.md` 0a)

- [ ] `y-rdzen-szyjny` — wariant bez wstrząsu neurogennego (świadomie ŻÓŁTY); czy dodać wariant CZERWONY.
- [ ] Nowe typy pacjentów z 0a do weryfikacji przez osobę z uprawnieniami merytorycznymi.

## UI / grafika

- [ ] Punkt zbiórki: badana osoba ginie w 3D w tłumie (zasłania ją ratownik lub inni chodzący) — odsunąć grupę albo
      podświetlić badanego.
- [ ] Telefon: w pasku górnym nie widać, że gra jest w trybie SALT.
- [ ] Sporadycznie kliknięcie opaski nie zapisuje się za pierwszym razem (raz zaobserwowane, przyczyna nieznana).
- [ ] Pył / kurz na postaci także przy opisie „przygnieciony elementem konstrukcji” (`src/scenarios/injuryLook.ts`).

## Plan dalszy (z GDD)

- [ ] Pogarszanie stanu, re-triage.
- [ ] Dźwięk (oddechy, otoczenie, krzyki).
- [ ] Miejsce na scenie zależne od stanu/mechanizmu (pozy: duszność — siedząco, nieprzytomny oddychający — bocznie).
- [ ] Edytor scenariuszy, statystyki postępów.

## Proces

- [ ] Sprawdzić CI po pushu (lokalnie brak `gh`) — zakładka Actions na GitHubie.
