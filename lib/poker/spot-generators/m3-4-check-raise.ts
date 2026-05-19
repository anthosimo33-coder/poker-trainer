import type { Card } from "@/lib/poker/cards";
import precomputed from "@/content/spots/m3-4.json";
import type { PrecomputedM34Spot } from "@/content/spots/types";

export interface CheckRaiseSpot {
  id: string;
  submoduleSlug: "m3.4";
  heroCards: [Card, Card];
  board: [Card, Card, Card];
  heroPosition: string;
  villainPosition: string;
  potPreflop: number;
  cbetSize: number;
  raiseSize: number;
  effectiveStack: number;
  villainCBetRangeLabel: string;
  villainCBetRangeNotation: string;
  villainCallVsRaiseRangeLabel: string;
  villainCallVsRaiseRangeNotation: string;
  villain3BetRangeLabel: string;
  villain3BetRangeNotation: string;
  boardTexture: PrecomputedM34Spot["boardTexture"];
  heroHandType: PrecomputedM34Spot["heroHandType"];
  scenarioLabel: string;
  expected: PrecomputedM34Spot["expected"];
}

// JSON importé : cast typé (autorisé pour les imports JSON).
const SPOTS = precomputed as unknown as PrecomputedM34Spot[];

export function generateCheckRaiseSpot(rng: () => number = Math.random): CheckRaiseSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m3.4",
    heroCards: s.heroCards,
    board: s.board,
    heroPosition: s.heroPosition,
    villainPosition: s.villainPosition,
    potPreflop: s.potPreflop,
    cbetSize: s.cbetSize,
    raiseSize: s.raiseSize,
    effectiveStack: s.effectiveStack,
    villainCBetRangeLabel: s.villainCBetRangeLabel,
    villainCBetRangeNotation: s.villainCBetRangeNotation,
    villainCallVsRaiseRangeLabel: s.villainCallVsRaiseRangeLabel,
    villainCallVsRaiseRangeNotation: s.villainCallVsRaiseRangeNotation,
    villain3BetRangeLabel: s.villain3BetRangeLabel,
    villain3BetRangeNotation: s.villain3BetRangeNotation,
    boardTexture: s.boardTexture,
    heroHandType: s.heroHandType,
    scenarioLabel: s.scenarioLabel,
    expected: { ...s.expected },
  };
}
