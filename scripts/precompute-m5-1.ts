import * as fs from "fs";
import * as path from "path";
import { isInRange } from "../lib/poker/range-parser";
import { getNashSBPushRange } from "../content/ranges/nash-sb-push";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM51Spot } from "../content/spots/types";

interface SpotTemplate {
  heroCards: [Card, Card];
  heroStack: number;
  category: PrecomputedM51Spot["category"];
  scenarioLabel: string;
}

// Premium hands : toujours dans le range, peu importe la stack
const PREMIUM_HANDS: [Card, Card][] = [
  ["As", "Ah"],
  ["Ks", "Kh"],
  ["Qs", "Qh"],
  ["Js", "Jh"],
  ["As", "Ks"],
  ["As", "Qs"],
  ["As", "Kc"],
  ["As", "Qd"],
];

// Trash hands : presque toujours hors range sauf stacks très courts
const TRASH_HANDS: [Card, Card][] = [
  ["7s", "2h"], // 72o
  ["8c", "3d"], // 83o
  ["6h", "2s"], // 62o
  ["9d", "4c"], // 94o
  ["5s", "2d"], // 52o
];

// Marginales — zone de calibration la plus utile (~22 mains variées)
const MARGINAL_HANDS: [Card, Card][] = [
  // Petites paires
  ["6s", "6h"], ["5c", "5d"], ["4h", "4s"], ["3d", "3c"], ["2s", "2h"],
  // Aces faibles (s/o)
  ["As", "9h"], ["Ad", "8c"], ["Ah", "7s"], ["As", "5d"], ["Ac", "3h"], ["Ad", "2s"],
  ["As", "9s"], ["Ad", "5d"], ["Ah", "3h"],
  // Suited connectors
  ["Ts", "9s"], ["9h", "8h"], ["8c", "7c"], ["7d", "6d"], ["6s", "5s"], ["5h", "4h"],
  // K/Q/J avec kickers variés
  ["Ks", "9h"], ["Kc", "Td"], ["Qs", "Jc"], ["Qh", "9d"], ["Jc", "Th"], ["Js", "8c"],
  // Broadways offsuit (limite range)
  ["Ks", "Qd"], ["Qh", "Tc"], ["Js", "Td"],
  // Suited gappers
  ["Js", "9s"], ["9h", "7h"], ["8c", "6c"], ["7s", "5s"],
  // K/Q suited mid-low
  ["Ks", "8s"], ["Qs", "8s"], ["Js", "7s"],
];

function buildTemplates(): SpotTemplate[] {
  const templates: SpotTemplate[] = [];
  const stackDepths = [5, 7, 8, 10, 12, 15];

  for (const stack of stackDepths) {
    // Premium : 3 par stack
    for (let i = 0; i < 3; i++) {
      templates.push({
        heroCards: PREMIUM_HANDS[i],
        heroStack: stack,
        category: "obvious-push",
        scenarioLabel: `Premium push SB ${stack}bb`,
      });
    }
    // Trash : 2 par stack
    for (let i = 0; i < 2; i++) {
      templates.push({
        heroCards: TRASH_HANDS[i],
        heroStack: stack,
        category: stack <= 5 ? "marginal-push" : "obvious-fold",
        scenarioLabel: `Trash hand SB ${stack}bb`,
      });
    }
    // Marginales : ~22-25 par stack
    for (let i = 0; i < MARGINAL_HANDS.length; i++) {
      const hand = MARGINAL_HANDS[i];
      templates.push({
        heroCards: hand,
        heroStack: stack,
        category: "marginal-push", // sera affiné par Nash
        scenarioLabel: `Marginal SB ${stack}bb`,
      });
    }
  }

  return templates;
}

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM51Spot | null {
  const nashRange = getNashSBPushRange(tpl.heroStack);
  if (!nashRange) {
    console.error(`No Nash range for ${tpl.heroStack}bb`);
    return null;
  }

  const handInRange = isInRange(tpl.heroCards, nashRange.notation);
  const nashAction: "push" | "fold" = handInRange ? "push" : "fold";

  // Affiner category selon Nash : marginal-push si in range, marginal-fold si out range.
  let category = tpl.category;
  if (category === "marginal-push" && !handInRange) {
    category = "marginal-fold";
  }

  return {
    id,
    heroCards: tpl.heroCards,
    heroPosition: "SB",
    villainPosition: "BB",
    heroStack: tpl.heroStack,
    villainStack: tpl.heroStack,
    potBefore: 1.5,
    scenarioLabel: tpl.scenarioLabel,
    category,
    expected: {
      nashAction,
      nashRangeNotation: nashRange.notation,
      handInRange,
    },
  };
}

async function main() {
  console.log("Pré-calcul M5.1 SB push range Nash...");
  const t0 = Date.now();

  const templates = buildTemplates();
  const spots: PrecomputedM51Spot[] = [];
  for (let i = 0; i < templates.length; i++) {
    const tpl = templates[i];
    const id = `m5-1-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(tpl, id);
    if (spot) spots.push(spot);
  }

  const t1 = Date.now();
  console.log(`✓ ${spots.length} spots en ${((t1 - t0) / 1000).toFixed(1)}s`);

  // Distribution par stack
  const byStack: Record<number, number> = {};
  for (const s of spots) byStack[s.heroStack] = (byStack[s.heroStack] ?? 0) + 1;
  console.log(
    "Distribution par stack :",
    Object.entries(byStack)
      .map(([k, v]) => `${k}bb: ${v}`)
      .join(", ")
  );

  const pushCount = spots.filter((s) => s.expected.nashAction === "push").length;
  const foldCount = spots.length - pushCount;
  console.log(`Push: ${pushCount} (${((pushCount / spots.length) * 100).toFixed(1)}%) · Fold: ${foldCount} (${((foldCount / spots.length) * 100).toFixed(1)}%)`);

  // Distribution par category
  const byCat: Record<string, number> = {};
  for (const s of spots) byCat[s.category] = (byCat[s.category] ?? 0) + 1;
  console.log("Distribution catégories :", byCat);

  const outPath = path.join(process.cwd(), "content", "spots", "m5-1.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
