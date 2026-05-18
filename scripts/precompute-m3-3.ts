/**
 * Pré-calcule les spots M3.3 (EV composites multi-branches).
 *
 * Quatre scénarios canoniques, chacun avec 3 branches du vilain :
 *  - 3bet-vs-open       : opener fold / call / 4-bet
 *  - iso-vs-limp        : limper fold / call / 3-bet
 *  - squeeze-vs-open-call: tout le monde fold / opener call / opener 4-bet
 *  - cold-call-vs-open  : flop défavorable / neutre (réalise equity) / favorable
 *
 * Modèle EV simplifié (cf. ev3BetVs3Branches, realizationFactor 0.85) :
 *  - evIfFold     = pot ramassé immédiatement (positif)
 *  - evIfCall     = equity réalisée × (pot postflop) − invest postflop
 *  - evIfFourBet  = −taille de la mise de hero (hero fold le 4-bet/3-bet)
 *  - evBb         = Σ Pᵢ × EVᵢ (evMultiBranch)
 *
 * Probabilités dérivées de la taille relative des ranges ; normalisées pour
 * sommer exactement à 1. Perf : equityVsRange MC, iterations=600.
 */
import * as fs from "fs";
import * as path from "path";
import { evMultiBranch, ev3BetVs3Branches } from "../lib/poker/ev";
import { equityVsRange } from "../lib/poker/equity";
import { parseRange } from "../lib/poker/range-parser";
import { getRange } from "../content/ranges/canonical";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM33Spot } from "../content/spots/types";

const ITER = 600;
const REAL = 0.85;

type Scenario = PrecomputedM33Spot["scenario"];

interface Cfg {
  scenario: Scenario;
  heroPosition: string;
  villainPosition: string;
  heroStack: number;
  effectiveStack: number;
  potBefore: number;
  heroActionSize: number;
  potIfCall: number;
  totalSlug: string;
  callSlug: string;
  fourBetSlug?: string;
  label: (h: string) => string;
}

const SCEN: Record<Scenario, Cfg> = {
  "3bet-vs-open": {
    scenario: "3bet-vs-open",
    heroPosition: "BTN",
    villainPosition: "CO",
    heroStack: 40,
    effectiveStack: 40,
    potBefore: 3.8, // CO open 2.3 + SB 0.5 + BB 1
    heroActionSize: 7.5,
    potIfCall: 15.5,
    totalSlug: "open-co-30",
    callSlug: "defense-co-vs-mp",
    fourBetSlug: "4bet-value-tight",
    label: (h) => `${h} 3-bet BTN vs CO open (fold/call/4-bet)`,
  },
  "iso-vs-limp": {
    scenario: "iso-vs-limp",
    heroPosition: "BTN",
    villainPosition: "UTG",
    heroStack: 25,
    effectiveStack: 25,
    potBefore: 2.5, // limp 1 + SB 0.5 + BB 1
    heroActionSize: 4.5,
    potIfCall: 9.5,
    totalSlug: "limp-fish",
    callSlug: "fish-call-anything",
    fourBetSlug: "fish-3bet-light",
    label: (h) => `${h} iso-raise BTN vs UTG limp (fold/call/3-bet)`,
  },
  "squeeze-vs-open-call": {
    scenario: "squeeze-vs-open-call",
    heroPosition: "BB",
    villainPosition: "MP",
    heroStack: 50,
    effectiveStack: 50,
    potBefore: 6.5, // open 2.5 + call 2.5 + SB 0.5 + BB 1
    heroActionSize: 11,
    potIfCall: 24,
    totalSlug: "open-mp-20",
    callSlug: "total-co-vs-utg-3bet",
    fourBetSlug: "4bet-value-tight",
    label: (h) => `${h} squeeze BB vs MP open + call (fold/call/4-bet)`,
  },
  "cold-call-vs-open": {
    scenario: "cold-call-vs-open",
    heroPosition: "CO",
    villainPosition: "UTG",
    heroStack: 35,
    effectiveStack: 35,
    potBefore: 4.0, // UTG open 2.5 + SB 0.5 + BB 1
    heroActionSize: 2.5, // hero cold-call l'open
    potIfCall: 6.5,
    totalSlug: "open-utg-15",
    callSlug: "defense-co-vs-mp",
    label: (h) => `${h} cold-call CO vs UTG open (flop défav./neutre/fav.)`,
  },
};

