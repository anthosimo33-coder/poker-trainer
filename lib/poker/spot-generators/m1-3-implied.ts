import type { Card } from "@/lib/poker/cards";
import { shuffledDeck } from "@/lib/poker/cards";
import { potOdds, impliedOdds } from "@/lib/poker/odds";

export interface ImpliedOddsSpot {
  id: string;
  submoduleSlug: "m1.3";
  heroCards: [Card, Card];
  board: [Card, Card, Card];
  effectiveStackBb: number;
  potBb: number;
  betBb: number;
  heroPosition: "BTN" | "CO" | "BB";
  villainPosition: "CO" | "MP" | "UTG";
  /** Equity réelle estimée du tirage du héros (en %). On la fournit au user. */
  realEquity: number;
  /** Description verbale du tirage (ex. "tirage couleur"). */
  drawDescription: string;
  expected: {
    requiredEquity: number;
    ratio: number;
    finalPotBb: number;
    /** Gain futur supplémentaire moyen à extraire pour break-even. */
    neededExtraBb: number;
    /** Ratio implied vs bet. */
    impliedRatio: number;
  };
}

const DRAW_PROFILES = [
  { description: "tirage couleur", equity: 36 },
  { description: "tirage quinte bilatérale", equity: 32 },
  { description: "tirage quinte ventrale", equity: 16 },
  { description: "double tirage (couleur + quinte)", equity: 54 },
  { description: "tirage couleur + over", equity: 45 },
] as const;

function pick<T>(arr: readonly T[], rng = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateImpliedOddsSpot(rng: () => number = Math.random): ImpliedOddsSpot {
  const deck = shuffledDeck([], rng);
  const heroCards: [Card, Card] = [deck[0], deck[1]];
  const board: [Card, Card, Card] = [deck[2], deck[3], deck[4]];

  // Sélectionne un profil de tirage où l'equity est INSUFFISANTE par rapport à la cote
  // (sinon le concept d'implied n'a pas de sens — equity actuelle déjà profitable)
  // → on biaise vers des tirages quinte ventrale, ou des bets élevés sur tirages couleur
  const draw = pick(DRAW_PROFILES, rng);

  const effectiveStackBb = pick([40, 50, 60, 80, 100, 150], rng);
  const potBb = pick([4, 5, 6, 8, 10, 12], rng);
  // Bet élevé pour rendre la cote difficile (ce qui justifie le concept implied)
  const betFraction = pick([2 / 3, 3 / 4, 1, 1.25], rng);
  const betBb = Math.round(potBb * betFraction * 10) / 10;

  const heroPosition = pick(["BTN", "CO", "BB"] as const, rng);
  const villainPosition = pick(["CO", "MP", "UTG"] as const, rng);

  const base = potOdds({ pot: potBb, bet: betBb });
  const implied = impliedOdds({
    pot: potBb,
    bet: betBb,
    realEquity: draw.equity,
    effectiveStack: effectiveStackBb,
  });

  return {
    id: `m1-3-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    submoduleSlug: "m1.3",
    heroCards,
    board,
    effectiveStackBb,
    potBb,
    betBb,
    heroPosition,
    villainPosition,
    realEquity: draw.equity,
    drawDescription: draw.description,
    expected: {
      requiredEquity: base.requiredEquity,
      ratio: base.ratio,
      finalPotBb: base.finalPot,
      neededExtraBb: implied.neededExtra,
      impliedRatio: implied.impliedRatio,
    },
  };
}
