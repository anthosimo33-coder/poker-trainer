import type { Card } from "./cards";

/**
 * Un combo = une combinaison spécifique de 2 cartes.
 */
export type Combo = [Card, Card];

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
type Rank = (typeof RANKS)[number];
const SUITS = ["s", "h", "d", "c"] as const;
type Suit = (typeof SUITS)[number];

function rankIndex(r: Rank): number {
  return RANKS.indexOf(r);
}

/** 6 combos par paire. */
function combosForPair(rank: Rank): Combo[] {
  const combos: Combo[] = [];
  for (let i = 0; i < SUITS.length; i++) {
    for (let j = i + 1; j < SUITS.length; j++) {
      combos.push([`${rank}${SUITS[i]}` as Card, `${rank}${SUITS[j]}` as Card]);
    }
  }
  return combos;
}

/** 4 combos suited (un par couleur). */
function combosForSuited(r1: Rank, r2: Rank): Combo[] {
  return SUITS.map((s) => [`${r1}${s}` as Card, `${r2}${s}` as Card] as Combo);
}

/** 12 combos offsuit (4 × 3). */
function combosForOffsuit(r1: Rank, r2: Rank): Combo[] {
  const combos: Combo[] = [];
  for (const s1 of SUITS) {
    for (const s2 of SUITS) {
      if (s1 === s2) continue;
      combos.push([`${r1}${s1}` as Card, `${r2}${s2}` as Card]);
    }
  }
  return combos;
}

/** 16 combos (suited + offsuit). */
function combosForAny(r1: Rank, r2: Rank): Combo[] {
  return [...combosForSuited(r1, r2), ...combosForOffsuit(r1, r2)];
}

/**
 * Parse une expression de main isolée : "AA", "AKs", "AKo", "AK", "22+", "ATs+".
 */
function parseHandExpression(expr: string): Combo[] {
  const trimmed = expr.trim();
  const isRangePlus = trimmed.endsWith("+");
  const core = isRangePlus ? trimmed.slice(0, -1) : trimmed;

  let suitSuffix: "s" | "o" | null = null;
  let ranksOnly = core;
  if (core.endsWith("s")) {
    suitSuffix = "s";
    ranksOnly = core.slice(0, -1);
  } else if (core.endsWith("o")) {
    suitSuffix = "o";
    ranksOnly = core.slice(0, -1);
  }

  if (ranksOnly.length !== 2) {
    throw new Error(`Expression invalide : ${expr}`);
  }

  const r1 = ranksOnly[0] as Rank;
  const r2 = ranksOnly[1] as Rank;
  if (!RANKS.includes(r1) || !RANKS.includes(r2)) {
    throw new Error(`Rank invalide dans : ${expr}`);
  }

  const isPair = r1 === r2;

  if (isPair) {
    if (suitSuffix) throw new Error(`Paire ne prend pas de suffixe : ${expr}`);
    if (isRangePlus) {
      const combos: Combo[] = [];
      for (let i = rankIndex(r1); i >= 0; i--) {
        combos.push(...combosForPair(RANKS[i]));
      }
      return combos;
    }
    return combosForPair(r1);
  }

  // Non-paire : ordonner hi > lo (hi = rang le plus haut = index le plus petit)
  let hi = r1;
  let lo = r2;
  if (rankIndex(hi) > rankIndex(lo)) {
    [hi, lo] = [lo, hi];
  }

  if (isRangePlus) {
    const combos: Combo[] = [];
    const hiIdx = rankIndex(hi);
    for (let i = rankIndex(lo); i > hiIdx; i--) {
      const newLo = RANKS[i];
      if (suitSuffix === "s") combos.push(...combosForSuited(hi, newLo));
      else if (suitSuffix === "o") combos.push(...combosForOffsuit(hi, newLo));
      else combos.push(...combosForAny(hi, newLo));
    }
    return combos;
  }

  if (suitSuffix === "s") return combosForSuited(hi, lo);
  if (suitSuffix === "o") return combosForOffsuit(hi, lo);
  return combosForAny(hi, lo);
}

