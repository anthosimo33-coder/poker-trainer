import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m5-1.json";
import type { PrecomputedM51Spot } from "@/content/spots/types";

export interface NashPushSpot {
  id: string;
  submoduleSlug: "m5.1";
  heroCards: [Card, Card];
  heroPosition: "SB";
  villainPosition: "BB";
  heroStack: number;
  villainStack: number;
  potBefore: number;
  scenarioLabel: string;
  category: PrecomputedM51Spot["category"];
  expected: PrecomputedM51Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM51Spot[];

export function generateNashPushSpot(rng: () => number = Math.random): NashPushSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m5.1",
    heroCards: s.heroCards,
    heroPosition: "SB",
    villainPosition: "BB",
    heroStack: s.heroStack,
    villainStack: s.villainStack,
    potBefore: s.potBefore,
    scenarioLabel: s.scenarioLabel,
    category: s.category,
    expected: { ...s.expected },
  };
}
