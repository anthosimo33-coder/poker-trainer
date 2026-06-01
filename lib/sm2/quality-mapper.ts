/**
 * Conversion d'un attempt scoré (niveau qualitatif + erreur signée) en qualité
 * SM-2 (0-5). C'est le pont entre le scoring nuancé des drills (M·II → M·V) et
 * l'algorithme de révision espacée.
 *
 * Module pur (aucun import de valeur).
 */
import type { SM2Quality } from "./algorithm";

/**
 * Niveau de score d'un attempt, partagé par tous les sous-modules.
 * - "excellent" / "juste" : `isCorrect === true`
 * - "proche" / "faux"     : `isCorrect === false`
 * Les sous-modules binaires (M·V) ne produisent que "excellent" ou "faux".
 */
export type ScoreLevel = "excellent" | "juste" | "proche" | "faux";

/**
 * Convertit le résultat d'un attempt en qualité SM-2.
 *
 * @param scoreLevel niveau qualitatif du scoring.
 * @param signedError erreur signée (sert à distinguer un "faux" mineur d'un blackout).
 * @param isBinary `true` pour les sous-modules à scoring binaire (M·V push/fold,
 *   call/fold) : seuls 5 (correct) et 1 (faux) sont produits.
 */
export function attemptToQuality(
  scoreLevel: ScoreLevel,
  signedError: number,
  isBinary: boolean
): SM2Quality {
  if (isBinary) {
    return scoreLevel === "excellent" ? 5 : 1;
  }

  switch (scoreLevel) {
    case "excellent":
      return 5;
    case "juste":
      return 4;
    case "proche":
      return 3;
    case "faux":
      // Un "faux" avec une erreur extrême (> 15 unités) est un blackout (0) ;
      // sinon c'est un faux « plausible » (1).
      return Math.abs(signedError) > 15 ? 0 : 1;
  }
}
