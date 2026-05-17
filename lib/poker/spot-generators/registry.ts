import { generatePotOddsSpot } from "./m1-1-pot-odds";
import { generatePotOddsConversionSpot } from "./m1-2-conversion";
import { generateImpliedOddsSpot } from "./m1-3-implied";
import { generateReverseImpliedSpot } from "./m1-4-reverse-implied";
import { generateOutsSpot } from "./m2-1-outs";
import type { GenericSpot } from "./types";

export const SPOT_GENERATORS: Record<string, () => GenericSpot> = {
  "m1.1": generatePotOddsSpot,
  "m1.2": generatePotOddsConversionSpot,
  "m1.3": generateImpliedOddsSpot,
  "m1.4": generateReverseImpliedSpot,
  "m2.1": generateOutsSpot,
};

export function getGenerator(submoduleSlug: string): (() => GenericSpot) | null {
  return SPOT_GENERATORS[submoduleSlug] ?? null;
}
