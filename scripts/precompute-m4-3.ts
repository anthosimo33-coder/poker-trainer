import * as fs from "fs";
import * as path from "path";
import { positionAdjustedBubbleFactor } from "../lib/poker/icm";
import { getPayout } from "../content/payouts/canonical";
import type { ICMPlayer } from "../lib/poker/icm";
import type { PrecomputedM43Spot } from "../content/spots/types";

interface SpotTemplate {
  players: ICMPlayer[];
  heroId: string;
  villainId: string;
  payoutSlug: string;
  pushAmount: number;
  heroPosition: PrecomputedM43Spot["heroPosition"];
  playersLeftToAct: number;
  spotType: PrecomputedM43Spot["spotType"];
  scenarioLabel: string;
}

function p(...stacks: { id: string; stack: number }[]): ICMPlayer[] {
  return stacks;
}

const TEMPLATES: SpotTemplate[] = [
  // ===== EP BULLE (UTG/MP avec 3-5 joueurs derrière) — ~42 spots =====
  // UTG (5 joueurs derrière)
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG push 5bb en bulle 6-way (5 derrière)" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG push 6bb en bulle 6-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG short push 4.5bb en bulle" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG push 5.5bb stacks équilibrés + micro-short" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG push 4bb bulle FT 6-way" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG leader push bulle MTT 18j (5 derrière)" },
  // UTG en bulle MTT 18j
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG mid stack push bulle MTT 18j" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG leader push bulle SnG" },
  // MP (4 joueurs derrière) — bulle 5-way et 6-way
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP push 5bb bulle 6-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP leader push bulle 6-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP short push 4.5bb bulle" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP push 5bb bulle FT 6-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP push 5.5bb stacks équilibrés FT" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP leader push bulle MTT 18j" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 4500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP mid stack push bulle MTT 18j" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP push 5.5bb bulle FT (large stacks)" },
  // EP en 5-way (UTG → 4 derrière, MP → 3 derrière)
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "UTG push 5bb bulle 5-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "UTG leader push bulle 5-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500, heroPosition: "UTG", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "UTG short push 4.5bb bulle 5-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "UTG push 5.5bb bulle SnG 5-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP push 5bb bulle 5-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP leader push bulle 5-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP short push 4.5bb bulle 5-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP push 5bb stacks équilibrés bulle SnG" },
  // EP en 4-way (UTG → 3 derrière, MP → 2 derrière → bascule LP)
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG push 5bb bulle 4-way (3 derrière)" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG leader push bulle 4-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG short push 4.5bb bulle 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG push 5.5bb stacks éqaux bulle 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG push 5bb bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "UTG leader push bulle MTT 4-way" },
  // EP variations supplémentaires
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG short 4bb bulle FT 6-way" },
  { players: p({ id: "hero", stack: 3500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 3500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG micro-short 3.5bb bulle FT" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP chip leader push bulle FT" },
  { players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 5000 }, { id: "v2", stack: 4500 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG chip leader push bulle FT (très exposé)" },
  { players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP leader push bulle FT 6-way" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4000, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP short stack push bulle 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5000, heroPosition: "MP", playersLeftToAct: 3, spotType: "ep-bubble", scenarioLabel: "MP push 5bb bulle MTT 18j 4-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG leader 6.5k push bulle SnG 6-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG mid 5.5k push bulle SnG 6-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "MP", playersLeftToAct: 4, spotType: "ep-bubble", scenarioLabel: "MP mid 6k push bulle SnG 6-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG leader 6.5k push bulle MTT 18j 6-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-bubble", scenarioLabel: "UTG push 5.5bb stacks éqaux SnG 6-way" },

  // ===== LP BULLE (CO/BTN avec 1-2 joueurs derrière) — ~36 spots =====
  // CO (2 derrière) — bulle 4-way
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO push 5.5bb bulle 4-way (2 derrière)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO leader push bulle 4-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO short push bulle 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO mid push bulle 4-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO push bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO mid push bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO push 5bb bulle FT 5-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 4500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO leader push bulle FT 5-way" },
  // BTN (1 derrière) — bulle 4-way et 3-way
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN push 5.5bb bulle 4-way (1 derrière)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN leader push bulle 4-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN short push bulle 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN mid push bulle 4-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN push bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN mid push bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 4500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN short push bulle MTT 4-way" },
  // LP bulle 5-way / 6-way (CO 3 derrière)
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO push bulle FT 5-way (3 derrière)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO leader push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO mid push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 6000 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO short push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO push bulle FT 6-way (3 derrière)" },
  // BTN en 5-way / 6-way (2 derrière)
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "BTN push bulle FT 5-way (2 derrière)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "BTN leader push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "BTN push bulle FT 6-way" },
  // BTN bulle 3-way (1 derrière)
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN push bulle 3-way (1 derrière)" },
  { players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN leader push bulle 3-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN mid push bulle 3-way" },
  // Variations LP supplémentaires
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4000, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO short 4bb push bulle 4-way" },
  { players: p({ id: "hero", stack: 7500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO big leader push bulle 4-way" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN dominant leader push bulle 4-way" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 6000 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "BTN short stack 4bb push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "BTN big leader push bulle FT 5-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 2, spotType: "lp-bubble", scenarioLabel: "CO leader push bulle MTT 18j" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "BTN", playersLeftToAct: 1, spotType: "lp-bubble", scenarioLabel: "BTN leader push bulle MTT 18j" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-bubble", scenarioLabel: "CO mid push bulle MTT 18j 5-way" },

  // ===== SB vs BB BULLE (0 joueurs derrière, BF brut) — ~24 spots =====
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle 4-way (0 derrière)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB short vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle MTT 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle FT 5-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle FT 5-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 4500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB short vs BB bulle FT 5-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5000, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle FT 6-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "v3", stack: 5000 }, { id: "v4", stack: 4500 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle FT 6-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle 3-way" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle 3-way" },
  { players: p({ id: "hero", stack: 4500 }, { id: "v1", stack: 6500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB short vs BB bulle 3-way" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6000 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle 5-way" },
  { players: p({ id: "hero", stack: 6000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle 5-way" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5000 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB big leader vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 4000 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 6000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 4000, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB short stack 4bb vs BB bulle 4-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle MTT 18j (équilibré)" },
  { players: p({ id: "hero", stack: 6500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5000 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB leader vs BB bulle MTT 5-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 6500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "short", stack: 1500 }), heroId: "hero", villainId: "v1", payoutSlug: "bubble-18-3paid", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle MTT 5-way" },
  { players: p({ id: "hero", stack: 5500 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5500 }, { id: "short", stack: 500 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5500, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB vs BB bulle 6-way équilibré + micro-short" },
  { players: p({ id: "hero", stack: 5000 }, { id: "v1", stack: 5500 }, { id: "v2", stack: 5500 }, { id: "v3", stack: 5500 }, { id: "v4", stack: 5500 }, { id: "short", stack: 2000 }), heroId: "hero", villainId: "v1", payoutSlug: "sng-9-standard", pushAmount: 5000, heroPosition: "SB", playersLeftToAct: 0, spotType: "sb-vs-bb-bubble", scenarioLabel: "SB mid vs BB bulle 6-way" },

  // ===== FT positions variées — ~18 spots =====
  // EP table finale 9j (UTG = 7 derrière mais cap 5)
  { players: p({ id: "hero", stack: 12000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 12000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "UTG mid 12k push FT 9j (5+ derrière)" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 8000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "UTG short 8k push FT 9j" },
  { players: p({ id: "hero", stack: 15000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 15000, heroPosition: "MP", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "MP mid 15k push FT 9j" },
  { players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 11000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 9000, heroPosition: "MP", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "MP short 9k push FT 9j" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 18000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "UTG mid-leader 18k push FT 9j" },
  { players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 11000, heroPosition: "MP", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "MP mid 11k push FT 9j" },
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 22000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 11000 }, { id: "v6", stack: 9000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 14000, heroPosition: "UTG", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "UTG mid 14k push FT 9j stacks équilibrés" },
  { players: p({ id: "hero", stack: 7000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 17000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 5000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 7000, heroPosition: "MP", playersLeftToAct: 5, spotType: "ep-ft", scenarioLabel: "MP short 7k push FT 9j" },
  // LP table finale 9j (BTN = 2 derrière, CO = 3 derrière)
  { players: p({ id: "hero", stack: 14000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 14000, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-ft", scenarioLabel: "CO mid 14k push FT 9j (3 derrière)" },
  { players: p({ id: "hero", stack: 18000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 18000, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-ft", scenarioLabel: "CO leader 18k push FT 9j" },
  { players: p({ id: "hero", stack: 11000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 11000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-ft", scenarioLabel: "BTN mid 11k push FT 9j (2 derrière)" },
  { players: p({ id: "hero", stack: 22000 }, { id: "v1", stack: 25000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 3000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 22000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-ft", scenarioLabel: "BTN second-leader 22k push FT 9j" },
  { players: p({ id: "hero", stack: 9000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 9000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-ft", scenarioLabel: "BTN short 9k push FT 9j" },
  { players: p({ id: "hero", stack: 13000 }, { id: "v1", stack: 26000 }, { id: "v2", stack: 20000 }, { id: "v3", stack: 16000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 13000, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-ft", scenarioLabel: "CO mid 13k push FT 9j" },
  { players: p({ id: "hero", stack: 16000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 19000 }, { id: "v3", stack: 15000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 16000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-ft", scenarioLabel: "BTN mid-leader 16k push FT 9j" },
  { players: p({ id: "hero", stack: 8000 }, { id: "v1", stack: 28000 }, { id: "v2", stack: 22000 }, { id: "v3", stack: 18000 }, { id: "v4", stack: 13000 }, { id: "v5", stack: 10000 }, { id: "v6", stack: 8000 }, { id: "v7", stack: 6000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 8000, heroPosition: "CO", playersLeftToAct: 3, spotType: "lp-ft", scenarioLabel: "CO short 8k push FT 9j" },
  { players: p({ id: "hero", stack: 20000 }, { id: "v1", stack: 24000 }, { id: "v2", stack: 18000 }, { id: "v3", stack: 14000 }, { id: "v4", stack: 12000 }, { id: "v5", stack: 9000 }, { id: "v6", stack: 7000 }, { id: "v7", stack: 5000 }, { id: "v8", stack: 4000 }), heroId: "hero", villainId: "v1", payoutSlug: "ft-9-standard", pushAmount: 20000, heroPosition: "BTN", playersLeftToAct: 2, spotType: "lp-ft", scenarioLabel: "BTN leader 20k push FT 9j (2 derrière)" },
];

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM43Spot | null {
  const payout = getPayout(tpl.payoutSlug);
  if (!payout) {
    console.error(`Payout slug introuvable : ${tpl.payoutSlug}`);
    return null;
  }
  try {
    const result = positionAdjustedBubbleFactor({
      players: tpl.players,
      payouts: payout.payouts,
      heroId: tpl.heroId,
      villainId: tpl.villainId,
      pushAmount: tpl.pushAmount,
      playersLeftToAct: tpl.playersLeftToAct,
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
      heroPosition: tpl.heroPosition,
      playersLeftToAct: tpl.playersLeftToAct,
      scenarioLabel: tpl.scenarioLabel,
      spotType: tpl.spotType,
      expected: {
        baseBubbleFactor: Math.round(result.baseBubbleFactor * 1000) / 1000,
        adjustedBubbleFactor: Math.round(result.bubbleFactor * 1000) / 1000,
        positionMultiplier: Math.round(result.positionMultiplier * 1000) / 1000,
        requiredEquityChip: Math.round(result.requiredEquityChip * 10) / 10,
        requiredEquityICM: Math.round(result.requiredEquityICM * 10) / 10,
        heroEquityBefore: Math.round(result.heroEquityBefore * 10) / 10,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`Pré-calcul de ${TEMPLATES.length} spots M4.3...`);
  const t0 = Date.now();

  const spots: PrecomputedM43Spot[] = [];
  for (let i = 0; i < TEMPLATES.length; i++) {
    const tpl = TEMPLATES[i];
    const id = `m4-3-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(tpl, id);
    if (spot) {
      spots.push(spot);
      if ((i + 1) % 15 === 0) {
        console.log(
          `  [${i + 1}/${TEMPLATES.length}] ${tpl.scenarioLabel} → mult ${spot.expected.positionMultiplier.toFixed(2)}, BF adj ${spot.expected.adjustedBubbleFactor.toFixed(2)}`
        );
      }
    }
  }

  const t1 = Date.now();
  console.log(`\n✓ ${spots.length} spots calculés en ${((t1 - t0) / 1000).toFixed(1)}s`);

  const byType: Record<string, number> = {};
  const byPos: Record<string, number> = {};
  for (const s of spots) {
    byType[s.spotType] = (byType[s.spotType] ?? 0) + 1;
    byPos[s.heroPosition] = (byPos[s.heroPosition] ?? 0) + 1;
  }
  console.log("Distribution types :", byType);
  console.log("Distribution positions :", byPos);

  const outPath = path.join(process.cwd(), "content", "spots", "m4-3.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
