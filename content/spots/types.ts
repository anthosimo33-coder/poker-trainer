import type { Card } from "@/lib/poker/cards";
import type { ICMPlayer } from "@/lib/poker/icm";

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

export interface PrecomputedM34Spot {
  id: string;
  heroCards: [Card, Card];
  board: [Card, Card, Card]; // flop
  heroPosition: string; // toujours OOP pour check-raise
  villainPosition: string;
  potPreflop: number;
  cbetSize: number;
  raiseSize: number;
  effectiveStack: number;
  villainCBetRangeSlug: string;
  villainCBetRangeLabel: string;
  villainCBetRangeNotation: string;
  villainCallVsRaiseRangeSlug: string;
  villainCallVsRaiseRangeLabel: string;
  villainCallVsRaiseRangeNotation: string;
  villain3BetRangeSlug: string;
  villain3BetRangeLabel: string;
  villain3BetRangeNotation: string;
  boardTexture: "dry" | "wet" | "monotone" | "paired";
  heroHandType: "value" | "semibluff" | "bluff";
  scenarioLabel: string;
  expected: {
    pFold: number;
    pCall: number;
    pThreeBet: number;
    equityVsCallRange: number;
    evIfFold: number;
    evIfCall: number;
    evIf3Bet: number;
    evBb: number;
    realizationFactorUsed: number;
  };
}

export interface PrecomputedM41Spot {
  id: string;
  /** Tous les joueurs en jeu (hero + adversaires). */
  players: ICMPlayer[];
  /** Identifiant de hero dans `players`. */
  heroId: string;
  /** Slug de la structure de payouts utilisée. */
  payoutSlug: string;
  /** Label lisible (dénormalisé). */
  payoutLabel: string;
  /** Payouts en % (dénormalisé). */
  payouts: number[];
  /** Description pédagogique du spot (ex. "Bulle 4 joueurs, tu es chipleader"). */
  scenarioLabel: string;
  /** Type de spot pour pédagogie. */
  spotType:
    | "equal-stacks"
    | "chip-leader"
    | "short-stack"
    | "bubble"
    | "final-table"
    | "satellite";
  expected: {
    /** Équité ICM de hero en % du prizepool. */
    heroEquityPercent: number;
    /** Équité chip de hero en % du total chips (pour comparaison). */
    heroChipEquityPercent: number;
    /** Effet ICM : différence absolue entre chip equity et ICM equity (en pts %). */
    icmEffect: number;
    /** Équités ICM des autres joueurs. */
    allEquities: Record<string, number>;
  };
}

export interface PrecomputedM42Spot {
  id: string;
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  pushAmount: number;
  scenarioLabel: string;
  /** Catégorie pédagogique. */
  spotType:
    | "bubble-leader-vs-mid"
    | "bubble-leader-vs-short"
    | "bubble-short-vs-leader"
    | "bubble-mid-vs-mid"
    | "ft-leader"
    | "ft-mid"
    | "ft-short"
    | "satellite";
  expected: {
    bubbleFactor: number;
    requiredEquityChip: number;
    requiredEquityICM: number;
    heroEquityBefore: number;
    heroEquityIfWin: number;
    heroEquityIfLose: number;
  };
}

export interface PrecomputedM43Spot {
  id: string;
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  pushAmount: number;
  /** Position du hero. */
  heroPosition: "UTG" | "MP" | "CO" | "BTN" | "SB" | "BB";
  /** Nombre de joueurs encore à parler après le hero (0..5). */
  playersLeftToAct: number;
  scenarioLabel: string;
  spotType: "ep-bubble" | "lp-bubble" | "sb-vs-bb-bubble" | "ep-ft" | "lp-ft";
  expected: {
    baseBubbleFactor: number;
    adjustedBubbleFactor: number;
    positionMultiplier: number;
    requiredEquityChip: number;
    requiredEquityICM: number;
    heroEquityBefore: number;
  };
}

export interface PrecomputedM44Spot {
  id: string;
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  payoutLabel: string;
  payouts: number[];
  /** Nombre de joueurs restants en FT. */
  playersRemaining: number;
  pushAmount: number;
  scenarioLabel: string;
  spotType:
    | "ft-9way-leader"
    | "ft-9way-mid"
    | "ft-9way-short"
    | "ft-6way"
    | "ft-3way"
    | "ft-heads-up";
  /** Spread des payouts (top - bottom en pts %). */
  payoutSpread: number;
  expected: {
    bubbleFactor: number;
    requiredEquityChip: number;
    requiredEquityICM: number;
    heroEquityBefore: number;
    heroEquityIfWin: number;
    heroEquityIfLose: number;
    /** Différence pédagogique : équité ICM si win - équité ICM si lose. */
    rangeOfOutcomes: number;
  };
}

export interface PrecomputedM51Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: "SB";
  villainPosition: "BB";
  /** Stack effectif en bb (5, 7, 8, 10, 12, 15). */
  heroStack: number;
  villainStack: number;
  /** Pot avant push (SB + BB blinds). */
  potBefore: number;
  scenarioLabel: string;
  category: "obvious-push" | "obvious-fold" | "marginal-push" | "marginal-fold";
  expected: {
    nashAction: "push" | "fold";
    nashRangeNotation: string;
    handInRange: boolean;
  };
}

export interface PrecomputedM52Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: "BB";
  villainPosition: "SB";
  heroStack: number;
  villainStack: number;
  /** Ce que SB a poussé (= heroStack en effective stack). */
  pushAmount: number;
  potBefore: number;
  scenarioLabel: string;
  category: "obvious-call" | "obvious-fold" | "marginal-call" | "marginal-fold";
  expected: {
    nashAction: "call" | "fold";
    nashRangeNotation: string;
    handInRange: boolean;
  };
}

export interface PrecomputedM53Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: "BTN";
  heroStack: number;
  potBefore: number;
  scenarioLabel: string;
  category: "obvious-push" | "obvious-fold" | "marginal-push" | "marginal-fold";
  expected: {
    nashAction: "push" | "fold";
    nashRangeNotation: string;
    handInRange: boolean;
  };
}

export interface PrecomputedM54Spot {
  id: string;
  heroCards: [Card, Card];
  heroPosition: "BB" | "SB" | "BTN" | "CO" | "MP";
  /** Qui a pushé (varie selon la position du hero). */
  villainPosition: "SB" | "BTN" | "CO" | "MP" | "UTG";
  heroStack: number;
  pushAmount: number;
  potBefore: number;
  scenarioLabel: string;
  category: "obvious-call" | "obvious-fold" | "marginal-call" | "marginal-fold";
  expected: {
    nashAction: "call" | "fold";
    nashRangeNotation: string;
    handInRange: boolean;
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
