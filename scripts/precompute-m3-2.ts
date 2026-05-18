/**
 * Pré-calcule les spots M3.2 (fold equity isolée).
 *
 * Pour chaque spot : on isole la P(fold) MINIMUM qui rend le push break-even
 * (`breakEvenPFold`), et on compare à la P(fold) RÉELLE estimée à partir de la
 * paire callRange ↔ totalRange (`evPushAllIn` mode précis avec villainTotalRange).
 *
 * Perf : equityVsRange est MC par combo ; iterations=600 (le spec hardcodait
 * 5 000 → intraitable pour ~120 spots × 80-300 combos). La moyenne sur N combos
 * lisse la variance (σ_agrégé ≈ 0.2 %). Exécuté en arrière-plan.
 */
import * as fs from "fs";
import * as path from "path";
import { breakEvenPFold, evPushAllIn } from "../lib/poker/ev";
import { parseRange } from "../lib/poker/range-parser";
import { getRange } from "../content/ranges/canonical";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM32Spot } from "../content/spots/types";

const ITER = 600;

interface SpotTemplate {
  heroCards: [Card, Card];
  heroPosition: string;
  heroStack: number;
  villainPosition: string;
  villainCallRangeSlug: string;
  villainTotalRangeSlug: string;
  potBefore: number;
  scenarioLabel: string;
}

const T: SpotTemplate[] = [];
const push = (
  hero: [Card, Card],
  hp: string,
  stack: number,
  vp: string,
  callSlug: string,
  totalSlug: string,
  pot: number,
  scenario: string
) =>
  T.push({
    heroCards: hero,
    heroPosition: hp,
    heroStack: stack,
    villainPosition: vp,
    villainCallRangeSlug: callSlug,
    villainTotalRangeSlug: totalSlug,
    potBefore: pot,
    scenarioLabel: scenario,
  });

// Pools de mains par tier (du plus fort au plus faible).
const PREMIUM: [Card, Card, string][] = [
  ["As", "Ah", "AA"], ["Ks", "Kh", "KK"], ["Qs", "Qh", "QQ"], ["Js", "Jh", "JJ"],
  ["Ts", "Th", "TT"], ["9s", "9h", "99"], ["As", "Ks", "AKs"], ["As", "Kh", "AKo"],
  ["As", "Qs", "AQs"], ["As", "Qh", "AQo"], ["As", "Js", "AJs"], ["Ks", "Qs", "KQs"],
  ["As", "Ts", "ATs"],
];
const MARGINAL: [Card, Card, string][] = [
  ["8s", "8h", "88"], ["7s", "7h", "77"], ["6s", "6h", "66"], ["5s", "5h", "55"],
  ["As", "Jh", "AJo"], ["As", "Th", "ATo"], ["Ks", "Js", "KJs"], ["Ks", "Td", "KTo"],
  ["Qs", "Js", "QJs"], ["Qs", "Ts", "QTs"], ["Js", "Ts", "JTs"], ["Ts", "9s", "T9s"],
  ["9s", "8s", "98s"], ["As", "5s", "A5s"], ["As", "4s", "A4s"], ["Ks", "9s", "K9s"],
  ["As", "9s", "A9s"], ["Ks", "Qh", "KQo"], ["Qs", "Th", "QTo"], ["Js", "Th", "JTo"],
];
const WEAK: [Card, Card, string][] = [
  ["7s", "2h", "72o"], ["8s", "3h", "83o"], ["9s", "2h", "92o"], ["6s", "2h", "62o"],
  ["5s", "3h", "53o"], ["8s", "4h", "84o"], ["7s", "4h", "74o"], ["Js", "3h", "J3o"],
  ["Ts", "4h", "T4o"], ["9s", "5h", "95o"], ["Ks", "3h", "K3o"], ["Qs", "4h", "Q4o"],
  ["5s", "2h", "52o"], ["4s", "3h", "43o"], ["Js", "5h", "J5o"], ["6s", "3h", "63o"],
  ["7s", "3h", "73o"], ["8s", "2h", "82o"], ["Ts", "2h", "T2o"],
];
const SHORT: [Card, Card, string][] = [
  ["As", "7h", "A7o"], ["As", "5h", "A5o"], ["Ks", "8h", "K8o"], ["Qs", "9h", "Q9o"],
  ["Js", "9h", "J9o"], ["Ts", "8s", "T8s"], ["9s", "8h", "98o"], ["8s", "7h", "87o"],
  ["7s", "6s", "76s"], ["6s", "5s", "65s"], ["As", "9h", "A9o"], ["Ks", "Td", "KTo"],
  ["9s", "7s", "97s"], ["8s", "6s", "86s"], ["Js", "8s", "J8s"], ["Qs", "Ts", "QTs"],
];

