import type { Card } from "@/lib/poker/cards";
import { shuffledDeck } from "@/lib/poker/cards";
import { potOdds } from "@/lib/poker/odds";

export interface ReverseImpliedSpot {
  id: string;
  submoduleSlug: "m1.4";
  heroCards: [Card, Card];
  board: [Card, Card, Card];
  effectiveStackBb: number;
  potBb: number;
  betBb: number;
  heroPosition: "BTN" | "CO" | "BB";
  villainPosition: "CO" | "MP" | "UTG";
  /** Main faite du héros (description verbale, ex. "top paire kicker faible"). */
  handDescription: string;
  /** Equity actuelle estimée vs range vilain (en %). */
  apparentEquity: number;
  /** Equity réelle après ajustement reverse implied (typiquement plus basse). */
  adjustedEquity: number;
  expected: {
    requiredEquity: number;
    ratio: number;
    finalPotBb: number;
    /** Equity ajustée à utiliser pour la décision. */
    adjustedEquity: number;
    /** Estimation de la perte future moyenne en bb. */
    estimatedFutureLossBb: number;
  };
}

const HAND_PROFILES = [
  {
    description: "top paire kicker faible",
    apparent: 65,
    adjusted: 48,
    futureLoss: 4,
  },
  {
    description: "second paire kicker fort",
    apparent: 55,
    adjusted: 42,
    futureLoss: 3,
  },
  {
    description: "deuxième paire avec FD adverse possible",
    apparent: 60,
    adjusted: 45,
    futureLoss: 5,
  },
  {
    description: "overpair sur board connecté",
    apparent: 70,
    adjusted: 52,
    futureLoss: 6,
  },
  {
    description: "top paire top kicker sur board très texturé",
    apparent: 75,
    adjusted: 60,
    futureLoss: 5,
  },
] as const;

function pick<T>(arr: readonly T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateReverseImpliedSpot(rng: () => number = Math.random): ReverseImpliedSpot {
  const deck = shuffledDeck([], rng);
  const heroCards: [Card, Card] = [deck[0], deck[1]];
  const board: [Card, Card, Card] = [deck[2], deck[3], deck[4]];

  const hand = pick(HAND_PROFILES, rng);

  const effectiveStackBb = pick([50, 60, 80, 100, 150], rng);
  const potBb = pick([5, 6, 8, 10, 12, 15], rng);
  const betFraction = pick([1 / 2, 2 / 3, 3 / 4], rng);
  const betBb = Math.round(potBb * betFraction * 10) / 10;

  const heroPosition = pick(["BTN", "CO", "BB"] as const, rng);
  const villainPosition = pick(["CO", "MP", "UTG"] as const, rng);

  const base = potOdds({ pot: potBb, bet: betBb });

  return {
    id: `m1-4-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    submoduleSlug: "m1.4",
    heroCards,
    board,
    effectiveStackBb,
    potBb,
    betBb,
    heroPosition,
    villainPosition,
    handDescription: hand.description,
    apparentEquity: hand.apparent,
    adjustedEquity: hand.adjusted,
    expected: {
      requiredEquity: base.requiredEquity,
      ratio: base.ratio,
      finalPotBb: base.finalPot,
      adjustedEquity: hand.adjusted,
      estimatedFutureLossBb: hand.futureLoss,
    },
  };
}
