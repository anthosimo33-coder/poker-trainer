import precomputed from "@/content/spots/m4-2.json";
import type { PrecomputedM42Spot } from "@/content/spots/types";

export interface BubbleFactorSpot {
  id: string;
  submoduleSlug: "m4.2";
  players: { id: string; stack: number }[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  pushAmount: number;
  scenarioLabel: string;
  spotType: PrecomputedM42Spot["spotType"];
  expected: PrecomputedM42Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM42Spot[];

export function generateBubbleFactorSpot(rng: () => number = Math.random): BubbleFactorSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m4.2",
    players: s.players,
    heroId: s.heroId,
    villainId: s.villainId,
    payoutSlug: s.payoutSlug,
    payoutLabel: s.payoutLabel,
    payouts: s.payouts,
    pushAmount: s.pushAmount,
    scenarioLabel: s.scenarioLabel,
    spotType: s.spotType,
    expected: { ...s.expected },
  };
}
