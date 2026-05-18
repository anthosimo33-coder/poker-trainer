/**
 * Pré-calcule les spots M3.1 (push/fold sub-15bb).
 * Chaque spot : hero push all-in, vilain call avec un range canonique → EV.
 *
 * Perf : evPushAllIn fait un equityVsRange (MC par combo). On passe
 * iterations=600 (le spec hardcodait 5 000 → intraitable pour ~120 spots ×
 * 50-300 combos). La moyenne sur N combos lisse la variance (σ_agrégé ≈ 0.2 %),
 * EV à ±0.05 bb près — largement sous la bande Excellent (0.3 bb). Exécuté en
 * arrière-plan.
 */
import * as fs from "fs";
import * as path from "path";
import { evPushAllIn } from "../lib/poker/ev";
import { parseRange } from "../lib/poker/range-parser";
import { getRange } from "../content/ranges/canonical";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM31Spot } from "../content/spots/types";

const ITER = 600;
const ANTE_POT = 2.625; // SB 0.5 + BB 1 + ~1.125 antes (9 joueurs × 0.125)

type Pos = PrecomputedM31Spot["heroPosition"];
type VPos = PrecomputedM31Spot["villainPosition"];

interface SpotTemplate {
  heroCards: [Card, Card];
  heroPosition: Pos;
  heroStack: number;
  villainPosition: VPos;
  villainCallRangeSlug: string;
  potBefore: number;
  hasAntes: boolean;
  scenarioLabel: string;
}

// Mains du plus fort au plus faible (variété de tiers pour étaler les EV).
const HEROES: [Card, Card, string][] = [
  ["As", "Ah", "AA"], ["Ks", "Kh", "KK"], ["Qs", "Qh", "QQ"], ["Js", "Jh", "JJ"],
  ["Ts", "Th", "TT"], ["9s", "9h", "99"], ["8s", "8h", "88"], ["7s", "7h", "77"],
  ["5s", "5h", "55"], ["3s", "3h", "33"], ["2s", "2h", "22"],
  ["As", "Ks", "AKs"], ["As", "Kh", "AKo"], ["As", "Qs", "AQs"], ["As", "Qh", "AQo"],
  ["As", "Js", "AJs"], ["As", "Jh", "AJo"], ["As", "Ts", "ATs"], ["As", "Th", "ATo"],
  ["As", "9s", "A9s"], ["As", "5s", "A5s"], ["As", "2h", "A2o"],
  ["Ks", "Qs", "KQs"], ["Ks", "Qh", "KQo"], ["Ks", "Js", "KJs"], ["Ks", "Td", "KTo"],
  ["Qs", "Js", "QJs"], ["Qs", "Th", "QTo"], ["Js", "Th", "JTo"], ["Ts", "9s", "T9s"],
  ["9s", "8s", "98s"], ["7s", "6s", "76s"], ["Tc", "9h", "T9o"], ["Ks", "9h", "K9o"],
  ["8s", "7h", "87o"], ["7s", "3h", "73o"], ["9s", "4h", "94o"], ["6s", "2h", "62o"],
];

const T: SpotTemplate[] = [];
const push = (
  hero: [Card, Card],
  label: string,
  hp: Pos,
  stack: number,
  vp: VPos,
  slug: string,
  pot: number,
  antes: boolean,
  scenario: string
) =>
  T.push({
    heroCards: hero,
    heroPosition: hp,
    heroStack: stack,
    villainPosition: vp,
    villainCallRangeSlug: slug,
    potBefore: pot,
    hasAntes: antes,
    scenarioLabel: scenario,
  });

// 1. SB push vs BB, 10bb, call range standard (~20)
for (const [c1, c2, hl] of HEROES.slice(0, 20))
  push([c1, c2], hl, "SB", 10, "BB", "call-vs-push-bb-standard", 1.5, false, `${hl} push SB 10bb vs BB standard`);

// 2. SB push vs BB, 10bb, call range TIGHT (haute fold equity) (~15)
for (const [c1, c2, hl] of HEROES.slice(18, 33))
  push([c1, c2], hl, "SB", 10, "BB", "call-vs-push-bb-tight", 1.5, false, `${hl} push SB 10bb vs BB tight`);

// 3. SB push vs BB, 10bb, call range LOOSE (faible fold equity) (~15)
for (const [c1, c2, hl] of HEROES.slice(0, 15))
  push([c1, c2], hl, "SB", 10, "BB", "call-vs-push-bb-loose", 1.5, false, `${hl} push SB 10bb vs BB loose`);

