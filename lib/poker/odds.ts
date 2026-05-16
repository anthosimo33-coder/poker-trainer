/**
 * Calculs de cotes (pot odds) et equity requise.
 * Module fondamental du M·I (Pot odds & cotes implicites).
 *
 * Toutes les valeurs monétaires sont des nombres bruts (peu importe l'unité : bb, $, jetons).
 * Les pourcentages sont en valeurs 0-100 (pas 0-1).
 */

export interface PotOddsInput {
  /** Taille du pot AVANT la mise du vilain. */
  pot: number;
  /** Mise du vilain face à laquelle tu dois décider. */
  bet: number;
}

export interface PotOddsResult {
  /** Ratio "pot:bet" sous forme "X to 1" (ex. 2.25 pour pot 4.5 / bet 2). */
  ratio: number;
  /** Equity requise en pourcentage (0-100) pour que le call soit break-even. */
  requiredEquity: number;
  /** Pot final après ton call (pot + bet + bet). */
  finalPot: number;
  /** Le montant que tu dois payer (= bet). */
  toCall: number;
}

/**
 * Calcule la cote du pot et l'equity requise pour caller.
 *
 * Formule canonique :
 *   - Ratio = (pot + bet) / bet
 *   - Equity requise = bet / (pot + 2 × bet)
 *
 * @throws si pot ou bet est négatif, ou si bet est 0.
 */
export function potOdds({ pot, bet }: PotOddsInput): PotOddsResult {
  if (pot < 0) throw new Error("Le pot ne peut pas être négatif.");
  if (bet <= 0) throw new Error("La mise doit être strictement positive.");

  const finalPot = pot + 2 * bet;
  const ratio = (pot + bet) / bet;
  const requiredEquity = (bet / finalPot) * 100;

  return {
    ratio,
    requiredEquity,
    finalPot,
    toCall: bet,
  };
}

export interface CallDecisionInput extends PotOddsInput {
  /** Ton equity estimée en pourcentage (0-100). */
  estimatedEquity: number;
}

export type CallDecision = "call" | "fold" | "indifferent";

export interface CallDecisionResult extends PotOddsResult {
  /** Décision recommandée. */
  decision: CallDecision;
  /** Edge = estimatedEquity - requiredEquity. Positif = +EV. */
  edge: number;
  /** EV du call en valeur absolue (positive = profitable). */
  evCall: number;
}

/**
 * Détermine si caller est +EV étant donné une equity estimée.
 *
 * EV du call = (equity × pot après call) - ((1-equity) × bet à payer)
 *            = (equity × (pot + 2×bet)) - bet
 *
 * @param tolerance Marge d'indifférence en points (default 0.5).
 *                  Si |edge| < tolerance, la décision est "indifferent".
 */
export function evaluateCall(
  input: CallDecisionInput,
  tolerance = 0.5
): CallDecisionResult {
  const base = potOdds(input);
  const equity = input.estimatedEquity / 100;
  const evCall = equity * base.finalPot - input.bet;
  const edge = input.estimatedEquity - base.requiredEquity;

  let decision: CallDecision;
  if (Math.abs(edge) < tolerance) decision = "indifferent";
  else if (edge > 0) decision = "call";
  else decision = "fold";

  return { ...base, decision, edge, evCall };
}

export interface ImpliedOddsInput extends PotOddsInput {
  /** Equity réelle (objective) en pourcentage. */
  realEquity: number;
  /** Stack effectif restant après ce call (pour estimer le gain futur potentiel). */
  effectiveStack: number;
}

/**
 * Calcule les implied odds : combien de jetons supplémentaires tu dois gagner
 * en moyenne sur les streets futures pour que le call devienne break-even,
 * lorsque l'equity actuelle ne suffit pas.
 *
 * Retourne 0 si l'equity actuelle suffit déjà (pas besoin d'implied).
 *
 * Note : `effectiveStack` fait partie du contrat d'entrée (plafond théorique du
 * gain futur, exploité par les sous-modules ultérieurs) mais n'intervient pas
 * dans le calcul break-even de base — il n'est donc pas déstructuré ici.
 */
export function impliedOdds({
  pot,
  bet,
  realEquity,
}: ImpliedOddsInput): { neededExtra: number; impliedRatio: number } {
  const base = potOdds({ pot, bet });
  const equity = realEquity / 100;
  if (realEquity >= base.requiredEquity) {
    return { neededExtra: 0, impliedRatio: 0 };
  }
  // Soit X le gain futur moyen. Pour break-even :
  //   equity * (finalPot + X) - (1 - equity) * bet >= 0
  //   X >= (bet - equity * finalPot - equity * bet) / equity ... simplification :
  //   X >= bet / equity - finalPot - bet  (équivalent algebrique)
  // Plus simple et plus correct :
  //   equity * (finalPot + X) = bet
  //   X = bet / equity - finalPot
  const neededExtra = bet / equity - base.finalPot;
  const impliedRatio = neededExtra / bet;
  return {
    neededExtra: Math.max(0, neededExtra),
    impliedRatio: Math.max(0, impliedRatio),
  };
}
