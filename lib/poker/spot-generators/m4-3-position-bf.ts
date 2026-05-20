import precomputed from "@/content/spots/m4-3.json";
import type { PrecomputedM43Spot } from "@/content/spots/types";

export interface PositionBubbleFactorSpot {
  id: string;
  submoduleSlug: "m4.3";
  players: { id: string; stack: number }[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  pushAmount: number;
  heroPosition: PrecomputedM43Spot["heroPosition"];
  playersLeftToAct: number;
  scenarioLabel: string;
  spotType: PrecomputedM43Spot["spotType"];
  expected: PrecomputedM43Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM43Spot[];

export function generatePositionBubbleFactorSpot(
  rng: () => number = Math.random
): PositionBubbleFactorSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m4.3",
    players: s.players,
    heroId: s.heroId,
    villainId: s.villainId,
    payoutSlug: s.payoutSlug,
    payoutLabel: s.payoutLabel,
    payouts: s.payouts,
    pushAmount: s.pushAmount,
    heroPosition: s.heroPosition,
    playersLeftToAct: s.playersLeftToAct,
    scenarioLabel: s.scenarioLabel,
    spotType: s.spotType,
    expected: { ...s.expected },
  };
}
