# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Random codes have fewer walking-wounded and more patients who need decisions: green 25–40%
  (was 40–55%), yellow 25–35%, red 20–30%, black 4–12%. Existing codes give a different set.

## [0.4.1] - 2026-10-11

### Changed

- Train derailment and hall collapse are the largest scenes: 26 template casualties (random codes
  24–30) on a wider area; scenarios can now declare their own patient area (`bounds`).
- Hall collapse (winter): cold skin makes capillary refill read prolonged for everyone, so only
  the radial pulse counts as a perfusion check there; the debrief explains why.

## [0.4.0] - 2026-10-11

### Added

- New scenario "Katastrofa kolejowa" (fictional regional train derailment on an embankment):
  16 patients (4 green, 4 yellow, 6 red, 2 black, two children on JumpSTART), PSP firefighters at
  the wagons, fire engine, ambulance and police on a dirt service road. Random codes `POCIAG-XXXX`
  with a new train-crash mechanism (no seat-belt or steering-wheel injuries) and two train-specific
  patient types.
- New scenario "Zawalenie dachu hali" (fictional, inspired by Katowice 2006): the snow-loaded roof of
  an exhibition hall collapses during a winter fair. 16 template patients (4 green, 5 yellow, 5 red,
  2 black) — visitors, exhibitors and families with children. Random codes with the `HALA` prefix.
- "School bus" scene: the car driver is always trapped in the driver's seat (template and every
  random code) while two PSP firefighters cut the car open — hydraulic cutter and spreader, power
  unit with hoses, roof and door already removed. The patient is examined as usual; the medic stands
  at the open door and the bleeding runs over the door sill.
- Children aged 9–12: a colour is accepted from either JumpSTART or START (sources disagree on the
  age limit); the debrief shows both paths.
- "Critical error" badge and summary tile for BLACK given to a patient with a chance of survival.
- Debrief teaching notes: Romig's list of significant external injuries for infants, urgent
  secondary triage for pregnant patients with warning signs, left-side positioning in shock, and a
  note that JumpSTART tends to under-triage seriously injured children (Vassallo 2022, Stefani 2022).
- New generator patient: drowsy adult with a head injury (AVPU "V") who obeys commands — YELLOW in START.
- Terrains: highway (two lanes, hard shoulder, median with guardrails, opposite carriageway), railway
  (ballast embankment, rails, overhead-line masts, service road), winter (snow, ploughed car park,
  snow piles, snow-capped trees), and a rural road with edge lines, gravel shoulders, tree rows,
  bushes, delineators, a power line, road signs, a house and a crop field.
- 3D models: ZRM ambulance, PSP fire engine, police car (current livery), firefighters, car variants
  (sedan, hatchback, SUV, van, crashed, overturned, cut open), jackknifed truck, crashed school bus,
  regional EMU car (upright, derailed, crushed cab), exhibition hall with a collapsed roof, roof
  panels and bent girders, neighbouring tenements forming a street frontage, speaker tower, festival
  stalls, litter, belongings, dust/smoke/snow clouds, knocked-over barrier, cones, spilled cargo,
  skid marks and fuel spills.
- Scenes dressed with these models: pile-up, bus collision (head-on crash, fire engine blocking the
  road), school bus, tenement (street frontage, firefighters searching the rubble, dust and smoke).
- Render demo: "Pojazdy" and "Nowe modele" scenes for reviewing models.

### Changed

- "Incomplete procedure" now also covers a correct colour given without the assessment that decides
  it, and a tag placed before controlling a major bleed — both count as errors.
- START perfusion: radial pulse and capillary refill are interchangeable — when perfusion is adequate
  either one counts. Patients in shock have both an absent radial pulse and CRT > 2 s, and scenario
  validation rejects a palpable pulse with CRT > 2 s, so either check gives the same answer.
- 5 rescue breaths take 15 s (was 10 s).
- Pulse button reads "Tętno obwodowe" for children (brachial for infants); the pulse is checked on an
  uninjured limb when a limb bleeds.
- AVPU "P" results describe the full range of appropriate / inappropriate responses; patients with
  AVPU "V" may obey commands.
- CRT in a dead patient reads "brak — nieoznaczalny"; in young children it notes that JumpSTART does
  not use CRT.
- Infant injury texts follow Romig's criteria; pregnancy texts and remarks no longer give away exam
  results.
- Narrator remarks are shown in italics instead of quotes; Polish closing quotes.
- Hint describes JumpSTART as "looks like a child (usually up to ~8 years)" and lists the infant
  injury criteria.
