/**
 * Algorithme SuperMemo-2 (SM-2) adapté à la révision espacée de *patterns* de
 * jeu (et non de flashcards classiques).
 *
 * Le principe reste identique au SM-2 d'origine :
 *  - `easinessFactor` (EF) : difficulté perçue du pattern, démarre à 2.5, plancher 1.3.
 *  - `interval` : nombre de jours avant la prochaine révision due.
 *  - `repetition` : compteur de réussites consécutives (reset à 0 sur échec).
 *
 * Module 100 % pur (aucun import de valeur) : utilisable côté client, côté
 * tests Vitest et dans le runtime Convex sans dépendance externe.
 */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface SM2State {
  patternId: string;
  /** Easiness Factor — défaut 2.5, jamais sous 1.3. */
  easinessFactor: number;
  /** Intervalle courant en jours. */
  interval: number;
  /** Réussites consécutives. */
  repetition: number;
  /** Timestamp ms de la prochaine révision due. */
  nextReviewAt: number;
  /** Timestamp ms de la dernière révision. */
  lastReviewedAt: number;
}

/**
 * Qualité de la réponse, convention SM-2 :
 * 0 = blackout total (faux + erreur extrême)
 * 1 = faux mais réponse plausible
 * 2 = faux + hésitation
 * 3 = correct mais avec effort
 * 4 = correct, naturel
 * 5 = correct, parfaitement automatique
 */
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

/** Plancher de l'easiness factor imposé par l'algorithme SM-2. */
export const MIN_EASINESS_FACTOR = 1.3;
/** Easiness factor d'un pattern jamais révisé. */
export const DEFAULT_EASINESS_FACTOR = 2.5;

/**
 * Calcule le prochain état SM-2 à partir de l'état courant, d'une qualité de
 * réponse et de l'instant `now` (timestamp ms).
 *
 * - quality < 3 : la séquence est cassée — on repart à un intervalle de 1 jour
 *   (re-révision le lendemain) et l'EF est pénalisé.
 * - quality >= 3 : on progresse (1 j → 6 j → interval × EF) et l'EF est ajusté.
 */
export function nextState(current: SM2State, quality: SM2Quality, now: number): SM2State {
  // L'EF est toujours réévalué (même sur échec) selon la formule SM-2 standard.
  const newEF = Math.max(
    MIN_EASINESS_FACTOR,
    current.easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    return {
      ...current,
      repetition: 0,
      interval: 1,
      easinessFactor: newEF,
      nextReviewAt: now + 1 * ONE_DAY_MS,
      lastReviewedAt: now,
    };
  }

  const newRepetition = current.repetition + 1;
  let newInterval: number;
  if (newRepetition === 1) {
    newInterval = 1;
  } else if (newRepetition === 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(current.interval * current.easinessFactor);
  }

  return {
    ...current,
    repetition: newRepetition,
    interval: newInterval,
    easinessFactor: newEF,
    nextReviewAt: now + newInterval * ONE_DAY_MS,
    lastReviewedAt: now,
  };
}

/**
 * État initial d'un pattern jamais révisé : due immédiatement (`nextReviewAt = 0`).
 */
export function newState(patternId: string): SM2State {
  return {
    patternId,
    easinessFactor: DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetition: 0,
    nextReviewAt: 0,
    lastReviewedAt: 0,
  };
}
