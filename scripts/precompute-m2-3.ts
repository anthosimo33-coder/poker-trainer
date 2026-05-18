/**
 * Pré-calcule des spots 3-way pour M2.3 (Equity multiway).
 * Hero + 2 villains, board flop (3) ou turn (4). Pas de préflop.
 * Énumération EXACTE. Sur-génération + filtrage bande [18,82] (le spec dit
 * « cible 100 spots APRÈS filtrage », bande utile [20-75] privilégiée — en
 * 3-way l'equity est polarisée, le filtrage est nécessaire pour une distribution
 * majoritairement dans la bande utile, cf. test Phase 8).
 */
import * as fs from "fs";
import * as path from "path";
import {
  equityMultiExactFlop,
  equityMultiExactRiver,
} from "../lib/poker/equity";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM23Spot } from "../content/spots/types";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
type Suit = "s" | "h" | "d" | "c";
const SUITS: Suit[] = ["s", "h", "d", "c"];

interface SpotTemplate {
  heroCards: [Card, Card];
  villain1Cards: [Card, Card];
  villain2Cards: [Card, Card];
  board: Card[];
  street: "flop" | "turn";
  scenarioLabel: string;
}
interface Slot {
  rank: Rank;
  grp?: string;
}

function assignSuits(slots: Slot[]): Card[] | null {
  const res: (Suit | null)[] = slots.map(() => null);
  const grpSuit: Record<string, Suit> = {};
  const used = new Set<string>();
  function dfs(i: number): boolean {
    if (i === slots.length) return true;
    const sl = slots[i];
    const fixed = sl.grp ? grpSuit[sl.grp] : undefined;
    const candidates = fixed ? [fixed] : SUITS;
    for (const su of candidates) {
      const key = sl.rank + su;
      if (used.has(key)) continue;
      const setGrp = sl.grp && !grpSuit[sl.grp];
      if (setGrp) grpSuit[sl.grp!] = su;
      used.add(key);
      res[i] = su;
      if (dfs(i + 1)) return true;
      used.delete(key);
      res[i] = null;
      if (setGrp) delete grpSuit[sl.grp!];
    }
    return false;
  }
  if (!dfs(0)) return null;
  return slots.map((s, i) => `${s.rank}${res[i]}` as Card);
}

let skipped = 0;
function build3(slots: Slot[], boardLen: number, street: SpotTemplate["street"], label: string): SpotTemplate | null {
  const c = assignSuits(slots);
  if (!c) {
    skipped++;
    return null;
  }
  return {
    heroCards: [c[0], c[1]],
    villain1Cards: [c[2], c[3]],
    villain2Cards: [c[4], c[5]],
    board: c.slice(6, 6 + boardLen),
    street,
    scenarioLabel: label,
  };
}

const T: (SpotTemplate | null)[] = [];

// ===== Hero = combo draw (grp F) vs over-pair vs 2 overs (flop) ≈ 22-40 % =====
// Flush group F = hero h1,h2 + board b1,b2 (4 rangs DISTINCTS → toujours assignable).
const HERO_DRAWS: [Rank, Rank][] = [
  ["9", "8"], ["8", "7"], ["T", "9"], ["7", "6"], ["J", "T"], ["6", "5"],
  ["Q", "J"], ["5", "4"], ["T", "8"], ["9", "7"], ["J", "9"], ["8", "6"],
];
const OPP_PAIRS: Rank[] = ["A", "K", "Q", "J"];
for (const [h1, h2] of HERO_DRAWS) {
  for (const p of OPP_PAIRS) {
    if (p === h1 || p === h2) continue;
    // 2 cartes board de la couleur F : un connecteur haut + le rang sous h2
    const bHi: Rank = h1 >= "T" ? "5" : "Q";
    const bLo: Rank = "2";
    if ([h1, h2, p, bLo].includes(bHi)) continue;
    T.push(
      build3(
        [
          { rank: h1, grp: "F" }, { rank: h2, grp: "F" },
          { rank: p }, { rank: p },
          { rank: p === "A" ? "K" : "A" }, { rank: p === "Q" ? "J" : "Q" },
          { rank: bHi, grp: "F" }, { rank: h1 === "Q" ? "4" : "Q" === h2 ? "3" : "K", grp: "F" },
          { rank: bLo },
        ],
        3, "flop", `Combo draw ${h1}${h2}s vs over-pair ${p}${p} vs overs`
      )
    );
  }
}

