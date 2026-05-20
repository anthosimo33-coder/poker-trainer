/**
 * ICM (Independent Chip Model) — calcul d'équité $ à partir des stacks et payouts.
 *
 * Algorithme : Malmuth-Harville récursif.
 * Formule : P(joueur i finit en position k) = stack_i / total_chips_restants
 *           * P(joueur i finit en position k-1 parmi les autres)
 *
 * Limite : factoriel sur le nombre de places payées.
 * Pour 9 joueurs / 6 places payées : 9!/3! = 60 480 permutations. Tractable.
 * Pour 9 joueurs / 9 places payées : 9! = 362 880. Lent mais OK en pré-calcul.
 */

export interface ICMPlayer {
  /** Identifiant (ex. "hero", "villain1", ou nom). */
  id: string;
  /** Stack en chips. */
  stack: number;
}

export interface ICMResult {
  /** Pour chaque joueur, son équité $ (en valeur absolue, même unité que payouts). */
  equities: Record<string, number>;
  /** Probabilités finales par position [joueur][position]. */
  finishProbs: Record<string, number[]>;
  /** Total des équités (sanity check : doit ≈ somme des payouts). */
  totalEquity: number;
}

/**
 * Calcule l'équité ICM de chaque joueur.
 *
 * @param players - Joueurs avec stacks
 * @param payouts - Tableau de payouts, indexé par position (payouts[0] = 1ère place)
 * @returns Équités $ par joueur
 */
export function icmEquity(players: ICMPlayer[], payouts: number[]): ICMResult {
  if (players.length === 0) {
    throw new Error("players ne peut être vide");
  }
  if (payouts.length === 0) {
    throw new Error("payouts ne peut être vide");
  }

  const activePlayers = players.filter((p) => p.stack > 0);
  if (activePlayers.length === 0) {
    throw new Error("Aucun joueur avec stack > 0");
  }

  const numPlaces = Math.min(payouts.length, activePlayers.length);

  // finishProbs[playerId][position] = probabilité que ce joueur finisse à cette position
  const finishProbs: Record<string, number[]> = {};
  for (const p of activePlayers) {
    finishProbs[p.id] = new Array(activePlayers.length).fill(0);
  }

  // Récursion Malmuth-Harville
  // À chaque profondeur d, on considère "qui finit à la position d ?"
  // Position 0 = 1ère place (gagnant)
  function recurse(remainingPlayers: ICMPlayer[], currentPosition: number, pathProb: number): void {
    if (currentPosition >= numPlaces || remainingPlayers.length === 0) {
      return;
    }
    const totalRemaining = remainingPlayers.reduce((acc, p) => acc + p.stack, 0);
    if (totalRemaining === 0) return;

    for (const player of remainingPlayers) {
      const probThisFinish = player.stack / totalRemaining;
      const cumulativeProb = pathProb * probThisFinish;
      finishProbs[player.id][currentPosition] += cumulativeProb;
      const nextRemaining = remainingPlayers.filter((p) => p.id !== player.id);
      recurse(nextRemaining, currentPosition + 1, cumulativeProb);
    }
  }

  recurse(activePlayers, 0, 1.0);

  // Équité $ : équité_i = Σ payout_k × P(joueur_i finit en position k)
  const equities: Record<string, number> = {};
  for (const player of activePlayers) {
    let eq = 0;
    for (let pos = 0; pos < numPlaces; pos++) {
      eq += (payouts[pos] || 0) * finishProbs[player.id][pos];
    }
    equities[player.id] = eq;
  }

  // Joueurs inactifs : équité 0
  for (const player of players) {
    if (!(player.id in equities)) {
      equities[player.id] = 0;
      finishProbs[player.id] = new Array(activePlayers.length).fill(0);
    }
  }

  const totalEquity = Object.values(equities).reduce((acc, e) => acc + e, 0);

  return { equities, finishProbs, totalEquity };
}

/**
 * Helper : équité $ d'un joueur spécifique en pourcentage du prizepool.
 */
export function icmEquityPercent(
  players: ICMPlayer[],
  payouts: number[],
  playerId: string
): number {
  const result = icmEquity(players, payouts);
  const totalPrizepool = payouts.reduce((acc, p) => acc + p, 0);
  if (totalPrizepool === 0) return 0;
  return (result.equities[playerId] / totalPrizepool) * 100;
}

/**
 * Helper : chip equity (équité naïve si chips = $).
 */
export function chipEquityPercent(players: ICMPlayer[], playerId: string): number {
  const total = players.reduce((acc, p) => acc + p.stack, 0);
  if (total === 0) return 0;
  const player = players.find((p) => p.id === playerId);
  if (!player) return 0;
  return (player.stack / total) * 100;
}

/**
 * Bubble factor : ratio entre risque ICM et reward ICM lors d'un push/call.
 *
 * Définition :
 *   BF = (équity_ICM_perdue_si_lose) / (équity_ICM_gagnée_si_win)
 *
 * En cash, BF = 1 (perdre 1 unité = gagner 1 unité de valeur). En bulle, BF > 1
 * (parfois 1.3 à 2.5). Plus le bubble factor est élevé, plus tu dois être
 * prudent dans tes calls.
 *
 * L'équité requise pour break-even passe de :
 *   eq_chip_required = call / (pot + call) (pot odds standards)
 * À :
 *   eq_icm_required = lossIfLose / (gainIfWin + lossIfLose)
 *                   = BF / (BF + 1)
 */
