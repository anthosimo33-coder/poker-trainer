/**
 * Classification d'une main préflop (2 cartes) en *classe de main* pédagogique.
 * Sert au matching de patterns (dimension `hand_class`) pour le leak detection.
 *
 * Module auto-suffisant : aucun import de valeur (seul le type `Card` est
 * importé, et il est effacé à la compilation). Indispensable pour rester
 * embarquable dans le runtime Convex.
 */
import type { Card } from "./cards";

export type HandClass =
  | "premium-pair" // QQ+
  | "mid-pair" // 88-JJ
  | "small-pair" // 22-77
  | "premium-broadway" // AK, AQ (suited ou offsuit)
  | "ax-suited" // A2s-AJs (non premium-broadway)
  | "ax-offsuit-small" // A2o-A8o
  | "ax-offsuit-mid" // A9o-AJo
  | "kx-suited" // K2s-KQs
  | "kx-offsuit" // K2o-KQo
  | "broadway-suited" // QJs, QTs, JTs
  | "broadway-offsuit" // QJo, QTo, JTo
  | "suited-connector" // T9s, 98s, ...
  | "suited-gapper" // J9s, 97s, ...
  | "trash";

const RANK_VALUE: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function classifyHand(cards: [Card, Card]): HandClass {
  const [c1, c2] = cards;
  const v1 = RANK_VALUE[c1[0]];
  const v2 = RANK_VALUE[c2[0]];
  const suited = c1[1] === c2[1];

  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const gap = high - low; // 0 = paire, 1 = connecteur, ...

  // --- Paires ---
  if (gap === 0) {
    if (high >= 12) return "premium-pair"; // QQ, KK, AA
    if (high >= 8) return "mid-pair"; // 88, 99, TT, JJ
    return "small-pair"; // 22-77
  }

  // --- Mains avec un As ---
  if (high === 14) {
    if (low >= 12) return "premium-broadway"; // AK, AQ
    if (suited) return "ax-suited"; // A2s-AJs
    return low <= 8 ? "ax-offsuit-small" : "ax-offsuit-mid"; // A2o-A8o / A9o-AJo
  }

  // --- Mains avec un Roi (sans As) ---
  if (high === 13) {
    return suited ? "kx-suited" : "kx-offsuit"; // K2s-KQs / K2o-KQo
  }

  // --- Deux broadways (T/J/Q), sans As ni Roi : QJ, QT, JT ---
  if (low >= 10) {
    return suited ? "broadway-suited" : "broadway-offsuit";
  }

  // --- Mains basses suitées ---
  if (suited) {
    if (gap === 1) return "suited-connector"; // T9s, 98s, ...
    if (gap <= 3) return "suited-gapper"; // J9s, 97s, T7s, ...
  }

  return "trash";
}