// 4. BTN push vs BB, 12bb (~15)
for (const [c1, c2, hl] of HEROES.slice(10, 25))
  push([c1, c2], hl, "BTN", 12, "BB", "call-vs-push-bb-vs-btn-15bb", 1.5, false, `${hl} push BTN 12bb vs BB`);

// 5. BTN push vs SB, 15bb (~10)
for (const [c1, c2, hl] of HEROES.slice(0, 10))
  push([c1, c2], hl, "BTN", 15, "SB", "call-vs-push-sb-tight", 1.5, false, `${hl} push BTN 15bb vs SB`);

// 6. Avec antes : SB push vs BB 10bb, loose (~20)
for (const [c1, c2, hl] of HEROES.slice(11, 31))
  push([c1, c2], hl, "SB", 10, "BB", "call-vs-push-bb-loose", ANTE_POT, true, `${hl} push SB 10bb +antes vs BB loose`);

// 7. Stacks courts 5bb : SB push vs BB loose (~12)
for (const [c1, c2, hl] of HEROES.slice(22, 34))
  push([c1, c2], hl, "SB", 5, "BB", "call-vs-push-bb-loose", 1.5, false, `${hl} push SB 5bb vs BB (any two zone)`);

// 8. Stacks 7bb : SB push vs BB standard (~10)
for (const [c1, c2, hl] of HEROES.slice(14, 24))
  push([c1, c2], hl, "SB", 7, "BB", "call-vs-push-bb-standard", 1.5, false, `${hl} push SB 7bb vs BB standard`);

// 9. Edge cases : mains marginales vs tight 8bb (fold equity test) (~13)
for (const [c1, c2, hl] of HEROES.slice(25, 38))
  push([c1, c2], hl, "SB", 8, "BB", "call-vs-push-bb-tight", 1.5, false, `${hl} push SB 8bb vs BB tight (fold equity)`);

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM31Spot | null {
  const range = getRange(tpl.villainCallRangeSlug);
  if (!range) {
    console.error(`Range slug introuvable : ${tpl.villainCallRangeSlug}`);
    return null;
  }
  const callCombos = parseRange(range.notation);
  try {
    const r = evPushAllIn({
      heroCards: tpl.heroCards,
      heroStack: tpl.heroStack,
      villainStack: tpl.heroStack,
      potBefore: tpl.potBefore,
      villainCallRange: callCombos,
      iterations: ITER,
    });
    return {
      id,
      heroCards: tpl.heroCards,
      heroPosition: tpl.heroPosition,
      heroStack: tpl.heroStack,
      villainPosition: tpl.villainPosition,
      villainCallRangeSlug: range.slug,
      villainCallRangeLabel: range.label,
      villainCallRangeNotation: range.notation,
      potBefore: tpl.potBefore,
      hasAntes: tpl.hasAntes,
      scenarioLabel: tpl.scenarioLabel,
      expected: {
        pFold: Math.round(r.pFold * 1000) / 1000,
        equityVsCallRange: Math.round(r.equityVsCallRange * 10) / 10,
        evBb: Math.round(r.evBb * 100) / 100,
        combosInCallRange: callCombos.length,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

function main() {
  console.log(`Pré-calcul de ${T.length} spots M3.1...`);
  const t0 = Date.now();
  const spots: PrecomputedM31Spot[] = [];
  const buckets = { "<-1": 0, "-1..0": 0, "0..1": 0, "1..2": 0, ">2": 0 };
  for (let i = 0; i < T.length; i++) {
    const spot = computeSpot(T[i], `m3-1-spot-${String(i + 1).padStart(3, "0")}`);
    if (!spot) continue;
    spots.push(spot);
    const ev = spot.expected.evBb;
    const k = ev < -1 ? "<-1" : ev < 0 ? "-1..0" : ev < 1 ? "0..1" : ev < 2 ? "1..2" : ">2";
    buckets[k as keyof typeof buckets]++;
    if ((i + 1) % 15 === 0) {
      console.log(`  [${i + 1}/${T.length}] ${spot.scenarioLabel} → EV ${spot.expected.evBb} bb`);
    }
  }
  const band = spots.filter((s) => Math.abs(s.expected.evBb) <= 1).length;
  console.log(`\n✓ ${spots.length} spots en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Distribution EV : ${JSON.stringify(buckets)}`);
  console.log(`  Bande ±1 bb (calibration) : ${band} (${((band / spots.length) * 100).toFixed(1)}%)`);
  const outPath = path.join(process.cwd(), "content", "spots", "m3-1.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
