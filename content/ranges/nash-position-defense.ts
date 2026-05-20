import { rangeSize } from "@/lib/poker/range-parser";
import type { NashRange } from "./nash-bb-call";

/**
 * Ranges Nash de defense (call) face à un push selon la position du caller
 * et le stack effectif.
 *
 * Hiérarchie : plus tu es late, plus tu call large (moins de joueurs derrière =
 * moins de risque de squeeze). Plus tu es early, plus tu call tight.
 *
 * Décroissance : BB > SB > BTN > CO > MP. À 10bb :
 * BB ~24 % · SB ~17 % · BTN ~14 % · CO ~9 % · MP ~7 %.
 */

export interface PositionDefenseRange extends NashRange {
  position: "BB" | "SB" | "BTN" | "CO" | "MP";
}

const RAW: Array<Omit<PositionDefenseRange, "combos" | "percentageOfDeck">> = [
  // ===== BB defense (le plus large) =====
  {
    position: "BB",
    stackDepth: 10,
    notation: "22+, A2s+, K8s+, Q9s+, JTs, T9s, A7o+, K9o+, QTo+",
    context: "BB call vs push 10bb (déjà invest 1bb, ~24 %)",
  },
  {
    position: "BB",
    stackDepth: 15,
    notation: "33+, A7s+, KTs+, QJs, AJo+, KQo",
    context: "BB call vs push 15bb (~12 %)",
  },
  // ===== SB defense =====
  {
    position: "SB",
    stackDepth: 10,
    notation: "33+, A4s+, K9s+, QTs+, JTs, A9o+, KJo+",
    context: "SB call vs BTN push 10bb (~17 %)",
  },
  {
    position: "SB",
    stackDepth: 15,
    notation: "55+, A9s+, KJs+, QJs, AJo+",
    context: "SB call vs BTN push 15bb (~8 %)",
  },
  // ===== BTN defense (vs CO/MP push) =====
  {
    position: "BTN",
    stackDepth: 10,
    notation: "44+, A5s+, KJs+, QJs, ATo+, KJo+",
    context: "BTN call vs CO push 10bb (~14 %)",
  },
  {
    position: "BTN",
    stackDepth: 15,
    notation: "77+, A9s+, KJs+, AJo+",
    context: "BTN call vs CO push 15bb (~6 %)",
  },
  // ===== CO defense (vs MP/UTG push) =====
  {
    position: "CO",
    stackDepth: 10,
    notation: "66+, A8s+, KJs+, AJo+",
    context: "CO call vs MP push 10bb (très tight, ~9 %)",
  },
  {
    position: "CO",
    stackDepth: 15,
    notation: "99+, AJs+, AQo+",
    context: "CO call vs MP push 15bb (~4 %)",
  },
  // ===== MP defense (vs UTG push) =====
  {
    position: "MP",
    stackDepth: 10,
    notation: "77+, AJs+, AQo+, KQs",
    context: "MP call vs UTG push 10bb (premium only, ~7 %)",
  },
  {
    position: "MP",
    stackDepth: 15,
    notation: "99+, AJs+, AQo+",
    context: "MP call vs UTG push 15bb (~4 %)",
  },
];

export const NASH_POSITION_DEFENSE_RANGES: PositionDefenseRange[] = RAW.map((r) => {
  const combos = rangeSize(r.notation);
  return {
    ...r,
    combos,
    percentageOfDeck: (combos / 1326) * 100,
  };
});

export function getNashPositionDefense(
  position: PositionDefenseRange["position"],
  stackDepth: number
): PositionDefenseRange | undefined {
  return NASH_POSITION_DEFENSE_RANGES.find(
    (r) => r.position === position && r.stackDepth === stackDepth
  );
}
