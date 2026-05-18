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
