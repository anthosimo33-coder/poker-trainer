import { generatePotOddsSpot } from "./m1-1-pot-odds";
import { generatePotOddsConversionSpot } from "./m1-2-conversion";
import { generateImpliedOddsSpot } from "./m1-3-implied";
import { generateReverseImpliedSpot } from "./m1-4-reverse-implied";
import { generateOutsSpot } from "./m2-1-outs";
import { generateEquitySpot } from "./m2-2-equity";
import { generateMultiwaySpot } from "./m2-3-multiway";
import { generateVsRangeSpot } from "./m2-4-vs-range";
import { generatePushFoldSpot } from "./m3-1-push-fold";
import type { GenericSpot } from "./types";

export const SPOT_GENERATORS: Record<string, () => GenericSpot> = {
  "m1.1": generatePotOddsSpot,
  "m1.2": generatePotOddsConversionSpot,
  "m1.3": generateImpliedOddsSpot,
  "m1.4": generateReverseImpliedSpot,
  "m2.1": generateOutsSpot,
  "m2.2": generateEquitySpot,
  "m2.3": generateMultiwaySpot,
  "m2.4": generateVsRangeSpot,
  "m3.1": generatePushFoldSpot,
};

export function getGenerator(submoduleSlug: string): (() => GenericSpot) | null {
  return SPOT_GENERATORS[submoduleSlug] ?? null;
}