/**
 * Étend un token intervalle "X-Y" en une liste d'expressions de mains.
 *
 * Écart vs spec (flaggé) : le parser du spec ne gère que `+` et les mains
 * isolées, mais les 30 ranges canoniques du spec utilisent la notation
 * intervalle standard ("TT-22", "ATs-A8s", "A5s-A2s", "K6s-K8s"). On ajoute le
 * support de `-` ICI (couche orchestration) pour garder `parseHandExpression`
 * verbatim et les tests unitaires valides. Cas couverts : intervalle de paires
 * ("TT-22") et intervalle même-haut-rang+suffixe ("ATs-A8s", "K6s-K8s").
 */
function expandIntervalToken(token: string): string[] {
  if (!token.includes("-")) return [token];
  const parts = token.split("-").map((s) => s.trim());
  if (parts.length !== 2) throw new Error(`Intervalle invalide : ${token}`);
  const [a, b] = parts;

  const suffixOf = (h: string): "" | "s" | "o" =>
    h.endsWith("s") ? "s" : h.endsWith("o") ? "o" : "";
  const sa = suffixOf(a);
  const sb = suffixOf(b);
  const ra = sa ? a.slice(0, -1) : a;
  const rb = sb ? b.slice(0, -1) : b;

  // Intervalle de paires : "TT-22"
  if (ra.length === 2 && ra[0] === ra[1] && rb.length === 2 && rb[0] === rb[1] && !sa && !sb) {
    const i1 = rankIndex(ra[0] as Rank);
    const i2 = rankIndex(rb[0] as Rank);
    const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
    const out: string[] = [];
    for (let i = lo; i <= hi; i++) out.push(`${RANKS[i]}${RANKS[i]}`);
    return out;
  }

  // Intervalle même rang haut + même suffixe : "ATs-A8s", "K6s-K8s", "QJo-Q9o"
  if (ra.length === 2 && rb.length === 2 && ra[0] === rb[0] && sa === sb) {
    const hiRank = ra[0];
    const i1 = rankIndex(ra[1] as Rank);
    const i2 = rankIndex(rb[1] as Rank);
    const [lo, hi] = i1 < i2 ? [i1, i2] : [i2, i1];
    const out: string[] = [];
    for (let i = lo; i <= hi; i++) out.push(`${hiRank}${RANKS[i]}${sa}`);
    return out;
  }

  throw new Error(`Intervalle non supporté : ${token}`);
}

/**
 * Parse une notation complète : "22+, ATs+, KQo, TT-22". Combos dédupliqués.
 */
export function parseRange(notation: string): Combo[] {
  const tokens = notation.split(",").map((s) => s.trim()).filter(Boolean);
  const exprs: string[] = [];
  for (const t of tokens) exprs.push(...expandIntervalToken(t));
  const all: Combo[] = [];
  for (const expr of exprs) {
    all.push(...parseHandExpression(expr));
  }
  const seen = new Set<string>();
  const unique: Combo[] = [];
  for (const combo of all) {
    const key = [combo[0], combo[1]].sort().join("-");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(combo);
    }
  }
  return unique;
}

/** Nombre total de combos d'un range parsé. */
export function rangeSize(notation: string): number {
  return parseRange(notation).length;
}

/** % du deck que représente le range (sur 1326 combos possibles). */
export function rangePercentage(notation: string): number {
  return (rangeSize(notation) / 1326) * 100;
}

/**
 * Vérifie si une main spécifique est dans un range donné (notation).
 * Hand format : 2 cartes (ex. ["As", "Kh"]). L'ordre des cartes n'importe pas.
 */
export function isInRange(hand: [Card, Card], rangeNotation: string): boolean {
  const combos = parseRange(rangeNotation);
  const handKey = [hand[0], hand[1]].sort().join("-");
  for (const combo of combos) {
    const comboKey = [combo[0], combo[1]].sort().join("-");
    if (comboKey === handKey) return true;
  }
  return false;
}

