# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Highway terrain for the pile-up scenario: two lanes plus a hard shoulder, a grassed median with
  a double steel guardrail, the opposite carriageway, roadside guardrails, a kilometre post and an A2 sign.
- Vehicle variants: sedan, hatchback, SUV and van, crashed versions (crumpled front, cracked
  windscreen, blinking hazard lights), an overturned car and a jackknifed truck.
- ZRM ambulance modelled on current Polish ambulances (high-roof van, red/blue livery, roof chevrons,
  mirrored "AMBULANS" on the hood, alternating blue lights) — for now only in the pile-up scenario.
- Crash details: spilled cargo, skid marks, fuel spill and warning triangles.
- "Pojazdy" scene on the render demo page for reviewing models.

### Changed

- Pile-up scenario renamed to "Karambol na autostradzie"; the briefing no longer mentions fog.

### Fixed

- Clinical contradictions from the medical review: an apnoeic patient described as breathing,
  early burn shock explained by an associated internal injury, a forearm fracture used to explain
  inability to walk, and a remark that contradicted the patient's pose.
- Flickering (z-fighting) on vehicle models caused by coplanar faces.

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

[Unreleased]: https://github.com/ShootGan/triage-game/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ShootGan/triage-game/compare/v0.2...v0.3.0
[0.2.0]: https://github.com/ShootGan/triage-game/compare/v0.1-mvp...v0.2
[0.1.0]: https://github.com/ShootGan/triage-game/releases/tag/v0.1-mvp
