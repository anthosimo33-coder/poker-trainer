import { generatePotOddsSpot } from "./m1-1-pot-odds";
import { generatePotOddsConversionSpot } from "./m1-2-conversion";
import { generateImpliedOddsSpot } from "./m1-3-implied";
import { generateReverseImpliedSpot } from "./m1-4-reverse-implied";
import { generateOutsSpot } from "./m2-1-outs";
import { generateEquitySpot } from "./m2-2-equity";
import { generateMultiwaySpot } from "./m2-3-multiway";
import { generateVsRangeSpot } from "./m2-4-vs-range";
import { generatePushFoldSpot } from "./m3-1-push-fold";
import { generateFoldEquitySpot } from "./m3-2-fold-equity";
import { generateMultiBranchSpot } from "./m3-3-multibranch";
import { generateCheckRaiseSpot } from "./m3-4-check-raise";
import { generateICMSpot } from "./m4-1-icm";
import { generateBubbleFactorSpot } from "./m4-2-bubble-factor";
import { generatePositionBubbleFactorSpot } from "./m4-3-position-bf";
import { generateFinalTableSpot } from "./m4-4-final-table";
import { generateNashPushSpot } from "./m5-1-nash-push";
import { generateBBCallSpot } from "./m5-2-bb-call";
import { generateBTNPushSpot } from "./m5-3-btn-push";
import { generatePositionDefenseSpot } from "./m5-4-position-defense";
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
  "m3.2": generateFoldEquitySpot,
  "m3.3": generateMultiBranchSpot,
  "m3.4": generateCheckRaiseSpot,
  "m4.1": generateICMSpot,
  "m4.2": generateBubbleFactorSpot,
  "m4.3": generatePositionBubbleFactorSpot,
  "m4.4": generateFinalTableSpot,
  "m5.1": generateNashPushSpot,
  "m5.2": generateBBCallSpot,
  "m5.3": generateBTNPushSpot,
  "m5.4": generatePositionDefenseSpot,
};

export function getGenerator(submoduleSlug: string): (() => GenericSpot) | null {
  return SPOT_GENERATORS[submoduleSlug] ?? null;
}
