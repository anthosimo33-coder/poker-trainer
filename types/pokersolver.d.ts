declare module 'pokersolver' {
  export class Card {
    value: string;
    suit: string;
    rank: number;
    wildValue: string;
    toString(): string;
  }

  export class Hand {
    cards: Card[];
    name: string;
    descr: string;
    rank: number;
    static solve(cards: string[], game?: string, canDisqualify?: boolean): Hand;
    static winners(hands: Hand[]): Hand[];
  }

  export class Game {}
}
