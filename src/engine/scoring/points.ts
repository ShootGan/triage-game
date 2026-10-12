/** Points per patient (max `POINTS.correct`). Time is shown but never scored. */
export const POINTS = {
  correct: 10,
  /** Right colour, but the findings before the tag didn't settle it. */
  guessed: 3,
  over: 2,
  /** Any living colour for the dead: takes a team and transport from someone who can be saved. */
  overDead: 0,
  under: 0,
  untagged: 0,
  /** BLACK for a patient with a chance of survival (instead of `under`). */
  critical: -5,
  /** Each missed life-saving intervention. */
  missedLifesaving: -3,
} as const;
