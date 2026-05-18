/**
 * Engine equity : énumération exacte (turn/river) ou Monte Carlo (préflop).
 *
 * Note d'implémentation (écart vs spec, cf. rapport S6a) : le spec proposait un
 * `compareHands` local comparant `evaluateHand(...).rank`. Or `rank` (pokersolver)
 * ne départage PAS les mains de même catégorie (deux paires de kickers différents,
 * deux couleurs, etc.) — l'utiliser ferait converger toutes les equities vers 50 %
 * (chaque showdown même-catégorie compté comme split). On réutilise donc le
 * `compareHands` existant de `./evaluator`, basé sur `Hand.winners` (gère kickers
 * et splits correctement), ce qui est requis par les critères de validation
 * (AA vs KK ≈ 81/19, AKo vs 22 ≈ 50/50…).
 */
import type { Card } from "./cards";
import { fullDeck } from "./cards";
import { evaluateHand, compareHands, determineWinners } from "./evaluator";
import type { Combo } from "./range-parser";

/**
 * Résultat d'un calcul d'equity.
 */
export interface EquityResult {
  /** Pourcentage de wins (0-100). Inclut les splits proportionnels. */
  equity: number;
  /** Nombre de scénarios où hero gagne strictement. */
  wins: number;
  /** Nombre de scénarios où hero perd strictement. */
  losses: number;
  /** Nombre de scénarios de split. */
  ties: number;
  /** Nombre total de scénarios évalués (wins + losses + ties). */
  total: number;
  /** Méthode utilisée : "exact" si toutes les runouts énumérées, "monte-carlo" sinon. */
  method: "exact" | "monte-carlo";
}

/**
 * Retourne le deck moins les cartes données (hero, villain, board).
 */
function remainingDeck(usedCards: Card[]): Card[] {
  const used = new Set(usedCards);
  return fullDeck().filter((c) => !used.has(c));
}

/**
 * Compare deux mains de 5-7 cartes via le wrapper pokersolver `Hand.winners`
 * (départage correctement les kickers et les splits).
 * Retourne 1 si hero gagne, -1 si villain gagne, 0 si split.
 */
function compareSeven(heroHand: Card[], villainHand: Card[]): -1 | 0 | 1 {
  return compareHands(evaluateHand(heroHand), evaluateHand(villainHand));
}

/**
 * Énumération exhaustive sur la river uniquement (board à 4 cartes → 1 carte manquante).
 * Précis et rapide (~44 itérations). Préféré à Monte Carlo quand applicable.
 */
export function equityExactRiver(
  hero: [Card, Card],
  villain: [Card, Card],
  board: [Card, Card, Card, Card]
): EquityResult {
  const used = [...hero, ...villain, ...board];
  const deck = remainingDeck(used);

  let wins = 0,
    losses = 0,
    ties = 0;
  for (const river of deck) {
    const heroHand = [...hero, ...board, river];
    const villainHand = [...villain, ...board, river];
    const result = compareSeven(heroHand, villainHand);
    if (result === 1) wins++;
    else if (result === -1) losses++;
    else ties++;
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "exact" };
}

/**
 * Énumération exhaustive turn+river (board à 3 cartes → 2 cartes manquantes).
 * ~47×46/2 = ~1081 itérations. Encore très rapide (<20ms).
 */
export function equityExactFlop(
  hero: [Card, Card],
  villain: [Card, Card],
  board: [Card, Card, Card]
): EquityResult {
  const used = [...hero, ...villain, ...board];
  const deck = remainingDeck(used);

  let wins = 0,
    losses = 0,
    ties = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const turn = deck[i];
      const river = deck[j];
      const heroHand = [...hero, ...board, turn, river];
      const villainHand = [...villain, ...board, turn, river];
      const result = compareSeven(heroHand, villainHand);
      if (result === 1) wins++;
      else if (result === -1) losses++;
      else ties++;
    }
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "exact" };
}

/**
 * Monte Carlo pour preflop (5 cartes du board à tirer).
 * 50k itérations par défaut → convergence à ±0.3%.
 */
export function equityMonteCarlo(
  hero: [Card, Card],
  villain: [Card, Card],
  board: Card[] = [],
  iterations = 50_000
): EquityResult {
  const used = [...hero, ...villain, ...board];
  const remaining = remainingDeck(used);
  const cardsToFlip = 5 - board.length;

  let wins = 0,
    losses = 0,
    ties = 0;
  for (let n = 0; n < iterations; n++) {
    // Fisher-Yates partiel : on tire `cardsToFlip` cartes du deck
    const deckCopy = remaining.slice();
    const sampled: Card[] = [];
    for (let i = 0; i < cardsToFlip; i++) {
      const idx = i + Math.floor(Math.random() * (deckCopy.length - i));
      [deckCopy[i], deckCopy[idx]] = [deckCopy[idx], deckCopy[i]];
      sampled.push(deckCopy[i]);
    }
    const fullBoard = [...board, ...sampled];
    const heroHand = [...hero, ...fullBoard];
    const villainHand = [...villain, ...fullBoard];
    const result = compareSeven(heroHand, villainHand);
    if (result === 1) wins++;
    else if (result === -1) losses++;
    else ties++;
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "monte-carlo" };
}

