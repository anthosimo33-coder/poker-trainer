/**
 * Évaluateur de mains de poker.
 * Wrappe la lib pokersolver (algorithme Cactus Kev, standard pro).
 * Évalue une main de 5 à 7 cartes et retourne sa catégorie + une "rank value" comparable.
 */

import { Hand } from 'pokersolver';
import type { Card } from './cards';
import { rankOf, suitOf } from './cards';

export type HandCategory =
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface EvaluatedHand {
  /** Catégorie de la main (e.g. "Flush", "Two Pair"). */
  category: HandCategory;
  /** Description lisible (e.g. "Pair, A's"). */
  description: string;
  /** Cartes de la meilleure main de 5 (parmi les 5-7 fournies). */
  bestFive: Card[];
  /** Toutes les cartes fournies (la main complète). */
  allCards: Card[];
  /** Rang pour comparaison directe (plus haut = meilleure main). */
  rank: number;
}

/**
 * Convertit notre format de carte ("Th", "As") vers le format pokersolver.
 * pokersolver utilise le même format mais avec rank toujours majuscule et suit toujours minuscule.
 * On normalise au passage.
 */
function toSolverFormat(card: Card): string {
  return `${rankOf(card)}${suitOf(card)}`;
}

/**
 * Convertit un format pokersolver vers notre Card type.
 */
function fromSolverFormat(str: string): Card {
  return `${str[0]}${str[1].toLowerCase()}` as Card;
}

/**
 * Évalue une main de 5 à 7 cartes (hole cards + board).
 * Retourne la meilleure combinaison de 5 cartes possible.
 */
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand attend 5 à 7 cartes, reçu ${cards.length}.`);
  }
  const solverHand = Hand.solve(cards.map(toSolverFormat));
  // pokersolver représente une quinte flush royale comme une "Straight Flush"
  // (solverHand.name) et ne la distingue que via solverHand.descr === 'Royal Flush'.
  const category = (
    solverHand.descr === 'Royal Flush' ? 'Royal Flush' : solverHand.name
  ) as HandCategory;
  return {
    category,
    description: solverHand.descr,
    bestFive: solverHand.cards.map((c) => fromSolverFormat(c.toString())),
    allCards: cards,
    rank: solverHand.rank,
  };
}

/**
 * Compare deux mains évaluées.
 * Retourne 1 si a > b, -1 si a < b, 0 si égalité (split pot).
 */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): -1 | 0 | 1 {
  // On re-solve les deux mains et on compare via Hand.winners (2 gagnants = split pot).
  const ha = Hand.solve(a.bestFive.map(toSolverFormat));
  const hb = Hand.solve(b.bestFive.map(toSolverFormat));
  const result = Hand.winners([ha, hb]);
  if (result.length === 2) return 0;
  if (result[0] === ha) return 1;
  return -1;
}

/**
 * Détermine le ou les gagnants parmi plusieurs mains.
 * Retourne les indices des gagnants (multiple = split pot).
 */
export function determineWinners(hands: EvaluatedHand[]): number[] {
  const solverHands = hands.map(h => Hand.solve(h.bestFive.map(toSolverFormat)));
  const winners = Hand.winners(solverHands);
  return winners.map((w) => solverHands.indexOf(w));
}
