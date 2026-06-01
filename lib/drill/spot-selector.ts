/**
 * Sélecteur de spot pour le pipeline drill.
 *
 * Au lieu de tirer un spot purement aléatoire, on priorise (60 % du temps) les
 * spots qui correspondent à un pattern « prioritaire » — c.-à-d. en leak actif
 * ou dû pour révision SM-2. Les 40 % restants restent aléatoires pour éviter de
 * tourner en boucle sur les mêmes spots et garder de la variété.
 *
 * Le mode focus (`focusPatternId`) force des spots d'un unique pattern (utilisé
 * depuis la page /leaks « Drill ce pattern »).
 */
import { getGenerator } from "@/lib/poker/spot-generators/registry";
import type { GenericSpot } from "@/lib/poker/spot-generators/types";
import { matchPatterns } from "@/content/patterns/definitions";

/** Probabilité de tirer un spot prioritaire quand il existe des patterns ciblés. */
export const PRIORITY_PROBABILITY = 0.6;
/** Nombre max de tirages en rejection sampling avant de retomber sur l'aléatoire. */
export const MAX_SAMPLING_TRIES = 40;

/** Source de priorité minimale : tout objet portant un patternId. */
export interface PrioritySource {
  patternId: string;
}

/**
 * Décide si on doit tirer un spot prioritaire. Extrait pour être testable
 * indépendamment du tirage (le ratio 60/40 ne dépend que du `roll`).
 */
export function shouldUsePriority(prioritizedCount: number, roll: number): boolean {
  return prioritizedCount > 0 && roll < PRIORITY_PROBABILITY;
}

/** Tire un spot jusqu'à en trouver un qui matche un des patterns ciblés. */
function sampleMatching(
  gen: (rng?: () => number) => GenericSpot,
  patternIds: Set<string>,
  rng: () => number
): GenericSpot | null {
  for (let i = 0; i < MAX_SAMPLING_TRIES; i++) {
    const spot = gen(rng);
    if (matchPatterns(spot).some((p) => patternIds.has(p.patternId))) {
      return spot;
    }
  }
  return null;
}

/**
 * Sélectionne le prochain spot d'un sous-module.
 *
 * @param submoduleSlug slug DB (ex. "m5.1").
 * @param leaks leaks actifs (on en extrait les patternId prioritaires).
 * @param duePatterns patterns dus pour révision SM-2 (patternId prioritaires).
 * @param focusPatternId si défini, ne tire QUE des spots de ce pattern (focus mode).
 * @param rng source d'aléa (injectable pour les tests).
 */
export function selectSpot(
  submoduleSlug: string,
  leaks: PrioritySource[],
  duePatterns: PrioritySource[],
  focusPatternId: string | null = null,
  rng: () => number = Math.random
): GenericSpot {
  const gen = getGenerator(submoduleSlug);
  if (!gen) {
    throw new Error(`Aucun générateur pour le sous-module "${submoduleSlug}".`);
  }

  // Mode focus : uniquement des spots du pattern ciblé (fallback aléatoire si
  // le sampling échoue, pour ne jamais bloquer la session).
  if (focusPatternId) {
    return sampleMatching(gen, new Set([focusPatternId]), rng) ?? gen(rng);
  }

  const prioritizedPatternIds = new Set<string>([
    ...leaks.map((l) => l.patternId),
    ...duePatterns.map((p) => p.patternId),
  ]);

  // Premier tirage de l'rng = décision priorité/aléatoire (ratio 60/40).
  const usePriority = shouldUsePriority(prioritizedPatternIds.size, rng());
  if (usePriority) {
    return sampleMatching(gen, prioritizedPatternIds, rng) ?? gen(rng);
  }
  return gen(rng);
}