/**
 * API unifiée : choisit automatiquement la méthode la plus précise.
 * - Board 4 cartes → équité exacte sur la river
 * - Board 3 cartes → équité exacte sur turn+river
 * - Board 0-2 cartes → Monte Carlo
 */
export function equity(
  hero: [Card, Card],
  villain: [Card, Card],
  board: Card[] = [],
  iterations = 50_000
): EquityResult {
  if (board.length === 4) {
    return equityExactRiver(hero, villain, board as [Card, Card, Card, Card]);
  }
  if (board.length === 3) {
    return equityExactFlop(hero, villain, board as [Card, Card, Card]);
  }
  return equityMonteCarlo(hero, villain, board, iterations);
}

/**
 * Compte les outs de hero face à villain au flop.
 * Énumère les 47 cartes restantes après hero+villain+flop ; compte celles où
 * hero était derrière au flop et passe devant (ou rejoint) au turn. Approximatif
 * mais conforme à la pédagogie classique du comptage d'outs.
 */
export function countOuts(
  hero: [Card, Card],
  villain: [Card, Card],
  board: [Card, Card, Card]
): number {
  const used = [...hero, ...villain, ...board];
  const remaining = remainingDeck(used);

  // État actuel : hero perd-il avant le turn ?
  const heroFlopHand = [...hero, ...board];
  const villainFlopHand = [...villain, ...board];
  const flopResult = compareSeven(heroFlopHand, villainFlopHand);

  let outs = 0;
  for (const card of remaining) {
    const heroNew = [...hero, ...board, card];
    const villainNew = [...villain, ...board, card];
    const turnResult = compareSeven(heroNew, villainNew);
    // Out = on était derrière au flop et on passe devant ou on rejoint au turn
    if (flopResult === -1 && turnResult >= 0) outs++;
  }
  return outs;
}

// ============== MULTI-WAY (N adversaires) ==============

/**
 * Compare la main hero contre N villains, board complet (5 cartes incluses).
 *
 * Écart vs spec (flaggé, même logique que `compareSeven` en S6a) : le spec
 * proposait `Hand.solve(h)` + `Hand.winners` en réimportant pokersolver. On
 * réutilise `evaluateHand` + `determineWinners` de `./evaluator` (déjà corrigés
 * S6a pour le format "10"/"1" et basés sur `Hand.winners`) — DRY, testé, pas
 * de réimport pokersolver ni de risque de régression du bug de format.
 *
 * - "win"  : hero seul gagnant
 * - "tie"  : hero parmi plusieurs gagnants (split)
 * - "loss" : hero battu
 */
function multiCompare(
  heroHand: Card[],
  villainHands: Card[][]
): "win" | "tie" | "loss" {
  const evals = [evaluateHand(heroHand), ...villainHands.map((h) => evaluateHand(h))];
  const winners = determineWinners(evals); // indices des gagnants
  if (winners.length === 1 && winners[0] === 0) return "win";
  if (winners.includes(0)) return "tie";
  return "loss";
}

/**
 * Equity multi-way Monte Carlo (board 0-2 cartes).
 */
export function equityMultiMonteCarlo(
  hero: [Card, Card],
  villains: [Card, Card][],
  board: Card[] = [],
  iterations = 100_000
): EquityResult {
  if (villains.length === 0) throw new Error("Au moins 1 villain requis");
  const used = [...hero, ...villains.flat(), ...board];
  const remaining = remainingDeck(used);
  const cardsToFlip = 5 - board.length;

  let wins = 0,
    losses = 0,
    ties = 0;
  for (let n = 0; n < iterations; n++) {
    const deckCopy = remaining.slice();
    const sampled: Card[] = [];
    for (let i = 0; i < cardsToFlip; i++) {
      const idx = i + Math.floor(Math.random() * (deckCopy.length - i));
      [deckCopy[i], deckCopy[idx]] = [deckCopy[idx], deckCopy[i]];
      sampled.push(deckCopy[i]);
    }
    const fullBoard = [...board, ...sampled];
    const heroHand = [...hero, ...fullBoard];
    const villainHands = villains.map((v) => [...v, ...fullBoard]);
    const result = multiCompare(heroHand, villainHands);
    if (result === "win") wins++;
    else if (result === "tie") ties++;
    else losses++;
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "monte-carlo" };
}

