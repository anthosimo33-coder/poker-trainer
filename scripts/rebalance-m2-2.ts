/**
 * Rééquilibrage du pool M2.2 vers la bande utile [25-75].
 *
 * Écarts vs spec (flaggés) :
 *  - Filtre existant [15,80] (et non [13,87]) : les spots 82-88 (« set vs
 *    over-pair ~85 ») sont précisément les « trop évidents » que le spec veut
 *    écarter ; le critère dur (≥60 % en [25-75]) prime sur la borne indicative.
 *  - Re-id séquentiel complet de tous les spots (le schéma filtered.length+1
 *    du spec produit des doublons d'id après filtrage).
 *  - Archétypes ciblés flop-draws / races préflop / mains-faites-vulnérables
 *    (équités fiables 26-72), pas de « turn over-pair vs brique » (skew 80-90).
 */
import * as fs from "fs";
import * as path from "path";
import {
  equityMonteCarlo,
  equityExactFlop,
} from "../lib/poker/equity";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM22Spot } from "../content/spots/types";

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
type Suit = "s" | "h" | "d" | "c";
const SUITS: Suit[] = ["s", "h", "d", "c"];

interface SpotTemplate {
  heroCards: [Card, Card];
  villainCards: [Card, Card];
  board: Card[];
  street: "preflop" | "flop" | "turn";
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
function build(slots: Slot[], boardLen: number, street: SpotTemplate["street"], label: string): SpotTemplate | null {
  const cards = assignSuits(slots);
  if (!cards) {
    skipped++;
    return null;
  }
  return {
    heroCards: [cards[0], cards[1]],
    villainCards: [cards[2], cards[3]],
    board: cards.slice(4, 4 + boardLen),
    street,
    scenarioLabel: label,
  };
}

const NEW: (SpotTemplate | null)[] = [];

// --- Flop : tirage couleur nu vs over-pair (~34-38) ---
for (const [h1, h2, v, b1, b2, b3] of [
  ["A", "K", "Q", "T", "5", "2"], ["K", "Q", "A", "9", "6", "3"], ["A", "J", "K", "8", "4", "2"],
  ["Q", "T", "A", "9", "5", "3"], ["K", "T", "Q", "8", "6", "2"], ["A", "9", "K", "7", "4", "3"],
  ["J", "9", "A", "8", "5", "2"], ["A", "8", "Q", "7", "3", "2"], ["K", "9", "A", "6", "4", "3"],
  ["Q", "9", "K", "7", "5", "2"],
] as [Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1, grp: "F" }, { rank: h2, grp: "F" }, { rank: v }, { rank: v }, { rank: b1, grp: "F" }, { rank: b2, grp: "F" }, { rank: b3 }],
    3, "flop", `Tirage couleur nu (${h1}${h2}s) vs over-pair ${v}${v}`));
}
// --- Flop : OESD vs over-pair (~30-34) ---
for (const [h1, h2, v, b1, b2, b3] of [
  ["9", "8", "A", "T", "7", "2"], ["T", "9", "K", "J", "8", "3"], ["8", "7", "Q", "9", "6", "2"],
  ["7", "6", "A", "8", "5", "3"], ["J", "T", "A", "Q", "9", "2"], ["6", "5", "K", "7", "4", "2"],
  ["9", "8", "Q", "T", "7", "3"], ["T", "9", "A", "J", "8", "2"], ["8", "7", "K", "9", "6", "3"],
  ["5", "4", "A", "6", "3", "2"],
] as [Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1 }, { rank: h2 }, { rank: v }, { rank: v }, { rank: b1 }, { rank: b2 }, { rank: b3 }],
    3, "flop", `Tirage quinte bilatérale (${h1}${h2}) vs over-pair ${v}${v}`));
}
// --- Flop : FD + 2 overs vs over-pair (~44-50) ---
for (const [h1, h2, v, b1, b2, b3] of [
  ["A", "K", "Q", "9", "5", "2"], ["A", "Q", "J", "8", "6", "3"], ["A", "K", "T", "7", "4", "2"],
  ["K", "Q", "J", "9", "5", "2"], ["A", "J", "T", "8", "6", "3"], ["A", "K", "9", "6", "4", "2"],
  ["K", "Q", "T", "8", "5", "3"], ["A", "Q", "9", "7", "4", "2"], ["A", "J", "9", "8", "5", "2"],
  ["K", "J", "T", "9", "6", "3"],
] as [Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1, grp: "F" }, { rank: h2, grp: "F" }, { rank: v }, { rank: v }, { rank: b1, grp: "F" }, { rank: b2, grp: "F" }, { rank: b3 }],
    3, "flop", `FD + 2 overs (${h1}${h2}s) vs over-pair ${v}${v}`));
}
// --- Flop : combo draw (FD + OESD) vs over-pair (~50-58) ---
for (const [h1, h2, v, b1, b2, b3] of [
  ["9", "8", "A", "T", "7", "2"], ["T", "9", "K", "J", "8", "2"], ["8", "7", "A", "9", "6", "2"],
  ["7", "6", "K", "8", "5", "2"], ["J", "T", "A", "Q", "9", "3"], ["6", "5", "Q", "7", "4", "2"],
  ["9", "8", "K", "T", "7", "3"], ["T", "9", "A", "J", "8", "3"], ["8", "7", "Q", "9", "6", "3"],
  ["J", "T", "K", "Q", "9", "2"],
] as [Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1, grp: "F" }, { rank: h2, grp: "F" }, { rank: v }, { rank: v }, { rank: b1, grp: "F" }, { rank: b2, grp: "F" }, { rank: b3 }],
    3, "flop", `Combo draw (${h1}${h2}s) vs over-pair ${v}${v}`));
}
// --- Flop : combo draw vs set (~30-45) ---
for (const [h1, h2, vs, b1, b2] of [
  ["9", "8", "T", "T", "7"], ["8", "7", "9", "9", "6"], ["T", "9", "J", "J", "8"],
  ["7", "6", "8", "8", "5"], ["J", "T", "Q", "Q", "9"], ["6", "5", "7", "7", "4"],
  ["9", "8", "7", "7", "T"], ["T", "9", "8", "8", "J"],
] as [Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1, grp: "F" }, { rank: h2, grp: "F" }, { rank: vs }, { rank: vs }, { rank: b1, grp: "F" }, { rank: b2, grp: "F" }, { rank: vs }],
    3, "flop", `Combo draw (${h1}${h2}s) vs set de ${vs}`));
}
// --- Flop : gutshot + 2 overs vs paire (~24-30) ---
for (const [h1, h2, v, b1, b2, b3] of [
  ["A", "K", "Q", "Q", "J", "2"], ["A", "Q", "J", "J", "T", "3"], ["K", "Q", "T", "T", "9", "2"],
  ["A", "J", "T", "T", "8", "2"], ["A", "K", "J", "J", "9", "3"], ["K", "J", "9", "9", "8", "2"],
  ["A", "T", "8", "8", "7", "2"], ["Q", "J", "9", "9", "8", "3"],
] as [Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1 }, { rank: h2 }, { rank: v }, { rank: v }, { rank: b1 }, { rank: b2 }, { rank: b3 }],
    3, "flop", `Gutshot + 2 overs (${h1}${h2}) vs paire ${b1}${b1}`));
}
// --- Préflop : paire moyenne vs 2 overs (race ~46-57) ---
for (const [p, hi, lo, su] of [
  ["6", "A", "K", false], ["7", "A", "J", false], ["8", "K", "Q", true], ["9", "A", "Q", false],
  ["5", "A", "K", false], ["4", "K", "Q", true], ["3", "A", "Q", false], ["2", "A", "K", false],
  ["6", "A", "Q", true], ["7", "K", "Q", false], ["8", "A", "J", true], ["9", "A", "K", false],
  ["5", "K", "J", true], ["6", "Q", "J", false], ["7", "A", "T", true], ["8", "A", "Q", false],
  ["9", "K", "Q", true], ["4", "A", "J", false],
] as [Rank, Rank, Rank, boolean][]) {
  const g = su ? "V" : undefined;
  NEW.push(build(
    [{ rank: p }, { rank: p }, { rank: hi, grp: g }, { rank: lo, grp: g }],
    0, "preflop", `Pocket ${p}${p} vs ${hi}${lo}${su ? "s" : "o"} (race)`));
}
// --- Préflop : grosse paire vs AK suited (flip ~54/46) ---
for (const [p, h1, h2] of [
  ["J", "A", "K"], ["T", "A", "K"], ["Q", "A", "K"], ["9", "A", "Q"],
  ["T", "A", "Q"], ["J", "A", "Q"], ["9", "K", "Q"], ["8", "A", "K"],
] as [Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: p }, { rank: p }, { rank: h1, grp: "W" }, { rank: h2, grp: "W" }],
    0, "preflop", `Pocket ${p}${p} vs ${h1}${h2}s (flip)`));
}
// --- Flop : main faite vulnérable (hero devant, ~55-72) ---
const MV: [Rank, Rank, Rank, Rank, Rank, Rank, Rank, string][] = [
  ["A", "A", "9", "8", "T", "7", "2", "Over-pair vs tirage quinte bilatérale"],
  ["K", "K", "T", "9", "8", "7", "2", "Over-pair vs OESD"],
  ["Q", "Q", "J", "T", "9", "8", "3", "Over-pair vs OESD"],
  ["A", "A", "K", "Q", "J", "T", "3", "Over-pair vs gutshot broadway"],
  ["K", "K", "Q", "J", "T", "9", "2", "Over-pair vs OESD + over"],
  ["A", "T", "9", "8", "T", "7", "3", "Top pair kicker faible vs combo draw"],
  ["K", "T", "J", "9", "T", "8", "4", "Top pair vs OESD"],
  ["A", "J", "T", "9", "A", "8", "2", "Top pair vs OESD"],
  ["K", "Q", "J", "T", "K", "9", "3", "Top pair vs OESD"],
  ["A", "Q", "K", "J", "Q", "9", "4", "Top pair vs gutshot broadway"],
  ["A", "T", "K", "Q", "A", "5", "2", "Two pair vs 2 overs"],
  ["K", "9", "A", "J", "K", "9", "4", "Two pair vs overs"],
  ["Q", "8", "A", "K", "Q", "8", "3", "Two pair vs 2 overs"],
  ["J", "T", "A", "Q", "J", "T", "2", "Two pair vs gutshot"],
  ["9", "9", "K", "Q", "8", "7", "2", "Over-pair vs 2 overs + gutshot"],
  ["8", "8", "A", "T", "9", "7", "2", "Paire moyenne vs over + OESD"],
  ["T", "T", "A", "K", "9", "8", "2", "Over-pair vs 2 overs"],
  ["A", "K", "Q", "J", "K", "T", "3", "Top pair TK vs gutshot"],
];
for (const [h1, h2, v1, v2, b1, b2, b3, label] of MV) {
  NEW.push(build(
    [{ rank: h1 }, { rank: h2 }, { rank: v1 }, { rank: v2 }, { rank: b1 }, { rank: b2 }, { rank: b3 }],
    3, "flop", label));
}
// --- Flop : two pair vs flush draw (~58-68) ---
for (const [h1, h2, v1, v2, b1, b2, b3] of [
  ["A", "T", "K", "Q", "A", "T", "5"], ["K", "9", "A", "J", "K", "9", "4"],
  ["Q", "8", "A", "K", "Q", "8", "3"], ["J", "T", "A", "Q", "J", "T", "2"],
  ["A", "9", "K", "Q", "A", "9", "6"], ["K", "T", "A", "J", "K", "T", "4"],
] as [Rank, Rank, Rank, Rank, Rank, Rank, Rank][]) {
  NEW.push(build(
    [{ rank: h1 }, { rank: h2 }, { rank: v1, grp: "F" }, { rank: v2, grp: "F" }, { rank: b1 }, { rank: b2, grp: "F" }, { rank: b3, grp: "F" }],
    3, "flop", `Two pair ${h1}${h2} vs tirage couleur`));
}

