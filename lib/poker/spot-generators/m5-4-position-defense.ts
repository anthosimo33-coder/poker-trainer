import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m5-4.json";
import type { PrecomputedM54Spot } from "@/content/spots/types";

export interface PositionDefenseSpot {
  id: string;
  submoduleSlug: "m5.4";
  heroCards: [Card, Card];
  heroPosition: PrecomputedM54Spot["heroPosition"];
  villainPosition: PrecomputedM54Spot["villainPosition"];
  heroStack: number;
  pushAmount: number;
  potBefore: number;
  scenarioLabel: string;
  category: PrecomputedM54Spot["category"];
  expected: PrecomputedM54Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM54Spot[];

export function generatePositionDefenseSpot(rng: () => number = Math.random): PositionDefenseSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m5.4",
    heroCards: s.heroCards,
    heroPosition: s.heroPosition,
    villainPosition: s.villainPosition,
    heroStack: s.heroStack,
    pushAmount: s.pushAmount,
    potBefore: s.potBefore,
    scenarioLabel: s.scenarioLabel,
    category: s.category,
    expected: { ...s.expected },
  };
}