const HANDS: [Card, Card, string][] = [
  ["As", "Ks", "AKs"], ["As", "Kh", "AKo"], ["Qs", "Qh", "QQ"], ["Js", "Jh", "JJ"],
  ["Ts", "Th", "TT"], ["9s", "9h", "99"], ["8s", "8h", "88"], ["7s", "7h", "77"],
  ["As", "Qs", "AQs"], ["As", "Qh", "AQo"], ["As", "Js", "AJs"], ["As", "Ts", "ATs"],
  ["Ks", "Qs", "KQs"], ["Ks", "Js", "KJs"], ["Qs", "Js", "QJs"], ["Js", "Ts", "JTs"],
  ["Ts", "9s", "T9s"], ["9s", "8s", "98s"], ["As", "5s", "A5s"], ["As", "4s", "A4s"],
  ["Ks", "Td", "KTo"], ["Qs", "Th", "QTo"], ["6s", "6h", "66"], ["5s", "5h", "55"],
  ["7s", "6s", "76s"], ["8s", "7s", "87s"], ["As", "9h", "A9o"], ["Ks", "Qh", "KQo"],
  ["Ad", "Js", "AJo"], ["6s", "5s", "65s"],
];

interface Row {
  cfg: Cfg;
  hero: [Card, Card];
  heroLabel: string;
}
const T: Row[] = [];
for (const sc of Object.keys(SCEN) as Scenario[]) {
  for (const [a, b, hl] of HANDS) {
    T.push({ cfg: SCEN[sc], hero: [a, b], heroLabel: hl });
  }
}