export interface RangeMembership {
  inRange: [Card, Card][];
  outOfRange: [Card, Card][];
  totalTested: number;
  membershipPercentage: number;
}

/**
 * Pour un set de hands testées, retourne lesquelles sont dans le range et
 * lesquelles ne le sont pas.
 */
export function rangeMembership(
  hands: [Card, Card][],
  rangeNotation: string
): RangeMembership {
  const inRange: [Card, Card][] = [];
  const outOfRange: [Card, Card][] = [];
  for (const hand of hands) {
    if (isInRange(hand, rangeNotation)) {
      inRange.push(hand);
    } else {
      outOfRange.push(hand);
    }
  }
  return {
    inRange,
    outOfRange,
    totalTested: hands.length,
    membershipPercentage:
      hands.length > 0 ? (inRange.length / hands.length) * 100 : 0,
  };
}

export interface NashComparison {
  totalSpots: number;
  correctChoices: number;
  pushedButShouldFold: [Card, Card][];
  foldedButShouldPush: [Card, Card][];
  userPushPercentage: number;
  nashPushPercentage: number;
  /** userPush% - nashPush% (positif = over-push, négatif = under-push). */
  signedRangeDelta: number;
  accuracy: number;
}

/**
 * Compare les choix du user à un range Nash de référence.
 */
export function compareToNash(
  spots: Array<{ hand: [Card, Card]; userAction: "push" | "fold" }>,
  nashRangeNotation: string
): NashComparison {
  let correct = 0;
  const pushedButShouldFold: [Card, Card][] = [];
  const foldedButShouldPush: [Card, Card][] = [];
  let userPushCount = 0;
  let nashPushCount = 0;

  for (const spot of spots) {
    const nashSaysPush = isInRange(spot.hand, nashRangeNotation);
    if (nashSaysPush) nashPushCount++;
    if (spot.userAction === "push") userPushCount++;

    const correctChoice =
      (spot.userAction === "push" && nashSaysPush) ||
      (spot.userAction === "fold" && !nashSaysPush);
    if (correctChoice) {
      correct++;
    } else if (spot.userAction === "push" && !nashSaysPush) {
      pushedButShouldFold.push(spot.hand);
    } else {
      foldedButShouldPush.push(spot.hand);
    }
  }

  const total = spots.length;
  return {
    totalSpots: total,
    correctChoices: correct,
    pushedButShouldFold,
    foldedButShouldPush,
    userPushPercentage: total > 0 ? (userPushCount / total) * 100 : 0,
    nashPushPercentage: total > 0 ? (nashPushCount / total) * 100 : 0,
    signedRangeDelta:
      total > 0 ? ((userPushCount - nashPushCount) / total) * 100 : 0,
    accuracy: total > 0 ? (correct / total) * 100 : 0,
  };
}

/**
 * Convertit le range en grille 13×13 (true = main dans le range).
 * Diagonale = paires ; au-dessus = suited ; en-dessous = offsuit.
 */
export function rangeToGrid(notation: string): boolean[][] {
  const combos = parseRange(notation);
  const grid: boolean[][] = Array.from({ length: 13 }, () => Array(13).fill(false));

  for (const combo of combos) {
    const r1 = combo[0][0] as Rank;
    const r2 = combo[1][0] as Rank;
    const s1 = combo[0][1] as Suit;
    const s2 = combo[1][1] as Suit;

    if (r1 === r2) {
      const idx = rankIndex(r1);
      grid[idx][idx] = true;
    } else {
      const hiIdx = Math.min(rankIndex(r1), rankIndex(r2));
      const loIdx = Math.max(rankIndex(r1), rankIndex(r2));
      const isSuited = s1 === s2;
      if (isSuited) {
        grid[hiIdx][loIdx] = true;
      } else {
        grid[loIdx][hiIdx] = true;
      }
    }
  }

  return grid;
}
