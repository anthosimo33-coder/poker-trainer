import * as fs from "fs";
import * as path from "path";
import { isInRange } from "../lib/poker/range-parser";
import {
  getNashPositionDefense,
  type PositionDefenseRange,
} from "../content/ranges/nash-position-defense";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM54Spot } from "../content/spots/types";

interface SpotTemplate {
  heroCards: [Card, Card];
  heroPosition: PositionDefenseRange["position"];
  villainPosition: PrecomputedM54Spot["villainPosition"];
  heroStack: number;
  category: PrecomputedM54Spot["category"];
  scenarioLabel: string;
}

const PREMIUM_HANDS: [Card, Card][] = [
  ["As", "Ah"],
  ["Ks", "Kh"],
  ["Qs", "Qh"],
  ["Js", "Jh"],
  ["As", "Ks"],
];

const TRASH_HANDS: [Card, Card][] = [
  ["7s", "2h"],
  ["8c", "3d"],
  ["6h", "2s"],
];

// Marginales : test la frontière par position
const MARGINAL_HANDS: [Card, Card][] = [
  // Paires moyennes/petites
  ["8s", "8h"], ["7c", "7d"], ["6h", "6s"], ["5d", "5c"], ["4s", "4h"], ["3d", "3c"], ["2s", "2h"],
  // Aces
  ["As", "Ts"], ["Ad", "9c"], ["Ah", "8s"], ["As", "7d"], ["Ac", "6h"], ["Ad", "5s"],
  ["As", "Th"], ["Ad", "Jh"], ["Ah", "Jc"], ["As", "Qd"],
  // K et Q
  ["Ks", "Js"], ["Kh", "Qc"], ["Ks", "9h"], ["Kc", "Td"], ["Qs", "Jc"], ["Qh", "Jd"],
  // J / T
  ["Jc", "Th"], ["Js", "Tc"], ["Ts", "9s"],
  // Suited connectors
  ["9h", "8h"], ["8c", "7c"], ["7d", "6d"],
  // Broadways suited
  ["Ks", "Qs"], ["Js", "Qs"],
];

// Pour chaque position × stack, on génère un set de mains testées
const POSITION_VILLAIN_MAP: Record<
  PositionDefenseRange["position"],
  PrecomputedM54Spot["villainPosition"]
> = {
  BB: "SB",
  SB: "BTN",
  BTN: "CO",
  CO: "MP",
  MP: "UTG",
};

function buildTemplates(): SpotTemplate[] {
  const templates: SpotTemplate[] = [];
  const positions: PositionDefenseRange["position"][] = ["BB", "SB", "BTN", "CO", "MP"];
  const stacks = [10, 15];

  for (const pos of positions) {
    for (const stack of stacks) {
      const villain = POSITION_VILLAIN_MAP[pos];
      // Premium (3 par combo)
      for (let i = 0; i < 3; i++) {
        templates.push({
          heroCards: PREMIUM_HANDS[i],
          heroPosition: pos,
          villainPosition: villain,
          heroStack: stack,
          category: "obvious-call",
          scenarioLabel: `Premium call ${pos} ${stack}bb vs ${villain} push`,
        });
      }
      // Trash (2 par combo)
      for (let i = 0; i < 2; i++) {
        templates.push({
          heroCards: TRASH_HANDS[i],
          heroPosition: pos,
          villainPosition: villain,
          heroStack: stack,
          category: "obvious-fold",
          scenarioLabel: `Trash fold ${pos} ${stack}bb`,
        });
      }
      // Marginales (~15 par combo)
      for (let i = 0; i < 15; i++) {
        templates.push({
          heroCards: MARGINAL_HANDS[i],
          heroPosition: pos,
          villainPosition: villain,
          heroStack: stack,
          category: "marginal-call",
          scenarioLabel: `Marginal ${pos} ${stack}bb vs ${villain}`,
        });
      }
    }
  }

  return templates;
}

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM54Spot | null {
  const nashRange = getNashPositionDefense(tpl.heroPosition, tpl.heroStack);
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
    heroPosition: tpl.heroPosition,
    villainPosition: tpl.villainPosition,
    heroStack: tpl.heroStack,
    pushAmount: tpl.heroStack,
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
  console.log("Pré-calcul M5.4 call ranges par position Nash...");
  const t0 = Date.now();

  const templates = buildTemplates();
  const spots: PrecomputedM54Spot[] = [];
  for (let i = 0; i < templates.length; i++) {
    const id = `m5-4-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(templates[i], id);
    if (spot) spots.push(spot);
  }

  const t1 = Date.now();
  console.log(`✓ ${spots.length} spots en ${((t1 - t0) / 1000).toFixed(1)}s`);

  const byPos: Record<string, number> = {};
  for (const s of spots) byPos[s.heroPosition] = (byPos[s.heroPosition] ?? 0) + 1;
  console.log("Distribution par position :", byPos);

  const byStack: Record<number, number> = {};
  for (const s of spots) byStack[s.heroStack] = (byStack[s.heroStack] ?? 0) + 1;
  console.log("Distribution par stack :", byStack);

  const callCount = spots.filter((s) => s.expected.nashAction === "call").length;
  console.log(`Call: ${callCount} (${((callCount / spots.length) * 100).toFixed(1)}%) · Fold: ${spots.length - callCount}`);

  const outPath = path.join(process.cwd(), "content", "spots", "m5-4.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
