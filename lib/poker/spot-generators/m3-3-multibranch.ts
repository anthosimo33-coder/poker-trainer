import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m3-3.json";
import type { PrecomputedM33Spot } from "@/content/spots/types";

export interface MultiBranchSpot {
  id: string;
  submoduleSlug: "m3.3";
  heroCards: [Card, Card];
  scenario: PrecomputedM33Spot["scenario"];
  heroPosition: string;
  villainPosition: string;
  heroStack: number;
  effectiveStack: number;
  potBefore: number;
  heroActionSize: number;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  villainFourBetRangeLabel?: string;
  villainFourBetRangeNotation?: string;
  scenarioLabel: string;
  expected: {
    pFold: number;
    pCall: number;
    pFourBet: number;
    evIfFold: number;
    evIfCall: number;
    evIfFourBet: number;
    evBb: number;
    breakdown: string;
  };
}

// JSON importé : cast typé (autorisé par les règles qualité pour les imports JSON).
const SPOTS = precomputed as unknown as PrecomputedM33Spot[];

export function generateMultiBranchSpot(rng: () => number = Math.random): MultiBranchSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m3.3",
    heroCards: s.heroCards,
    scenario: s.scenario,
    heroPosition: s.heroPosition,
    villainPosition: s.villainPosition,
    heroStack: s.heroStack,
    effectiveStack: s.effectiveStack,
    potBefore: s.potBefore,
    heroActionSize: s.heroActionSize,
    villainCallRangeLabel: s.villainCallRangeLabel,
    villainCallRangeNotation: s.villainCallRangeNotation,
    ...(s.villainFourBetRangeNotation
      ? {
          villainFourBetRangeLabel: s.villainFourBetRangeLabel,
          villainFourBetRangeNotation: s.villainFourBetRangeNotation,
        }
      : {}),
    scenarioLabel: s.scenarioLabel,
    expected: {
      pFold: s.expected.pFold,
      pCall: s.expected.pCall,
      pFourBet: s.expected.pFourBet,
      evIfFold: s.expected.evIfFold,
      evIfCall: s.expected.evIfCall,
      evIfFourBet: s.expected.evIfFourBet,
      evBb: s.expected.evBb,
      breakdown: s.expected.breakdown,
    },
  };
}