// 1. PREMIUM vs BB standard, SB push 10bb (FE breakeven attendue ~0)
for (const [a, b, hl] of PREMIUM)
  push([a, b], "SB", 10, "BB", "call-vs-push-bb-standard", "total-bb-defense-vs-sb-push-10bb", 1.5, `${hl} push SB 10bb vs BB — FE requise minimale ?`);

// 2. PREMIUM vs BB tight, SB push 10bb (encore plus dominant)
for (const [a, b, hl] of PREMIUM.slice(0, 12))
  push([a, b], "SB", 10, "BB", "call-vs-push-bb-tight", "total-bb-defense-vs-sb-push-10bb", 1.5, `${hl} push SB 10bb vs BB tight`);

// 3. MARGINAL vs BB standard, SB push 10bb (FE breakeven ~10-40 %)
for (const [a, b, hl] of MARGINAL)
  push([a, b], "SB", 10, "BB", "call-vs-push-bb-standard", "total-bb-defense-vs-sb-push-10bb", 1.5, `${hl} push SB 10bb vs BB — combien de FE ?`);

// 4. MARGINAL vs BB tight, BTN push 12bb (FE breakeven variable)
for (const [a, b, hl] of MARGINAL.slice(0, 20))
  push([a, b], "BTN", 12, "BB", "call-vs-push-bb-tight", "total-bb-defense-vs-btn-push-12bb", 1.5, `${hl} push BTN 12bb vs BB tight`);

// 5. WEAK vs BB standard, SB push 10bb (FE breakeven ~40-70 %)
for (const [a, b, hl] of WEAK)
  push([a, b], "SB", 10, "BB", "call-vs-push-bb-standard", "total-bb-defense-vs-sb-push-10bb", 1.5, `${hl} push SB 10bb vs BB — FE breakeven ?`);

// 6. WEAK vs BB tight, SB push 10bb (FE breakeven encore plus haute)
for (const [a, b, hl] of WEAK.slice(0, 19))
  push([a, b], "SB", 10, "BB", "call-vs-push-bb-tight", "total-bb-defense-vs-sb-push-10bb", 1.5, `${hl} push SB 10bb vs BB tight (FE breakeven haute)`);

// 7. SHORT 5bb vs BB loose (equity vs call large compense la FE)
for (const [a, b, hl] of SHORT)
  push([a, b], "SB", 5, "BB", "call-vs-push-bb-loose", "total-bb-defense-vs-sb-push-5bb", 1.5, `${hl} push SB 5bb vs BB loose — FE faible suffit ?`);

// 8. MARGINAL vs CO push 12bb (autre paire callRange↔totalRange)
for (const [a, b, hl] of MARGINAL.slice(0, 14))
  push([a, b], "CO", 12, "BB", "call-vs-push-co-vs-btn", "total-bb-vs-co-push", 1.5, `${hl} push CO 12bb vs BB`);

