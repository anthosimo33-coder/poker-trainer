import type { PotOddsSpot } from "./m1-1-pot-odds";
import type { PotOddsConversionSpot } from "./m1-2-conversion";
import type { ImpliedOddsSpot } from "./m1-3-implied";
import type { ReverseImpliedSpot } from "./m1-4-reverse-implied";

export type GenericSpot =
  | PotOddsSpot
  | PotOddsConversionSpot
  | ImpliedOddsSpot
  | ReverseImpliedSpot;

/**
 * Champs minimum présents sur tous les spots (pour un affichage générique de table).
 */
export interface BaseSpotShape {
  id: string;
  submoduleSlug: string;
  heroCards: [string, string];
  board: [string, string, string];
  potBb: number;
  betBb: number;
  effectiveStackBb: number;
  heroPosition: string;
  villainPosition: string;
  expected: Record<string, number>;
}
