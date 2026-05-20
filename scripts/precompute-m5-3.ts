import * as fs from "fs";
import * as path from "path";
import { isInRange } from "../lib/poker/range-parser";
import { getNashBTNPushRange } from "../content/ranges/nash-btn-push";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM53Spot } from "../content/spots/types";

interface SpotTemplate {
  heroCards: [Card, Card];
  heroStack: number;
  category: PrecomputedM53Spot["category"];
  scenarioLabel: string;
}

const PREMIUM_HANDS: [Card, Card][] = [
  ["As", "Ah"],
  ["Ks", "Kh"],
  ["Qs", "Qh"],
  ["Js", "Jh"],
  ["As", "Ks"],
  ["As", "Kc"],
];

const TRASH_HANDS: [Card, Card][] = [
  ["7s", "2h"],
  ["8c", "3d"],
  ["6h", "2s"],
  ["5s", "2d"],
];

// Marginales pour BTN push : test la frontière SB/BTN
const MARGINAL_HANDS: [Card, Card][] = [
  // Petites paires
  ["6s", "6h"], ["5c", "5d"], ["4h", "4s"], ["3d", "3c"], ["2s", "2h"],
  // Aces (A5o = ligne séparant SB et BTN à 10-12bb)
  ["As", "9h"], ["Ad", "8c"], ["Ah", "7s"], ["As", "5d"], ["Ac", "3h"], ["Ad", "2s"],
  ["As", "9s"], ["Ad", "5d"], ["Ah", "3h"],
  // Suited connectors
  ["Ts", "9s"], ["9h", "8h"], ["8c", "7c"], ["7d", "6d"], ["6s", "5s"], ["5h", "4h"],
  // K kickers variés
  ["Ks", "9h"], ["Kc", "Td"], ["Ks", "8s"], ["Kh", "7s"],
  // Q-J
  ["Qs", "Jc"], ["Qh", "9d"], ["Jc", "Th"], ["Js", "8c"],
  // Broadways offsuit
  ["Ks", "Qd"], ["Qh", "Tc"], ["Js", "Td"],
  // Suited gappers
  ["Js", "9s"], ["9h", "7h"], ["8c", "6c"], ["7s", "5s"],
  // K/Q suited mid-low
  ["Qs", "8s"], ["Js", "7s"],
];

function buildTemplates(): SpotTemplate[] {
  const templates: SpotTemplate[] = [];
  const stackDepths = [5, 7, 8, 10, 12, 15];

  for (const stack of stackDepths) {
    for (let i = 0; i < 3; i++) {
      templates.push({
        heroCards: PREMIUM_HANDS[i],
        heroStack: stack,
        category: "obvious-push",
        scenarioLabel: `Premium push BTN ${stack}bb`,
      });
    }
    for (let i = 0; i < 2; i++) {
      templates.push({
        heroCards: TRASH_HANDS[i],
        heroStack: stack,
        category: stack <= 5 ? "marginal-push" : "obvious-fold",
        scenarioLabel: `Trash hand BTN ${stack}bb`,
      });
    }
    for (let i = 0; i < MARGINAL_HANDS.length; i++) {
      templates.push({
        heroCards: MARGINAL_HANDS[i],
        heroStack: stack,
        category: "marginal-push",
        scenarioLabel: `Marginal BTN ${stack}bb`,
      });
    }
  }

  return templates;
}

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM53Spot | null {
  const nashRange = getNashBTNPushRange(tpl.heroStack);
  if (!nashRange) return null;

  const handInRange = isInRange(tpl.heroCards, nashRange.notation);
  const nashAction: "push" | "fold" = handInRange ? "push" : "fold";

  let category = tpl.category;
  if (category === "marginal-push" && !handInRange) {
    category = "marginal-fold";
  }

  return {
    id,
    heroCards: tpl.heroCards,
    heroPosition: "BTN",
    heroStack: tpl.heroStack,
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
  console.log("Pré-calcul M5.3 BTN push range Nash...");
  const t0 = Date.now();

  const templates = buildTemplates();
  const spots: PrecomputedM53Spot[] = [];
  for (let i = 0; i < templates.length; i++) {
    const id = `m5-3-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(templates[i], id);
    if (spot) spots.push(spot);
  }

  const t1 = Date.now();
  console.log(`✓ ${spots.length} spots en ${((t1 - t0) / 1000).toFixed(1)}s`);

  const byStack: Record<number, number> = {};
  for (const s of spots) byStack[s.heroStack] = (byStack[s.heroStack] ?? 0) + 1;
  console.log("Distribution :", Object.entries(byStack).map(([k, v]) => `${k}bb: ${v}`).join(", "));

  const pushCount = spots.filter((s) => s.expected.nashAction === "push").length;
  console.log(`Push: ${pushCount} (${((pushCount / spots.length) * 100).toFixed(1)}%) · Fold: ${spots.length - pushCount}`);

  const outPath = path.join(process.cwd(), "content", "spots", "m5-3.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