- Pile-up scenario renamed to "Karambol na autostradzie"; the briefing no longer mentions fog.
- On portrait screens the camera stays on the facade side of buildings so roofs don't hide patients.
- Some random codes produce a different patient set than in 0.3.0 (new slots, archetypes and props).

### Fixed

- Clinical contradictions from the medical review: an apnoeic patient described as breathing, early
  burn shock explained by an associated internal injury, a forearm fracture used to explain inability
  to walk, and a remark that contradicted the patient's pose.
- School bus model hovered with its front ~0.6 m above the road (tilted about the wrong axis).
- Flickering (z-fighting) on vehicle models caused by coplanar faces.
- Decimal comma in the START perfusion step of the debrief path; "ok. 32 lat" in labels.

## [0.3.0] - 2026-10-11

### Added

- New debrief verdict "Kolor poprawny, niepełna procedura" (counted as an error): the right colour
  given without the algorithm step that decides it — e.g. BLACK without opening the airway,
  or a child tagged BLACK without a pulse check / 5 rescue breaths when a pulse is present.
- Debrief marks actions performed after the tag ("· po opasce"), shows when the tag was placed
  and explains all verdicts in a legend.
- App version (e.g. `v0.3.0`) shown in the menu footer, read from `package.json` at build time.
- This changelog and a README with the release process.

### Changed

- Life-saving notes (airway, rescue breaths, bleeding control) are judged by what was done
  before the last tag, not by the final exam state.
- Removed the "ćwiczenia segregacji" subtitle from the menu title.
- Debrief summary tiles wrap to the available width.

### Fixed

- Tagging an apnoeic patient BLACK (or RED) with the correct colour but without the required
  steps no longer counts as a correct triage.

## [0.2.0] - 2026-10-11

### Added

- Four new scenarios: highway pile-up, gas explosion in a tenement house,
  panic at an open-air concert and grandstand collapse at a school fair (mostly children).
- Special scenario "Zderzenie autobusów: ciężarne i dzieci" (bus collision, 20–26 casualties,
  about half children and 30–40% pregnant women), with a visible pregnancy on characters.
- Randomised casualties: each start generates a different, clinically consistent set of patients
  from 54 clinical archetypes, with a realistic category mix verified by the triage engine.
- Task codes (e.g. `KAMIENICA-4F7K`): the same code always reproduces the same situation;
  enter it in the menu, copy it from the briefing or debrief, or "play the same code" again.
  Each scenario keeps its hand-made reference set under a fixed `-WZOR` code.
- "Sytuacja" choice in the menu: random casualties or the fixed reference set.
- Phone support: touch controls (one-finger rotate, pinch zoom, tap tolerance), compact HUD,
  examination panel as a bottom drawer showing the latest finding, camera framing for portrait screens.
- New terrains (road, street with pavements, open field) and props (truck, rubble, tenement,
  stage, barriers, grandstand, tent, coach; varied car colours).
- Shared scenario validator (geometry and clinical consistency).
- Deployment to GitHub Pages and CI running type checks, tests and the production build on every push and PR.

### Changed

- Learn mode now shows the algorithm panel on demand (key H) with an untimed stopwatch;
  practice mode uses the scenario time limit.
- Overview camera framing moved below the HUD bar.
- On phones the triage category buttons are no longer cut off.

### Removed

- Exam mode (previously shown in the menu as "coming soon").

### Fixed

- An infant given a simple command is no longer described as confused.

## [0.1.0] - 2026-10-10

### Added

- First playable version (MVP) of the triage training game with a Polish UI.
- START (adults) and JumpSTART (children) triage engine with automated tests;
  the correct category is computed from patient parameters, not hard-coded.
- Patient examination (breathing, airway opening, rescue breaths, radial pulse, capillary refill,
  commands/AVPU, bleeding control) with results shown as text, and triage tags.
- Scenario "Wypadek autobusu szkolnego" (school bus crash, 12 casualties).
- 3D view with a pixel-art filter: procedurally generated characters and poses,
  a rescuer walking between patients, visible bleeding and tourniquet, assembly point.
- UI: menu, briefing, examination panel, triage markers, algorithm hint, stopwatch and HUD.
- Debrief with accuracy, over-/undertriage and per-patient decision paths.
- Learn and practice modes.

[Unreleased]: https://github.com/ShootGan/triage-game/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/ShootGan/triage-game/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/ShootGan/triage-game/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ShootGan/triage-game/compare/v0.2...v0.3.0
[0.2.0]: https://github.com/ShootGan/triage-game/compare/v0.1-mvp...v0.2
[0.1.0]: https://github.com/ShootGan/triage-game/releases/tag/v0.1-mvp
