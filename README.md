# Triage

A browser game for practising mass-casualty triage with the **START** (adults) and
**JumpSTART** (children) algorithms. You walk between casualties at an incident scene,
examine them, assign triage tags and get a detailed debrief. The UI is in **Polish**
(Polish EMS terminology); it runs on desktop and phones.

Play online: https://shootgan.github.io/triage-game/

Design notes (Polish): [docs/GDD.md](docs/GDD.md) · Changes: [CHANGELOG.md](CHANGELOG.md)

## Development

Requires Node.js 20.

```sh
npm ci            # install dependencies
npm run dev       # dev server (http://localhost:5173)
npm test          # unit tests (Vitest)
npm run typecheck # TypeScript type check
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

Stack: Vite, TypeScript, React, Three.js, Zustand, Vitest. Pushes to `main` are deployed
to GitHub Pages; CI runs type checks, tests and the build on every push and pull request.

## Versioning and releases

The project follows [Semantic Versioning](https://semver.org/). The version in
`package.json` is shown in the menu footer.

To release:

1. Bump `"version"` in `package.json` (e.g. `0.3.0`).
2. In `CHANGELOG.md`, move the entries from `## [Unreleased]` under a new
   `## [X.Y.Z] - YYYY-MM-DD` heading and update the compare links at the bottom.
3. Commit (`chore(release): X.Y.Z`) and tag the commit `vX.Y.Z`.

Older tags use a different naming: `v0.1-mvp` (0.1.0) and `v0.2` (0.2.0).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) in English, e.g.
`feat(menu): ...`, `fix(scoring): ...`, `docs: ...`, `chore(release): ...`.
Imperative subject up to 72 characters; the body explains why.

## Medical disclaimer

This is an educational tool. Scenarios, algorithms and feedback are simplified and
have not been formally validated. Do not use it as a clinical reference — verify
procedures with your instructors and current guidelines.
