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
