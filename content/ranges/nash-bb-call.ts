import { rangeSize } from "@/lib/poker/range-parser";

/**
 * Ranges Nash BB call vs SB push selon stack effectif (en bb).
 *
 * Source : Nash equilibrium standard (HoldemResources / SnG Wizard).
 * Convention : on call si la main est dans le range, on fold sinon.
 *
 * Note : range BB call est typiquement *plus tight* que range SB push pour le
 * même stack, parce que BB n'a plus de fold equity quand il call — il doit
 * gagner au showdown. SB push capture la valeur des plis adverses ; BB call
 * doit avoir équity vraie face au range adverse.
 */

export interface NashRange {
  stackDepth: number;
  notation: string;
  combos: number;
  percentageOfDeck: number;
  context: string;
}

const RAW: Array<Omit<NashRange, "combos" | "percentageOfDeck">> = [
  {
    stackDepth: 5,
    notation:
      "22+, A2s+, K2s+, Q2s+, J3s+, T5s+, 95s+, 85s+, 75s+, 65s, A2o+, K4o+, Q7o+, J7o+, T7o+, 97o+, 87o, 76o",
    context: "BB call vs SB push 5bb (très large, ~56 %)",
  },
  {
    stackDepth: 7,
    notation:
      "22+, A2s+, K4s+, Q7s+, J8s+, T8s+, 98s, 87s, A2o+, K8o+, Q9o+, J9o+, T9o",
    context: "BB call vs SB push 7bb (~37 %)",
  },
  {
    stackDepth: 8,
    notation:
      "22+, A2s+, K7s+, Q8s+, J9s+, T9s, 98s, A4o+, K9o+, Q9o+, JTo",
    context: "BB call vs SB push 8bb (~30 %)",
  },
  {
    stackDepth: 10,
    notation:
      "22+, A2s+, K8s+, Q9s+, JTs, T9s, A7o+, K9o+, QTo+",
    context: "BB call vs SB push 10bb (référence, ~24 %)",
  },
  {
    stackDepth: 12,
    notation:
      "22+, A3s+, K9s+, QTs+, JTs, A9o+, KTo+, QJo",
    context: "BB call vs SB push 12bb (~20 %)",
  },
  {
    stackDepth: 15,
    notation: "33+, A7s+, KTs+, QJs, AJo+, KQo",
    context: "BB call vs SB push 15bb (très tight, ~12 %)",
  },
];

export const NASH_BB_CALL_RANGES: NashRange[] = RAW.map((r) => {
  const combos = rangeSize(r.notation);
  return {
    ...r,
    combos,
    percentageOfDeck: (combos / 1326) * 100,
  };
});

export function getNashBBCallRange(stackDepth: number): NashRange | undefined {
  return NASH_BB_CALL_RANGES.find((r) => r.stackDepth === stackDepth);
}
