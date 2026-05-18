import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m2-3.json";
import type { PrecomputedM23Spot } from "@/content/spots/types";

export interface MultiwaySpot {
  id: string;
  submoduleSlug: "m2.3";
  heroCards: [Card, Card];
  villain1Cards: [Card, Card];
  villain2Cards: [Card, Card];
  board: Card[];
  street: "flop" | "turn";
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
const SPOTS = precomputed as unknown as PrecomputedM23Spot[];

export function generateMultiwaySpot(rng: () => number = Math.random): MultiwaySpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m2.3",
    heroCards: s.heroCards,
    villain1Cards: s.villain1Cards,
    villain2Cards: s.villain2Cards,
    board: s.board,
    street: s.street,
    scenarioLabel: s.scenarioLabel,
    expected: {
      equity: s.expected.equity,
      method: s.expected.method,
      iterations: s.expected.iterations,
      wins: s.expected.wins,
      losses: s.expected.losses,
      ties: s.expected.ties,
    },
  };
}
