import type { Card } from "@/lib/poker/cards";
import precomputedSpots from "@/content/spots/m2-2.json";
import type { PrecomputedM22Spot } from "@/content/spots/types";

export interface EquitySpot {
  id: string;
  submoduleSlug: "m2.2";
  heroCards: [Card, Card];
  villainCards: [Card, Card];
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
  expected: {
    equity: number;
    method: "exact" | "monte-carlo";
    iterations: number;
    wins: number;
    losses: number;
    ties: number;
  };
}

// JSON importé : cast typé (autorisé par les règles qualité pour les imports JSON).
const SPOTS = precomputedSpots as unknown as PrecomputedM22Spot[];

export function generateEquitySpot(rng: () => number = Math.random): EquitySpot {
  const src = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${src.id}-${Date.now()}`, // unique pour la session
    submoduleSlug: "m2.2",
    heroCards: src.heroCards,
    villainCards: src.villainCards,
    board: src.board,
    street: src.street,
    scenarioLabel: src.scenarioLabel,
    expected: {
      equity: src.expected.equity,
      method: src.expected.method,
      iterations: src.expected.iterations,
      wins: src.expected.wins,
      losses: src.expected.losses,
      ties: src.expected.ties,
    },
  };
}
