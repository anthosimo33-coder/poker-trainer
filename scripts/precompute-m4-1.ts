import * as fs from "fs";
import * as path from "path";
import { icmEquity, chipEquityPercent } from "../lib/poker/icm";
import { getPayout } from "../content/payouts/canonical";
import type { ICMPlayer } from "../lib/poker/icm";
import type { PrecomputedM41Spot } from "../content/spots/types";

interface SpotTemplate {
  players: ICMPlayer[];
  heroId: string;
  payoutSlug: string;
  spotType: PrecomputedM41Spot["spotType"];
  scenarioLabel: string;
}

// Helpers concis pour construire des templates lisibles.
function hp(stacks: number[]): ICMPlayer[] {
  return stacks.map((s, i) => ({ id: i === 0 ? "hero" : `v${i}`, stack: s }));
}

const TEMPLATES: SpotTemplate[] = [
  // ===== EQUAL STACKS — calibration de l'intuition naïve (30) =====
  // 3-way
  { players: hp([5000, 5000, 5000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "3-way égal sit&go 9-max" },
  { players: hp([3000, 3000, 3000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "3-way égal stacks moyens" },
  { players: hp([10000, 10000, 10000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "3-way égal stacks profonds" },
  { players: hp([5000, 5000, 5000]), heroId: "hero", payoutSlug: "bubble-18-3paid", spotType: "equal-stacks", scenarioLabel: "3-way égal bulle 18j (3 payés)" },
  // 4-way
  { players: hp([3000, 3000, 3000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "4-way égal table finale" },
  { players: hp([3000, 3000, 3000, 3000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "4-way égal bulle 3 payés" },
  { players: hp([7500, 7500, 7500, 7500]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "equal-stacks", scenarioLabel: "4-way égal proche FT" },
  // 5-way
  { players: hp([4000, 4000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "5-way égal table finale" },
  { players: hp([4000, 4000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "5-way égal sit&go (3 payés)" },
  { players: hp([6000, 6000, 6000, 6000, 6000]), heroId: "hero", payoutSlug: "flat-15percent", spotType: "equal-stacks", scenarioLabel: "5-way égal MTT flat" },
  // 6-way
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "6-way égal table finale" },
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "sng-6-standard", spotType: "equal-stacks", scenarioLabel: "6-way égal sit&go 6-max (65/35)" },
  { players: hp([8000, 8000, 8000, 8000, 8000, 8000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "equal-stacks", scenarioLabel: "6-way égal proche FT" },
  { players: hp([3500, 3500, 3500, 3500, 3500, 3500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "6-way égal stacks moyens FT" },
  // 7-way
  { players: hp([4500, 4500, 4500, 4500, 4500, 4500, 4500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "7-way égal table finale" },
  { players: hp([4500, 4500, 4500, 4500, 4500, 4500, 4500]), heroId: "hero", payoutSlug: "flat-15percent", spotType: "equal-stacks", scenarioLabel: "7-way égal MTT flat" },
  { players: hp([7000, 7000, 7000, 7000, 7000, 7000, 7000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "equal-stacks", scenarioLabel: "7-way égal proche FT" },
  // 8-way
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "8-way égal table finale" },
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "flat-15percent", spotType: "equal-stacks", scenarioLabel: "8-way égal MTT flat" },
  { players: hp([10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "equal-stacks", scenarioLabel: "8-way égal proche FT stacks profonds" },
  // 9-way
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "9-way égal table finale" },
  { players: hp([8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "9-way égal FT stacks moyens" },
  // 2-way (heads-up WTA)
  { players: hp([5000, 5000]), heroId: "hero", payoutSlug: "wta-2", spotType: "equal-stacks", scenarioLabel: "HU égal WTA" },
  { players: hp([10000, 10000]), heroId: "hero", payoutSlug: "wta-2", spotType: "equal-stacks", scenarioLabel: "HU égal WTA stacks profonds" },
  { players: hp([3000, 3000]), heroId: "hero", payoutSlug: "wta-2", spotType: "equal-stacks", scenarioLabel: "HU égal WTA stacks courts" },
  // Variations stack-size 3-way equal
  { players: hp([1500, 1500, 1500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "3-way égal stacks courts (1500)" },
  { players: hp([15000, 15000, 15000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "equal-stacks", scenarioLabel: "3-way égal stacks énormes (15000)" },
  // Variations 4-5-6 equal additionnels
  { players: hp([6500, 6500, 6500, 6500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "4-way égal FT stacks 6500" },
  { players: hp([2500, 2500, 2500, 2500, 2500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "equal-stacks", scenarioLabel: "5-way égal FT stacks 2500" },
  { players: hp([12000, 12000, 12000, 12000, 12000, 12000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "equal-stacks", scenarioLabel: "6-way égal proche FT stacks 12000" },

  // ===== CHIP LEADER (overestimate trap) (30) =====
  // 3-way avec leader massif
  { players: hp([10000, 2500, 2500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 3-way (67 % des chips)" },
  { players: hp([12000, 1500, 1500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader écrasant 3-way (80 % des chips)" },
  { players: hp([8000, 3000, 4000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader confortable 3-way (53 %)" },
  { players: hp([6000, 2000, 2000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 3-way (60 % des chips)" },
  { players: hp([9000, 3000, 3000]), heroId: "hero", payoutSlug: "bubble-18-3paid", spotType: "chip-leader", scenarioLabel: "Chipleader bulle 3-way (60 %)" },
  // 4-way avec leader
  { players: hp([10000, 4000, 3000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way FT (50 % des chips)" },
  { players: hp([12000, 3000, 3000, 2000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way FT (60 %)" },
  { players: hp([8000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way SnG (40 %, 3 payés)" },
  { players: hp([15000, 3000, 3000, 4000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way proche FT (60 %)" },
  // 5-way avec leader
  { players: hp([10000, 4000, 3500, 3500, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 5-way FT (40 % des chips)" },
  { players: hp([15000, 4000, 4000, 4000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 5-way FT (50 %)" },
  { players: hp([12000, 3000, 3000, 3000, 3000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 5-way SnG (50 %, 3 payés)" },
  // 6-way avec leader
  { players: hp([15000, 4000, 4000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 6-way FT (43 %)" },
  { players: hp([20000, 4000, 4000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 6-way FT (50 %)" },
  { players: hp([12000, 3500, 3500, 3500, 3500, 3500]), heroId: "hero", payoutSlug: "sng-6-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 6-way SnG (41 %, 2 payés)" },
  // 7-9 way avec leader
  { players: hp([20000, 4000, 4000, 4000, 4000, 4000, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 7-way FT (45 %)" },
  { players: hp([25000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 7-way FT (45 % gros stacks)" },
  { players: hp([20000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 8-way FT (36 %)" },
  { players: hp([30000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 9-way FT (43 %)" },
  { players: hp([25000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 9-way FT (38 %)" },
  // Heads-up chip leader
  { players: hp([7000, 3000]), heroId: "hero", payoutSlug: "wta-2", spotType: "chip-leader", scenarioLabel: "Chipleader HU 70 % WTA" },
  { players: hp([8500, 1500]), heroId: "hero", payoutSlug: "wta-2", spotType: "chip-leader", scenarioLabel: "Chipleader HU 85 % WTA" },
  // Variations supplémentaires
  { players: hp([6000, 1500, 1500, 1000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way bulle (60 %, 3 payés)" },
  { players: hp([8000, 2000, 2000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 3-way (67 % stacks moyens)" },
  { players: hp([9000, 2500, 2500, 1000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way FT (60 %) + 1 short" },
  { players: hp([14000, 5000, 3000, 3000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "chip-leader", scenarioLabel: "Chipleader 4-way proche FT (56 %)" },
  { players: hp([16000, 4000, 4000, 4000, 2000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 5-way FT (53 %)" },
  { players: hp([18000, 4000, 4000, 4000, 4000, 2000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 6-way FT (50 % avec short)" },
  { players: hp([22000, 6000, 5000, 4000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader 5-way FT (55 % stacks variés)" },
  { players: hp([30000, 8000, 6000, 4000, 2000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "chip-leader", scenarioLabel: "Chipleader dominant 5-way FT (60 %)" },

  // ===== SHORT STACK (underestimate trap) (30) =====
  // 3-way short
  { players: hp([1500, 5500, 8000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 3-way SnG (10 %)" },
  { players: hp([1000, 4500, 4500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 3-way SnG (10 % vs 2 stacks moyens)" },
  { players: hp([2000, 5000, 8000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 3-way SnG (13 %)" },
  { players: hp([2500, 5000, 7500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 3-way SnG (17 %)" },
  { players: hp([500, 4500, 5000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 3-way SnG (5 %)" },
  // 4-way short
  { players: hp([1500, 5000, 5000, 8500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 4-way FT (7.5 %)" },
  { players: hp([2000, 4000, 6000, 8000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 4-way FT (10 %)" },
  { players: hp([1000, 4000, 5000, 10000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 4-way FT (5 %)" },
  { players: hp([1500, 4500, 5500, 8500]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "short-stack", scenarioLabel: "Short 4-way proche FT (7.5 %)" },
  { players: hp([2500, 4500, 5500, 7500]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "short-stack", scenarioLabel: "Short 4-way proche FT (12.5 %)" },
  // 5-way short
  { players: hp([1500, 4000, 5000, 5000, 4500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 5-way FT (7.5 %)" },
  { players: hp([2000, 4000, 4500, 5000, 4500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 5-way FT (10 %)" },
  { players: hp([1000, 4000, 4500, 5500, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 5-way FT (5 %)" },
  { players: hp([2500, 4500, 5000, 4500, 3500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 5-way FT (12.5 %)" },
  // 6-way short
  { players: hp([2000, 4500, 5000, 5500, 5000, 8000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 6-way FT (6.7 %)" },
  { players: hp([1500, 4500, 5000, 5500, 6000, 7500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 6-way FT (5 %)" },
  { players: hp([3000, 4500, 5500, 6000, 5000, 6000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 6-way FT (10 %)" },
  // 7-way short
  { players: hp([2500, 5000, 5500, 6000, 5500, 6000, 4500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 7-way FT (7.4 %)" },
  { players: hp([2000, 5000, 5500, 6500, 6000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 7-way FT (5.7 %)" },
  // 8-way et 9-way short
  { players: hp([2500, 5000, 5500, 6000, 6000, 5500, 5500, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 8-way FT (6.3 %)" },
  { players: hp([3000, 5000, 5500, 6000, 6500, 5000, 5500, 4500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 8-way FT (7.5 %)" },
  { players: hp([2000, 4500, 5000, 5500, 6000, 6500, 5500, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 9-way FT (4.4 %)" },
  { players: hp([3500, 5000, 5500, 5500, 6000, 6000, 5500, 5000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 9-way FT (7.8 %)" },
  // Heads-up short
  { players: hp([2000, 8000]), heroId: "hero", payoutSlug: "wta-2", spotType: "short-stack", scenarioLabel: "Short HU 20 % WTA" },
  { players: hp([1500, 8500]), heroId: "hero", payoutSlug: "wta-2", spotType: "short-stack", scenarioLabel: "Short HU 15 % WTA" },
  // Variations short additionnels
  { players: hp([2500, 5000, 4500, 6000, 4500, 3500]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Short 6-way FT (10 % stacks moyens)" },
  { players: hp([1500, 6000, 4500, 5500, 4500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 5-way SnG bulle (7 %, 3 payés)" },
  { players: hp([2000, 5500, 7000, 5500]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "short-stack", scenarioLabel: "Short 4-way SnG bulle (10 %, 3 payés)" },
  { players: hp([1000, 4000, 6500, 6000, 5500, 4500, 5500, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Micro-short 8-way FT (2.6 %)" },
  { players: hp([500, 4500, 5500, 6000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "short-stack", scenarioLabel: "Micro-short 5-way FT (2.2 %)" },

  // ===== BUBBLE (effet ICM extrême) (18) =====
  { players: hp([8000, 6000, 5000, 1000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero chipleader + 1 short" },
  { players: hp([6000, 6000, 5000, 3000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero co-chipleader" },
  { players: hp([5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way égale" },
  { players: hp([7000, 5500, 4500, 3000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero chipleader confortable" },
  { players: hp([3000, 5500, 6500, 5000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero 2ème short" },
  { players: hp([2000, 6000, 6000, 6000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero short stack" },
  { players: hp([1500, 6500, 6000, 6000]), heroId: "hero", payoutSlug: "sng-9-standard", spotType: "bubble", scenarioLabel: "Bulle 4-way, hero micro-short" },
  // Bulle 18j (3 payés)
  { players: hp([6000, 5000, 5000, 4000]), heroId: "hero", payoutSlug: "bubble-18-3paid", spotType: "bubble", scenarioLabel: "Bulle MTT 18j (3 payés), hero chipleader" },
  { players: hp([2500, 5500, 6000, 6000]), heroId: "hero", payoutSlug: "bubble-18-3paid", spotType: "bubble", scenarioLabel: "Bulle MTT 18j, hero short" },
  { players: hp([5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "bubble-18-3paid", spotType: "bubble", scenarioLabel: "Bulle MTT 18j, stacks égaux" },
  // Bulle proche FT 10 restants 9 payés
  { players: hp([12000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000, 1000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "bubble", scenarioLabel: "Bulle FT (10 restants 9 payés), hero chipleader" },
  { players: hp([1000, 12000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "bubble", scenarioLabel: "Bulle FT (10 restants 9 payés), hero micro-short" },
  { players: hp([6500, 6500, 6500, 6500, 6500, 6500, 6500, 6500, 6500, 6500]), heroId: "hero", payoutSlug: "near-ft-10-9paid", spotType: "bubble", scenarioLabel: "Bulle FT (10 restants), stacks égaux" },
  // Bulle 5-way (variantes)
  { players: hp([8000, 5000, 5000, 5000, 1000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "bubble", scenarioLabel: "Bulle FT 5-way, hero chipleader" },
  { players: hp([1000, 5000, 5500, 6500, 6000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "bubble", scenarioLabel: "Bulle FT 5-way, hero short" },
  { players: hp([5000, 5000, 5000, 5000, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "bubble", scenarioLabel: "Bulle FT 5-way, hero stack moyen" },
  { players: hp([3000, 5000, 5500, 6500, 4000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "bubble", scenarioLabel: "Bulle FT 5-way, hero 4ème stack" },
  { players: hp([6000, 5000, 5000, 5000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "bubble", scenarioLabel: "Bulle FT 5-way, hero chipleader confortable" },

  // ===== FINAL TABLE (9 payés, écarts payouts élevés) (8) =====
  { players: hp([30000, 25000, 20000, 15000, 10000, 8000, 7000, 5000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero chipleader (24 %)" },
  { players: hp([3000, 30000, 25000, 20000, 15000, 10000, 8000, 7000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero short (2.4 %)" },
  { players: hp([12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, stacks égaux" },
  { players: hp([20000, 20000, 15000, 15000, 10000, 10000, 8000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero co-chipleader" },
  { players: hp([10000, 15000, 20000, 18000, 12000, 10000, 8000, 8000, 7000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero stack moyen" },
  { players: hp([40000, 15000, 15000, 12000, 10000, 8000, 6000, 5000, 3000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero chipleader dominant (35 %)" },
  { players: hp([5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, stacks égaux courts" },
  { players: hp([25000, 25000, 25000, 25000, 5000, 5000, 5000, 5000, 5000]), heroId: "hero", payoutSlug: "ft-9-standard", spotType: "final-table", scenarioLabel: "FT 9 joueurs, hero parmi 4 chipleaders" },

  // ===== SATELLITE (cas extrême flat) (4) =====
  { players: hp([12000, 8000, 5000, 4000, 1000]), heroId: "hero", payoutSlug: "satellite-5tickets", spotType: "satellite", scenarioLabel: "Satellite 5 tickets, hero chipleader" },
  { players: hp([1000, 8000, 5000, 4000, 12000]), heroId: "hero", payoutSlug: "satellite-5tickets", spotType: "satellite", scenarioLabel: "Satellite 5 tickets, hero micro-short (bulle)" },
  { players: hp([6000, 6000, 6000, 6000, 6000]), heroId: "hero", payoutSlug: "satellite-5tickets", spotType: "satellite", scenarioLabel: "Satellite 5 tickets, stacks égaux (5 payés sur 5)" },
  { players: hp([2000, 7000, 7000, 7000, 7000]), heroId: "hero", payoutSlug: "satellite-5tickets", spotType: "satellite", scenarioLabel: "Satellite 5 tickets, hero short (bulle satellite)" },
];

function computeSpot(tpl: SpotTemplate, id: string): PrecomputedM41Spot | null {
  const payout = getPayout(tpl.payoutSlug);
  if (!payout) {
    console.error(`Payout slug introuvable : ${tpl.payoutSlug}`);
    return null;
  }
  try {
    const result = icmEquity(tpl.players, payout.payouts);
    const totalPrizepool = payout.payouts.reduce((acc, p) => acc + p, 0);
    const heroEquityValue = result.equities[tpl.heroId];
    const heroEquityPercent = (heroEquityValue / totalPrizepool) * 100;
    const heroChipEquityPercent = chipEquityPercent(tpl.players, tpl.heroId);
    const icmEffect = heroEquityPercent - heroChipEquityPercent;

    const allEquitiesPct: Record<string, number> = {};
    for (const [pid, eq] of Object.entries(result.equities)) {
      allEquitiesPct[pid] = Math.round((eq / totalPrizepool) * 1000) / 10;
    }

    return {
      id,
      players: tpl.players,
      heroId: tpl.heroId,
      payoutSlug: payout.slug,
      payoutLabel: payout.label,
      payouts: payout.payouts,
      scenarioLabel: tpl.scenarioLabel,
      spotType: tpl.spotType,
      expected: {
        heroEquityPercent: Math.round(heroEquityPercent * 10) / 10,
        heroChipEquityPercent: Math.round(heroChipEquityPercent * 10) / 10,
        icmEffect: Math.round(icmEffect * 10) / 10,
        allEquities: allEquitiesPct,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.scenarioLabel} : ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`Pré-calcul de ${TEMPLATES.length} spots M4.1...`);
  const t0 = Date.now();

  const spots: PrecomputedM41Spot[] = [];
  for (let i = 0; i < TEMPLATES.length; i++) {
    const tpl = TEMPLATES[i];
    const id = `m4-1-spot-${String(i + 1).padStart(3, "0")}`;
    const spot = computeSpot(tpl, id);
    if (spot) {
      spots.push(spot);
      if ((i + 1) % 10 === 0) {
        console.log(
          `  [${i + 1}/${TEMPLATES.length}] ${tpl.scenarioLabel} → équité ${spot.expected.heroEquityPercent} % (chip ${spot.expected.heroChipEquityPercent} %, effet ${spot.expected.icmEffect >= 0 ? "+" : ""}${spot.expected.icmEffect})`
        );
      }
    }
  }

  const t1 = Date.now();
  console.log(`\n✓ ${spots.length} spots calculés en ${((t1 - t0) / 1000).toFixed(1)}s`);

  // Stats distribution
  const byType: Record<string, number> = {};
  for (const s of spots) {
    byType[s.spotType] = (byType[s.spotType] ?? 0) + 1;
  }
  console.log("Distribution :", byType);

  const outPath = path.join(process.cwd(), "content", "spots", "m4-1.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`Écrit : ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
