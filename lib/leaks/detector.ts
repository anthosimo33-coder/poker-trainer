/**
 * Leak detection v1.
 *
 * Un *pattern* devient un *leak* quand, sur les 20 derniers attempts du pattern
 * (ou tous si < 20, minimum 5), au moins une des conditions est vraie :
 *
 *  1. Accuracy basse : < 70 % d'attempts corrects (scoreLevel ∈ {excellent, juste}).
 *  2. Biais signedError systématique : |médiane(signedError)| > seuil du sous-module.
 *
 * Module pur (aucun import de valeur) : testable et embarquable dans Convex.
 */

/** Nombre minimum d'attempts pour qu'un diagnostic soit statistiquement recevable. */
export const MIN_ATTEMPTS_FOR_LEAK = 5;
/** Fenêtre d'analyse glissante. */
export const LEAK_WINDOW = 20;
/** Seuil d'accuracy en dessous duquel on signale un leak. */
export const ACCURACY_THRESHOLD = 0.7;

export type LeakSeverity = "minor" | "moderate" | "severe";

export type LeakReason =
  | { type: "low-accuracy"; accuracy: number; threshold: number }
  | {
      type: "signed-bias-high";
      median: number;
      threshold: number;
      direction: "over" | "under";
    };

export interface Leak {
  patternId: string;
  patternLabel: string;
  submoduleSlug: string;
  severity: LeakSeverity;
  reasons: LeakReason[];
  attemptsAnalyzed: number;
  accuracy: number;
  signedErrorMedian: number;
  detectedAt: number;
}

/** Infos minimales d'un pattern nécessaires au diagnostic. */
export interface LeakPatternInfo {
  patternId: string;
  label: string;
  submoduleSlug: string;
}

/** Forme minimale d'un attempt nécessaire au diagnostic. */
export interface AttemptLike {
  scoreLevel?: string;
  signedError?: number;
  isCorrect: boolean;
}

/**
 * Seuil de biais signedError au-delà duquel on signale un leak, par catégorie
 * de sous-module. Les unités diffèrent : points de % (M·I/II/IV), bb (M·III),
 * échelle binaire ±1 (M·V).
 */
export function getThresholdForSubmodule(submoduleSlug: string): number {
  const modulePrefix = submoduleSlug.slice(0, 2); // "m1".."m5"
  switch (modulePrefix) {
    case "m1":
      return 5; // pot odds — pts %
    case "m2":
      return 8; // equity — pts %
    case "m3":
      return 0.3; // EV — bb
    case "m4":
      return 8; // ICM — pts %
    case "m5":
      return 0.15; // Nash — médiane de ±1
    default:
      return 8;
  }
}

/** Médiane d'une liste de nombres (0 si vide). */
export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Un attempt compte comme « réussi » si scoreLevel ∈ {excellent, juste}. */
function isAccurate(a: AttemptLike): boolean {
  // scoreLevel est la source de vérité ; fallback sur isCorrect pour les
  // attempts legacy enregistrés avant que scoreLevel ne soit persisté.
  if (a.scoreLevel === "excellent" || a.scoreLevel === "juste") return true;
  if (a.scoreLevel === "proche" || a.scoreLevel === "faux") return false;
  return a.isCorrect;
}

function computeSeverity(
  accuracy: number,
  median: number,
  threshold: number
): LeakSeverity {
  // Seuils directs sur l'accuracy (robustes aux artefacts de virgule flottante)
  // croisés avec l'ampleur du biais (ratio à son seuil de sous-module).
  const biasRatio = threshold > 0 ? Math.abs(median) / threshold : 0; // 1 = pile au seuil
  if (accuracy < 0.5 || biasRatio >= 2) return "severe";
  if (accuracy < 0.65 || biasRatio >= 1.5) return "moderate";
  return "minor";
}

/**
 * Diagnostique un pattern. Renvoie un `Leak` si au moins une condition est
 * remplie, `null` sinon (échantillon insuffisant ou pattern sain).
 *
 * `now` est injecté pour rester déterministe (tests) et cohérent (mutation).
 */
export function detectLeak(
  pattern: LeakPatternInfo,
  attempts: AttemptLike[],
  now: number
): Leak | null {
  if (attempts.length < MIN_ATTEMPTS_FOR_LEAK) return null;

  const recent = attempts.slice(-LEAK_WINDOW);
  const correctCount = recent.filter(isAccurate).length;
  const accuracy = correctCount / recent.length;

  const signedErrors = recent.map((a) => a.signedError ?? 0);
  const median = computeMedian(signedErrors);
  const threshold = getThresholdForSubmodule(pattern.submoduleSlug);

  const reasons: LeakReason[] = [];
  if (accuracy < ACCURACY_THRESHOLD) {
    reasons.push({ type: "low-accuracy", accuracy, threshold: ACCURACY_THRESHOLD });
  }
  if (Math.abs(median) > threshold) {
    reasons.push({
      type: "signed-bias-high",
      median,
      threshold,
      direction: median > 0 ? "over" : "under",
    });
  }

  if (reasons.length === 0) return null;

  return {
    patternId: pattern.patternId,
    patternLabel: pattern.label,
    submoduleSlug: pattern.submoduleSlug,
    severity: computeSeverity(accuracy, median, threshold),
    reasons,
    attemptsAnalyzed: recent.length,
    accuracy,
    signedErrorMedian: median,
    detectedAt: now,
  };
}
