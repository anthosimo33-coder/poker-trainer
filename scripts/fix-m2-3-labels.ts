import * as fs from "fs";
import * as path from "path";
import type { PrecomputedM23Spot } from "../content/spots/types";

const SRC = path.join(process.cwd(), "content", "spots", "m2-3.json");
const spots = JSON.parse(fs.readFileSync(SRC, "utf-8")) as PrecomputedM23Spot[];

function rankOf(card: string): string {
  // "As" → "A", "Th" → "T". Nos cartes font 2 caractères.
  return card.length === 3 ? card.substring(0, 2) : card[0];
}

let fixed = 0;
for (const spot of spots) {
  const heroRanks = spot.heroCards.map(rankOf);
  const isPair = heroRanks[0] === heroRanks[1];
  if (!isPair) continue;

  const boardRanks = spot.board.map(rankOf);
  const heroPairRank = heroRanks[0];
  const setOnBoard = boardRanks.includes(heroPairRank);

  if (setOnBoard && /over[- ]?pair/i.test(spot.scenarioLabel)) {
    const newLabel = spot.scenarioLabel.replace(/over[- ]?pair/gi, "Set");
    console.log(`  [${spot.id}] "${spot.scenarioLabel}" → "${newLabel}"`);
    spot.scenarioLabel = newLabel;
    fixed++;
  }
}

console.log(`\n✓ ${fixed} labels corrigés sur ${spots.length} spots`);
fs.writeFileSync(SRC, JSON.stringify(spots, null, 2));
