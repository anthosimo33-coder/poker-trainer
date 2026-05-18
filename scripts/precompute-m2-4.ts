/**
 * Pré-calcule les spots M2.4 (Equity vs range).
 * Chaque spot : hero vs un range canonique, moyenne pondérée sur les combos.
 *
 * Perf : equityVsRange fait du Monte Carlo par combo. Itérations modestes
 * (préflop 500, postflop 400) — la moyenne sur N combos lisse la variance
 * (σ agrégé ≈ σ_combo / √N ≈ 0.1-0.2 %, très en deçà de la bande ±1 %).
 * ~150 spots → ~10-15 min ⇒ exécuté en arrière-plan.
 */
import * as fs from "fs";
import * as path from "path";
import { equityVsRange } from "../lib/poker/equity";
import { parseRange } from "../lib/poker/range-parser";
import { getRange } from "../content/ranges/canonical";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM24Spot } from "../content/spots/types";

interface SpotTemplate {
  heroCards: [Card, Card];
  villainRangeSlug: string;
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
}

const T: SpotTemplate[] = [];

// ===== PRÉFLOP : hero × range (loops) =====
const PF_HEROES: [Card, Card, string][] = [
  ["As" as Card, "Ah" as Card, "AA"],
  ["Ks" as Card, "Kd" as Card, "KK"],
  ["Qs" as Card, "Qh" as Card, "QQ"],
  ["Js" as Card, "Jh" as Card, "JJ"],
  ["Ts" as Card, "Tc" as Card, "TT"],
  ["9s" as Card, "9d" as Card, "99"],
  ["7s" as Card, "7h" as Card, "77"],
  ["5s" as Card, "5c" as Card, "55"],
  ["3s" as Card, "3d" as Card, "33"],
  ["As" as Card, "Ks" as Card, "AKs"],
  ["As" as Card, "Qs" as Card, "AQs"],
  ["As" as Card, "Js" as Card, "AJs"],
  ["As" as Card, "5s" as Card, "A5s"],
  ["Ks" as Card, "Qs" as Card, "KQs"],
  ["7s" as Card, "6s" as Card, "76s"],
  ["9s" as Card, "8s" as Card, "98s"],
  ["Ah" as Card, "Kd" as Card, "AKo"],
  ["Ah" as Card, "Qd" as Card, "AQo"],
  ["Ah" as Card, "Td" as Card, "ATo"],
  ["Kh" as Card, "Qd" as Card, "KQo"],
];
const PF_RANGES = [
  "open-utg-15",
  "open-mp-20",
  "open-co-30",
  "open-btn-45",
  "open-sb-35",
  "3bet-value-tight",
  "3bet-linear-medium",
  "3bet-polarized-btn",
  "3bet-bb-vs-btn",
  "defense-bb-vs-btn",
  "defense-bb-vs-co",
  "defense-bb-vs-utg",
  "push-btn-12bb",
  "push-sb-10bb",
  "push-co-15bb",
  "squeeze-tight",
  "squeeze-medium",
  "4bet-value-tight",
  "iso-vs-limp",
  "fish-3bet-light",
];
// Chaque hero affronte 4 ranges (rotation) → 20 × 4 = 80 préflop
for (let i = 0; i < PF_HEROES.length; i++) {
  const [c1, c2, hl] = PF_HEROES[i];
  for (let k = 0; k < 4; k++) {
    const slug = PF_RANGES[(i + k * 5) % PF_RANGES.length];
    const r = getRange(slug)!;
    T.push({
      heroCards: [c1, c2],
      villainRangeSlug: slug,
      board: [],
      street: "preflop",
      scenarioLabel: `${hl} vs ${r.label}`,
    });
  }
}

