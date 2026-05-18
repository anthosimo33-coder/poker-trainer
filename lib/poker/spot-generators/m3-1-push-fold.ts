import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m3-1.json";
import type { PrecomputedM31Spot } from "@/content/spots/types";

export interface PushFoldSpot {
  id: string;
  submoduleSlug: "m3.1";
  heroCards: [Card, Card];
  heroPosition: string;
  heroStack: number;
  villainPosition: string;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  potBefore: number;
  hasAntes: boolean;
  scenarioLabel: string;
  expected: {
    pFold: number;
    equityVsCallRange: number;
    evBb: number;
    combosInCallRange: number;
  };
}

// JSON importé : cast typé (autorisé par les règles qualité pour les imports JSON).
const SPOTS = precomputed as unknown as PrecomputedM31Spot[];

export function generatePushFoldSpot(rng: () => number = Math.random): PushFoldSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m3.1",
    heroCards: s.heroCards,
    heroPosition: s.heroPosition,
    heroStack: s.heroStack,
    villainPosition: s.villainPosition,
    villainCallRangeLabel: s.villainCallRangeLabel,
    villainCallRangeNotation: s.villainCallRangeNotation,
    potBefore: s.potBefore,
    hasAntes: s.hasAntes,
    scenarioLabel: s.scenarioLabel,
    expected: {
      pFold: s.expected.pFold,
      equityVsCallRange: s.expected.equityVsCallRange,
      evBb: s.expected.evBb,
      combosInCallRange: s.expected.combosInCallRange,
    },
  };
}
