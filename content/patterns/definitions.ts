/**
 * Catalogue centralisé des *patterns* de jeu, par sous-module.
 *
 * Un pattern est une coupe pédagogique d'un sous-module selon une dimension
 * (profondeur de stack, classe de main, type de scénario, position, …). Chaque
 * pattern porte un prédicat `matchSpot` qui dit si un spot (donc l'attempt qui
 * en découle) appartient au pattern. Ces patterns sont l'unité de granularité
 * du SM-2 (révision espacée) et du leak detection.
 *
 * Contrainte d'embarquabilité Convex : les imports de TYPES utilisent l'alias
 * `@/` (effacés à la compilation), l'unique import de VALEUR (`classifyHand`)
 * utilise un chemin relatif (résolu par l'esbuild de Convex).
 */
import { classifyHand, type HandClass } from "../../lib/poker/hand-classifier";
import type { GenericSpot } from "@/lib/poker/spot-generators/types";
import type { PotOddsSpot } from "@/lib/poker/spot-generators/m1-1-pot-odds";
import type { PotOddsConversionSpot } from "@/lib/poker/spot-generators/m1-2-conversion";
import type { ImpliedOddsSpot } from "@/lib/poker/spot-generators/m1-3-implied";
import type { ReverseImpliedSpot } from "@/lib/poker/spot-generators/m1-4-reverse-implied";
import type { OutsSpot } from "@/lib/poker/spot-generators/m2-1-outs";
import type { EquitySpot } from "@/lib/poker/spot-generators/m2-2-equity";
import type { MultiwaySpot } from "@/lib/poker/spot-generators/m2-3-multiway";
import type { VsRangeSpot } from "@/lib/poker/spot-generators/m2-4-vs-range";
import type { PushFoldSpot } from "@/lib/poker/spot-generators/m3-1-push-fold";
import type { FoldEquitySpot } from "@/lib/poker/spot-generators/m3-2-fold-equity";
import type { MultiBranchSpot } from "@/lib/poker/spot-generators/m3-3-multibranch";
import type { CheckRaiseSpot } from "@/lib/poker/spot-generators/m3-4-check-raise";
import type { ICMSpot } from "@/lib/poker/spot-generators/m4-1-icm";
import type { BubbleFactorSpot } from "@/lib/poker/spot-generators/m4-2-bubble-factor";
import type { PositionBubbleFactorSpot } from "@/lib/poker/spot-generators/m4-3-position-bf";
import type { FinalTableSpot } from "@/lib/poker/spot-generators/m4-4-final-table";
import type { NashPushSpot } from "@/lib/poker/spot-generators/m5-1-nash-push";
import type { BBCallSpot } from "@/lib/poker/spot-generators/m5-2-bb-call";
import type { BTNPushSpot } from "@/lib/poker/spot-generators/m5-3-btn-push";
import type { PositionDefenseSpot } from "@/lib/poker/spot-generators/m5-4-position-defense";

export type PatternDimension =
  | "stack_depth"
  | "hand_class"
  | "scenario_type"
  | "position"
  | "range_type"
  | "equity_band"
  | "street";

export interface PatternDefinition {
  /** Identifiant unique stable (ex. "m5-1-stack-10bb"). */
  patternId: string;
  /** Sous-module d'appartenance (slug DB, ex. "m5.1"). */
  submoduleSlug: string;
  dimension: PatternDimension;
  /** Valeur de la dimension (ex. "10bb", "ax-offsuit-small"). */
  value: string;
  /** Libellé court pour l'UI. */
  label: string;
  /** Explication pédagogique. */
  description: string;
  /** Vrai si l'attempt issu de ce spot appartient au pattern. */
  matchSpot: (spot: GenericSpot) => boolean;
}

/**
 * Sous-module d'un spot. Tous les spots portent `submoduleSlug` SAUF le
 * PotOddsSpot (M1.1), seul membre de l'union sans ce champ.
 */
export function submoduleOf(spot: GenericSpot): string {
  return "submoduleSlug" in spot ? spot.submoduleSlug : "m1.1";
}

/**
 * Fabrique un prédicat `matchSpot` : vérifie d'abord le sous-module (sûr même
 * appelé sur un spot d'un autre sous-module), puis applique `pred` sur le spot
 * narrowé vers le type concret `T`.
 */
function match<T extends GenericSpot>(
  slug: string,
  pred: (s: T) => boolean
): (s: GenericSpot) => boolean {
  return (s) => submoduleOf(s) === slug && pred(s as T);
}

const isAx = (cls: HandClass): boolean => cls.startsWith("ax-");
const isBroadwayish = (cls: HandClass): boolean =>
  cls === "premium-broadway" || cls === "broadway-suited" || cls === "broadway-offsuit";

