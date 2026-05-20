import * as fs from "fs";
import * as path from "path";
import { isInRange } from "../lib/poker/range-parser";
import { getNashBBCallRange } from "../content/ranges/nash-bb-call";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM52Spot } from "../content/spots/types";

interface SpotTemplate {
  heroCards: [Card, Card];
  heroStack: number;
  category: PrecomputedM52Spot["category"];
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

// Marginales pour BB call : mix qui calle à 5-8bb mais fold à 12-15bb
const MARGINAL_HANDS: [Card, Card][] = [
  // Petites paires
  ["6s", "6h"], ["5c", "5d"], ["4h", "4s"], ["3d", "3c"], ["2s", "2h"],
  // Aces faibles
  ["As", "9h"], ["Ad", "8c"], ["Ah", "7s"], ["As", "5d"], ["Ac", "3h"], ["Ad", "2s"],
  ["As", "9s"], ["Ad", "5d"],
  // Suited connectors
  ["Ts", "9s"], ["9h", "8h"], ["8c", "7c"], ["7d", "6d"], ["6s", "5s"],
  // K avec kickers variés
  ["Ks", "9h"], ["Kc", "Td"], ["Kh", "8s"], ["Ks", "8s"],
  // Q-J connectors
  ["Qs", "Jc"], ["Qh", "9d"], ["Jc", "Th"], ["Js", "8c"],
  // Broadways offsuit
  ["Ks", "Qd"], ["Qh", "Tc"], ["Js", "Td"],
  // Suited gappers
  ["Js", "9s"], ["9h", "7h"], ["8c", "6c"], ["7s", "5s"],
];

function buildTemplates(): SpotTemplate[] {
  const templates: SpotTemplate[] = [];
  const stackDepths = [5, 7, 8, 10, 12, 15];

  for (const stack of stackDepths) {
    for (let i = 0; i < 3; i++) {
      templates.push({
        heroCards: PREMIUM_HANDS[i],
        heroStack: stack,
        category: "obvious-call",
        scenarioLabel: `Premium call BB ${stack}bb`,
      });
    }
    for (let i = 0; i < 2; i++) {
      templates.push({
        heroCards: TRASH_HANDS[i],
        heroStack: stack,
        category: stack <= 5 ? "marginal-call" : "obvious-fold",
        scenarioLabel: `Trash hand BB ${stack}bb`,
      });
    }
    for (let i = 0; i < MARGINAL_HANDS.length; i++) {
      templates.push({
        heroCards: MARGINAL_HANDS[i],
        heroStack: stack,
        category: "marginal-call",
        scenarioLabel: `Marginal BB ${stack}bb`,
      });
    }
  }

  return templates;
}

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM52Spot | null {
  const nashRange = getNashBBCallRange(tpl.heroStack);
  if (!nashRange) return null;

  const handInRange = isInRange(tpl.heroCards, nashRange.notation);
  const nashAction: "call" | "fold" = handInRange ? "call" : "fold";

  let category = tpl.category;
  if (category === "marginal-call" && !handInRange) {
    category = "marginal-fold";
  }

  return {
    id,
    heroCards: tpl.heroCards,
    heroPosition: "BB",
    villainPosition: "SB",
    heroStack: tpl.heroStack,
    villainStack: tpl.heroStack,
    pushAmount: tpl.heroStack, // SB a push tout son stack (effective stack)
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
  console.log("Pré-calcul M5.2 BB call vs SB push Nash...");
  const t0 = Date.now();

  const templates = buildTemplates();
  const spots: PrecomputedM52Spot[] = [];
  for (let i = 0; i < templates.length; i++) {
    const id = `m5-2-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(templates[i], id);
    if (spot) spots.push(spot);
  }

  const t1 = Date.now();
  console.log(`✓ ${spots.length} spots en ${((t1 - t0) / 1000).toFixed(1)}s`);

  const byStack: Record<number, number> = {};
  for (const s of spots) byStack[s.heroStack] = (byStack[s.heroStack] ?? 0) + 1;
  console.log("Distribution :", Object.entries(byStack).map(([k, v]) => `${k}bb: ${v}`).join(", "));

  const callCount = spots.filter((s) => s.expected.nashAction === "call").length;
  console.log(`Call: ${callCount} (${((callCount / spots.length) * 100).toFixed(1)}%) · Fold: ${spots.length - callCount}`);

  const outPath = path.join(process.cwd(), "content", "spots", "m5-2.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
