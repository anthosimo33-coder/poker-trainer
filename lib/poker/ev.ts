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

/**
 * M3.2 — P(fold) minimum pour qu'un push soit break-even (EV = 0).
 *
 * Inversion de la formule M3.1 :
 *   0 = pFold × pot + (1 − pFold) × evIfCall
 *   pFold = −evIfCall / (pot − evIfCall)
 *
 * Si evIfCall ≥ 0 (le call lui-même est +EV), pFold break-even = 0 : le push
 * est profitable même si le vilain call 100 % du temps. Si evIfCall < 0, on a
 * besoin de fold equity pour compenser — plus la main est faible, plus le seuil
 * monte. pFoldBreakEven est clampé [0, 1].
 */
export function breakEvenPFold(params: {
  heroCards: [Card, Card];
  heroStack: number;
  villainStack: number;
  potBefore: number;
  villainCallRange: Combo[];
  iterations?: number;
}): { pFoldBreakEven: number; evIfCall: number; equityVsCallRange: number } {
  const {
    heroCards,
    heroStack,
    villainStack,
    potBefore,
    villainCallRange,
    iterations = 1200,
  } = params;
  const callAmount = Math.min(heroStack, villainStack);

  let equityVsCallPct = 0;
  if (villainCallRange.length > 0) {
    equityVsCallPct = equityVsRange(heroCards, villainCallRange, [], iterations).equity;
  }
  const equity = equityVsCallPct / 100;

  const netGainIfWin = potBefore + callAmount;
  const lossIfLose = callAmount;
  const evIfCall = equity * netGainIfWin - (1 - equity) * lossIfLose;

  let pFoldBreakEven: number;
  if (evIfCall >= 0) {
    pFoldBreakEven = 0;
  } else {
    pFoldBreakEven = -evIfCall / (potBefore - evIfCall);
    pFoldBreakEven = Math.max(0, Math.min(1, pFoldBreakEven));
  }

  return { pFoldBreakEven, evIfCall, equityVsCallRange: equityVsCallPct };
}

/**
 * Fold equity requise (en % du temps) pour break-even. Plus parlant que la
 * probabilité brute (wrapper de `breakEvenPFold`).
 */
export function requiredFoldEquity(params: Parameters<typeof breakEvenPFold>[0]): number {
  return breakEvenPFold(params).pFoldBreakEven * 100;
}

/**
 * M3.3 — une branche d'un arbre de décision pondéré (le vilain prend l'action
 * `label` avec probabilité `probability`, EV de hero conditionnelle `evIfBranch`).
 */
export interface EVBranch {
  label: string;
  probability: number;
  evIfBranch: number;
}

/**
 * EV totale d'une décision à N branches : moyenne pondérée `Σ Pᵢ × EVᵢ`.
 * Les probabilités doivent sommer à 1 (± 0.01) sinon on lance une erreur.
 */
export function evMultiBranch(branches: EVBranch[]): { evBb: number; branches: EVBranch[] } {
  const sumP = branches.reduce((acc, b) => acc + b.probability, 0);
  if (Math.abs(sumP - 1) > 0.01) {
    throw new Error(`Probabilités branches ne somment pas à 1 : ${sumP}`);
  }
  const evBb = branches.reduce((acc, b) => acc + b.probability * b.evIfBranch, 0);
  return { evBb, branches };
}

/**
 * EV d'un 3-bet preflop face à 3 branches (fold / call / 4-bet).
 *
 * - fold  : on gagne le pot avant 3-bet (open + blinds)
 * - call  : EV postflop simplifiée — equity réalisée (× realizationFactor) vs le
 *           call range, en supposant un jeu all-in à terme
 * - 4-bet : hero fold (cas simple), perd la taille de son 3-bet
 *
 * realizationFactor (défaut 0.85) : on ne réalise jamais 100 % de son equity
 * postflop hors de position / sans initiative ; 80-90 % est l'ordre de grandeur.
 */
export function ev3BetVs3Branches(params: {
  pFold: number;
  pCall: number;
  pFourBet: number;
  potBefore3Bet: number;
  threeBetSize: number;
  potIfCall: number;
  equityVsCallRange: number;
  effectiveStackPostflop: number;
  realizationFactor?: number;
}): { evBb: number; branches: EVBranch[] } {
  const {
    pFold,
    pCall,
    pFourBet,
    potBefore3Bet,
    threeBetSize,
    potIfCall,
    equityVsCallRange,
    effectiveStackPostflop,
    realizationFactor = 0.85,
  } = params;

  if (Math.abs(pFold + pCall + pFourBet - 1) > 0.01) {
    throw new Error("p_fold + p_call + p_4bet doit sommer à 1");
  }

  const evFold = potBefore3Bet;

  const effectiveEquity = equityVsCallRange * realizationFactor;
  const ourInvestPost = effectiveStackPostflop;
  const evCall =
    effectiveEquity * (potIfCall + ourInvestPost) - (1 - effectiveEquity) * ourInvestPost;

  const evFourBet = -threeBetSize;

  const branches: EVBranch[] = [
    { label: "fold", probability: pFold, evIfBranch: evFold },
    { label: "call", probability: pCall, evIfBranch: evCall },
    { label: "4-bet", probability: pFourBet, evIfBranch: evFourBet },
  ];

  return evMultiBranch(branches);
}
