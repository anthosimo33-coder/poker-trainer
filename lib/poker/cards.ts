/**
 * Représentation et manipulation des cartes à jouer.
 * Convention de notation : "As", "Kh", "Td", "2c" (rank + suit en lowercase).
 * Ranks: 2-9, T, J, Q, K, A
 * Suits: s (spades ♠), h (hearts ♥), d (diamonds ♦), c (clubs ♣)
 */

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['s', 'h', 'd', 'c'] as const;

export type Rank = typeof RANKS[number];
export type Suit = typeof SUITS[number];

/**
 * Une carte est représentée par une chaîne de 2 caractères : rank + suit.
 * Exemples : "As" (As de pique), "Th" (10 de cœur), "2c" (2 de trèfle).
 */
export type Card = `${Rank}${Suit}`;

export const SUIT_SYMBOLS: Record<Suit, string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};

export const SUIT_NAMES: Record<Suit, string> = {
  s: 'spades',
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
};

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Parse une chaîne en Card avec validation stricte.
 * Throw si le format est invalide.
 */
export function parseCard(str: string): Card {
  if (str.length !== 2) {
    throw new Error(`Carte invalide : "${str}". Format attendu : 2 caractères (ex. "As", "Th").`);
  }
  const rank = str[0].toUpperCase() as Rank;
  const suit = str[1].toLowerCase() as Suit;
  if (!RANKS.includes(rank)) {
    throw new Error(`Rank invalide : "${rank}". Ranks valides : ${RANKS.join(', ')}.`);
  }
  if (!SUITS.includes(suit)) {
    throw new Error(`Suit invalide : "${suit}". Suits valides : ${SUITS.join(', ')}.`);
  }
  return `${rank}${suit}` as Card;
}

/**
 * Parse un tableau de chaînes en Cards.
 */
export function parseCards(strs: string[]): Card[] {
  return strs.map(parseCard);
}

/**
 * Retourne le rank d'une carte.
 */
export function rankOf(card: Card): Rank {
  return card[0] as Rank;
}

/**
 * Retourne le suit d'une carte.
 */
export function suitOf(card: Card): Suit {
  return card[1] as Suit;
}

/**
 * Retourne la valeur numérique d'une carte (2-14, As = 14).
 */
export function valueOf(card: Card): number {
  return RANK_VALUES[rankOf(card)];
}

/**
 * Formate une carte pour affichage : "A♠", "T♥", etc.
 */
export function formatCard(card: Card): string {
  return `${rankOf(card)}${SUIT_SYMBOLS[suitOf(card)]}`;
}

/**
 * Génère un deck complet de 52 cartes ordonnées (2s, 3s... As, 2h... Ac).
 */
export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

/**
 * Retourne un deck mélangé en excluant les cartes "dead" (déjà visibles).
 * Utilise Fisher-Yates pour un shuffle uniforme.
 */
export function shuffledDeck(deadCards: Card[] = [], rng: () => number = Math.random): Card[] {
  const deadSet = new Set(deadCards);
  const deck = fullDeck().filter(c => !deadSet.has(c));
  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Vérifie qu'un ensemble de cartes ne contient pas de doublon.
 */
export function hasDuplicates(cards: Card[]): boolean {
  return new Set(cards).size !== cards.length;
}