// 9. WEAK vs MP push 10bb
for (const [a, b, hl] of WEAK.slice(0, 12))
  push([a, b], "MP", 10, "BB", "call-vs-push-mp-short", "total-bb-vs-mp-push", 1.5, `${hl} push MP 10bb vs BB`);

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM32Spot | null {
  const callRange = getRange(tpl.villainCallRangeSlug);
  const totalRange = getRange(tpl.villainTotalRangeSlug);
  if (!callRange || !totalRange) {
    console.error(`Range slug introuvable : ${tpl.villainCallRangeSlug} / ${tpl.villainTotalRangeSlug}`);
    return null;
  }
  const callCombos = parseRange(callRange.notation);
  const totalCombos = parseRange(totalRange.notation);
  try {
    const breakEven = breakEvenPFold({
      heroCards: tpl.heroCards,
      heroStack: tpl.heroStack,
      villainStack: tpl.heroStack,
      potBefore: tpl.potBefore,
      villainCallRange: callCombos,
      iterations: ITER,
    });
    const fullEv = evPushAllIn({
      heroCards: tpl.heroCards,
      heroStack: tpl.heroStack,
      villainStack: tpl.heroStack,
      potBefore: tpl.potBefore,
      villainCallRange: callCombos,
      villainTotalRange: totalCombos,
      iterations: ITER,
    });
    const pFoldActual = fullEv.pFold;
    const pFoldBreakEven = breakEven.pFoldBreakEven;
    return {
      id,
      heroCards: tpl.heroCards,
      heroPosition: tpl.heroPosition,
      heroStack: tpl.heroStack,
      villainPosition: tpl.villainPosition,
      villainCallRangeSlug: callRange.slug,
      villainCallRangeLabel: callRange.label,
      villainCallRangeNotation: callRange.notation,
      villainTotalRangeSlug: totalRange.slug,
      villainTotalRangeLabel: totalRange.label,
      villainTotalRangeNotation: totalRange.notation,
      potBefore: tpl.potBefore,
      scenarioLabel: tpl.scenarioLabel,
      expected: {
        pFoldBreakEven: Math.round(pFoldBreakEven * 1000) / 1000,
        pFoldActual: Math.round(pFoldActual * 1000) / 1000,
        equityVsCallRange: Math.round(breakEven.equityVsCallRange * 10) / 10,
        evIfCall: Math.round(breakEven.evIfCall * 100) / 100,
        isPushProfitable: pFoldActual >= pFoldBreakEven,
        evBb: Math.round(fullEv.evBb * 100) / 100,
        combosInCallRange: callCombos.length,
        combosInTotalRange: totalCombos.length,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

function main() {
  console.log(`Pré-calcul de ${T.length} spots M3.2...`);
  const t0 = Date.now();
  const spots: PrecomputedM32Spot[] = [];
  const zones = { "zone1 (0)": 0, "zone2 (0-0.4)": 0, "zone3 (0.4+)": 0 };
  for (let i = 0; i < T.length; i++) {
    const spot = computeSpot(T[i], `m3-2-spot-${String(i + 1).padStart(3, "0")}`);
    if (!spot) continue;
    spots.push(spot);
    const be = spot.expected.pFoldBreakEven;
    const k = be <= 0.001 ? "zone1 (0)" : be < 0.4 ? "zone2 (0-0.4)" : "zone3 (0.4+)";
    zones[k as keyof typeof zones]++;
    if ((i + 1) % 15 === 0) {
      console.log(`  [${i + 1}/${T.length}] ${spot.scenarioLabel} → FE breakeven ${(be * 100).toFixed(1)} %`);
    }
  }
  console.log(`\n✓ ${spots.length} spots en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Distribution FE breakeven : ${JSON.stringify(zones)}`);
  const profitable = spots.filter((s) => s.expected.isPushProfitable).length;
  console.log(`  Push profitable (pFoldActual ≥ breakeven) : ${profitable}/${spots.length}`);
  const outPath = path.join(process.cwd(), "content", "spots", "m3-2.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