export interface BubbleFactorParams {
  /** Joueurs avec stacks AVANT la décision. */
  players: ICMPlayer[];
  /** Payouts du tournoi (% du prizepool). */
  payouts: number[];
  /** Identifiant du joueur qui pousse (ou est confronté au push). */
  heroId: string;
  /** Identifiant du joueur adverse. */
  villainId: string;
  /** Taille du push en chips (= stack pushé). */
  pushAmount: number;
}

export interface BubbleFactorResult {
  /** Le bubble factor (ratio risk/reward). */
  bubbleFactor: number;
  /** Équité requise en chips (pot odds standards, en %). */
  requiredEquityChip: number;
  /** Équité requise en ICM (plus haute en bulle, en %). */
  requiredEquityICM: number;
  /** Équité ICM hero AVANT la décision (en %). */
  heroEquityBefore: number;
  /** Équité ICM hero SI il call et gagne (en %). */
  heroEquityIfWin: number;
  /** Équité ICM hero SI il call et perd (en %, 0 si tapis bust). */
  heroEquityIfLose: number;
  /** Détails pédagogiques (en pts %). */
  breakdown: {
    icmGainIfWin: number;
    icmLossIfLose: number;
  };
}

export function bubbleFactor(params: BubbleFactorParams): BubbleFactorResult {
  const { players, payouts, heroId, villainId, pushAmount } = params;

  const heroPlayer = players.find((p) => p.id === heroId);
  const villainPlayer = players.find((p) => p.id === villainId);
  if (!heroPlayer || !villainPlayer) {
    throw new Error("Hero ou villain introuvable");
  }
  const effective = Math.min(heroPlayer.stack, villainPlayer.stack);
  const actualPush = Math.min(pushAmount, effective);

  const totalPrizepool = payouts.reduce((acc, p) => acc + p, 0);

  // 1. Équité ICM AVANT la décision
  const equitiesBefore = icmEquity(players, payouts);
  const heroEquityBefore = (equitiesBefore.equities[heroId] / totalPrizepool) * 100;

  // 2. Scénario WIN : hero gagne le push de villain
  const playersIfWin = players.map((p) => {
    if (p.id === heroId) return { ...p, stack: p.stack + actualPush };
    if (p.id === villainId) return { ...p, stack: p.stack - actualPush };
    return p;
  });
  const equitiesIfWin = icmEquity(playersIfWin, payouts);
  const heroEquityIfWin = (equitiesIfWin.equities[heroId] / totalPrizepool) * 100;

  // 3. Scénario LOSE : hero perd le push (potentiellement bust)
  const playersIfLose = players.map((p) => {
    if (p.id === heroId) {
      const newStack = p.stack - actualPush;
      return { ...p, stack: Math.max(0, newStack) };
    }
    if (p.id === villainId) return { ...p, stack: p.stack + actualPush };
    return p;
  });
  const equitiesIfLose = icmEquity(playersIfLose, payouts);
  const heroEquityIfLose = (equitiesIfLose.equities[heroId] / totalPrizepool) * 100;

  // 4. Calcul du bubble factor
  const icmGainIfWin = heroEquityIfWin - heroEquityBefore;
  const icmLossIfLose = heroEquityBefore - heroEquityIfLose;

  let bf: number;
  if (icmGainIfWin <= 0.0001) {
    // Edge case : pas de gain ICM possible (déjà max) → on plafonne à 10
    bf = 10;
  } else {
    bf = icmLossIfLose / icmGainIfWin;
    // Bornage défensif [1, 10] pour rester pédagogique
    bf = Math.max(1, Math.min(10, bf));
  }

  // 5. Équité chip requise : approximation pot odds standard.
  //    Pour un call all-in : on risque actualPush pour gagner pot ≈ actualPush + 1.5 bb
  //    (1.5 bb = blinds approximatives). eq_chip = call / (pot_final) où pot_final = 2×push + 1.5.
  //    Cette approximation suffit pour M4.2 où l'enjeu est le ratio chip/ICM, pas la précision absolue.
  const requiredEquityChip = (actualPush / (2 * actualPush + 1.5)) * 100;

  // 6. Équité ICM requise : eq tel que EV_icm_call = 0
  //    eq × gainIfWin = (1 - eq) × lossIfLose
  //    eq = lossIfLose / (gainIfWin + lossIfLose) = BF / (BF + 1)
  let requiredEquityICM: number;
  if (icmGainIfWin + icmLossIfLose <= 0.0001) {
    requiredEquityICM = 50;
  } else {
    requiredEquityICM = (icmLossIfLose / (icmGainIfWin + icmLossIfLose)) * 100;
  }

  return {
    bubbleFactor: bf,
    requiredEquityChip,
    requiredEquityICM,
    heroEquityBefore,
    heroEquityIfWin,
    heroEquityIfLose,
    breakdown: {
      icmGainIfWin,
      icmLossIfLose,
    },
  };
}

/**
 * Helper : équité ICM requise pour break-even sur un call all-in.
 */
export function requiredEquityICMForCall(params: BubbleFactorParams): number {
  return bubbleFactor(params).requiredEquityICM;
}

/**
 * Décision ICM : étant donnée une équity vs range adverse, le call est-il +EV en ICM ?
 */
export function icmDecisionCall(
  params: BubbleFactorParams & { actualEquity: number }
): {
  shouldCall: boolean;
  marginPts: number; // écart en points : positif = +EV, négatif = -EV
  requiredEquityICM: number;
} {
  const bf = bubbleFactor(params);
  const margin = params.actualEquity - bf.requiredEquityICM;
  return {
    shouldCall: margin >= 0,
    marginPts: margin,
    requiredEquityICM: bf.requiredEquityICM,
  };
}
