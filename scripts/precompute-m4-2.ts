import * as fs from "fs";
import * as path from "path";
import { bubbleFactor } from "../lib/poker/icm";
import { getPayout } from "../content/payouts/canonical";
import type { ICMPlayer } from "../lib/poker/icm";
import type { PrecomputedM42Spot } from "../content/spots/types";

interface SpotTemplate {
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  pushAmount: number;
  spotType: PrecomputedM42Spot["spotType"];
  scenarioLabel: string;
}

function p(...stacks: { id: string; stack: number }[]): ICMPlayer[] {
  return stacks;
}

const TEMPLATES: SpotTemplate[] = [
  // ===== BULLE — Hero leader vs mid (35) =====
  // Cas archétypal : hero chip leader, doit décider call/fold face à un push d'un stack moyen
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, hero leader vs mid push",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader 8000 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader 9000 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, mini-leader vs co-leader",
  },
  {
    players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader dominant 10000 vs mid",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v2", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader vs mid bas",
  },
  {
    players: p({ id: "hero", stack: 8500 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader 8500 vs mid 5000",
  },
  {
    players: p({ id: "hero", stack: 9500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader 9500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader serré vs mid",
  },
  {
    players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 3000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader écrasant",
  },
  // Bulle 5-way
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4000 }, { id: "v3", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader vs mid",
  },
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader vs mid bas",
  },
  {
    players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader dominant vs mid",
  },
  // Variantes stacks et confrontations
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 4000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 6000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, hero vs mid 6000 (max effective)",
  },
  {
    players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v2", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, mini-leader vs co-mid",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 6500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader serré vs second-leader",
  },
  {
    players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader 55 % stacks vs mid",
  },
  {
    players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, mini-leader vs mid",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader 8000 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, big leader vs mid",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 6000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader serré vs second",
  },
  {
    players: p({ id: "hero", stack: 10500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 6000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader 10500 vs second 6000",
  },
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v2", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader vs deuxième mid",
  },
  {
    players: p({ id: "hero", stack: 8500 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader 8500 vs mid (short pas si court)",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, hero leader marginal vs co-mid",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 6500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 4-way, leader vs second proche",
  },
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v2", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader vs mid alterné",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, mini-leader vs mid",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 6000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader 7500 vs second 6000",
  },
  {
    players: p({ id: "hero", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader 8500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 9500 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle 5-way FT, leader 9500 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 6000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, mini-leader vs second",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader 8000 vs mid",
  },
  {
    players: p({ id: "hero", stack: 9500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader 9500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 10500 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 3500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000,
    spotType: "bubble-leader-vs-mid", scenarioLabel: "Bulle MTT 18j, leader dominant vs mid",
  },

  // ===== BULLE — Hero leader vs short (15) =====
  // Le leader pousse / call le short. Push généralement +EV (gain ICM modeste mais perte aussi modeste).
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, leader call short push",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 1500,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, leader 8000 call short 1500",
  },
  {
    players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 4000 }, { id: "v2", stack: 4000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 2000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, leader dominant call short",
  },
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, leader 9000 call micro-short",
  },
  {
    players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 3000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, leader 11000 call short",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "short", payoutSlug: "sng-9-standard", pushAmount: 2000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 4-way, mini-leader call short 2000",
  },
  // Bulle 18j
  {
    players: p({ id: "hero", stack: 9500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "bubble-18-3paid", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle MTT 18j, leader call micro-short",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "short", payoutSlug: "bubble-18-3paid", pushAmount: 2000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle MTT 18j, leader 8000 call short 2000",
  },
  // Bulle 5-way
  {
    players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader call micro-short",
  },
  {
    players: p({ id: "hero", stack: 10500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader 10500 call short 1500",
  },
  {
    players: p({ id: "hero", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader 8500 call micro-short",
  },
  {
    players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 3500 }, { id: "v3", stack: 2500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader dominant call short",
  },
  {
    players: p({ id: "hero", stack: 10000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }, { id: "v3", stack: 3000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader 10000 call short 1500",
  },
  {
    players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, mini-leader call short",
  },
  {
    players: p({ id: "hero", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "short", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-leader-vs-short", scenarioLabel: "Bulle 5-way FT, leader 8500 call short 1500",
  },

  // ===== BULLE — Hero short vs leader (30) =====
  // Cas critique : hero short, doit call ou fold face au push du leader (souvent fold)
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 1000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, short vs leader",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 8000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, short 2000 vs leader",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 1000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, micro-short vs leader",
  },
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short vs leader",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 9000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, micro-short vs leader",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 2000 vs leader 8000",
  },
  {
    players: p({ id: "hero", stack: 2500 }, { id: "leader", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 2500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, mid-short vs leader 7500",
  },
  // Bulle 18j short vs leader
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 9000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "bubble-18-3paid", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle MTT 18j, short 1500 vs leader",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 8500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "bubble-18-3paid", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle MTT 18j, micro-short vs leader 8500",
  },
  {
    players: p({ id: "hero", stack: 2500 }, { id: "leader", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "bubble-18-3paid", pushAmount: 2500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle MTT 18j, short 2500 vs leader",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 9500 }, { id: "v1", stack: 4500 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "bubble-18-3paid", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle MTT 18j, short 2000 vs leader 9500",
  },
  // Bulle FT (5 left, 9 paid)
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, short 1500 vs leader 8000",
  },
  {
    players: p({ id: "hero", stack: 2500 }, { id: "leader", stack: 8500 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 2500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, mid-short 2500 vs leader",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 9500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, micro-short vs leader 9500",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 7500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 5-way FT, short 2000 vs leader",
  },
  // 6-way bubble short vs leader
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 3500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 6-way FT, short 1500 vs leader",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 9000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 2000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 6-way FT, short 2000 vs leader",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 3000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 6-way FT, micro-short vs leader",
  },
  {
    players: p({ id: "hero", stack: 2500 }, { id: "leader", stack: 9500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 1500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 2500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 6-way FT, mid-short vs leader 9500",
  },
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 7500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "ft-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 6-way FT, short vs leader (close stacks)",
  },
  // Variations
  {
    players: p({ id: "hero", stack: 1200 }, { id: "leader", stack: 8200 }, { id: "v1", stack: 5800 }, { id: "v2", stack: 4800 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1200,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 1200 vs leader 8200",
  },
  {
    players: p({ id: "hero", stack: 1800 }, { id: "leader", stack: 7800 }, { id: "v1", stack: 5700 }, { id: "v2", stack: 4700 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1800,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 1800 vs leader 7800",
  },
  {
    players: p({ id: "hero", stack: 2200 }, { id: "leader", stack: 7300 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 2200,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, mid-short vs leader 7300",
  },
  {
    players: p({ id: "hero", stack: 1500 }, { id: "leader", stack: 9000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1500,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short vs leader 9000",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "leader", stack: 10000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, micro-short vs leader 10000",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "leader", stack: 8500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 2000,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 2000 vs leader 8500",
  },
  {
    players: p({ id: "hero", stack: 1700 }, { id: "leader", stack: 8000 }, { id: "v1", stack: 5300 }, { id: "v2", stack: 5000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1700,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 1700 vs leader",
  },
  {
    players: p({ id: "hero", stack: 2300 }, { id: "leader", stack: 8200 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 4000 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 2300,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, mid-short vs leader 8200",
  },
  {
    players: p({ id: "hero", stack: 1300 }, { id: "leader", stack: 7700 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }),
    heroId: "hero", villainId: "leader", payoutSlug: "sng-9-standard", pushAmount: 1300,
    spotType: "bubble-short-vs-leader", scenarioLabel: "Bulle 4-way SnG, short 1300 vs leader 7700",
  },

  // ===== BULLE — Hero mid vs mid (25) =====
  // Cas le plus subtil : deux stacks moyens, BF modéré, calibration la plus utile
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid vs mid (équilibré)",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7000 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid 4500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 4500 }, { id: "leader", stack: 8000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid 5500 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 8000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid vs mid égaux",
  },
  {
    players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6000 }, { id: "leader", stack: 7500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid 4000 vs mid 6000",
  },
  // 5-way
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 7500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 5-way FT, mid vs mid (5000 chacun)",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 8000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 5-way FT, mid 4500 vs mid 5000",
  },
  {
    players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 4500 }, { id: "leader", stack: 7500 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 5-way FT, mid 5500 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6000 }, { id: "leader", stack: 8000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 5-way FT, mid 4000 vs mid 6000",
  },
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7000 }, { id: "v2", stack: 4500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 5-way FT, mid 5000 vs mid 5500",
  },
  // Bulle 18j mid vs mid
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle MTT 18j, mid vs mid",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 8000 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle MTT 18j, mid 4500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 4500 }, { id: "leader", stack: 7500 }, { id: "short", stack: 2500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle MTT 18j, mid 5500 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 7000 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle MTT 18j, mid vs mid (égaux)",
  },
  {
    players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6000 }, { id: "leader", stack: 7000 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 4000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle MTT 18j, mid 4000 vs mid 6000",
  },
  // 6-way
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 7000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid vs mid (5000)",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7500 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid 4500 vs mid 5500",
  },
  {
    players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 7000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid 5500 vs mid 5000",
  },
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 4500 }, { id: "leader", stack: 8000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 3500 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid 5000 vs mid 4500",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid 4500 vs mid 5500 (stacks équilibrés)",
  },
  // Variations stack-size
  {
    players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, high-mid vs mid",
  },
  {
    players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 7000 }, { id: "short", stack: 1500 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, second-leader vs mid",
  },
  {
    players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "leader", stack: 6500 }, { id: "short", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 4-way SnG, mid 5500 vs mid 6000 (très proche)",
  },
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "leader", stack: 7500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4000 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid vs mid (large field)",
  },
  {
    players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 5000 }, { id: "leader", stack: 8000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 4000 }, { id: "short", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500,
    spotType: "bubble-mid-vs-mid", scenarioLabel: "Bulle 6-way FT, mid 4500 vs mid 5000 (large field)",
  },

  // ===== TABLE FINALE — Hero leader (8) =====
  // Multi-payouts (9 paid), tous les joueurs sont in the money mais écarts ICM massifs
  {
    players: p({ id: "hero", stack: 30000 }, { id: "v1", stack: 20000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 20000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, leader 30k vs v1 20k",
  },
  {
    players: p({ id: "hero", stack: 35000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 9000 }, { id: "v5", stack: 7000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 22000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, big leader 35k vs second 22k",
  },
  {
    players: p({ id: "hero", stack: 25000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 22000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, mini-leader vs second 22k",
  },
  {
    players: p({ id: "hero", stack: 28000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 14000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, leader 28k vs mid 14k",
  },
  {
    players: p({ id: "hero", stack: 22000 }, { id: "v1", stack: 18000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 18000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, leader vs second 18k (stacks équilibrés)",
  },
  {
    players: p({ id: "hero", stack: 32000 }, { id: "v1", stack: 20000 }, { id: "v2", stack: 16000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v2", payoutSlug: "ft-9-standard", pushAmount: 16000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, big leader vs mid 16k",
  },
  {
    players: p({ id: "hero", stack: 26000 }, { id: "v1", stack: 19000 }, { id: "v2", stack: 17000 }, { id: "v3", stack: 13000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 19000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, leader 26k vs second 19k",
  },
  {
    players: p({ id: "hero", stack: 30000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 15000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 4000 }, { id: "v8", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 25000,
    spotType: "ft-leader", scenarioLabel: "FT 9j, leader 30k vs second 25k (proche)",
  },

  // ===== TABLE FINALE — Hero mid (5) =====
  {
    players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 30000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 10000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 12000,
    spotType: "ft-mid", scenarioLabel: "FT 9j, mid 12k vs leader 30k",
  },
  {
    players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 11000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 14000,
    spotType: "ft-mid", scenarioLabel: "FT 9j, mid 14k vs second mid 16k",
  },
  {
    players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 12000 }, { id: "v4", stack: 9000 }, { id: "v5", stack: 8000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 6000 }),
    heroId: "hero", villainId: "v3", payoutSlug: "ft-9-standard", pushAmount: 12000,
    spotType: "ft-mid", scenarioLabel: "FT 9j, mid-leader 15k vs mid 12k",
  },
  {
    players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v4", payoutSlug: "ft-9-standard", pushAmount: 12000,
    spotType: "ft-mid", scenarioLabel: "FT 9j, mid 13k vs mid 12k",
  },
  {
    players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 14000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 6000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v5", payoutSlug: "ft-9-standard", pushAmount: 9000,
    spotType: "ft-mid", scenarioLabel: "FT 9j, mid 11k call short 9k",
  },

  // ===== TABLE FINALE — Hero short (5) =====
  {
    players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 30000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000,
    spotType: "ft-short", scenarioLabel: "FT 9j, short 5k vs leader 30k",
  },
  {
    players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000,
    spotType: "ft-short", scenarioLabel: "FT 9j, short 4k vs leader 28k",
  },
  {
    players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 6000,
    spotType: "ft-short", scenarioLabel: "FT 9j, short 6k vs leader 26k",
  },
  {
    players: p({ id: "hero", stack: 3000 }, { id: "v1", stack: 30000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 3000,
    spotType: "ft-short", scenarioLabel: "FT 9j, micro-short 3k vs leader",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 11000 }, { id: "v6", stack: 9000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 7000,
    spotType: "ft-short", scenarioLabel: "FT 9j, short 7k vs leader 24k",
  },

  // ===== SATELLITE (5) =====
  // Payouts flat (tickets égaux). BF extrême près de la bulle satellite.
  {
    players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 8000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4000 }, { id: "short", stack: 1000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "satellite-5tickets", pushAmount: 8000,
    spotType: "satellite", scenarioLabel: "Satellite 5 tickets, leader vs second",
  },
  {
    players: p({ id: "hero", stack: 1000 }, { id: "v1", stack: 12000 }, { id: "v2", stack: 8000 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "satellite-5tickets", pushAmount: 1000,
    spotType: "satellite", scenarioLabel: "Satellite 5 tickets, bubble-boy vs leader",
  },
  {
    players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 7000 }, { id: "v2", stack: 6000 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "satellite-5tickets", pushAmount: 7000,
    spotType: "satellite", scenarioLabel: "Satellite 5 tickets, stacks équilibrés (5 payés)",
  },
  {
    players: p({ id: "hero", stack: 2000 }, { id: "v1", stack: 10000 }, { id: "v2", stack: 8000 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 5000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "satellite-5tickets", pushAmount: 2000,
    spotType: "satellite", scenarioLabel: "Satellite 5 tickets, short vs leader",
  },
  {
    players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 7000 }, { id: "v2", stack: 7000 }, { id: "v3", stack: 7000 }, { id: "v4", stack: 2000 }),
    heroId: "hero", villainId: "v1", payoutSlug: "satellite-5tickets", pushAmount: 7000,
    spotType: "satellite", scenarioLabel: "Satellite 5 tickets, 4-way égal + short",
  },
];

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM42Spot | null {
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
    return {
      id,
      players: tpl.players,
      heroId: tpl.heroId,
      villainId: tpl.villainId,
      payoutSlug: payout.slug,
      payoutLabel: payout.label,
      payouts: payout.payouts,
      pushAmount: tpl.pushAmount,
      scenarioLabel: tpl.scenarioLabel,
      spotType: tpl.spotType,
      expected: {
        bubbleFactor: Math.round(result.bubbleFactor * 1000) / 1000,
        requiredEquityChip: Math.round(result.requiredEquityChip * 10) / 10,
        requiredEquityICM: Math.round(result.requiredEquityICM * 10) / 10,
        heroEquityBefore: Math.round(result.heroEquityBefore * 10) / 10,
        heroEquityIfWin: Math.round(result.heroEquityIfWin * 10) / 10,
        heroEquityIfLose: Math.round(result.heroEquityIfLose * 10) / 10,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`Pré-calcul de ${TEMPLATES.length} spots M4.2...`);
  const t0 = Date.now();

  const spots: PrecomputedM42Spot[] = [];
  for (let i = 0; i < TEMPLATES.length; i++) {
    const tpl = TEMPLATES[i];
    const id = `m4-2-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(tpl, id);
    if (spot) {
      spots.push(spot);
      if ((i + 1) % 15 === 0) {
        console.log(
          `  [${i + 1}/${TEMPLATES.length}] ${tpl.scenarioLabel} → BF ${spot.expected.bubbleFactor.toFixed(2)}, eq_ICM ${spot.expected.requiredEquityICM.toFixed(1)} %`
        );
      }
    }
  }

  const t1 = Date.now();
  console.log(`\n✓ ${spots.length} spots calculés en ${((t1 - t0) / 1000).toFixed(1)}s`);

  // Stats distribution
  const byType: Record<string, number> = {};
  const bfBuckets = { lt12: 0, b12_18: 0, b18_25: 0, gt25: 0 };
  for (const s of spots) {
    byType[s.spotType] = (byType[s.spotType] ?? 0) + 1;
    const bf = s.expected.bubbleFactor;
    if (bf < 1.2) bfBuckets.lt12++;
    else if (bf < 1.8) bfBuckets.b12_18++;
    else if (bf < 2.5) bfBuckets.b18_25++;
    else bfBuckets.gt25++;
  }
  console.log("Distribution types :", byType);
  console.log("Distribution BF :", bfBuckets, `(total ${spots.length})`);

  const outPath = path.join(process.cwd(), "content", "spots", "m4-2.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
