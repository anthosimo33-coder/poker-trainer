import type { Card } from "@/lib/poker/cards";
import { shuffledDeck } from "@/lib/poker/cards";

export interface OutsSpot {
  id: string;
  submoduleSlug: "m2.1";
  heroCards: [Card, Card];
  board: [Card, Card, Card] | [Card, Card, Card, Card];
  /** Description verbale du tirage (ex. "tirage couleur + over"). */
  drawDescription: string;
  /** Nombre d'outs réel. */
  outs: number;
  /** "flop" si 3 cartes, "turn" si 4 cartes — détermine le multiplicateur. */
  street: "flop" | "turn";
  expected: {
    outs: number;
    equityApprox: number; // outs × 4 (flop) ou × 2 (turn)
    multiplier: 4 | 2;
  };
}

/**
 * Spots prédéfinis avec outs et descriptions vérifiés.
 * Plus simple et plus pédagogique que la génération aléatoire pour M2.1 :
 * on veut entraîner la reconnaissance de patterns d'outs, pas le calcul d'equity
 * exact (M2.2 s'en occupe).
 */
interface PreparedSpot {
  heroCards: [Card, Card];
  board: [Card, Card, Card];
  drawDescription: string;
  outs: number;
}

const SPOT_TEMPLATES: PreparedSpot[] = [
  {
    heroCards: ["As", "Ks"],
    board: ["Ts", "7s", "2d"],
    drawDescription: "tirage couleur (Nut Flush Draw) + over cards",
    outs: 15, // 9 spades + 3 As + 3 Ks (overs)
  },
  {
    heroCards: ["9h", "8h"],
    board: ["Th", "7c", "2h"],
    drawDescription: "double tirage : couleur + quinte bilatérale",
    outs: 15, // 9 hearts + 6 quinte non-coeurs (6, J non-coeurs)
  },
  {
    heroCards: ["Qd", "Jh"],
    board: ["Tc", "9s", "3d"],
    drawDescription: "tirage quinte bilatérale",
    outs: 8,
  },
  {
    heroCards: ["Kc", "Jc"],
    board: ["Tc", "9d", "3s"],
    drawDescription: "tirage quinte ventrale + over cards",
    outs: 10, // 4 outs quinte + 3 K + 3 J
  },
  {
    heroCards: ["7d", "6d"],
    board: ["8d", "5c", "Kh"],
    drawDescription: "tirage couleur + quinte bilatérale",
    outs: 15,
  },
  {
    heroCards: ["Ah", "Kc"],
    board: ["Qd", "9s", "3h"],
    drawDescription: "deux over cards (pas de tirage)",
    outs: 6, // 3 As + 3 Ks
  },
  {
    heroCards: ["Js", "Th"],
    board: ["Kc", "9d", "2s"],
    drawDescription: "tirage quinte ventrale",
    outs: 4,
  },
  {
    heroCards: ["6c", "6d"],
    board: ["Ah", "Kc", "9s"],
    drawDescription: "paire de 6s (set draw)",
    outs: 2, // 2 outs pour le brelan
  },
  {
    heroCards: ["Ad", "Kd"],
    board: ["7d", "5d", "2c"],
    drawDescription: "tirage couleur (Nut Flush Draw)",
    outs: 9,
  },
  {
    heroCards: ["Qc", "Jc"],
    board: ["Tc", "8c", "3d"],
    drawDescription: "tirage couleur + quinte ventrale",
    outs: 13, // 9 clubs + 4 quinte non-clubs
  },
];

export function generateOutsSpot(rng: () => number = Math.random): OutsSpot {
  const tpl = SPOT_TEMPLATES[Math.floor(rng() * SPOT_TEMPLATES.length)];
  // 50/50 entre mode flop et mode turn
  const onTurn = rng() < 0.5;

  if (onTurn) {
    // Génère une 4e carte "neutre" (pas un out)
    const used = [...tpl.heroCards, ...tpl.board];
    const deck = shuffledDeck(used, rng);
    const fourthCard = deck[0]; // pourrait être plus subtil mais OK pour M2.1
    return {
      id: `m2-1-${Date.now()}-${Math.floor(rng() * 1e6)}`,
      submoduleSlug: "m2.1",
      heroCards: tpl.heroCards,
      board: [...tpl.board, fourthCard] as [Card, Card, Card, Card],
      drawDescription: tpl.drawDescription,
      outs: tpl.outs,
      street: "turn",
      expected: {
        outs: tpl.outs,
        equityApprox: tpl.outs * 2,
        multiplier: 2,
      },
    };
  }

  return {
    id: `m2-1-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    submoduleSlug: "m2.1",
    heroCards: tpl.heroCards,
    board: tpl.board,
    drawDescription: tpl.drawDescription,
    outs: tpl.outs,
    street: "flop",
    expected: {
      outs: tpl.outs,
      equityApprox: tpl.outs * 4,
      multiplier: 4,
    },
  };
}