// ===== FLOP : hero + board fixes × range =====
const FLOP_CASES: [[Card, Card], Card[], string, string][] = [
  [["As", "Ks"], ["Ts", "7s", "2d"], "open-btn-45", "NFD + overs vs BTN open"],
  [["Ah", "Ad"], ["Kh", "8s", "3d"], "defense-bb-vs-btn", "Over-pair vs BB defense"],
  [["Qs", "Qh"], ["Jd", "9c", "4s"], "open-co-30", "Over-pair vs CO open"],
  [["Ad", "Kd"], ["Kc", "9s", "5h"], "3bet-linear-medium", "Top pair TK vs 3-bet range"],
  [["9c", "8c"], ["Tc", "7d", "2h"], "open-btn-45", "Combo draw vs BTN open"],
  [["Js", "Ts"], ["9h", "8d", "2c"], "defense-bb-vs-co", "OESD vs BB defense"],
  [["Ac", "Qc"], ["Qd", "7s", "3h"], "defense-bb-vs-btn", "Top pair vs BB defense"],
  [["7h", "7d"], ["Ah", "Kc", "5s"], "3bet-value-tight", "Under-pair vs 3-bet"],
  [["Kh", "Qh"], ["Kd", "8c", "4s"], "open-mp-20", "Top pair vs MP open"],
  [["As", "Js"], ["Js", "9d", "6c"], "open-sb-35", "Top pair vs SB open"],
  [["Td", "Tc"], ["9s", "6h", "2d"], "defense-bb-vs-utg", "Over-pair vs UTG defense"],
  [["Ah", "Qd"], ["Qs", "Tc", "5d"], "open-co-30", "Top pair vs CO open"],
  [["8s", "7s"], ["6s", "5d", "Kc"], "open-btn-45", "Combo draw vs BTN open"],
  [["Ad", "Ac"], ["Js", "Ts", "9d"], "defense-bb-vs-btn", "Over-pair vs wet board vs BB"],
  [["Ks", "Js"], ["Qd", "Tc", "3h"], "3bet-polarized-btn", "OESD vs 3-bet polarized"],
  [["Qc", "Jc"], ["Tc", "8d", "2s"], "open-co-30", "Gutshot + FD vs CO open"],
  [["As", "Th"], ["Td", "7c", "4s"], "defense-bb-vs-co", "Top pair weak kicker vs BB"],
  [["9d", "9h"], ["Ks", "Qd", "2c"], "3bet-linear-medium", "Under-pair vs 3-bet"],
  [["Ah", "Kh"], ["Ad", "8s", "3c"], "push-btn-12bb", "Top pair vs push range"],
  [["Js", "Jd"], ["9s", "7h", "2d"], "open-mp-20", "Over-pair vs MP open"],
  [["Ts", "9s"], ["8s", "7d", "Ac"], "defense-bb-vs-btn", "Combo draw vs BB defense"],
  [["Ac", "Kd"], ["Qs", "Jh", "Ts"], "3bet-value-tight", "Broadway draw vs 3-bet"],
  [["6h", "6d"], ["6s", "Kc", "4d"], "defense-bb-vs-co", "Set vs BB defense"],
  [["As", "Qs"], ["Ks", "Js", "5d"], "open-btn-45", "NFD + gutshot vs BTN open"],
  [["Kd", "Kc"], ["8h", "5s", "2d"], "defense-bb-vs-utg", "Over-pair vs UTG defense"],
  [["Qh", "Jh"], ["Td", "9s", "3c"], "open-co-30", "OESD vs CO open"],
  [["Ad", "5d"], ["Kd", "9d", "4s"], "open-sb-35", "NFD vs SB open"],
  [["Tc", "Td"], ["As", "8h", "3d"], "3bet-linear-medium", "Under-pair vs 3-bet"],
  [["Ks", "Qd"], ["Qc", "8s", "4h"], "defense-bb-vs-btn", "Top pair vs BB defense"],
  [["9h", "8h"], ["7s", "6d", "Kc"], "open-mp-20", "OESD vs MP open"],
  [["As", "Ah"], ["9c", "6s", "2d"], "fish-3bet-light", "Over-pair vs fish 3-bet"],
  [["Js", "Ts"], ["Qd", "9c", "4s"], "defense-bb-vs-co", "OESD vs BB defense"],
  [["Ad", "Kh"], ["Ac", "7d", "2s"], "iso-vs-limp", "Top pair vs iso range"],
  [["7c", "7d"], ["Ks", "Qh", "5c"], "defense-bb-vs-btn", "Under-pair vs BB defense"],
  [["Ks", "Js"], ["Ts", "9s", "2d"], "open-btn-45", "FD + gutshot vs BTN open"],
  [["Qd", "Qs"], ["Ah", "8c", "3d"], "3bet-polarized-btn", "Under-pair vs 3-bet"],
  [["Ah", "Jd"], ["Js", "7c", "4h"], "open-co-30", "Top pair vs CO open"],
  [["8d", "8c"], ["8s", "Td", "2h"], "defense-bb-vs-co", "Set vs BB defense"],
  [["As", "Ks"], ["Qs", "8s", "3d"], "defense-bb-vs-btn", "NFD vs BB defense"],
  [["Tc", "9c"], ["8c", "7d", "2s"], "open-sb-35", "Combo draw vs SB open"],
  [["Ad", "Qh"], ["Qd", "9s", "5c"], "push-co-15bb", "Top pair vs push range"],
  [["Kh", "Kd"], ["Ts", "8d", "3c"], "defense-bb-vs-utg", "Over-pair vs UTG defense"],
  [["Js", "9s"], ["Ts", "8d", "2s"], "open-btn-45", "Combo draw vs BTN open"],
  [["Ac", "Tc"], ["Td", "6s", "3h"], "defense-bb-vs-co", "Top pair weak kicker vs BB"],
  [["Qs", "Js"], ["Ks", "Td", "4s"], "3bet-linear-medium", "Gutshot + FD vs 3-bet"],
  [["9d", "8d"], ["7d", "6s", "Kc"], "open-mp-20", "Combo draw vs MP open"],
  [["As", "Kd"], ["Ah", "Qs", "7d"], "defense-bb-vs-btn", "Two pair top vs BB defense"],
  [["6s", "6h"], ["As", "Kd", "9c"], "3bet-value-tight", "Under-pair vs 3-bet"],
  [["Kc", "Qc"], ["Jc", "Td", "3s"], "open-co-30", "OESD + FD vs CO open"],
  [["Ah", "Ad"], ["Ks", "Js", "8d"], "defense-bb-vs-btn", "Over-pair vs wet vs BB"],
];
for (const [hero, board, slug, label] of FLOP_CASES) {
  T.push({
    heroCards: hero,
    villainRangeSlug: slug,
    board,
    street: "flop",
    scenarioLabel: label,
  });
}

