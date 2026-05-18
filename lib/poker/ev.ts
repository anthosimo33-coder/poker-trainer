import type { Card } from "./cards";
import type { Combo } from "./range-parser";
import { equityVsRange } from "./equity";

/**
 * Résultat d'un calcul d'EV (push all-in preflop).
 */
export interface EVResult {
  /** EV nette en bb (positive = profitable, négative = perdant). */
  evBb: number;
  /** Probabilité que le vilain fold (0-1). */
  pFold: number;
  /** Probabilité que le vilain call (0-1). */
  pCall: number;
  /** Equity de hero vs le call range du vilain (en %). */
  equityVsCallRange: number;
  /** Détails du calcul (pour pédagogie). */
  breakdown: {
    gainIfFold: number;
    potIfCall: number;
    netGainIfWin: number;
    lossIfLose: number;
  };
}

/**
 * EV d'un push all-in preflop.
 *
 *   EV = P(fold) × pot_avant_push
 *      + P(call) × [equity_vs_call_range × net_gain_if_win − (1 − equity) × call_amount]
 *
 * Écart vs spec (flaggé) : le spec hardcodait `equityVsRange(..., 5_000)`. Avec
 * ~46 combos ce serait ~12 s → dépasse le timeout vitest 5 s (cf. S6d) et rend
 * le pré-calcul de ~120 spots intraitable. On expose `iterations` (défaut 1200) ;
 * la moyenne sur N combos lisse la variance MC (σ_agrégé ≈ 0.2 %).
 */
export function evPushAllIn(params: {
  heroCards: [Card, Card];
  heroStack: number;
  villainStack: number;
  potBefore: number;
  villainCallRange: Combo[];
  villainTotalRange?: Combo[];
  iterations?: number;
}): EVResult {
  const {
    heroCards,
    heroStack,
    villainStack,
    potBefore,
    villainCallRange,
    villainTotalRange,
    iterations = 1200,
  } = params;

  // 1. Bornes du call amount (limité au plus petit stack)
  const callAmount = Math.min(heroStack, villainStack);

  // 2. P(fold)
  let pFold: number;
  if (villainTotalRange && villainTotalRange.length > 0) {
    pFold = 1 - villainCallRange.length / villainTotalRange.length;
  } else {
    // Range total par défaut ≈ 30 % du deck (~397 combos sur 1326).
    pFold = 1 - villainCallRange.length / 397;
  }
  pFold = Math.max(0, Math.min(1, pFold));
  const pCall = 1 - pFold;

  // 3. Equity de hero vs le call range
  let equityVsCallPct = 0;
  if (villainCallRange.length > 0) {
    equityVsCallPct = equityVsRange(heroCards, villainCallRange, [], iterations).equity;
  }
  const equityVsCall = equityVsCallPct / 100;

  // 4. EV
  const potFinal = potBefore + 2 * callAmount;
  const gainIfFold = potBefore;
  const netGainIfWin = potBefore + callAmount;
  const lossIfLose = callAmount;

  const evIfCall = equityVsCall * netGainIfWin - (1 - equityVsCall) * lossIfLose;
  const evBb = pFold * gainIfFold + pCall * evIfCall;

  return {
    evBb,
    pFold,
    pCall,
    equityVsCallRange: equityVsCallPct,
    breakdown: {
      gainIfFold,
      potIfCall: potFinal,
      netGainIfWin,
      lossIfLose,
    },
  };
}

/**
 * EV d'un call all-in face à un push adverse (main précise vs push range).
 */
export function evCallAllIn(params: {
  heroCards: [Card, Card];
  callAmount: number;
  potBefore: number;
  villainPushRange: Combo[];
  iterations?: number;
}): { evBb: number; equityVsPushRange: number } {
  const { heroCards, callAmount, potBefore, villainPushRange, iterations = 1200 } = params;

  let equityPct = 0;
  if (villainPushRange.length > 0) {
    equityPct = equityVsRange(heroCards, villainPushRange, [], iterations).equity;
  }
  const eq = equityPct / 100;

  const netGainIfWin = potBefore;
  const lossIfLose = callAmount;
  const evBb = eq * netGainIfWin - (1 - eq) * lossIfLose;

  return { evBb, equityVsPushRange: equityPct };
}

/**
 * Equité requise minimale pour qu'un call soit break-even.
 *   = call_amount / (pot_before + call_amount)
 */
export function requiredEquityForCall(callAmount: number, potBefore: number): number {
  return callAmount / (potBefore + callAmount);
}
