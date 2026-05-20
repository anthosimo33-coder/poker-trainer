import { rangeSize } from "@/lib/poker/range-parser";

/**
 * Ranges Nash push SB selon stack effectif (en bb).
 *
 * Source : calculs ICM Nash equilibrium standard (SnG Wizard / HoldemResources).
 * Convention : on push si la main est dans le range, on fold sinon. Le range
 * suppose un BB qui joue Nash en call.
 *
 * Ces ranges sont des **références académiques** : ils définissent l'équilibre
 * théorique pour push/fold SB vs BB en sit&go bulle (et plus généralement en
 * MTT bulle 4-handed).
 */

export interface NashRange {
  stackDepth: number;
  notation: string;
  combos: number;
  percentageOfDeck: number;
  context: string;
}

const RAW_RANGES: Array<Omit<NashRange, "combos" | "percentageOfDeck">> = [
  {
    stackDepth: 5,
    notation:
      "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q4o+, J6o+, T6o+, 96o+, 86o+, 75o+, 64o+, 53o+, 43o",
    context: "Push très large à 5bb (Nash ~76 %, quasi any two)",
  },
  {
    stackDepth: 7,
    notation:
      "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 53s+, A2o+, K5o+, Q8o+, J8o+, T8o+, 97o+, 87o, 76o, 65o",
    context: "Push large à 7bb (~50 % du deck)",
  },
  {
    stackDepth: 8,
    notation:
      "22+, A2s+, K3s+, Q6s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, A2o+, K7o+, Q9o+, J9o+, T9o, 98o",
    context: "Push standard 8bb (~40 % du deck)",
  },
  {
    stackDepth: 10,
    notation:
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 98s, 87s, 76s, A5o+, K9o+, Q9o+, J9o+, T9o",
    context: "Push standard 10bb (référence, ~30 % du deck)",
  },
  {
    stackDepth: 12,
    notation:
      "22+, A2s+, K7s+, Q9s+, J9s+, T9s, 98s, A7o+, KTo+, QTo+, JTo",
    context: "Push tight 12bb (~25 % du deck)",
  },
  {
    stackDepth: 15,
    notation:
      "22+, A4s+, K9s+, QTs+, JTs, A9o+, KJo+, QJo",
    context: "Push très tight 15bb (~18 %, range premium-ish)",
  },
];

export const NASH_SB_PUSH_RANGES: NashRange[] = RAW_RANGES.map((r) => {
  const combos = rangeSize(r.notation);
  return {
    ...r,
    combos,
    percentageOfDeck: (combos / 1326) * 100,
  };
});

/**
 * Trouve le range Nash correspondant à un stack effectif donné.
 * Match exact uniquement (5, 7, 8, 10, 12, 15).
 */
export function getNashSBPushRange(stackDepth: number): NashRange | undefined {
  return NASH_SB_PUSH_RANGES.find((r) => r.stackDepth === stackDepth);
}
