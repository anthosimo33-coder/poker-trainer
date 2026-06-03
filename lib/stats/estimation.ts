/**
 * S11 — Calibration & biais : fonctions PURES de mapping et d'extraction.
 *
 * Partagé entre les queries Convex (`convex/stats.ts`, import relatif) et les
 * tests unitaires. Aucun import de valeur d'app (seuls des types `@/` erasés).
 *
 * Découverte clé Phase 1 : `recordAttempt` stocke DÉJÀ `userAnswer` (le sac de
 * saisies user) ET `expected` (l'objet attendu du spot) en `v.any()`. Donc le
 * couple (estimé, réel) est reconstructible pour TOUT l'historique numérique —
 * **aucune migration de schéma n'est nécessaire**. Le graphe de calibration se
 * peuple à partir de tous les attempts existants, pas seulement des nouveaux.
 */

/** Échelle d'estimation d'un sous-module (dérivée PURE du slug, pas de champ DB). */
export type EstimationKind =
  | "equity_winrate" // M2.1–M2.4 : % d'équité — calibration
  | "icm_equity" // M4.1, M4.4 : % d'équité ICM — calibration
  | "ev_bb" // M3.1, M3.3, M3.4 : EV en bb — biais
  | "bubble_factor" // M4.2, M4.3 : ratio — biais
  | "none"; // M1.x (exact), M3.2 (pFoldBE %), M5.x (binaire)

const KIND_BY_SUBMODULE: Record<string, EstimationKind> = {
  "m2.1": "equity_winrate",
  "m2.2": "equity_winrate",
  "m2.3": "equity_winrate",
  "m2.4": "equity_winrate",
  // M3.1/M3.3/M3.4 : signedError stocké = userEV − trueEV (bb). M3.2 EXCLU : son
  // signedError est sur l'échelle pFoldBreakeven (pts %), pas bb — le mélanger
  // fausserait mean/median de l'histogramme ev_bb. Traité comme "none".
  "m3.1": "ev_bb",
  "m3.3": "ev_bb",
  "m3.4": "ev_bb",
  "m4.1": "icm_equity",
  "m4.4": "icm_equity",
  "m4.2": "bubble_factor",
  "m4.3": "bubble_factor",
};

/** Les sous-modules d'un kind donné (ordre stable pour les séries du graphe). */
export const SUBMODULES_BY_KIND: Record<EstimationKind, string[]> = {
  equity_winrate: ["m2.1", "m2.2", "m2.3", "m2.4"],
  icm_equity: ["m4.1", "m4.4"],
  ev_bb: ["m3.1", "m3.3", "m3.4"],
  bubble_factor: ["m4.2", "m4.3"],
  none: [],
};

export function estimationKind(submoduleSlug: string): EstimationKind {
  return KIND_BY_SUBMODULE[submoduleSlug] ?? "none";
}

/** Parse une saisie user (string « 30.8 % » / « 2,5 ») ou un nombre déjà typé. */
export function parseNumeric(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const cleaned = input.replace(",", ".").replace(/[%\s]/g, "").trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Lit un champ numérique d'un blob `expected` (tolérant au `any`). */
function numericField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type Blob = Record<string, unknown> | null | undefined;

export interface CalibrationPair {
  /** Estimé par l'user (axe X). */
  predicted: number;
  /** Valeur réelle attendue (axe Y). */
  actual: number;
}

/**
 * Reconstruit (estimé, réel) pour un attempt de calibration (equity_winrate ou
 * icm_equity). `null` si non applicable ou champs manquants/illisibles.
 */
export function calibrationPair(
  submoduleSlug: string,
  userAnswer: Blob,
  expected: Blob
): CalibrationPair | null {
  if (!userAnswer || !expected) return null;
  let predicted: number | null = null;
  let actual: number | null = null;
  switch (submoduleSlug) {
    case "m2.1": // outs → équité approx (règle des 4&2)
      predicted = parseNumeric(userAnswer.equityInput);
      actual = numericField(expected.equityApprox);
      break;
    case "m2.2":
    case "m2.3":
    case "m2.4":
      predicted = parseNumeric(userAnswer.equityHu);
      actual = numericField(expected.equity);
      break;
    case "m4.1":
      predicted = parseNumeric(userAnswer.equityIcmInput);
      actual = numericField(expected.heroEquityPercent);
      break;
    case "m4.4":
      predicted = parseNumeric(userAnswer.equityIcmFtInput);
      actual = numericField(expected.heroEquityBefore);
      break;
    default:
      return null;
  }
  if (predicted === null || actual === null) return null;
  return { predicted, actual };
}

/**
 * Erreur SIGNÉE (estimé − réel) pour un attempt de biais.
 *
 * - ev_bb (m3.1/m3.3/m3.4) : le `signedError` stocké EST l'erreur EV (bb).
 * - bubble_factor (m4.2/m4.3) : on (re)dérive l'erreur sur le BF **ratio** pour
 *   que les deux sous-modules partagent la même échelle. M4.3 saisit le BF
 *   directement ; M4.2 saisit eq_ICM → BF implicite = f/(1−f). (Le `signedError`
 *   stocké est inutilisable ici : errICM en pts % pour M4.2 vs errBF ratio pour
 *   M4.3 = deux échelles.)
 *
 * Positif = surestimation (optimiste), négatif = sous-estimation.
 */
export function biasValue(
  submoduleSlug: string,
  userAnswer: Blob,
  expected: Blob,
  signedError: number | null | undefined
): number | null {
  switch (submoduleSlug) {
    case "m3.1":
    case "m3.3":
    case "m3.4":
      return typeof signedError === "number" && Number.isFinite(signedError)
        ? signedError
        : null;
    case "m4.3": {
      if (!userAnswer || !expected) return null;
      const userBf = parseNumeric(userAnswer.bfAdjustedInput);
      const trueBf = numericField(expected.adjustedBubbleFactor);
      if (userBf === null || trueBf === null) return null;
      return round2(userBf - trueBf);
    }
    case "m4.2": {
      if (!userAnswer || !expected) return null;
      const eqIcmPct = parseNumeric(userAnswer.equityIcmReqInput); // % 0-100
      const trueBf = numericField(expected.bubbleFactor);
      if (eqIcmPct === null || trueBf === null) return null;
      const f = eqIcmPct / 100;
      if (f <= 0 || f >= 1) return null; // BF implicite indéfini aux bornes
      const userBf = f / (1 - f);
      return round2(userBf - trueBf);
    }
    default:
      return null;
  }
}
