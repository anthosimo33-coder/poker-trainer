import { rangeSize } from "@/lib/poker/range-parser";
import type { NashRange } from "./nash-bb-call";

/**
 * Ranges Nash BTN push (vs SB+BB) selon stack effectif (en bb).
 *
 * BTN push doit être *plus tight* que SB push parce qu'il y a 2 joueurs
 * derrière (SB + BB) au lieu d'1 (BB seul pour SB push). Chaque joueur
 * additionnel augmente la probabilité d'être call avec une main forte.
 * Approximation : BTN push ≈ 70 % du range SB push pour le même stack.
 */

const RAW: Array<Omit<NashRange, "combos" | "percentageOfDeck">> = [
  {
    stackDepth: 5,
    notation:
      "22+, A2s+, K2s+, Q2s+, J5s+, T6s+, 96s+, 86s+, 75s+, 65s, A2o+, K6o+, Q8o+, J8o+, T8o+, 98o, 87o",
    context: "BTN push 5bb (large, ~48 %)",
  },
  {
    stackDepth: 7,
    notation:
      "22+, A2s+, K5s+, Q7s+, J8s+, T8s+, 98s, 87s, A2o+, K8o+, Q9o+, J9o+, T9o",
    context: "BTN push 7bb (~36 %)",
  },
  {
    stackDepth: 8,
    notation:
      "22+, A2s+, K7s+, Q8s+, J9s+, T9s, 98s, A5o+, K9o+, Q9o+, JTo",
    context: "BTN push 8bb (~29 %)",
  },
  {
    stackDepth: 10,
    notation: "22+, A4s+, K8s+, Q9s+, JTs, T9s, A8o+, K9o+, QTo+",
    context: "BTN push 10bb (référence, ~23 %)",
  },
  {
    stackDepth: 12,
    notation: "22+, A6s+, K9s+, QTs+, JTs, A9o+, KTo+, QJo",
    context: "BTN push 12bb (~19 %)",
  },
  {
    stackDepth: 15,
    notation: "33+, A7s+, KTs+, QJs, AJo+, KQo",
    context: "BTN push 15bb (premium-ish, ~12 %)",
  },
];

export const NASH_BTN_PUSH_RANGES: NashRange[] = RAW.map((r) => {
  const combos = rangeSize(r.notation);
  return {
    ...r,
    combos,
    percentageOfDeck: (combos / 1326) * 100,
  };
});

export function getNashBTNPushRange(stackDepth: number): NashRange | undefined {
  return NASH_BTN_PUSH_RANGES.find((r) => r.stackDepth === stackDepth);
}
