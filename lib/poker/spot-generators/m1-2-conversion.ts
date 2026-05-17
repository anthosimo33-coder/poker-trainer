import type { Card } from "@/lib/poker/cards";
import { shuffledDeck } from "@/lib/poker/cards";
import { potOdds } from "@/lib/poker/odds";

export type ConversionMode = "ratio" | "percent" | "cross";

export interface PotOddsConversionSpot {
  id: string;
  submoduleSlug: "m1.2";
  mode: ConversionMode;
  heroCards: [Card, Card];
  board: [Card, Card, Card];
  effectiveStackBb: number;
  potBb: number;
  betBb: number;
  heroPosition: "BTN" | "CO" | "BB";
  villainPosition: "CO" | "MP" | "UTG";
  /** Format à fournir dans le drill */
  ask: "ratio" | "percent";
  /** Pour le mode cross, on donne au user la valeur dans l'autre format */
  given?: { kind: "ratio" | "percent"; value: number };
  expected: {
    requiredEquity: number;
    ratio: number;
    finalPotBb: number;
  };
}

function pick<T>(arr: readonly T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generatePotOddsConversionSpot(rng: () => number = Math.random): PotOddsConversionSpot {
  const deck = shuffledDeck([], rng);
  const heroCards: [Card, Card] = [deck[0], deck[1]];
  const board: [Card, Card, Card] = [deck[2], deck[3], deck[4]];

  const effectiveStackBb = pick([25, 30, 40, 50, 60, 80, 100], rng);
  const potBb = pick([3, 4, 5, 6, 7, 8, 10, 12], rng);
  const betFraction = pick([1 / 3, 1 / 2, 2 / 3, 3 / 4, 1], rng);
  const betBb = Math.round(potBb * betFraction * 10) / 10;

  const heroPosition = pick(["BTN", "CO", "BB"] as const, rng);
  const villainPosition = pick(["CO", "MP", "UTG"] as const, rng);

  const odds = potOdds({ pot: potBb, bet: betBb });

  // Tirage aléatoire du mode : 40 % ratio, 40 % percent, 20 % cross
  const r = rng();
  const mode: ConversionMode = r < 0.4 ? "ratio" : r < 0.8 ? "percent" : "cross";

  let ask: "ratio" | "percent";
  let given: PotOddsConversionSpot["given"];
  if (mode === "ratio") {
    ask = "ratio";
  } else if (mode === "percent") {
    ask = "percent";
  } else {
    // Cross : on donne un format, on demande l'autre
    if (rng() < 0.5) {
      ask = "ratio";
      given = { kind: "percent", value: odds.requiredEquity };
    } else {
      ask = "percent";
      given = { kind: "ratio", value: odds.ratio };
    }
  }

  return {
    id: `m1-2-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    submoduleSlug: "m1.2",
    mode,
    heroCards,
    board,
    effectiveStackBb,
    potBb,
    betBb,
    heroPosition,
    villainPosition,
    ask,
    given,
    expected: {
      requiredEquity: odds.requiredEquity,
      ratio: odds.ratio,
      finalPotBb: odds.finalPot,
    },
  };
}
