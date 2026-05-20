/**
 * Structures de payouts MTT canoniques.
 * Tous les pourcentages sont normalisés à 100.
 */

export interface PayoutStructure {
  slug: string;
  label: string;
  /** Nombre total de joueurs dans le tournoi (utilisé pour la doc). */
  totalPlayers: number;
  /** Pourcentages du prizepool par position (index 0 = 1ère place). */
  payouts: number[];
  category: "winner-takes-all" | "flat" | "standard" | "satellite";
}

export const CANONICAL_PAYOUTS: PayoutStructure[] = [
  {
    slug: "wta-2",
    label: "Heads-up WTA",
    totalPlayers: 2,
    payouts: [100],
    category: "winner-takes-all",
  },
  {
    slug: "sng-9-standard",
    label: "Sit & go 9-max (50/30/20)",
    totalPlayers: 9,
    payouts: [50, 30, 20],
    category: "standard",
  },
  {
    slug: "sng-6-standard",
    label: "Sit & go 6-max (65/35)",
    totalPlayers: 6,
    payouts: [65, 35],
    category: "standard",
  },
  {
    slug: "ft-9-standard",
    label: "Table finale 9 joueurs (MTT standard)",
    totalPlayers: 9,
    payouts: [30, 20, 14, 10, 8, 6, 5, 4, 3],
    category: "standard",
  },
  {
    slug: "bubble-18-3paid",
    label: "Bulle 18 joueurs, 3 payés (50/30/20)",
    totalPlayers: 18,
    payouts: [50, 30, 20],
    category: "standard",
  },
  {
    slug: "near-ft-10-9paid",
    label: "Bulle FT (10 restants, 9 payés)",
    totalPlayers: 10,
    payouts: [30, 20, 14, 10, 8, 6, 5, 4, 3],
    category: "standard",
  },
  {
    slug: "satellite-5tickets",
    label: "Satellite 5 tickets égaux",
    totalPlayers: 50,
    payouts: [20, 20, 20, 20, 20],
    category: "satellite",
  },
  {
    slug: "flat-15percent",
    label: "MTT flat (top 15 %)",
    totalPlayers: 100,
    payouts: [14, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 4, 3, 3],
    category: "flat",
  },
];

export function getPayout(slug: string): PayoutStructure | undefined {
  return CANONICAL_PAYOUTS.find((p) => p.slug === slug);
}
