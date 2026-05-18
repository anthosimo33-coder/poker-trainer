import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m3-2.json";
import type { PrecomputedM32Spot } from "@/content/spots/types";

export interface FoldEquitySpot {
  id: string;
  submoduleSlug: "m3.2";
  heroCards: [Card, Card];
  heroPosition: string;
  heroStack: number;
  villainPosition: string;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  villainTotalRangeLabel: string;
  villainTotalRangeNotation: string;
  potBefore: number;
  scenarioLabel: string;
  expected: {
    pFoldBreakEven: number;
    pFoldActual: number;
    equityVsCallRange: number;
    evIfCall: number;
    isPushProfitable: boolean;
    evBb: number;
    combosInCallRange: number;
    combosInTotalRange: number;
  };
}

// JSON importé : cast typé (autorisé par les règles qualité pour les imports JSON).
const SPOTS = precomputed as unknown as PrecomputedM32Spot[];

export function generateFoldEquitySpot(rng: () => number = Math.random): FoldEquitySpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m3.2",
    heroCards: s.heroCards,
    heroPosition: s.heroPosition,
    heroStack: s.heroStack,
    villainPosition: s.villainPosition,
    villainCallRangeLabel: s.villainCallRangeLabel,
    villainCallRangeNotation: s.villainCallRangeNotation,
    villainTotalRangeLabel: s.villainTotalRangeLabel,
    villainTotalRangeNotation: s.villainTotalRangeNotation,
    potBefore: s.potBefore,
    scenarioLabel: s.scenarioLabel,
    expected: {
      pFoldBreakEven: s.expected.pFoldBreakEven,
      pFoldActual: s.expected.pFoldActual,
      equityVsCallRange: s.expected.equityVsCallRange,
      evIfCall: s.expected.evIfCall,
      isPushProfitable: s.expected.isPushProfitable,
      evBb: s.expected.evBb,
      combosInCallRange: s.expected.combosInCallRange,
      combosInTotalRange: s.expected.combosInTotalRange,
    },
  };
}
