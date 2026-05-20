import precomputed from "@/content/spots/m4-1.json";
import type { PrecomputedM41Spot } from "@/content/spots/types";

export interface ICMSpot {
  id: string;
  submoduleSlug: "m4.1";
  players: { id: string; stack: number }[];
  heroId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  scenarioLabel: string;
  spotType: PrecomputedM41Spot["spotType"];
  expected: PrecomputedM41Spot["expected"];
}

const SPOTS = precomputed as unknown as PrecomputedM41Spot[];

export function generateICMSpot(rng: () => number = Math.random): ICMSpot {
  const s = SPOTS[Math.floor(rng() * SPOTS.length)];
  return {
    id: `${s.id}-${Date.now()}`,
    submoduleSlug: "m4.1",
    players: s.players,
    heroId: s.heroId,
    payoutSlug: s.payoutSlug,
    payoutLabel: s.payoutLabel,
    payouts: s.payouts,
    scenarioLabel: s.scenarioLabel,
    spotType: s.spotType,
    expected: { ...s.expected, allEquities: { ...s.expected.allEquities } },
  };
}
