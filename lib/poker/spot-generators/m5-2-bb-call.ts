import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m5-2.json";
import type { PrecomputedM52Spot } from "@/content/spots/types";

export interface BBCallSpot {
  id: string;
  submoduleSlug: "m5.2";
  heroCards: [Card, Card];
  heroPosition: "BB";
  villainPosition: "SB";
  heroStack: number;
  villainStack: number;
  pushAmount: number;
  potBefore: number;
  scenarioLabel: string;
  category: PrecomputedM52Spot["category"];
  expected: PrecomputedM52Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM52Spot[];

export function generateBBCallSpot(rng: () => number = Math.random): BBCallSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m5.2",
    heroCards: s.heroCards,
    heroPosition: "BB",
    villainPosition: "SB",
    heroStack: s.heroStack,
    villainStack: s.villainStack,
    pushAmount: s.pushAmount,
    potBefore: s.potBefore,
    scenarioLabel: s.scenarioLabel,
    category: s.category,
    expected: { ...s.expected },
  };
}