// ===================== CALCUL & FUSION =====================
const SRC = path.join(process.cwd(), "content", "spots", "m2-2.json");
const existing = JSON.parse(fs.readFileSync(SRC, "utf-8")) as PrecomputedM22Spot[];
const filtered = existing.filter((s) => s.expected.equity >= 15 && s.expected.equity <= 80);
console.log(`Pool initial : ${existing.length} spots`);
console.log(`Après filtrage extrêmes [15,80] : ${filtered.length} spots`);

function compute(tpl: SpotTemplate) {
  if (tpl.board.length === 3)
    return equityExactFlop(tpl.heroCards, tpl.villainCards, tpl.board as [Card, Card, Card]);
  return equityMonteCarlo(tpl.heroCards, tpl.villainCards, tpl.board, 100_000);
}

const templates = NEW.filter((x): x is SpotTemplate => x !== null);
const t0 = Date.now();
const newSpots: PrecomputedM22Spot[] = [];
let outOfBand = 0;
for (const tpl of templates) {
  const r = compute(tpl);
  const eqv = Math.round(r.equity * 10) / 10;
  if (eqv < 16 || eqv > 84) {
    outOfBand++;
    continue;
  }
  newSpots.push({
    id: "tmp",
    heroCards: tpl.heroCards,
    villainCards: tpl.villainCards,
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
console.log(
  `Nouveaux templates : ${templates.length} (skipped dup ${skipped}, hors bande ${outOfBand}) → ${newSpots.length} retenus`
);
console.log(`Calcul nouveaux spots : ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const final = [...filtered, ...newSpots].map((s, i) => ({
  ...s,
  id: `m2-2-spot-${String(i + 1).padStart(3, "0")}`,
}));

const buckets = { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0 };
for (const s of final) {
  const e = s.expected.equity;
  const k = e < 25 ? "0-25" : e < 50 ? "25-50" : e < 75 ? "50-75" : "75-100";
  buckets[k as keyof typeof buckets]++;
}
const mid = buckets["25-50"] + buckets["50-75"];
console.log(`\nDistribution finale (${final.length} spots) :`);
for (const [b, c] of Object.entries(buckets)) {
  console.log(`  [${b}%] : ${c} (${((c / final.length) * 100).toFixed(1)}%)`);
}
console.log(`  Bande utile [25-75] : ${mid} (${((mid / final.length) * 100).toFixed(1)}%)`);

fs.writeFileSync(SRC, JSON.stringify(final, null, 2));
console.log(`✓ Pool rééquilibré écrit dans ${SRC}`);
