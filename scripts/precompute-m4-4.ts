import * as fs from "fs";
import * as path from "path";
import { bubbleFactor, ftPayoutSpread } from "../lib/poker/icm";
import { getPayout } from "../content/payouts/canonical";
import type { ICMPlayer } from "../lib/poker/icm";
import type { PrecomputedM44Spot } from "../content/spots/types";

interface SpotTemplate {
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  pushAmount: number;
  spotType: PrecomputedM44Spot["spotType"];
  scenarioLabel: string;
}

function p(...stacks: { id: string; stack: number }[]): ICMPlayer[] {
  return stacks;
}

const TEMPLATES: SpotTemplate[] = [
  // ===== FT 9-WAY LEADER (steep payouts) — ~12 spots =====
  { players: p({ id: "hero", stack: 30000 }, { id: "v1", stack: 20000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 20000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j steep, leader 30k vs v1 20k" },
  { players: p({ id: "hero", stack: 35000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 9000 }, { id: "v5", stack: 7000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j steep, big leader 35k vs second 22k" },
  { players: p({ id: "hero", stack: 28000 }, { id: "v1", stack: 19000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-9-steep", pushAmount: 16000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j steep, leader 28k vs mid 16k" },
  { players: p({ id: "hero", stack: 25000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j standard, mini-leader vs second" },
  { players: p({ id: "hero", stack: 32000 }, { id: "v1", stack: 21000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 21000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j standard, big leader 32k" },
  { players: p({ id: "hero", stack: 28000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-flat", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j flat, leader 28k vs second 22k" },
  { players: p({ id: "hero", stack: 26000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-flat", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j flat, leader 26k call second" },
  { players: p({ id: "hero", stack: 40000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 14000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 18000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j steep, dominant leader 40k" },
  { players: p({ id: "hero", stack: 26000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j steep, leader 26k vs second 22k (close)" },
  { players: p({ id: "hero", stack: 30000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 24000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j standard, leader 30k call second 24k" },
  { players: p({ id: "hero", stack: 33000 }, { id: "v1", stack: 21000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 13000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j standard, leader 33k vs mid 13k" },
  { players: p({ id: "hero", stack: 27000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-flat", pushAmount: 22000, spotType: "ft-9way-leader", scenarioLabel: "FT 9j flat, leader 27k vs second 22k" },

  // ===== FT 9-WAY MID — ~10 spots =====
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 14000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j steep, mid 14k vs leader 28k" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 14000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j standard, mid 15k vs mid 14k" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 27000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-9-steep", pushAmount: 13000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j steep, mid 13k push mid 17k" },
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 21000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 14000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j standard, mid 16k call mid 14k" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 11000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v5", payoutSlug: "ft-9-flat", pushAmount: 11000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j flat, mid 12k call short 11k" },
  { players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 14000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 7000 }), heroId: "hero", villainId: "v5", payoutSlug: "ft-9-standard", pushAmount: 9000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j standard, mid 11k call short 9k" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-9-steep", pushAmount: 15000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j steep, mid 15k push mid 19k" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 21000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-9-standard", pushAmount: 13000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j standard, mid 13k push mid-leader 21k" },
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v4", payoutSlug: "ft-9-flat", pushAmount: 12000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j flat, mid 14k push mid 12k" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 27000 }, { id: "v2", stack: 21000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 9000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-9-steep", pushAmount: 13000, spotType: "ft-9way-mid", scenarioLabel: "FT 9j steep, mid 13k vs mid 15k" },

  // ===== FT 9-WAY SHORT — ~8 spots =====
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 30000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 5000, spotType: "ft-9way-short", scenarioLabel: "FT 9j steep, short 5k vs leader 30k" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000, spotType: "ft-9way-short", scenarioLabel: "FT 9j standard, short 4k vs leader 28k" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-flat", pushAmount: 6000, spotType: "ft-9way-short", scenarioLabel: "FT 9j flat, short 6k vs leader 26k" },
  { players: p({ id: "hero", stack: 3500 }, { id: "v1", stack: 30000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 2500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 3500, spotType: "ft-9way-short", scenarioLabel: "FT 9j steep, micro-short 3.5k vs leader" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 11000 }, { id: "v6", stack: 9000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 7000, spotType: "ft-9way-short", scenarioLabel: "FT 9j standard, short 7k vs leader 24k" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 21000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5500 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-steep", pushAmount: 5500, spotType: "ft-9way-short", scenarioLabel: "FT 9j steep, short 5.5k vs leader" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 27000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5500 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v8", payoutSlug: "ft-9-standard", pushAmount: 3000, spotType: "ft-9way-short", scenarioLabel: "FT 9j standard, short 4.5k vs micro-short 3k" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 3500 }), heroId: "hero", villainId: "v8", payoutSlug: "ft-9-flat", pushAmount: 3500, spotType: "ft-9way-short", scenarioLabel: "FT 9j flat, short 6.5k vs micro-short" },

  // ===== FT 6-WAY (sit&go FT) — ~25 spots =====
  // Leader
  { players: p({ id: "hero", stack: 25000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 14000 }, { id: "v3", stack: 10000 }, { id: "v4", stack: 7000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 18000, spotType: "ft-6way", scenarioLabel: "FT 6-max, leader 25k vs second 18k" },
  { players: p({ id: "hero", stack: 28000 }, { id: "v1", stack: 17000 }, { id: "v2", stack: 13000 }, { id: "v3", stack: 11000 }, { id: "v4", stack: 7000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 17000, spotType: "ft-6way", scenarioLabel: "FT 6-max, big leader 28k vs second 17k" },
  { players: p({ id: "hero", stack: 22000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 15000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 5000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-6-standard", pushAmount: 15000, spotType: "ft-6way", scenarioLabel: "FT 6-max, leader 22k vs mid 15k" },
  { players: p({ id: "hero", stack: 30000 }, { id: "v1", stack: 16000 }, { id: "v2", stack: 12000 }, { id: "v3", stack: 11000 }, { id: "v4", stack: 7000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 16000, spotType: "ft-6way", scenarioLabel: "FT 6-max, dominant leader 30k vs second" },
  { players: p({ id: "hero", stack: 26000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 14000 }, { id: "v3", stack: 10000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 10000, spotType: "ft-6way", scenarioLabel: "FT 6-max, leader 26k call mid 10k" },
  // Mid
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 7000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 12000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 14k push mid 12k" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 7000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 12000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 12k vs leader 25k" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 6000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-6-standard", pushAmount: 15000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 15k push mid 19k" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v4", payoutSlug: "ft-6-standard", pushAmount: 8000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 13k call short 8k" },
  { players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 11000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 11k push mid 14k" },
  // Short
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 5000, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 5k vs leader 25k" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 4000, spotType: "ft-6way", scenarioLabel: "FT 6-max, micro-short 4k vs leader" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 6500, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 6.5k vs leader 24k" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 23000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 6000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 7000, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 7k vs leader 23k" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 10500 }, { id: "v5", stack: 6000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 5500, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 5.5k vs leader" },
  // Variations FT 6 supplémentaires
  { players: p({ id: "hero", stack: 20000 }, { id: "v1", stack: 20000 }, { id: "v2", stack: 15000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 20000, spotType: "ft-6way", scenarioLabel: "FT 6-max, co-leader 20k vs co-leader" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 18000, spotType: "ft-6way", scenarioLabel: "FT 6-max, second-leader 18k vs leader 22k" },
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 23000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 3000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-6-standard", pushAmount: 16000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid-leader 16k push mid 17k" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v4", payoutSlug: "ft-6-standard", pushAmount: 8000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 12k call short 8k" },
  { players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 9000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 10000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 10k push mid 14k" },
  { players: p({ id: "hero", stack: 24000 }, { id: "v1", stack: 19000 }, { id: "v2", stack: 14000 }, { id: "v3", stack: 11000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-6-standard", pushAmount: 19000, spotType: "ft-6way", scenarioLabel: "FT 6-max, leader 24k call second 19k" },
  { players: p({ id: "hero", stack: 21000 }, { id: "v1", stack: 19000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 11000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 5000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-6-standard", pushAmount: 16000, spotType: "ft-6way", scenarioLabel: "FT 6-max, leader 21k push mid 16k" },
  { players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 9000 }, { id: "v5", stack: 5000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 9000, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 9k push mid 14k" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 6000 }), heroId: "hero", villainId: "v4", payoutSlug: "ft-6-standard", pushAmount: 8000, spotType: "ft-6way", scenarioLabel: "FT 6-max, short 8k push mid 11k" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 8000 }, { id: "v5", stack: 4000 }), heroId: "hero", villainId: "v3", payoutSlug: "ft-6-standard", pushAmount: 13000, spotType: "ft-6way", scenarioLabel: "FT 6-max, mid 15k push mid 13k" },

  // ===== FT 3-WAY — ~18 spots =====
  // Leader push
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader 16k vs second 10k" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 8000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 8000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader 18k vs second 8k" },
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 6000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader 14k vs second 10k" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 11000 }, { id: "v2", stack: 7000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 11000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, co-leader 12k vs co-leader 11k" },
  { players: p({ id: "hero", stack: 20000 }, { id: "v1", stack: 7000 }, { id: "v2", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 7000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, dominant leader 20k" },
  // Leader call short
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-3-standard", pushAmount: 4000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader call short 4k" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 9000 }, { id: "v2", stack: 3000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-3-standard", pushAmount: 3000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader call micro-short 3k" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 11000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-3-standard", pushAmount: 4000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader 15k call short 4k" },
  // Mid push leader
  { players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 16000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, second 10k vs leader 16k" },
  { players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 14000 }, { id: "v2", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 11000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, second 11k vs leader 14k" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 8000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, second 8k vs leader 18k" },
  // Short push
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 16000 }, { id: "v2", stack: 10000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 4000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, short 4k vs leader 16k" },
  { players: p({ id: "hero", stack: 3000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 9000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 3000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, micro-short 3k vs leader 18k" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 14000 }, { id: "v2", stack: 11000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 5000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, short 5k vs leader 14k" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 15000 }, { id: "v2", stack: 10500 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-3-standard", pushAmount: 4500, spotType: "ft-3way", scenarioLabel: "FT 3-handed, short 4.5k vs mid 10.5k" },
  // Stacks équilibrés
  { players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 10000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, stacks égaux 10k/10k/10k" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 8000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, mini-leader 12k vs mid 10k" },
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 9000 }, { id: "v2", stack: 7000 }), heroId: "hero", villainId: "v2", payoutSlug: "ft-3-standard", pushAmount: 7000, spotType: "ft-3way", scenarioLabel: "FT 3-handed, leader 14k call short 7k" },

  // ===== FT HEADS-UP — ~12 spots =====
  // Note: heads-up FT uses 30/20 payouts (equivalent to ft-3-standard top-2). We use ft-3-standard
  // sliced semantically — but our engine uses the full payout array. Use sng-9-standard's top-2 (50/30 = 62.5/37.5
  // normalized) — actually just use heads-up WTA for true HU and ft-3-standard with hero+2 for "HU FT close".
  // For pure HU FT, we use a synthetic payout structure inline: 60/40 (or 30/20 = 60/40 once normalized)
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 10000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 10000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, leader 15k vs short 10k" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 7000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 7000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, leader 18k vs short 7k" },
  { players: p({ id: "hero", stack: 12500 }, { id: "v1", stack: 12500 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 12500, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, stacks égaux 12.5k/12.5k" },
  { players: p({ id: "hero", stack: 20000 }, { id: "v1", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 5000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, dominant leader 20k vs short 5k" },
  // HU avec 3-way payouts (les 2 derniers d'un FT 3-handed, dernière vie pour 50/30 vs busted = 20)
  // → simulé en gardant un 3ème joueur busté (stack 0) qui prend automatiquement les 20%
  // Pour ne PAS dériver hors du moteur (filter active players), on reste sur le payout 2-positions.
  // Format : on conserve un 3ème joueur déjà éliminé virtuellement et payouts 50/30/20 mais hero/v1 sont les 2 vivants.
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 10000 }, { id: "busted", stack: 1 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 10000, spotType: "ft-heads-up", scenarioLabel: "HU FT 3-paid, leader 14k vs mid 10k (busted out)" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 6000 }, { id: "busted", stack: 1 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 6000, spotType: "ft-heads-up", scenarioLabel: "HU FT 3-paid, leader 18k vs short 6k (busted out)" },
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 12000 }, { id: "busted", stack: 1 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 12000, spotType: "ft-heads-up", scenarioLabel: "HU FT 3-paid, stacks égaux 12k/12k (busted out)" },
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 8000 }, { id: "busted", stack: 1 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-3-standard", pushAmount: 8000, spotType: "ft-heads-up", scenarioLabel: "HU FT 3-paid, leader 16k vs mid 8k" },
  // Variantes WTA HU
  { players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 15000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 10000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, short 10k vs leader 15k" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 17000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 8000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, short 8k vs leader 17k" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 12000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 12000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, mini-leader 13k vs 12k" },
  { players: p({ id: "hero", stack: 22000 }, { id: "v1", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "wta-2", pushAmount: 3000, spotType: "ft-heads-up", scenarioLabel: "HU FT WTA, big leader 22k vs micro-short 3k" },
];

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM44Spot | null {
  const payout = getPayout(tpl.payoutSlug);
  if (!payout) {
    console.error(`Payout slug introuvable : ${tpl.payoutSlug}`);
    return null;
  }
  try {
    const result = bubbleFactor({
      players: tpl.players,
      payouts: payout.payouts,
      heroId: tpl.heroId,
      villainId: tpl.villainId,
      pushAmount: tpl.pushAmount,
    });
    const spread = ftPayoutSpread(payout.payouts);
    return {
      id,
      players: tpl.players,
      heroId: tpl.heroId,
      villainId: tpl.villainId,
      payoutSlug: payout.slug,
      payoutLabel: payout.label,
      payouts: payout.payouts,
      playersRemaining: tpl.players.filter((p) => p.stack > 0).length,
      pushAmount: tpl.pushAmount,
      scenarioLabel: tpl.scenarioLabel,
      spotType: tpl.spotType,
      payoutSpread: spread.topVsBottom,
      expected: {
        bubbleFactor: Math.round(result.bubbleFactor * 1000) / 1000,
        requiredEquityChip: Math.round(result.requiredEquityChip * 10) / 10,
        requiredEquityICM: Math.round(result.requiredEquityICM * 10) / 10,
        heroEquityBefore: Math.round(result.heroEquityBefore * 10) / 10,
        heroEquityIfWin: Math.round(result.heroEquityIfWin * 10) / 10,
        heroEquityIfLose: Math.round(result.heroEquityIfLose * 10) / 10,
        rangeOfOutcomes:
          Math.round((result.heroEquityIfWin - result.heroEquityIfLose) * 10) / 10,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`Pré-calcul de ${TEMPLATES.length} spots M4.4...`);
  const t0 = Date.now();

  const spots: PrecomputedM44Spot[] = [];
  for (let i = 0; i < TEMPLATES.length; i++) {
    const tpl = TEMPLATES[i];
    const id = `m4-4-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(tpl, id);
    if (spot) {
      spots.push(spot);
      if ((i + 1) % 12 === 0) {
        console.log(
          `  [${i + 1}/${TEMPLATES.length}] ${tpl.scenarioLabel} → BF ${spot.expected.bubbleFactor.toFixed(2)}, eq ${spot.expected.heroEquityBefore.toFixed(1)}%`
        );
      }
    }
  }

  const t1 = Date.now();
  console.log(`\n✓ ${spots.length} spots calculés en ${((t1 - t0) / 1000).toFixed(1)}s`);

  const byType: Record<string, number> = {};
  for (const s of spots) {
    byType[s.spotType] = (byType[s.spotType] ?? 0) + 1;
  }
  console.log("Distribution types :", byType);

  const outPath = path.join(process.cwd(), "content", "spots", "m4-4.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