// ===== TURN : hero + 4-card board × range =====
const TURN_CASES: [[Card, Card], Card[], string, string][] = [
  [["Ks", "Kc"], ["Qs", "8d", "3c", "5h"], "defense-bb-vs-btn", "Over-pair vs BB (turn brique)"],
  [["As", "Ks"], ["Ts", "7s", "2d", "9c"], "open-btn-45", "NFD vs BTN (turn brique)"],
  [["Ah", "Ad"], ["Kh", "8s", "3d", "2c"], "defense-bb-vs-co", "Over-pair vs BB (turn brique)"],
  [["Qd", "Qc"], ["Js", "9d", "4s", "2h"], "open-co-30", "Over-pair vs CO (turn brique)"],
  [["Ac", "Kd"], ["Kc", "9s", "5h", "3d"], "3bet-linear-medium", "Top pair TK vs 3-bet (turn)"],
  [["Js", "Ts"], ["9h", "8d", "2c", "Qs"], "defense-bb-vs-btn", "Straight vs BB defense (turn)"],
  [["9c", "9d"], ["Ah", "Kc", "7s", "4d"], "3bet-value-tight", "Under-pair vs 3-bet (turn)"],
  [["As", "Qs"], ["Ks", "Js", "5d", "2c"], "open-btn-45", "NFD + gutshot vs BTN (turn)"],
  [["Kh", "Qh"], ["Kd", "8c", "4s", "9h"], "open-mp-20", "Top pair vs MP (turn)"],
  [["Td", "Tc"], ["9s", "6h", "2d", "Ac"], "defense-bb-vs-utg", "Under-pair vs UTG (turn)"],
  [["Ah", "Jh"], ["Js", "7c", "4h", "2d"], "open-co-30", "Top pair vs CO (turn brique)"],
  [["8s", "7s"], ["6s", "5d", "Kc", "2h"], "open-btn-45", "Straight vs BTN (turn)"],
  [["Ad", "Ac"], ["Js", "Ts", "9d", "3c"], "defense-bb-vs-btn", "Over-pair vs wet vs BB (turn)"],
  [["Ks", "Js"], ["Qd", "Tc", "3h", "7s"], "3bet-polarized-btn", "OESD missed vs 3-bet (turn)"],
  [["Ac", "Tc"], ["Td", "7s", "4h", "Kd"], "defense-bb-vs-co", "Top pair weak vs BB (turn)"],
  [["Qs", "Qd"], ["8h", "5c", "2s", "Jd"], "open-sb-35", "Over-pair vs SB (turn)"],
  [["Ah", "Kh"], ["Ad", "8s", "3c", "5d"], "push-btn-12bb", "Top pair vs push (turn)"],
  [["Js", "Jc"], ["9s", "7h", "2d", "4c"], "open-mp-20", "Over-pair vs MP (turn)"],
  [["Ks", "Qs"], ["Js", "Ts", "4d", "2c"], "open-btn-45", "NFD + OESD vs BTN (turn)"],
  [["Ad", "Kd"], ["Qs", "Jh", "Ts", "3c"], "3bet-value-tight", "Broadway vs 3-bet (turn)"],
  [["6h", "6d"], ["6s", "Kc", "4d", "9h"], "defense-bb-vs-co", "Set vs BB defense (turn)"],
  [["Th", "Td"], ["As", "8h", "3d", "Qc"], "3bet-linear-medium", "Under-pair vs 3-bet (turn)"],
  [["As", "Ah"], ["9c", "6s", "2d", "Kh"], "fish-3bet-light", "Over-pair vs fish (turn)"],
  [["Kc", "Qd"], ["Qc", "8s", "4h", "2d"], "defense-bb-vs-btn", "Top pair vs BB (turn brique)"],
  [["Qh", "Jh"], ["Td", "9s", "3c", "Ah"], "open-co-30", "OESD missed vs CO (turn)"],
];
for (const [hero, board, slug, label] of TURN_CASES) {
  T.push({
    heroCards: hero,
    villainRangeSlug: slug,
    board,
    street: "turn",
    scenarioLabel: label,
  });
}

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM24Spot | null {
  const range = getRange(tpl.villainRangeSlug);
  if (!range) {
    console.error(`Range slug introuvable : ${tpl.villainRangeSlug}`);
    return null;
  }
  const combos = parseRange(range.notation);
  const iterations = tpl.board.length === 0 ? 500 : 400;
  try {
    const result = equityVsRange(tpl.heroCards, combos, tpl.board, iterations);
    return {
      id,
      heroCards: tpl.heroCards,
      villainRangeSlug: range.slug,
      villainRangeLabel: range.label,
      villainRangeNotation: range.notation,
      board: tpl.board,
      street: tpl.street,
      scenarioLabel: tpl.scenarioLabel,
      expected: {
        equity: Math.round(result.equity * 10) / 10,
        comboCount: result.validCombos,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

function main() {
  console.log(`Pré-calcul de ${T.length} spots M2.4...`);
  const t0 = Date.now();
  const spots: PrecomputedM24Spot[] = [];
  const buckets = { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0 };
  for (let i = 0; i < T.length; i++) {
    const spot = computeSpot(T[i], `m2-4-spot-${String(i + 1).padStart(3, "0")}`);
    if (!spot) continue;
    spots.push(spot);
    const e = spot.expected.equity;
    const k = e < 25 ? "0-25" : e < 50 ? "25-50" : e < 75 ? "50-75" : "75-100";
    buckets[k as keyof typeof buckets]++;
    if ((i + 1) % 20 === 0) {
      console.log(
        `  [${i + 1}/${T.length}] ${spot.scenarioLabel} → ${spot.expected.equity}% (${spot.expected.comboCount} combos)`
      );
    }
  }
  const mid = buckets["25-50"] + buckets["50-75"];
  console.log(`\n✓ ${spots.length} spots en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Distribution : ${JSON.stringify(buckets)}`);
  console.log(`  Bande [25-75] : ${mid} (${((mid / spots.length) * 100).toFixed(1)}%)`);
  const outPath = path.join(process.cwd(), "content", "spots", "m2-4.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
