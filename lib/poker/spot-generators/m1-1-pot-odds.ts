/**
 * Générateur de spot M·I sous-module 1.1 — Pot odds basiques.
 *
 * Produit une situation MTT mid-stage simple : 1v1 au flop, le vilain bet une fraction du pot.
 * Le joueur doit calculer la cote et l'equity requise.
 */

import type { Card } from "@/lib/poker/cards";
import { shuffledDeck } from "@/lib/poker/cards";
import { potOdds } from "@/lib/poker/odds";

export interface PotOddsSpot {
  /** Identifiant unique du spot (pour tracking). */
  id: string;
  /** Hole cards du héros. */
  heroCards: [Card, Card];
  /** Board flop. */
  board: [Card, Card, Card];
  /** Stack effectif en bb. */
  effectiveStackBb: number;
  /** Pot au flop avant l'action vilain. */
  potBb: number;
  /** Mise du vilain. */
  betBb: number;
  /** Position du héros. */
  heroPosition: "BTN" | "CO" | "BB";
  /** Position du vilain. */
  villainPosition: "CO" | "MP" | "UTG";
  /** Réponses attendues. */
  expected: {
    requiredEquity: number;
    ratio: number;
    finalPotBb: number;
  };
}

/**
 * Choix d'un élément dans un array.
 */
function pick<T>(arr: readonly T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generatePotOddsSpot(rng: () => number = Math.random): PotOddsSpot {
  const deck = shuffledDeck([], rng);
  const heroCards: [Card, Card] = [deck[0], deck[1]];
  const board: [Card, Card, Card] = [deck[2], deck[3], deck[4]];

  const effectiveStackBb = pick([25, 30, 40, 50, 60, 80, 100], rng);
  // Pot au flop : on simule un raise préflop + un call (pot ~ 2.5 à 5bb)
  const potBb = pick([3, 4, 5, 6, 7, 8, 10], rng);
  // Bet vilain : fraction du pot (1/3, 1/2, 2/3, 3/4, pot)
  const betFraction = pick([1 / 3, 1 / 2, 2 / 3, 3 / 4, 1], rng);
  const betBb = Math.round(potBb * betFraction * 10) / 10;

  const heroPosition = pick(["BTN", "CO", "BB"] as const, rng);
  const villainPosition = pick(["CO", "MP", "UTG"] as const, rng);

  const odds = potOdds({ pot: potBb, bet: betBb });

  return {
    id: `m1-1-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    heroCards,
    board,
    effectiveStackBb,
    potBb,
    betBb,
    heroPosition,
    villainPosition,
    expected: {
      requiredEquity: odds.requiredEquity,
      ratio: odds.ratio,
      finalPotBb: odds.finalPot,
    },
  };
}