/**
 * Equity multi-way exacte au flop (board 3 cartes → 2 cartes manquantes).
 */
export function equityMultiExactFlop(
  hero: [Card, Card],
  villains: [Card, Card][],
  board: [Card, Card, Card]
): EquityResult {
  if (villains.length === 0) throw new Error("Au moins 1 villain requis");
  const used = [...hero, ...villains.flat(), ...board];
  const deck = remainingDeck(used);

  let wins = 0,
    losses = 0,
    ties = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const fullBoard = [...board, deck[i], deck[j]];
      const heroHand = [...hero, ...fullBoard];
      const villainHands = villains.map((v) => [...v, ...fullBoard]);
      const result = multiCompare(heroHand, villainHands);
      if (result === "win") wins++;
      else if (result === "tie") ties++;
      else losses++;
    }
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "exact" };
}

/**
 * Equity multi-way exacte au turn (board 4 cartes → 1 carte manquante).
 */
export function equityMultiExactRiver(
  hero: [Card, Card],
  villains: [Card, Card][],
  board: [Card, Card, Card, Card]
): EquityResult {
  if (villains.length === 0) throw new Error("Au moins 1 villain requis");
  const used = [...hero, ...villains.flat(), ...board];
  const deck = remainingDeck(used);

  let wins = 0,
    losses = 0,
    ties = 0;
  for (const river of deck) {
    const fullBoard = [...board, river];
    const heroHand = [...hero, ...fullBoard];
    const villainHands = villains.map((v) => [...v, ...fullBoard]);
    const result = multiCompare(heroHand, villainHands);
    if (result === "win") wins++;
    else if (result === "tie") ties++;
    else losses++;
  }
  const total = wins + losses + ties;
  const equity = ((wins + ties / 2) / total) * 100;
  return { equity, wins, losses, ties, total, method: "exact" };
}

/**
 * Dispatch automatique multi-way.
 */
export function equityMulti(
  hero: [Card, Card],
  villains: [Card, Card][],
  board: Card[] = [],
  iterations = 100_000
): EquityResult {
  if (board.length === 4) {
    return equityMultiExactRiver(hero, villains, board as [Card, Card, Card, Card]);
  }
  if (board.length === 3) {
    return equityMultiExactFlop(hero, villains, board as [Card, Card, Card]);
  }
  return equityMultiMonteCarlo(hero, villains, board, iterations);
}

// ============== EQUITY VS RANGE ==============

/**
 * Equity de hero face à un range = moyenne (poids uniforme) sur chaque combo
 * valide. Les combos partageant une carte avec hero/board sont ignorés.
 *
 * Écart vs spec (flaggé) : le spec appelait `equity(hero, combo, board, …)` par
 * combo, qui dispatche en énumération EXACTE au flop/turn. Avec ~150 spots ×
 * ~50-300 combos, l'exact-par-combo est intraitable (incompatible avec
 * l'estimation « ~5-10 min » du spec, cf. perfs S6a). On appelle directement
 * `equityMonteCarlo` (itérations contrôlées), ce qui est aussi cohérent avec
 * le `method: "monte-carlo"` que le spec retourne en dur. La moyenne sur N
 * combos lisse fortement la variance MC → précision largement suffisante.
 */
export function equityVsRange(
  hero: [Card, Card],
  villainRange: Combo[],
  board: Card[] = [],
  iterations = 10_000
): EquityResult & { validCombos: number; rejectedCombos: number } {
  const usedByHero = new Set<Card>([...hero, ...board]);
  const validCombos = villainRange.filter(
    ([c1, c2]) => !usedByHero.has(c1) && !usedByHero.has(c2) && c1 !== c2
  );

  if (validCombos.length === 0) {
    throw new Error(
      "Aucun combo valide dans le range (toutes les cartes sont utilisées par hero ou board)"
    );
  }

  let totalEquity = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;
  let totalIterations = 0;

  for (const combo of validCombos) {
    const result = equityMonteCarlo(hero, combo, board, iterations);
    totalEquity += result.equity;
    totalWins += result.wins;
    totalLosses += result.losses;
    totalTies += result.ties;
    totalIterations += result.total;
  }

  return {
    equity: totalEquity / validCombos.length,
    wins: totalWins,
    losses: totalLosses,
    ties: totalTies,
    total: totalIterations,
    method: "monte-carlo",
    validCombos: validCombos.length,
    rejectedCombos: villainRange.length - validCombos.length,
  };
}