export const PATTERNS: PatternDefinition[] = [
  // ============================== M1.1 — Pot odds basiques ==============================
  {
    patternId: "m1-1-equity-cheap",
    submoduleSlug: "m1.1",
    dimension: "scenario_type",
    value: "cheap-call",
    label: "Call cheap (eq requise < 25 %)",
    description: "Mise faible : l'équité requise est très basse, le call est quasi automatique.",
    matchSpot: match<PotOddsSpot>("m1.1", (s) => s.expected.requiredEquity < 25),
  },
  {
    patternId: "m1-1-equity-marginal",
    submoduleSlug: "m1.1",
    dimension: "scenario_type",
    value: "marginal-call",
    label: "Call marginal (eq requise 25-30 %)",
    description: "Zone de calibration la plus critique : l'erreur de cote coûte cher.",
    matchSpot: match<PotOddsSpot>(
      "m1.1",
      (s) => s.expected.requiredEquity >= 25 && s.expected.requiredEquity < 30
    ),
  },
  {
    patternId: "m1-1-equity-expensive",
    submoduleSlug: "m1.1",
    dimension: "scenario_type",
    value: "expensive-call",
    label: "Call cher (eq requise ≥ 30 %)",
    description: "Grosse mise (jusqu'au pot-bet) : il faut une main solide pour continuer.",
    matchSpot: match<PotOddsSpot>("m1.1", (s) => s.expected.requiredEquity >= 30),
  },
  {
    patternId: "m1-1-bet-small",
    submoduleSlug: "m1.1",
    dimension: "scenario_type",
    value: "small-bet",
    label: "Petite mise (≤ 40 % pot)",
    description: "Sizing faible : reconnaître que la cote offerte est excellente.",
    matchSpot: match<PotOddsSpot>("m1.1", (s) => s.betBb <= s.potBb * 0.4),
  },
  {
    patternId: "m1-1-bet-big",
    submoduleSlug: "m1.1",
    dimension: "scenario_type",
    value: "big-bet",
    label: "Grosse mise (≥ 90 % pot)",
    description: "Overbet ou pot-bet : la cote se dégrade fortement.",
    matchSpot: match<PotOddsSpot>("m1.1", (s) => s.betBb >= s.potBb * 0.9),
  },

  // ============================== M1.2 — Conversion ratio ↔ % ==============================
  {
    patternId: "m1-2-ask-ratio",
    submoduleSlug: "m1.2",
    dimension: "scenario_type",
    value: "ask-ratio",
    label: "Conversion % → ratio",
    description: "On demande la cote sous forme de ratio à partir d'un pourcentage.",
    matchSpot: match<PotOddsConversionSpot>("m1.2", (s) => s.ask === "ratio"),
  },
  {
    patternId: "m1-2-ask-percent",
    submoduleSlug: "m1.2",
    dimension: "scenario_type",
    value: "ask-percent",
    label: "Conversion ratio → %",
    description: "On demande l'équité requise en pourcentage à partir d'un ratio.",
    matchSpot: match<PotOddsConversionSpot>("m1.2", (s) => s.ask === "percent"),
  },
  {
    patternId: "m1-2-eq-low",
    submoduleSlug: "m1.2",
    dimension: "equity_band",
    value: "low",
    label: "Cote basse (< 25 %)",
    description: "Conversions sur cotes généreuses (gros ratios).",
    matchSpot: match<PotOddsConversionSpot>("m1.2", (s) => s.expected.requiredEquity < 25),
  },
  {
    patternId: "m1-2-eq-mid",
    submoduleSlug: "m1.2",
    dimension: "equity_band",
    value: "mid",
    label: "Cote moyenne (25-30 %)",
    description: "Conversions intermédiaires, les plus fréquentes en pratique.",
    matchSpot: match<PotOddsConversionSpot>(
      "m1.2",
      (s) => s.expected.requiredEquity >= 25 && s.expected.requiredEquity < 30
    ),
  },
  {
    patternId: "m1-2-eq-high",
    submoduleSlug: "m1.2",
    dimension: "equity_band",
    value: "high",
    label: "Cote haute (≥ 30 %)",
    description: "Conversions sur petites cotes (ratios proches de 1:1).",
    matchSpot: match<PotOddsConversionSpot>("m1.2", (s) => s.expected.requiredEquity >= 30),
  },

  // ============================== M1.3 — Cotes implicites ==============================
  {
    patternId: "m1-3-draw-weak",
    submoduleSlug: "m1.3",
    dimension: "equity_band",
    value: "weak-draw",
    label: "Tirage faible (< 25 %)",
    description: "Tirage mince : il faut un très gros gain futur pour justifier le call.",
    matchSpot: match<ImpliedOddsSpot>("m1.3", (s) => s.realEquity < 25),
  },
  {
    patternId: "m1-3-draw-medium",
    submoduleSlug: "m1.3",
    dimension: "equity_band",
    value: "medium-draw",
    label: "Tirage moyen (25-40 %)",
    description: "Tirage standard : la cote implicite fait souvent basculer la décision.",
    matchSpot: match<ImpliedOddsSpot>(
      "m1.3",
      (s) => s.realEquity >= 25 && s.realEquity < 40
    ),
  },
  {
    patternId: "m1-3-draw-strong",
    submoduleSlug: "m1.3",
    dimension: "equity_band",
    value: "strong-draw",
    label: "Tirage fort (≥ 40 %)",
    description: "Gros tirage : souvent déjà rentable même sans implicite.",
    matchSpot: match<ImpliedOddsSpot>("m1.3", (s) => s.realEquity >= 40),
  },
  {
    patternId: "m1-3-bet-normal",
    submoduleSlug: "m1.3",
    dimension: "scenario_type",
    value: "normal-bet",
    label: "Mise normale (< pot)",
    description: "Mise sub-pot : la cote brute reste jouable, l'implicite affine.",
    matchSpot: match<ImpliedOddsSpot>("m1.3", (s) => s.betBb < s.potBb * 0.9),
  },
  {
    patternId: "m1-3-bet-big",
    submoduleSlug: "m1.3",
    dimension: "scenario_type",
    value: "big-bet",
    label: "Surmise (≥ pot)",
    description: "Mise pot ou overbet : il faut anticiper un gros paiement futur.",
    matchSpot: match<ImpliedOddsSpot>("m1.3", (s) => s.betBb >= s.potBb * 0.9),
  },

  // ============================== M1.4 — Reverse implied odds ==============================
  {
    patternId: "m1-4-reverse-big",
    submoduleSlug: "m1.4",
    dimension: "scenario_type",
    value: "big-reverse",
    label: "Forte décote (≥ 16 pts)",
    description: "Reverse implied marqué : l'équité apparente surévalue largement la main.",
    matchSpot: match<ReverseImpliedSpot>(
      "m1.4",
      (s) => s.apparentEquity - s.expected.adjustedEquity >= 16
    ),
  },
  {
    patternId: "m1-4-reverse-small",
    submoduleSlug: "m1.4",
    dimension: "scenario_type",
    value: "small-reverse",
    label: "Faible décote (< 16 pts)",
    description: "Reverse implied léger : l'ajustement reste modéré.",
    matchSpot: match<ReverseImpliedSpot>(
      "m1.4",
      (s) => s.apparentEquity - s.expected.adjustedEquity < 16
    ),
  },
  {
    patternId: "m1-4-adj-weak",
    submoduleSlug: "m1.4",
    dimension: "equity_band",
    value: "weak",
    label: "Équité ajustée faible (< 46 %)",
    description: "Après ajustement, la main est derrière ou marginale : prudence.",
    matchSpot: match<ReverseImpliedSpot>("m1.4", (s) => s.expected.adjustedEquity < 46),
  },
  {
    patternId: "m1-4-adj-medium",
    submoduleSlug: "m1.4",
    dimension: "equity_band",
    value: "medium",
    label: "Équité ajustée moyenne (46-54 %)",
    description: "Zone de décision la plus délicate après décote.",
    matchSpot: match<ReverseImpliedSpot>(
      "m1.4",
      (s) => s.expected.adjustedEquity >= 46 && s.expected.adjustedEquity < 54
    ),
  },
  {
    patternId: "m1-4-adj-strong",
    submoduleSlug: "m1.4",
    dimension: "equity_band",
    value: "strong",
    label: "Équité ajustée forte (≥ 54 %)",
    description: "Main qui reste devant malgré la décote : call confortable.",
    matchSpot: match<ReverseImpliedSpot>("m1.4", (s) => s.expected.adjustedEquity >= 54),
  },

  // ============================== M2.1 — Outs & règle 4&2 ==============================
  {
    patternId: "m2-1-street-flop",
    submoduleSlug: "m2.1",
    dimension: "street",
    value: "flop",
    label: "Au flop (×4)",
    description: "Deux cartes à venir : on applique la règle des 4.",
    matchSpot: match<OutsSpot>("m2.1", (s) => s.street === "flop"),
  },
  {
    patternId: "m2-1-street-turn",
    submoduleSlug: "m2.1",
    dimension: "street",
    value: "turn",
    label: "À la turn (×2)",
    description: "Une carte à venir : on applique la règle des 2.",
    matchSpot: match<OutsSpot>("m2.1", (s) => s.street === "turn"),
  },
  {
    patternId: "m2-1-draw-big",
    submoduleSlug: "m2.1",
    dimension: "scenario_type",
    value: "big-draw",
    label: "Gros tirage (≥ 12 outs)",
    description: "Combo draws : compter sans double-compter les outs partagés.",
    matchSpot: match<OutsSpot>("m2.1", (s) => s.outs >= 12),
  },
  {
    patternId: "m2-1-draw-medium",
    submoduleSlug: "m2.1",
    dimension: "scenario_type",
    value: "medium-draw",
    label: "Tirage moyen (8-11 outs)",
    description: "Tirage couleur ou quinte bilatérale : le cas d'école.",
    matchSpot: match<OutsSpot>("m2.1", (s) => s.outs >= 8 && s.outs < 12),
  },
  {
    patternId: "m2-1-draw-small",
    submoduleSlug: "m2.1",
    dimension: "scenario_type",
    value: "small-draw",
    label: "Petit tirage (< 8 outs)",
    description: "Ventrale, paire à améliorer : peu d'outs, équité limitée.",
    matchSpot: match<OutsSpot>("m2.1", (s) => s.outs < 8),
  },

  // ============================== M2.2 — Equity heads-up ==============================
  {
    patternId: "m2-2-street-preflop",
    submoduleSlug: "m2.2",
    dimension: "street",
    value: "preflop",
    label: "Préflop",
    description: "Équité main vs main avant le flop (confrontations classiques).",
    matchSpot: match<EquitySpot>("m2.2", (s) => s.street === "preflop"),
  },
  {
    patternId: "m2-2-street-flop",
    submoduleSlug: "m2.2",
    dimension: "street",
    value: "flop",
    label: "Au flop",
    description: "Équité avec 3 cartes au board : intégrer tirages et made hands.",
    matchSpot: match<EquitySpot>("m2.2", (s) => s.street === "flop"),
  },
  {
    patternId: "m2-2-street-turn",
    submoduleSlug: "m2.2",
    dimension: "street",
    value: "turn",
    label: "À la turn",
    description: "Équité avec 4 cartes : une seule carte peut encore tout changer.",
    matchSpot: match<EquitySpot>("m2.2", (s) => s.street === "turn"),
  },
  {
    patternId: "m2-2-eq-dominating",
    submoduleSlug: "m2.2",
    dimension: "equity_band",
    value: "dominating",
    label: "Domination (≥ 65 %)",
    description: "Main largement devant : ne pas sous-estimer son avance.",
    matchSpot: match<EquitySpot>("m2.2", (s) => s.expected.equity >= 65),
  },
  {
    patternId: "m2-2-eq-coinflip",
    submoduleSlug: "m2.2",
    dimension: "equity_band",
    value: "coinflip",
    label: "Coinflip (45-60 %)",
    description: "Confrontations serrées : la calibration fine compte le plus.",
    matchSpot: match<EquitySpot>(
      "m2.2",
      (s) => s.expected.equity >= 45 && s.expected.equity <= 60
    ),
  },
  {
    patternId: "m2-2-eq-behind",
    submoduleSlug: "m2.2",
    dimension: "equity_band",
    value: "behind",
    label: "Derrière (< 45 %)",
    description: "Main dominée : reconnaître quand on est l'outsider.",
    matchSpot: match<EquitySpot>("m2.2", (s) => s.expected.equity < 45),
  },

  // ============================== M2.3 — Equity multiway ==============================
  {
    patternId: "m2-3-street-flop",
    submoduleSlug: "m2.3",
    dimension: "street",
    value: "flop",
    label: "Au flop (3-way)",
    description: "Équité face à 2 adversaires au flop : l'équité se dilue vite.",
    matchSpot: match<MultiwaySpot>("m2.3", (s) => s.street === "flop"),
  },
  {
    patternId: "m2-3-street-turn",
    submoduleSlug: "m2.3",
    dimension: "street",
    value: "turn",
    label: "À la turn (3-way)",
    description: "Équité 3-way à la turn : moins de cartes, équité plus stable.",
    matchSpot: match<MultiwaySpot>("m2.3", (s) => s.street === "turn"),
  },
  {
    patternId: "m2-3-eq-strong",
    submoduleSlug: "m2.3",
    dimension: "equity_band",
    value: "strong",
    label: "Équité forte 3-way (≥ 45 %)",
    description: "En multiway, 45 %+ est déjà une équité dominante.",
    matchSpot: match<MultiwaySpot>("m2.3", (s) => s.expected.equity >= 45),
  },
  {
    patternId: "m2-3-eq-medium",
    submoduleSlug: "m2.3",
    dimension: "equity_band",
    value: "medium",
    label: "Équité moyenne 3-way (30-45 %)",
    description: "Zone où la dilution multiway piège l'intuition heads-up.",
    matchSpot: match<MultiwaySpot>(
      "m2.3",
      (s) => s.expected.equity >= 30 && s.expected.equity < 45
    ),
  },
  {
    patternId: "m2-3-eq-weak",
    submoduleSlug: "m2.3",
    dimension: "equity_band",
    value: "weak",
    label: "Équité faible 3-way (< 30 %)",
    description: "Équité diluée : souvent insuffisante pour investir gros.",
    matchSpot: match<MultiwaySpot>("m2.3", (s) => s.expected.equity < 30),
  },

  // ============================== M2.4 — Equity vs range ==============================
  {
    patternId: "m2-4-street-preflop",
    submoduleSlug: "m2.4",
    dimension: "street",
    value: "preflop",
    label: "Préflop vs range",
    description: "Équité d'une main face à un range préflop complet.",
    matchSpot: match<VsRangeSpot>("m2.4", (s) => s.street === "preflop"),
  },
  {
    patternId: "m2-4-street-postflop",
    submoduleSlug: "m2.4",
    dimension: "street",
    value: "postflop",
    label: "Postflop vs range",
    description: "Équité face à un range au flop ou à la turn.",
    matchSpot: match<VsRangeSpot>("m2.4", (s) => s.street !== "preflop"),
  },
  {
    patternId: "m2-4-range-wide",
    submoduleSlug: "m2.4",
    dimension: "range_type",
    value: "wide",
    label: "Range large (≥ 150 combos)",
    description: "Face à un range très ouvert : l'équité moyenne monte.",
    matchSpot: match<VsRangeSpot>("m2.4", (s) => s.expected.comboCount >= 150),
  },
  {
    patternId: "m2-4-range-tight",
    submoduleSlug: "m2.4",
    dimension: "range_type",
    value: "tight",
    label: "Range serré (< 80 combos)",
    description: "Face à un range fermé : prudence, l'équité chute souvent.",
    matchSpot: match<VsRangeSpot>("m2.4", (s) => s.expected.comboCount < 80),
  },
  {
    patternId: "m2-4-eq-ahead",
    submoduleSlug: "m2.4",
    dimension: "equity_band",
    value: "ahead",
    label: "Devant le range (≥ 55 %)",
    description: "Main qui domine le range adverse : value à extraire.",
    matchSpot: match<VsRangeSpot>("m2.4", (s) => s.expected.equity >= 55),
  },

  // ============================== M3.1 — Push/fold sub-15bb ==============================
  {
    patternId: "m3-1-stack-short",
    submoduleSlug: "m3.1",
    dimension: "stack_depth",
    value: "<=8bb",
    label: "Stack court (≤ 8 bb)",
    description: "Très court : range de push large, peu de fold equity.",
    matchSpot: match<PushFoldSpot>("m3.1", (s) => s.heroStack <= 8),
  },
  {
    patternId: "m3-1-stack-mid",
    submoduleSlug: "m3.1",
    dimension: "stack_depth",
    value: "9-12bb",
    label: "Stack moyen (9-12 bb)",
    description: "Zone de push/fold standard : l'équilibre EV est subtil.",
    matchSpot: match<PushFoldSpot>("m3.1", (s) => s.heroStack >= 9 && s.heroStack <= 12),
  },
  {
    patternId: "m3-1-stack-deep",
    submoduleSlug: "m3.1",
    dimension: "stack_depth",
    value: ">=13bb",
    label: "Stack profond (≥ 13 bb)",
    description: "Haut de la zone : la fold equity et le risque se rééquilibrent.",
    matchSpot: match<PushFoldSpot>("m3.1", (s) => s.heroStack >= 13),
  },
  {
    patternId: "m3-1-hand-premium",
    submoduleSlug: "m3.1",
    dimension: "hand_class",
    value: "premium",
    label: "Mains premium",
    description: "Grosses paires et broadways : push trivial, ne pas hésiter.",
    matchSpot: match<PushFoldSpot>("m3.1", (s) => {
      const c = classifyHand(s.heroCards);
      return c === "premium-pair" || c === "mid-pair" || c === "premium-broadway";
    }),
  },
  {
    patternId: "m3-1-hand-ax",
    submoduleSlug: "m3.1",
    dimension: "hand_class",
    value: "ax",
    label: "As marginaux (Ax)",
    description: "Ax : pousser à court stack, fold marginal en haut de zone.",
    matchSpot: match<PushFoldSpot>("m3.1", (s) => isAx(classifyHand(s.heroCards))),
  },

  // ============================== M3.2 — Fold equity ==============================
  {
    patternId: "m3-2-profitable",
    submoduleSlug: "m3.2",
    dimension: "scenario_type",
    value: "profitable",
    label: "Push rentable",
    description: "La fold equity réelle dépasse le seuil break-even : push +EV.",
    matchSpot: match<FoldEquitySpot>("m3.2", (s) => s.expected.isPushProfitable),
  },
  {
    patternId: "m3-2-unprofitable",
    submoduleSlug: "m3.2",
    dimension: "scenario_type",
    value: "unprofitable",
    label: "Push non rentable",
    description: "Fold equity insuffisante : reconnaître quand il faut renoncer.",
    matchSpot: match<FoldEquitySpot>("m3.2", (s) => !s.expected.isPushProfitable),
  },
  {
    patternId: "m3-2-be-low",
    submoduleSlug: "m3.2",
    dimension: "scenario_type",
    value: "low-fe-needed",
    label: "Break-even bas (< 35 %)",
    description: "Peu de fold equity requise : push souvent automatique.",
    matchSpot: match<FoldEquitySpot>("m3.2", (s) => s.expected.pFoldBreakEven < 0.35),
  },
  {
    patternId: "m3-2-be-mid",
    submoduleSlug: "m3.2",
    dimension: "scenario_type",
    value: "mid-fe-needed",
    label: "Break-even moyen (35-55 %)",
    description: "Le seuil de fold equity est dans la zone de bascule.",
    matchSpot: match<FoldEquitySpot>(
      "m3.2",
      (s) => s.expected.pFoldBreakEven >= 0.35 && s.expected.pFoldBreakEven < 0.55
    ),
  },
  {
    patternId: "m3-2-be-high",
    submoduleSlug: "m3.2",
    dimension: "scenario_type",
    value: "high-fe-needed",
    label: "Break-even haut (≥ 55 %)",
    description: "Il faut beaucoup de folds : bluff/semi-bluff risqué.",
    matchSpot: match<FoldEquitySpot>("m3.2", (s) => s.expected.pFoldBreakEven >= 0.55),
  },

  // ============================== M3.3 — EV composites multi-branches ==============================
  {
    patternId: "m3-3-3bet-vs-open",
    submoduleSlug: "m3.3",
    dimension: "scenario_type",
    value: "3bet-vs-open",
    label: "3-bet vs open",
    description: "Pondérer fold / call / 4-bet face à un open.",
    matchSpot: match<MultiBranchSpot>("m3.3", (s) => s.scenario === "3bet-vs-open"),
  },
  {
    patternId: "m3-3-iso-vs-limp",
    submoduleSlug: "m3.3",
    dimension: "scenario_type",
    value: "iso-vs-limp",
    label: "Iso vs limp",
    description: "Isolation d'un limpeur : pondérer fold / call / 3-bet.",
    matchSpot: match<MultiBranchSpot>("m3.3", (s) => s.scenario === "iso-vs-limp"),
  },
  {
    patternId: "m3-3-squeeze",
    submoduleSlug: "m3.3",
    dimension: "scenario_type",
    value: "squeeze",
    label: "Squeeze vs open+call",
    description: "Squeeze multiway : la fold equity combinée est clé.",
    matchSpot: match<MultiBranchSpot>("m3.3", (s) => s.scenario === "squeeze-vs-open-call"),
  },
  {
    patternId: "m3-3-cold-call",
    submoduleSlug: "m3.3",
    dimension: "scenario_type",
    value: "cold-call",
    label: "Cold call vs open",
    description: "Évaluer l'EV d'un cold call selon la texture future du flop.",
    matchSpot: match<MultiBranchSpot>("m3.3", (s) => s.scenario === "cold-call-vs-open"),
  },
  {
    patternId: "m3-3-profitable",
    submoduleSlug: "m3.3",
    dimension: "scenario_type",
    value: "profitable",
    label: "Ligne +EV",
    description: "Spots où la décomposition donne une EV positive.",
    matchSpot: match<MultiBranchSpot>("m3.3", (s) => s.expected.evBb > 0),
  },

  // ============================== M3.4 — Check-raise flop ==============================
  {
    patternId: "m3-4-board-dry",
    submoduleSlug: "m3.4",
    dimension: "scenario_type",
    value: "dry-board",
    label: "Board sec",
    description: "Textures sèches : la fold equity du check-raise est élevée.",
    matchSpot: match<CheckRaiseSpot>("m3.4", (s) => s.boardTexture === "dry"),
  },
  {
    patternId: "m3-4-board-wet",
    submoduleSlug: "m3.4",
    dimension: "scenario_type",
    value: "wet-board",
    label: "Board humide",
    description: "Textures connectées : moins de folds, plus d'équité brute requise.",
    matchSpot: match<CheckRaiseSpot>("m3.4", (s) => s.boardTexture === "wet"),
  },
  {
    patternId: "m3-4-hand-value",
    submoduleSlug: "m3.4",
    dimension: "hand_class",
    value: "value",
    label: "Check-raise value",
    description: "Mains faites : maximiser la value sans faire fuir.",
    matchSpot: match<CheckRaiseSpot>("m3.4", (s) => s.heroHandType === "value"),
  },
  {
    patternId: "m3-4-hand-semibluff",
    submoduleSlug: "m3.4",
    dimension: "hand_class",
    value: "semibluff",
    label: "Check-raise semi-bluff",
    description: "Tirages : combiner fold equity et équité de réalisation.",
    matchSpot: match<CheckRaiseSpot>("m3.4", (s) => s.heroHandType === "semibluff"),
  },
  {
    patternId: "m3-4-hand-bluff",
    submoduleSlug: "m3.4",
    dimension: "hand_class",
    value: "bluff",
    label: "Check-raise bluff pur",
    description: "Bluffs sans équité : la décision repose sur la seule fold equity.",
    matchSpot: match<CheckRaiseSpot>("m3.4", (s) => s.heroHandType === "bluff"),
  },

  // ============================== M4.1 — Équité ICM ==============================
  {
    patternId: "m4-1-chip-leader",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "chip-leader",
    label: "Chip leader",
    description: "Gros stack : l'équité ICM est inférieure à l'équité chip.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "chip-leader"),
  },
  {
    patternId: "m4-1-short-stack",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "short-stack",
    label: "Short stack",
    description: "Petit stack : l'équité ICM dépasse l'équité chip (survie).",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "short-stack"),
  },
  {
    patternId: "m4-1-bubble",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "bubble",
    label: "Bulle",
    description: "Sur la bulle, la pression ICM est maximale.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "bubble"),
  },
  {
    patternId: "m4-1-equal-stacks",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "equal-stacks",
    label: "Stacks égaux",
    description: "Référence : ICM proche du chip equity quand les stacks s'égalisent.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "equal-stacks"),
  },
  {
    patternId: "m4-1-final-table",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "final-table",
    label: "Table finale",
    description: "En FT, l'effet ICM s'accentue à mesure que les payouts montent.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "final-table"),
  },
  {
    patternId: "m4-1-satellite",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "satellite",
    label: "Satellite",
    description: "Structure plate : au-dessus de la bulle, les jetons ne valent presque rien.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.spotType === "satellite"),
  },
  {
    patternId: "m4-1-high-icm-effect",
    submoduleSlug: "m4.1",
    dimension: "scenario_type",
    value: "high-icm-effect",
    label: "Effet ICM marqué (≥ 5 pts)",
    description: "Écart fort entre équité chip et ICM : la calibration est cruciale.",
    matchSpot: match<ICMSpot>("m4.1", (s) => s.expected.icmEffect >= 5),
  },

  // ============================== M4.2 — Bubble factor ==============================
  {
    patternId: "m4-2-leader-vs-mid",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "leader-vs-mid",
    label: "Chip leader vs mid",
    description: "Le leader paie la taxe ICM la plus élevée sur la bulle.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "bubble-leader-vs-mid"),
  },
  {
    patternId: "m4-2-leader-vs-short",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "leader-vs-short",
    label: "Chip leader vs short",
    description: "Affronter un short : bubble factor modéré, pression réduite.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "bubble-leader-vs-short"),
  },
  {
    patternId: "m4-2-short-vs-leader",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "short-vs-leader",
    label: "Short vs chip leader",
    description: "Le short risque l'élimination : bubble factor élevé pour lui.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "bubble-short-vs-leader"),
  },
  {
    patternId: "m4-2-mid-vs-mid",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "mid-vs-mid",
    label: "Mid vs mid",
    description: "Deux stacks moyens : bubble factor symétrique.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "bubble-mid-vs-mid"),
  },
  {
    patternId: "m4-2-ft-leader",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "ft-leader",
    label: "FT — leader",
    description: "Leader en table finale : bubble factor élevé contre les stacks moyens.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "ft-leader"),
  },
  {
    patternId: "m4-2-ft-mid",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "ft-mid",
    label: "FT — mid stack",
    description: "Stack moyen en FT : naviguer entre survie et accumulation.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "ft-mid"),
  },
  {
    patternId: "m4-2-ft-short",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "ft-short",
    label: "FT — short stack",
    description: "Short en FT : on doit prendre des risques malgré l'ICM.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "ft-short"),
  },
  {
    patternId: "m4-2-satellite",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "satellite",
    label: "Satellite",
    description: "Bubble factor extrême : le fold devient correct avec des mains très fortes.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.spotType === "satellite"),
  },
  {
    patternId: "m4-2-high-bf",
    submoduleSlug: "m4.2",
    dimension: "scenario_type",
    value: "high-bf",
    label: "Bubble factor élevé (≥ 1.8)",
    description: "Forte pénalité ICM : l'équité requise pour caller explose.",
    matchSpot: match<BubbleFactorSpot>("m4.2", (s) => s.expected.bubbleFactor >= 1.8),
  },

  // ============================== M4.3 — Bubble factor par position ==============================
  {
    patternId: "m4-3-ep-bubble",
    submoduleSlug: "m4.3",
    dimension: "scenario_type",
    value: "ep-bubble",
    label: "Position précoce (bulle)",
    description: "EP sur la bulle : beaucoup de joueurs derrière, prudence accrue.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.spotType === "ep-bubble"),
  },
  {
    patternId: "m4-3-lp-bubble",
    submoduleSlug: "m4.3",
    dimension: "scenario_type",
    value: "lp-bubble",
    label: "Position tardive (bulle)",
    description: "LP : moins de joueurs derrière, on peut élargir.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.spotType === "lp-bubble"),
  },
  {
    patternId: "m4-3-sb-vs-bb",
    submoduleSlug: "m4.3",
    dimension: "scenario_type",
    value: "sb-vs-bb-bubble",
    label: "SB vs BB (bulle)",
    description: "Blind vs blind sur la bulle : ajustement de position extrême.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.spotType === "sb-vs-bb-bubble"),
  },
  {
    patternId: "m4-3-ep-ft",
    submoduleSlug: "m4.3",
    dimension: "scenario_type",
    value: "ep-ft",
    label: "Position précoce (table finale)",
    description: "EP en FT : la pénalité de position s'ajoute à la pression ICM.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.spotType === "ep-ft"),
  },
  {
    patternId: "m4-3-lp-ft",
    submoduleSlug: "m4.3",
    dimension: "scenario_type",
    value: "lp-ft",
    label: "Position tardive (table finale)",
    description: "LP en FT : on peut ouvrir davantage avec l'information de position.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.spotType === "lp-ft"),
  },
  {
    patternId: "m4-3-many-left",
    submoduleSlug: "m4.3",
    dimension: "position",
    value: "many-left",
    label: "Beaucoup de joueurs derrière (≥ 3)",
    description: "Plus de joueurs à parler → multiplicateur de position plus fort.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.playersLeftToAct >= 3),
  },
  {
    patternId: "m4-3-few-left",
    submoduleSlug: "m4.3",
    dimension: "position",
    value: "few-left",
    label: "Peu de joueurs derrière (≤ 1)",
    description: "Quasi en position : la pénalité de position s'efface.",
    matchSpot: match<PositionBubbleFactorSpot>("m4.3", (s) => s.playersLeftToAct <= 1),
  },

  // ============================== M4.4 — Table finale ICM ==============================
  {
    patternId: "m4-4-9way-leader",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-9way-leader",
    label: "FT 9-max — leader",
    description: "Début de table finale en tant que leader : préserver l'avance.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-9way-leader"),
  },
  {
    patternId: "m4-4-9way-short",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-9way-short",
    label: "FT 9-max — short",
    description: "Short en début de FT : chaque place vaut cher.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-9way-short"),
  },
  {
    patternId: "m4-4-3way",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-3way",
    label: "FT 3-way",
    description: "Trois joueurs : les sauts de paie deviennent énormes.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-3way"),
  },
  {
    patternId: "m4-4-heads-up",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-heads-up",
    label: "FT heads-up",
    description: "Heads-up final : l'ICM se rapproche du chip equity (winner-take-most).",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-heads-up"),
  },
  {
    patternId: "m4-4-9way-mid",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-9way-mid",
    label: "FT 9-max — mid",
    description: "Stack moyen en début de FT : équilibre entre paliers et accumulation.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-9way-mid"),
  },
  {
    patternId: "m4-4-6way",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "ft-6way",
    label: "FT 6-way",
    description: "Milieu de table finale : les sauts de paie s'accélèrent.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.spotType === "ft-6way"),
  },
  {
    patternId: "m4-4-high-spread",
    submoduleSlug: "m4.4",
    dimension: "scenario_type",
    value: "high-spread",
    label: "Spread de payouts large (≥ 20 pts)",
    description: "Gros écart entre les places : la prudence ICM est maximale.",
    matchSpot: match<FinalTableSpot>("m4.4", (s) => s.payoutSpread >= 20),
  },

  // ============================== M5.1 — SB push range Nash ==============================
  {
    patternId: "m5-1-stack-5bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "5bb",
    label: "SB push à 5 bb",
    description: "Range Nash extrêmement large (~76 %). Quasi-any-two.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 5),
  },
  {
    patternId: "m5-1-stack-7bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "7bb",
    label: "SB push à 7 bb",
    description: "Range très large : on pousse l'immense majorité des mains.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 7),
  },
  {
    patternId: "m5-1-stack-8bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "8bb",
    label: "SB push à 8 bb",
    description: "Range encore très large : la plupart des mains jouables.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 8),
  },
  {
    patternId: "m5-1-stack-12bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "12bb",
    label: "SB push à 12 bb",
    description: "Zone intermédiaire : les mains marginales commencent à se folder.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 12),
  },
  {
    patternId: "m5-1-stack-10bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "10bb",
    label: "SB push à 10 bb",
    description: "Range Nash de référence (~33 %). Le push de calibration.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 10),
  },
  {
    patternId: "m5-1-stack-15bb",
    submoduleSlug: "m5.1",
    dimension: "stack_depth",
    value: "15bb",
    label: "SB push à 15 bb",
    description: "Haut de zone : range resserrée, les marginales passent fold.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => s.heroStack === 15),
  },
  {
    patternId: "m5-1-hand-ax-small",
    submoduleSlug: "m5.1",
    dimension: "hand_class",
    value: "ax-offsuit-small",
    label: "A petit offsuit (A2o-A8o)",
    description: "Mains pivot : push à court stack, fold à 15 bb.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => classifyHand(s.heroCards) === "ax-offsuit-small"),
  },
  {
    patternId: "m5-1-hand-small-pair",
    submoduleSlug: "m5.1",
    dimension: "hand_class",
    value: "small-pair",
    label: "Petites paires (22-77)",
    description: "Toujours un push profitable sur toute la zone sub-15bb.",
    matchSpot: match<NashPushSpot>("m5.1", (s) => classifyHand(s.heroCards) === "small-pair"),
  },

  // ============================== M5.2 — BB call vs SB push ==============================
  {
    patternId: "m5-2-stack-5bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "5bb",
    label: "BB call à 5 bb",
    description: "Cote du pot énorme : range de call très large.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 5),
  },
  {
    patternId: "m5-2-stack-10bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "10bb",
    label: "BB call à 10 bb",
    description: "Range de call de référence face au push SB.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 10),
  },
  {
    patternId: "m5-2-stack-7bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "7bb",
    label: "BB call à 7 bb",
    description: "Cote énorme : on défend très large face au push.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 7),
  },
  {
    patternId: "m5-2-stack-8bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "8bb",
    label: "BB call à 8 bb",
    description: "Range de call large : peu de fold rentables.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 8),
  },
  {
    patternId: "m5-2-stack-12bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "12bb",
    label: "BB call à 12 bb",
    description: "Zone intermédiaire : on commence à folder les mains dominées.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 12),
  },
  {
    patternId: "m5-2-stack-15bb",
    submoduleSlug: "m5.2",
    dimension: "stack_depth",
    value: "15bb",
    label: "BB call à 15 bb",
    description: "Plus profond : call plus sélectif, on évite les dominations.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.heroStack === 15),
  },
  {
    patternId: "m5-2-hand-ax",
    submoduleSlug: "m5.2",
    dimension: "hand_class",
    value: "ax",
    label: "As (Ax) en call",
    description: "Les Ax dominent une grande part du range de push : call solide.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => isAx(classifyHand(s.heroCards))),
  },
  {
    patternId: "m5-2-hand-broadway",
    submoduleSlug: "m5.2",
    dimension: "hand_class",
    value: "broadway",
    label: "Broadways en call",
    description: "Broadways : call ou fold selon la profondeur et la domination.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => isBroadwayish(classifyHand(s.heroCards))),
  },
  {
    patternId: "m5-2-marginal",
    submoduleSlug: "m5.2",
    dimension: "scenario_type",
    value: "marginal",
    label: "Décisions marginales",
    description: "Spots proches du seuil Nash : la zone d'erreur la plus fréquente.",
    matchSpot: match<BBCallSpot>("m5.2", (s) => s.category.startsWith("marginal")),
  },

  // ============================== M5.3 — BTN push range Nash ==============================
  {
    patternId: "m5-3-stack-5bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "5bb",
    label: "BTN push à 5 bb",
    description: "Très court au bouton : range de push proche de l'any-two.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 5),
  },
  {
    patternId: "m5-3-stack-10bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "10bb",
    label: "BTN push à 10 bb",
    description: "Range de référence au bouton : 2 joueurs encore à parler.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 10),
  },
  {
    patternId: "m5-3-stack-7bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "7bb",
    label: "BTN push à 7 bb",
    description: "Range de push très large au bouton.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 7),
  },
  {
    patternId: "m5-3-stack-8bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "8bb",
    label: "BTN push à 8 bb",
    description: "Encore très large : on shove la grande majorité du range.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 8),
  },
  {
    patternId: "m5-3-stack-12bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "12bb",
    label: "BTN push à 12 bb",
    description: "Zone intermédiaire : resserrement progressif des offsuit.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 12),
  },
  {
    patternId: "m5-3-stack-15bb",
    submoduleSlug: "m5.3",
    dimension: "stack_depth",
    value: "15bb",
    label: "BTN push à 15 bb",
    description: "Haut de zone : on resserre, surtout les offsuit faibles.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.heroStack === 15),
  },
  {
    patternId: "m5-3-hand-connector",
    submoduleSlug: "m5.3",
    dimension: "hand_class",
    value: "suited-connector",
    label: "Connecteurs suités",
    description: "Connecteurs/gappers suités : excellents push au bouton.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => {
      const c = classifyHand(s.heroCards);
      return c === "suited-connector" || c === "suited-gapper";
    }),
  },
  {
    patternId: "m5-3-hand-small-pair",
    submoduleSlug: "m5.3",
    dimension: "hand_class",
    value: "small-pair",
    label: "Petites paires",
    description: "Push standard, mais attention au resserrement vers 15 bb.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => classifyHand(s.heroCards) === "small-pair"),
  },
  {
    patternId: "m5-3-marginal",
    submoduleSlug: "m5.3",
    dimension: "scenario_type",
    value: "marginal",
    label: "Décisions marginales",
    description: "Spots au bord de la range Nash du bouton.",
    matchSpot: match<BTNPushSpot>("m5.3", (s) => s.category.startsWith("marginal")),
  },

  // ============================== M5.4 — Call ranges par position ==============================
  {
    patternId: "m5-4-stack-10bb",
    submoduleSlug: "m5.4",
    dimension: "stack_depth",
    value: "10bb",
    label: "Défense à 10 bb",
    description: "Call vs push à 10 bb selon la position du pousseur.",
    matchSpot: match<PositionDefenseSpot>("m5.4", (s) => s.heroStack === 10),
  },
  {
    patternId: "m5-4-stack-15bb",
    submoduleSlug: "m5.4",
    dimension: "stack_depth",
    value: "15bb",
    label: "Défense à 15 bb",
    description: "Call plus sélectif quand le stack est plus profond.",
    matchSpot: match<PositionDefenseSpot>("m5.4", (s) => s.heroStack === 15),
  },
  {
    patternId: "m5-4-pos-bb",
    submoduleSlug: "m5.4",
    dimension: "position",
    value: "BB",
    label: "Défense depuis la BB",
    description: "Meilleure cote du pot : la BB défend le plus large.",
    matchSpot: match<PositionDefenseSpot>("m5.4", (s) => s.heroPosition === "BB"),
  },
  {
    patternId: "m5-4-pos-late",
    submoduleSlug: "m5.4",
    dimension: "position",
    value: "late",
    label: "Défense en position tardive (BTN/CO)",
    description: "Hors blindes : range de call resserrée, pas de cote bonifiée.",
    matchSpot: match<PositionDefenseSpot>(
      "m5.4",
      (s) => s.heroPosition === "BTN" || s.heroPosition === "CO"
    ),
  },
  {
    patternId: "m5-4-hand-ax",
    submoduleSlug: "m5.4",
    dimension: "hand_class",
    value: "ax",
    label: "As (Ax) en défense",
    description: "Les Ax dominent le range de push : pierre angulaire de la défense.",
    matchSpot: match<PositionDefenseSpot>("m5.4", (s) => isAx(classifyHand(s.heroCards))),
  },
  {
    patternId: "m5-4-marginal",
    submoduleSlug: "m5.4",
    dimension: "scenario_type",
    value: "marginal",
    label: "Décisions marginales",
    description: "Spots proches du seuil de call par position.",
    matchSpot: match<PositionDefenseSpot>("m5.4", (s) => s.category.startsWith("marginal")),
  },
];

/** Index patternId → définition, pour les lookups rapides (Convex, UI). */
export const PATTERNS_BY_ID: Record<string, PatternDefinition> = Object.fromEntries(
  PATTERNS.map((p) => [p.patternId, p])
);

/** Patterns d'un sous-module donné. */
export function patternsForSubmodule(submoduleSlug: string): PatternDefinition[] {
  return PATTERNS.filter((p) => p.submoduleSlug === submoduleSlug);
}

/** Patterns matchés par un spot (filtre par sous-module + prédicat). */
export function matchPatterns(spot: GenericSpot): PatternDefinition[] {
  const slug = submoduleOf(spot);
  return PATTERNS.filter((p) => p.submoduleSlug === slug && p.matchSpot(spot));
}
