import type { Card } from "@/lib/poker/cards";

export interface PrecomputedM22Spot {
  id: string;
  heroCards: [Card, Card];
  villainCards: [Card, Card];
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
  expected: {
    equity: number;
    method: "exact" | "monte-carlo";
    iterations: number;
    wins: number;
    losses: number;
    ties: number;
  };
}

export interface PrecomputedM23Spot {
  id: string;
  heroCards: [Card, Card];
  villain1Cards: [Card, Card];
  villain2Cards: [Card, Card];
  board: Card[];
  street: "flop" | "turn"; // pas de préflop 3-way (confus pédagogiquement)
  scenarioLabel: string;
  expected: {
    equity: number;
    method: "exact" | "monte-carlo";
    iterations: number;
    wins: number;
    losses: number;
    ties: number;
  };
}

export interface PrecomputedM24Spot {
  id: string;
  heroCards: [Card, Card];
  villainRangeSlug: string;
  villainRangeLabel: string;
  villainRangeNotation: string;
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
  expected: {
    equity: number;
    comboCount: number;
  };
}

export interface PrecomputedM31Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: "UTG" | "MP" | "CO" | "BTN" | "SB";
  heroStack: number;
  villainPosition: "BB" | "BTN" | "SB" | "CO";
  villainCallRangeSlug: string;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  potBefore: number;
  hasAntes: boolean;
  scenarioLabel: string;
  expected: {
    pFold: number;
    equityVsCallRange: number;
    evBb: number;
    combosInCallRange: number;
  };
}

export interface PrecomputedM32Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: string;
  heroStack: number;
  villainPosition: string;
  /** Call range slug. */
  villainCallRangeSlug: string;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  /** Total range slug (pour calcul exact P(fold)). */
  villainTotalRangeSlug: string;
  villainTotalRangeLabel: string;
  villainTotalRangeNotation: string;
  potBefore: number;
  scenarioLabel: string;
  /** « Quelle P(fold) minimum pour que ce push soit break-even ? » */
  expected: {
    pFoldBreakEven: number; // 0-1, le seuil minimum
    pFoldActual: number; // P(fold) réelle (callRange / totalRange)
    equityVsCallRange: number; // %
    evIfCall: number; // EV conditionnelle au call
    isPushProfitable: boolean; // pFoldActual >= pFoldBreakEven
    evBb: number; // EV total push (référence)
    combosInCallRange: number;
    combosInTotalRange: number;
  };
}

export interface PrecomputedM33Spot {
  id: string;
  heroCards: [Card, Card];
  scenario: "3bet-vs-open" | "iso-vs-limp" | "squeeze-vs-open-call" | "cold-call-vs-open";
  heroPosition: string;
  villainPosition: string;
  heroStack: number;
  effectiveStack: number;
  potBefore: number; // pot avant la décision de hero
  heroActionSize: number; // taille de la mise (3bet, iso, etc.)
  villainCallRangeSlug: string;
  villainCallRangeLabel: string;
  villainCallRangeNotation: string;
  villainFourBetRangeSlug?: string; // optionnel, scénarios à 3 branches
  villainFourBetRangeLabel?: string;
  villainFourBetRangeNotation?: string;
  scenarioLabel: string;
  expected: {
    pFold: number; // 0-1
    pCall: number;
    pFourBet: number; // ou pRaise, 0 si scénario à 2 branches
    evIfFold: number;
    evIfCall: number;
    evIfFourBet: number;
    evBb: number; // EV totale
    breakdown: string; // texte explicatif
  };
}