function computeSpot(row: Row, id: string): PrecomputedM33Spot | null {
  const { cfg, hero, heroLabel } = row;
  const total = getRange(cfg.totalSlug);
  const call = getRange(cfg.callSlug);
  if (!total || !call) {
    console.error(`Range slug introuvable : ${cfg.totalSlug} / ${cfg.callSlug}`);
    return null;
  }
  const totalCombos = parseRange(total.notation);
  const callCombos = parseRange(call.notation);
  const fourBet = cfg.fourBetSlug ? getRange(cfg.fourBetSlug) : undefined;
  const fourBetCombos = fourBet ? parseRange(fourBet.notation) : [];

  try {
    const eqPct = callCombos.length
      ? equityVsRange(hero, callCombos, [], ITER).equity
      : 0;
    const equity = eqPct / 100;

    let pCall: number;
    let pFourBet: number;
    let pFold: number;
    let evIfFold: number;
    let evIfCall: number;
    let evIfFourBet: number;
    let evBb: number;
    let breakdown: string;

    if (cfg.scenario === "cold-call-vs-open") {
      // Cold-call : pas de fold preflop du vilain. Branches simplifiées au flop,
      // pondérées par l'equity de hero vs le range total d'open.
      pFourBet = Math.max(0.05, Math.min(0.3, equity * 0.45));
      pFold = Math.max(0.2, Math.min(0.7, 0.75 - equity * 0.6));
      pCall = Math.max(0, 1 - pFold - pFourBet);
      evIfFold = -cfg.heroActionSize * 0.6; // give-up : on perd ~60 % du cold-call
      evIfCall = equity * REAL * cfg.potIfCall - (1 - equity * REAL) * cfg.heroActionSize;
      evIfFourBet = cfg.effectiveStack * 0.45; // flop monstre : gros pot gagné
      ({ evBb } = evMultiBranch([
        { label: "flop défavorable", probability: pFold, evIfBranch: evIfFold },
        { label: "flop neutre", probability: pCall, evIfBranch: evIfCall },
        { label: "flop favorable", probability: pFourBet, evIfBranch: evIfFourBet },
      ]));
      breakdown = `Cold-call simplifié : P(flop défav.) ${(pFold * 100).toFixed(0)} %, neutre ${(pCall * 100).toFixed(0)} %, favorable ${(pFourBet * 100).toFixed(0)} %. Equity vs open ${eqPct.toFixed(1)} %.`;
    } else {
      // 3bet / iso / squeeze : pFold = 1 − (call + raise) / total, normalisé.
      let rawCall = callCombos.length / totalCombos.length;
      let rawRaise = fourBetCombos.length / totalCombos.length;
      if (rawCall + rawRaise > 1) {
        const s = rawCall + rawRaise;
        rawCall /= s;
        rawRaise /= s;
      }
      pCall = rawCall;
      pFourBet = rawRaise;
      pFold = Math.max(0, 1 - pCall - pFourBet);
      // Renormalise (sécurité flottants).
      const sum = pFold + pCall + pFourBet;
      pFold /= sum;
      pCall /= sum;
      pFourBet /= sum;

      const res = ev3BetVs3Branches({
        pFold,
        pCall,
        pFourBet,
        potBefore3Bet: cfg.potBefore,
        threeBetSize: cfg.heroActionSize,
        potIfCall: cfg.potIfCall,
        equityVsCallRange: equity,
        effectiveStackPostflop: cfg.effectiveStack - cfg.heroActionSize,
        realizationFactor: REAL,
      });
      evBb = res.evBb;
      evIfFold = res.branches[0].evIfBranch;
      evIfCall = res.branches[1].evIfBranch;
      evIfFourBet = res.branches[2].evIfBranch;
      breakdown = `P(fold) ${(pFold * 100).toFixed(0)} %, P(call) ${(pCall * 100).toFixed(0)} %, P(${cfg.scenario === "iso-vs-limp" ? "3-bet" : "4-bet"}) ${(pFourBet * 100).toFixed(0)} %. Equity vs call range ${eqPct.toFixed(1)} % (réalisée × ${REAL}).`;
    }

    return {
      id,
      heroCards: hero,
      scenario: cfg.scenario,
      heroPosition: cfg.heroPosition,
      villainPosition: cfg.villainPosition,
      heroStack: cfg.heroStack,
      effectiveStack: cfg.effectiveStack,
      potBefore: cfg.potBefore,
      heroActionSize: cfg.heroActionSize,
      villainCallRangeSlug: call.slug,
      villainCallRangeLabel: call.label,
      villainCallRangeNotation: call.notation,
      ...(fourBet
        ? {
            villainFourBetRangeSlug: fourBet.slug,
            villainFourBetRangeLabel: fourBet.label,
            villainFourBetRangeNotation: fourBet.notation,
          }
        : {}),
      scenarioLabel: cfg.label(heroLabel),
      expected: {
        pFold: Math.round(pFold * 1000) / 1000,
        pCall: Math.round(pCall * 1000) / 1000,
        pFourBet: Math.round(pFourBet * 1000) / 1000,
        evIfFold: Math.round(evIfFold * 100) / 100,
        evIfCall: Math.round(evIfCall * 100) / 100,
        evIfFourBet: Math.round(evIfFourBet * 100) / 100,
        evBb: Math.round(evBb * 100) / 100,
        breakdown,
      },
    };
  } catch (e) {
    console.error(`Skipped ${cfg.label(heroLabel)} : ${(e as Error).message}`);
    return null;
  }
}

function main() {
  console.log(`Pré-calcul de ${T.length} spots M3.3...`);
  const t0 = Date.now();
  const spots: PrecomputedM33Spot[] = [];
  const buckets = { "<-2": 0, "-2..0": 0, "0..2": 0, ">2": 0 };
  for (let i = 0; i < T.length; i++) {
    const spot = computeSpot(T[i], `m3-3-spot-${String(i + 1).padStart(3, "0")}`);
    if (!spot) continue;
    spots.push(spot);
    const ev = spot.expected.evBb;
    const k = ev < -2 ? "<-2" : ev < 0 ? "-2..0" : ev < 2 ? "0..2" : ">2";
    buckets[k as keyof typeof buckets]++;
    if ((i + 1) % 20 === 0) {
      console.log(`  [${i + 1}/${T.length}] ${spot.scenarioLabel} → EV ${spot.expected.evBb} bb`);
    }
  }
  const band = spots.filter((s) => Math.abs(s.expected.evBb) <= 2).length;
  console.log(`\n✓ ${spots.length} spots en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Distribution EV : ${JSON.stringify(buckets)}`);
  console.log(`  Bande ±2 bb : ${band} (${((band / spots.length) * 100).toFixed(1)}%)`);
  const outPath = path.join(process.cwd(), "content", "spots", "m3-3.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