// ===== Hero = main faite vs villain flush draw (grp F) vs villain OESD (flop) ≈ 38-70 % =====
const MADE_HERO: [Rank, Rank, string][] = [
  ["A", "A", "Over-pair"], ["K", "K", "Over-pair"], ["Q", "Q", "Over-pair"],
  ["J", "J", "Over-pair"], ["T", "T", "Over-pair"], ["9", "9", "Over-pair"],
  ["A", "K", "Top pair TK"], ["A", "Q", "Top pair"], ["K", "Q", "Top pair"],
  ["A", "J", "Top pair"], ["K", "J", "Top pair"], ["A", "T", "Top pair"],
];
// villain1 flush draw paire = [fd0,fd1] grp F + board [bf0,bf1] grp F (4 rangs distincts)
const FD_SETUPS: [Rank, Rank, Rank, Rank][] = [
  ["A", "9", "Q", "4"], ["K", "T", "J", "3"], ["A", "8", "Q", "5"], ["K", "9", "J", "4"],
];
const TOP_BOARD: Rank[] = ["T", "9", "8", "7", "6", "5"];
for (const [h1, h2, lbl] of MADE_HERO) {
  for (const [fd0, fd1, bf0, bf1] of FD_SETUPS) {
    for (const tb of TOP_BOARD) {
      const isPair = h1 === h2;
      const top: Rank = isPair ? tb : h1; // top pair → board porte le rang de hero
      const v2: [Rank, Rank] = ["8", "7"]; // OESD villain (plain)
      const ranks = [h1, h2, fd0, fd1, v2[0], v2[1], top, bf0, bf1];
      if (new Set(ranks).size !== (isPair ? 8 : 9) && !isPair) continue;
      // évite collisions board/flush-group : top, bf0, bf1 distincts
      if (top === bf0 || top === bf1 || bf0 === bf1) continue;
      if ([fd0, fd1].includes(top)) continue;
      T.push(
        build3(
          [
            { rank: h1 }, { rank: h2 },
            { rank: fd0, grp: "F" }, { rank: fd1, grp: "F" },
            { rank: v2[0] }, { rank: v2[1] },
            { rank: top }, { rank: bf0, grp: "F" }, { rank: bf1, grp: "F" },
          ],
          3, "flop", `${lbl} vs tirage couleur vs straight draw`
        )
      );
    }
  }
}

// ===== Turn 3-way : hero made vs nut FD vs straight draw ≈ 45-78 % =====
const TURN_HERO: [Rank, Rank, string][] = [
  ["A", "A", "Over-pair"], ["K", "K", "Over-pair"], ["Q", "Q", "Over-pair"],
  ["A", "K", "Top pair TK"], ["A", "Q", "Top pair"], ["J", "J", "Over-pair"],
  ["K", "Q", "Top pair"], ["T", "T", "Over-pair"], ["A", "J", "Top pair"],
  ["9", "9", "Over-pair"], ["K", "J", "Top pair"], ["A", "T", "Top pair"],
];
for (const [h1, h2, lbl] of TURN_HERO) {
  for (const tb of ["T", "9", "8", "5"] as Rank[]) {
    const isPair = h1 === h2;
    const top: Rank = isPair ? tb : h1;
    if ([h1, h2, "K", "4", "J", "9", "7", "6", "2"].includes(top)) continue;
    // v1 = nut flush draw K4 grp F ; board b: 7,6 grp F + top + 2 (plain)
    T.push(
      build3(
        [
          { rank: h1 }, { rank: h2 },
          { rank: "K", grp: "F" }, { rank: "4", grp: "F" },
          { rank: "J" }, { rank: "9" },
          { rank: top }, { rank: "7", grp: "F" }, { rank: "6", grp: "F" }, { rank: "2" },
        ],
        4, "turn", `${lbl} vs nut flush draw vs straight draw (turn)`
      )
    );
  }
}

const TEMPLATES = T.filter((x): x is SpotTemplate => x !== null);

function computeRaw(tpl: SpotTemplate) {
  const villains: [Card, Card][] = [tpl.villain1Cards, tpl.villain2Cards];
  return tpl.board.length === 4
    ? equityMultiExactRiver(tpl.heroCards, villains, tpl.board as [Card, Card, Card, Card])
    : equityMultiExactFlop(tpl.heroCards, villains, tpl.board as [Card, Card, Card]);
}

function main() {
  console.log(`Candidats M2.3 : ${TEMPLATES.length} (${skipped} skippés dup)`);
  const t0 = Date.now();
  const kept: PrecomputedM23Spot[] = [];
  let outOfBand = 0;
  for (const tpl of TEMPLATES) {
    const r = computeRaw(tpl);
    const eqv = Math.round(r.equity * 10) / 10;
    if (eqv < 18 || eqv > 82) {
      outOfBand++;
      continue;
    }
    kept.push({
      id: "tmp",
      heroCards: tpl.heroCards,
      villain1Cards: tpl.villain1Cards,
      villain2Cards: tpl.villain2Cards,
      board: tpl.board,
      street: tpl.street,
      scenarioLabel: tpl.scenarioLabel,
      expected: {
        equity: eqv,
        method: r.method,
        iterations: r.total,
        wins: r.wins,
        losses: r.losses,
        ties: r.ties,
      },
    });
  }
  const spots = kept.map((s, i) => ({
    ...s,
    id: `m2-3-spot-${String(i + 1).padStart(3, "0")}`,
  }));
  console.log(
    `Hors bande [18,82] : ${outOfBand} → ${spots.length} retenus en ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
  const buckets = { "0-20": 0, "20-50": 0, "50-75": 0, "75-100": 0 };
  for (const s of spots) {
    const e = s.expected.equity;
    const k = e < 20 ? "0-20" : e < 50 ? "20-50" : e < 75 ? "50-75" : "75-100";
    buckets[k as keyof typeof buckets]++;
  }
  const band = spots.filter((s) => s.expected.equity >= 20 && s.expected.equity <= 80).length;
  console.log(`  Distribution : ${JSON.stringify(buckets)}`);
  console.log(`  Bande [20-80] : ${band} (${((band / spots.length) * 100).toFixed(1)}%)`);
  const outPath = path.join(process.cwd(), "content", "spots", "m2-3.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${spots.length} spots → ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
