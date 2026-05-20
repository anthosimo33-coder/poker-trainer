import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m5-3.json";
import type { PrecomputedM53Spot } from "@/content/spots/types";

export interface BTNPushSpot {
  id: string;
  submoduleSlug: "m5.3";
  heroCards: [Card, Card];
  heroPosition: "BTN";
  heroStack: number;
  potBefore: number;
  scenarioLabel: string;
  category: PrecomputedM53Spot["category"];
  expected: PrecomputedM53Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM53Spot[];

export function generateBTNPushSpot(rng: () => number = Math.random): BTNPushSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m5.3",
    heroCards: s.heroCards,
    heroPosition: "BTN",
    heroStack: s.heroStack,
    potBefore: s.potBefore,
    scenarioLabel: s.scenarioLabel,
    category: s.category,
    expected: { ...s.expected },
  };
}
