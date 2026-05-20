import precomputed from "@/content/spots/m4-4.json";
import type { PrecomputedM44Spot } from "@/content/spots/types";

export interface FinalTableSpot {
  id: string;
  submoduleSlug: "m4.4";
  players: { id: string; stack: number }[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  playersRemaining: number;
  pushAmount: number;
  scenarioLabel: string;
  spotType: PrecomputedM44Spot["spotType"];
  payoutSpread: number;
  expected: PrecomputedM44Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM44Spot[];

export function generateFinalTableSpot(
  rng: () => number = Math.random
): FinalTableSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m4.4",
    players: s.players,
    heroId: s.heroId,
    villainId: s.villainId,
    payoutSlug: s.payoutSlug,
    payoutLabel: s.payoutLabel,
    payouts: s.payouts,
    playersRemaining: s.playersRemaining,
    pushAmount: s.pushAmount,
    scenarioLabel: s.scenarioLabel,
    spotType: s.spotType,
    payoutSpread: s.payoutSpread,
    expected: { ...s.expected },
  };
}
