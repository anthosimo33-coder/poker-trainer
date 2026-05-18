import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m2-4.json";
import type { PrecomputedM24Spot } from "@/content/spots/types";

export interface VsRangeSpot {
  id: string;
  submoduleSlug: "m2.4";
  heroCards: [Card, Card];
  villainRangeLabel: string;
  villainRangeNotation: string;
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
  expected: {
    equity: number;
    comboCount: number;
  };
}

// JSON importé : cast typé (autorisé par les règles qualité pour les imports JSON).
const SPOTS = precomputed as unknown as PrecomputedM24Spot[];

export function generateVsRangeSpot(rng: () => number = Math.random): VsRangeSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m2.4",
    heroCards: s.heroCards,
    villainRangeLabel: s.villainRangeLabel,
    villainRangeNotation: s.villainRangeNotation,
    board: s.board,
    street: s.street,
    scenarioLabel: s.scenarioLabel,
    expected: {
      equity: s.expected.equity,
      comboCount: s.expected.comboCount,
    },
  };
}
