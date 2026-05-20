"use client";

import { useState, useMemo, useEffect, useRef, Suspense, type ReactNode } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { PokerTable } from "@/components/poker/PokerTable";
import { PlayingCard } from "@/components/poker/PlayingCard";
import { getGenerator } from "@/lib/poker/spot-generators/registry";
import type { GenericSpot } from "@/lib/poker/spot-generators/types";
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
import { RangeDisplay } from "@/components/poker/RangeDisplay";
import { fmtPercent, fmtRatio, fmtBb, cn } from "@/lib/utils";
import { fmtDurationCompact, fmtDurationCompactUnit } from "@/lib/format";
import { urlSlugToDbSlug, moduleSlugFromSubmodule } from "@/lib/slug";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { Id } from "@/convex/_generated/dataModel";

interface Attempt {
  spotId: string;
  isCorrect: boolean;
  timeMs: number;
}

type Decision = "call" | "fold" | "raise" | null;

interface UserAnswer {
  ratio: string;
  requiredEquity: string;
  neededExtra: string;
  adjustedEquity: string;
  outsInput: string;
  equityInput: string;
  equityHu: string;
  pFoldInput: string;
  equityCallInput: string;
  pFoldBreakevenInput: string;
  pFoldBranchInput: string;
  pCallBranchInput: string;
  pRaiseBranchInput: string;
  pFoldCRInput: string;
  pCallCRInput: string;
  equityCRInput: string;
  equityIcmInput: string;
  equityChipReqInput: string;
  equityIcmReqInput: string;
  bfBaseInput: string;
  bfAdjustedInput: string;
  equityIcmFtInput: string;
  nashActionInput: "push" | "fold" | null;
  nashCallActionInput: "call" | "fold" | null;
  decision: Decision;
}

const EMPTY_ANSWER: UserAnswer = {
  ratio: "",
  requiredEquity: "",
  neededExtra: "",
  adjustedEquity: "",
  outsInput: "",
  equityInput: "",
  equityHu: "",
  pFoldInput: "",
  equityCallInput: "",
  pFoldBreakevenInput: "",
  pFoldBranchInput: "",
  pCallBranchInput: "",
  pRaiseBranchInput: "",
  pFoldCRInput: "",
  pCallCRInput: "",
  equityCRInput: "",
  equityIcmInput: "",
  equityChipReqInput: "",
  equityIcmReqInput: "",
  bfBaseInput: "",
  bfAdjustedInput: "",
  equityIcmFtInput: "",
  nashActionInput: null,
  nashCallActionInput: null,
  decision: null,
};

const SPOTS_PER_SESSION = 20;
const TOL_PCT = 1.5;
const TOL_RATIO = 0.15;
const TOL_BB = 0.8;

function parseAnswerNumber(input: string): number | null {
  const cleaned = input.replace(",", ".").replace(/[%\s]/g, "").trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseRatio(input: string): number | null {
  const cleaned = input.toLowerCase().replace(",", ".").trim();
  const match = cleaned.match(/^([\d.]+)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return Number.isFinite(n) ? n : null;
}

// ---- Type guards pour narrower GenericSpot ----
function isConversion(s: GenericSpot): s is PotOddsConversionSpot {
  return "mode" in s;
}
function isImplied(s: GenericSpot): s is ImpliedOddsSpot {
  return "drawDescription" in s;
}
function isReverse(s: GenericSpot): s is ReverseImpliedSpot {
  return "handDescription" in s;
}
// OutsSpot porte aussi `drawDescription` (comme ImpliedOddsSpot) : on le
// distingue par son champ unique `outs` et on le teste TOUJOURS avant isImplied.
function isOuts(s: GenericSpot): s is OutsSpot {
  return "outs" in s;
}
// EquitySpot (M2.2) : discriminé par `villainCards` + submoduleSlug. Testé
// AVANT isOuts/isImplied (guard le plus spécifique d'abord).
function isEquity(s: GenericSpot): s is EquitySpot {
  return "villainCards" in s && s.submoduleSlug === "m2.2";
}
// MultiwaySpot (M2.3) : discriminé par `villain1Cards` + submoduleSlug.
function isMultiway(s: GenericSpot): s is MultiwaySpot {
  return "villain1Cards" in s && s.submoduleSlug === "m2.3";
}
// VsRangeSpot (M2.4) : discriminé par `villainRangeNotation` + submoduleSlug.
function isVsRange(s: GenericSpot): s is VsRangeSpot {
  return "villainRangeNotation" in s && s.submoduleSlug === "m2.4";
}
// NashPushSpot (M5.1) : discriminé par `nashAction` dans expected + submoduleSlug.
// Testé EN PREMIER. Ordre complet :
// isNashPush → isFinalTable → isPositionBubbleFactor → isBubbleFactor → isICM →
// isCheckRaise → isFoldEquity → isMultiBranch → isPushFold → isVsRange →
// isMultiway → isEquity → isOuts → isImplied.
function isNashPush(s: GenericSpot): s is NashPushSpot {
  // PotOddsSpot (m1.1) n'a pas `submoduleSlug`. On vérifie d'abord la présence
  // de `category` (unique aux M5.x spots dans GenericSpot), puis `submoduleSlug`.
  return (
    "category" in s &&
    "submoduleSlug" in s &&
    (s as NashPushSpot).submoduleSlug === "m5.1"
  );
}
// M5.2 BB call : disc. `category` + submoduleSlug === "m5.2"
function isBBCall(s: GenericSpot): s is BBCallSpot {
  return (
    "category" in s &&
    "submoduleSlug" in s &&
    (s as BBCallSpot).submoduleSlug === "m5.2"
  );
}
// M5.3 BTN push : disc. `category` + submoduleSlug === "m5.3"
function isBTNPush(s: GenericSpot): s is BTNPushSpot {
  return (
    "category" in s &&
    "submoduleSlug" in s &&
    (s as BTNPushSpot).submoduleSlug === "m5.3"
  );
}
// M5.4 Position defense : disc. `category` + submoduleSlug === "m5.4"
function isPositionDefense(s: GenericSpot): s is PositionDefenseSpot {
  return (
    "category" in s &&
    "submoduleSlug" in s &&
    (s as PositionDefenseSpot).submoduleSlug === "m5.4"
  );
}
// FinalTableSpot (M4.4) : discriminé par `payoutSpread` + submoduleSlug.
function isFinalTable(s: GenericSpot): s is FinalTableSpot {
  return "payoutSpread" in s && s.submoduleSlug === "m4.4";
}
// PositionBubbleFactorSpot (M4.3) : discriminé par `playersLeftToAct` + submoduleSlug.
function isPositionBubbleFactor(
  s: GenericSpot
): s is PositionBubbleFactorSpot {
  return "playersLeftToAct" in s && s.submoduleSlug === "m4.3";
}
// BubbleFactorSpot (M4.2) : discriminé par `pushAmount` + submoduleSlug.
// M4.3 et M4.4 ont AUSSI `pushAmount`, donc on les teste AVANT (isFinalTable +
// isPositionBubbleFactor d'abord, isBubbleFactor ensuite).
function isBubbleFactor(s: GenericSpot): s is BubbleFactorSpot {
  return "pushAmount" in s && s.submoduleSlug === "m4.2";
}
// ICMSpot (M4.1) : discriminé par `players` + `payouts` + submoduleSlug.
// Aucun autre spot n'a `players` SANS pushAmount (M4.2 a aussi `players`,
// donc isBubbleFactor doit être testé AVANT isICM).
function isICM(s: GenericSpot): s is ICMSpot {
  return "players" in s && "payouts" in s && s.submoduleSlug === "m4.1";
}
// CheckRaiseSpot (M3.4) : discriminé par `villainCBetRangeNotation` +
// submoduleSlug. Aucun autre spot n'a `villainCBetRangeNotation`.
function isCheckRaise(s: GenericSpot): s is CheckRaiseSpot {
  return "villainCBetRangeNotation" in s && s.submoduleSlug === "m3.4";
}
// FoldEquitySpot (M3.2) : discriminé par `villainTotalRangeNotation` +
// submoduleSlug. PushFoldSpot (M3.1) n'a PAS villainTotalRangeNotation.
function isFoldEquity(s: GenericSpot): s is FoldEquitySpot {
  return "villainTotalRangeNotation" in s && s.submoduleSlug === "m3.2";
}
// MultiBranchSpot (M3.3) : discriminé par `scenario` + submoduleSlug. Aucun
// autre spot ne porte `scenario`.
function isMultiBranch(s: GenericSpot): s is MultiBranchSpot {
  return "scenario" in s && s.submoduleSlug === "m3.3";
}
// PushFoldSpot (M3.1) : discriminé par `villainCallRangeNotation` + heroStack +
// submoduleSlug. Ordre des gardes (du plus spécifique au plus large) :
// isFoldEquity → isMultiBranch → isPushFold → isVsRange → isMultiway →
// isEquity → isOuts → isImplied.
function isPushFold(s: GenericSpot): s is PushFoldSpot {
  return (
    "villainCallRangeNotation" in s &&
    "heroStack" in s &&
    s.submoduleSlug === "m3.1"
  );
}

// ---- Scoring nuancé M2.2 ----
type EquityLevel = "excellent" | "juste" | "proche" | "faux";
function gradeM22(
  userEquity: number,
  expectedEquity: number
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorLabel: string;
  errorColor: string;
} {
  const signedError = Math.round((userEquity - expectedEquity) * 10) / 10;
  const absError = Math.abs(signedError);
  let level: EquityLevel;
  let errorColor: string;
  if (absError <= 1) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absError <= 3) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absError <= 5) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absError <= 3;
  const sign = signedError > 0 ? "+" : "";
  const direction = signedError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absError <= 1
      ? "Excellent"
      : absError <= 3
      ? `Juste (${sign}${signedError} %)`
      : absError <= 5
      ? `Proche (${sign}${signedError} % ${direction})`
      : `Faux (${sign}${signedError} % ${direction})`;
  return { isCorrect, level, signedError, errorLabel, errorColor };
}

// ---- M3.1 — EV push/fold : calcul live + scoring sur l'erreur d'EV (bb) ----
function computeUserEV(
  pFoldPct: number,
  equityPct: number,
  heroStack: number,
  potBefore: number
): number {
  const pFold = pFoldPct / 100;
  const pCall = 1 - pFold;
  const equity = equityPct / 100;
  const callAmount = heroStack;
  const netGainIfWin = potBefore + callAmount;
  const lossIfLose = callAmount;
  return (
    pFold * potBefore +
    pCall * (equity * netGainIfWin - (1 - equity) * lossIfLose)
  );
}

function gradeM31(
  userPFoldPct: number,
  userEquityPct: number,
  spot: PushFoldSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  userEV: number;
  trueEV: number;
  pFoldError: number;
  equityError: number;
} {
  const userEV = computeUserEV(
    userPFoldPct,
    userEquityPct,
    spot.heroStack,
    spot.potBefore
  );
  const trueEV = spot.expected.evBb;
  const evError = Math.round((userEV - trueEV) * 100) / 100;
  const absErr = Math.abs(evError);
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 0.3) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 0.8) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 1.5) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 0.8;
  const sign = evError > 0 ? "+" : "";
  const dir = evError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 0.3
      ? "Excellent"
      : absErr <= 0.8
      ? `Juste (${sign}${evError} bb)`
      : absErr <= 1.5
      ? `Proche (${sign}${evError} bb ${dir})`
      : `Faux (${sign}${evError} bb ${dir})`;
  return {
    isCorrect,
    level,
    signedError: evError,
    errorColor,
    errorLabel,
    userEV,
    trueEV,
    pFoldError: Math.round((userPFoldPct - spot.expected.pFold * 100) * 10) / 10,
    equityError:
      Math.round((userEquityPct - spot.expected.equityVsCallRange) * 10) / 10,
  };
}

// ---- M3.2 — fold equity isolée : scoring sur l'erreur de pFoldBreakeven (pts %) ----
function gradeM32(
  userPFoldBePct: number,
  spot: FoldEquitySpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  truePct: number;
  pFoldActualPct: number;
  userVerdict: "+EV" | "break-even" | "-EV";
} {
  const truePct = Math.round(spot.expected.pFoldBreakEven * 1000) / 10;
  const signedError = Math.round((userPFoldBePct - truePct) * 10) / 10;
  const absErr = Math.abs(signedError);
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 3) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 7) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 15) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 7;
  const sign = signedError > 0 ? "+" : "";
  const dir = signedError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 3
      ? "Excellent"
      : absErr <= 7
      ? `Juste (${sign}${signedError} %)`
      : absErr <= 15
      ? `Proche (${sign}${signedError} % ${dir})`
      : `Faux (${sign}${signedError} % ${dir})`;
  const pFoldActualPct = Math.round(spot.expected.pFoldActual * 1000) / 10;
  // Verdict avec la FE réelle (donnée) comparée au breakeven saisi par l'user.
  const userVerdict: "+EV" | "break-even" | "-EV" =
    pFoldActualPct > userPFoldBePct + 0.5
      ? "+EV"
      : pFoldActualPct < userPFoldBePct - 0.5
      ? "-EV"
      : "break-even";
  return {
    isCorrect,
    level,
    signedError,
    errorColor,
    errorLabel,
    truePct,
    pFoldActualPct,
    userVerdict,
  };
}

// ---- M3.3 — EV composites : EV = Σ Pᵢ × EVᵢ, scoring sur l'erreur d'EV (bb) ----
function computeUserBranchEV(
  pFoldPct: number,
  pCallPct: number,
  pRaisePct: number,
  spot: MultiBranchSpot
): number {
  return (
    (pFoldPct / 100) * spot.expected.evIfFold +
    (pCallPct / 100) * spot.expected.evIfCall +
    (pRaisePct / 100) * spot.expected.evIfFourBet
  );
}

function gradeM33(
  pFoldPct: number,
  pCallPct: number,
  pRaisePct: number,
  spot: MultiBranchSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  userEV: number;
  trueEV: number;
} {
  const userEV = computeUserBranchEV(pFoldPct, pCallPct, pRaisePct, spot);
  const trueEV = spot.expected.evBb;
  const evError = Math.round((userEV - trueEV) * 100) / 100;
  const absErr = Math.abs(evError);
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 0.3) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 0.8) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 1.5) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 0.8;
  const sign = evError > 0 ? "+" : "";
  const dir = evError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 0.3
      ? "Excellent"
      : absErr <= 0.8
      ? `Juste (${sign}${evError} bb)`
      : absErr <= 1.5
      ? `Proche (${sign}${evError} bb ${dir})`
      : `Faux (${sign}${evError} bb ${dir})`;
  return { isCorrect, level, signedError: evError, errorColor, errorLabel, userEV, trueEV };
}

// Libellés des 3 branches M3.3 selon le scénario (l'arbre n'est pas le même).
function m33BranchLabels(
  scenario: MultiBranchSpot["scenario"]
): [string, string, string] {
  switch (scenario) {
    case "iso-vs-limp":
      return ["P(fold)", "P(call)", "P(3-bet)"];
    case "cold-call-vs-open":
      return ["P(flop défav.)", "P(flop neutre)", "P(flop fav.)"];
    default:
      return ["P(fold)", "P(call)", "P(4-bet)"];
  }
}

// ---- M3.4 — check-raise flop : EV postflop avec realization factor ----
function computeUserCRev(
  pFoldPct: number,
  pCallPct: number,
  equityVsCallPct: number,
  spot: CheckRaiseSpot
): number {
  const pFold = pFoldPct / 100;
  const pCall = pCallPct / 100;
  const pThreeBet = Math.max(0, 1 - pFold - pCall);
  const equity = equityVsCallPct / 100;
  const equityRealized = equity * spot.expected.realizationFactorUsed;
  const evIfFold = spot.potPreflop + spot.cbetSize;
  const potAfterCBet = spot.potPreflop + 2 * spot.cbetSize;
  const potAfterRaise = potAfterCBet + 2 * spot.raiseSize;
  const ourInvestPostRaise = spot.effectiveStack - spot.raiseSize;
  const evIfCall =
    equityRealized * (potAfterRaise + ourInvestPostRaise) -
    (1 - equityRealized) * ourInvestPostRaise;
  const evIf3Bet = -spot.raiseSize;
  return pFold * evIfFold + pCall * evIfCall + pThreeBet * evIf3Bet;
}

function gradeM34(
  pFoldPct: number,
  pCallPct: number,
  equityPct: number,
  spot: CheckRaiseSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  userEV: number;
  trueEV: number;
} {
  const userEV = computeUserCRev(pFoldPct, pCallPct, equityPct, spot);
  const trueEV = spot.expected.evBb;
  const evError = Math.round((userEV - trueEV) * 100) / 100;
  const absErr = Math.abs(evError);
  // Bandes plus larges qu'M3.1/M3.3 : l'EV postflop varie sur une échelle
  // plus grande (les pots flop sont plus gros qu'un push 10bb).
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 0.5) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 1.5) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 3) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 1.5;
  const sign = evError > 0 ? "+" : "";
  const dir = evError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 0.5
      ? "Excellent"
      : absErr <= 1.5
      ? `Juste (${sign}${evError} bb)`
      : absErr <= 3
      ? `Proche (${sign}${evError} bb ${dir})`
      : `Faux (${sign}${evError} bb ${dir})`;
  return { isCorrect, level, signedError: evError, errorColor, errorLabel, userEV, trueEV };
}

// ---- M4.1 — équité ICM : scoring sur l'erreur (pts %) ----
function gradeM41(
  userEquityPct: number,
  spot: ICMSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  truePct: number;
} {
  const truePct = spot.expected.heroEquityPercent;
  const signedError = Math.round((userEquityPct - truePct) * 10) / 10;
  const absErr = Math.abs(signedError);
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 1.5) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 3) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 6) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 3;
  const sign = signedError > 0 ? "+" : "";
  const dir = signedError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 1.5
      ? "Excellent"
      : absErr <= 3
      ? `Juste (${sign}${signedError} %)`
      : absErr <= 6
      ? `Proche (${sign}${signedError} % ${dir})`
      : `Faux (${sign}${signedError} % ${dir})`;
  return { isCorrect, level, signedError, errorColor, errorLabel, truePct };
}

// ---- M4.2 — bubble factor : scoring sur erreur composite (eq_chip + eq_ICM) ----
function gradeM42(
  userEqChipPct: number,
  userEqICMPct: number,
  spot: BubbleFactorSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  errorChip: number;
  errorICM: number;
  trueEqChip: number;
  trueEqICM: number;
} {
  const trueEqChip = spot.expected.requiredEquityChip;
  const trueEqICM = spot.expected.requiredEquityICM;
  const errorChip = Math.round((userEqChipPct - trueEqChip) * 10) / 10;
  const errorICM = Math.round((userEqICMPct - trueEqICM) * 10) / 10;
  // Erreur composite : moyenne quadratique des deux erreurs
  const combinedError =
    Math.round(
      Math.sqrt((errorChip * errorChip + errorICM * errorICM) / 2) * 10
    ) / 10;
  let level: EquityLevel;
  let errorColor: string;
  if (combinedError <= 2) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (combinedError <= 5) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (combinedError <= 10) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = combinedError <= 5;
  const errorLabel =
    combinedError <= 2
      ? "Excellent"
      : combinedError <= 5
      ? `Juste (erreur ${combinedError} pts)`
      : combinedError <= 10
      ? `Proche (erreur ${combinedError} pts)`
      : `Faux (erreur ${combinedError} pts)`;
  return {
    isCorrect,
    level,
    signedError: errorICM,
    errorColor,
    errorLabel,
    errorChip,
    errorICM,
    trueEqChip,
    trueEqICM,
  };
}

// ---- M4.3 — position-adjusted BF : scoring sur erreur composite BF_base + BF_adj ----
function gradeM43(
  userBfBase: number,
  userBfAdjusted: number,
  spot: PositionBubbleFactorSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  errorBase: number;
  errorAdjusted: number;
  trueBfBase: number;
  trueBfAdjusted: number;
} {
  const trueBfBase = spot.expected.baseBubbleFactor;
  const trueBfAdjusted = spot.expected.adjustedBubbleFactor;
  const errorBase = Math.round((userBfBase - trueBfBase) * 100) / 100;
  const errorAdjusted = Math.round((userBfAdjusted - trueBfAdjusted) * 100) / 100;
  // Erreur composite : moyenne quadratique sur les deux BF.
  const combinedError =
    Math.round(
      Math.sqrt((errorBase * errorBase + errorAdjusted * errorAdjusted) / 2) * 100
    ) / 100;
  let level: EquityLevel;
  let errorColor: string;
  if (combinedError <= 0.15) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (combinedError <= 0.4) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (combinedError <= 0.8) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = combinedError <= 0.4;
  const errorLabel =
    combinedError <= 0.15
      ? "Excellent"
      : combinedError <= 0.4
      ? `Juste (erreur ${combinedError.toFixed(2)})`
      : combinedError <= 0.8
      ? `Proche (erreur ${combinedError.toFixed(2)})`
      : `Faux (erreur ${combinedError.toFixed(2)})`;
  return {
    isCorrect,
    level,
    signedError: errorAdjusted,
    errorColor,
    errorLabel,
    errorBase,
    errorAdjusted,
    trueBfBase,
    trueBfAdjusted,
  };
}

// ---- M4.4 — équité ICM hero en FT : scoring sur l'erreur (pts %) ----
function gradeM44(
  userEquityPct: number,
  spot: FinalTableSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  truePct: number;
} {
  const truePct = spot.expected.heroEquityBefore;
  const signedError = Math.round((userEquityPct - truePct) * 10) / 10;
  const absErr = Math.abs(signedError);
  let level: EquityLevel;
  let errorColor: string;
  if (absErr <= 1.5) {
    level = "excellent";
    errorColor = "var(--green)";
  } else if (absErr <= 3) {
    level = "juste";
    errorColor = "var(--green)";
  } else if (absErr <= 6) {
    level = "proche";
    errorColor = "var(--amber)";
  } else {
    level = "faux";
    errorColor = "var(--red)";
  }
  const isCorrect = absErr <= 3;
  const sign = signedError > 0 ? "+" : "";
  const dir = signedError > 0 ? "surestimé" : "sous-estimé";
  const errorLabel =
    absErr <= 1.5
      ? "Excellent"
      : absErr <= 3
      ? `Juste (${sign}${signedError} %)`
      : absErr <= 6
      ? `Proche (${sign}${signedError} % ${dir})`
      : `Faux (${sign}${signedError} % ${dir})`;
  return { isCorrect, level, signedError, errorColor, errorLabel, truePct };
}

// ---- M5.1 — Nash push range : scoring binaire (push/fold correct ou non) ----
function gradeM51(
  userAction: "push" | "fold",
  spot: NashPushSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number; // +1 = over-push, -1 = under-push, 0 = correct
  errorColor: string;
  errorLabel: string;
  nashAction: "push" | "fold";
} {
  const nashAction = spot.expected.nashAction;
  const isCorrect = userAction === nashAction;
  let signedError = 0;
  if (!isCorrect) {
    signedError = userAction === "push" ? 1 : -1;
  }
  const level: EquityLevel = isCorrect ? "excellent" : "faux";
  const errorColor: string = isCorrect ? "var(--green)" : "var(--red)";
  const errorLabel = isCorrect
    ? `Correct (Nash : ${nashAction})`
    : userAction === "push"
    ? "Sur-push (Nash dit fold)"
    : "Sous-push (Nash dit push)";
  return { isCorrect, level, signedError, errorColor, errorLabel, nashAction };
}

// ---- M5.2 — BB call : scoring binaire (call/fold correct ou non) ----
function gradeM52(
  userAction: "call" | "fold",
  spot: BBCallSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number; // +1 = over-call, -1 = under-call, 0 = correct
  errorColor: string;
  errorLabel: string;
  nashAction: "call" | "fold";
} {
  const nashAction = spot.expected.nashAction;
  const isCorrect = userAction === nashAction;
  let signedError = 0;
  if (!isCorrect) signedError = userAction === "call" ? 1 : -1;
  const level: EquityLevel = isCorrect ? "excellent" : "faux";
  const errorColor: string = isCorrect ? "var(--green)" : "var(--red)";
  const errorLabel = isCorrect
    ? `Correct (Nash : ${nashAction})`
    : userAction === "call"
    ? "Sur-call (Nash dit fold)"
    : "Sous-call (Nash dit call)";
  return { isCorrect, level, signedError, errorColor, errorLabel, nashAction };
}

// ---- M5.3 — BTN push : scoring binaire push/fold ----
function gradeM53(
  userAction: "push" | "fold",
  spot: BTNPushSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  nashAction: "push" | "fold";
} {
  const nashAction = spot.expected.nashAction;
  const isCorrect = userAction === nashAction;
  let signedError = 0;
  if (!isCorrect) signedError = userAction === "push" ? 1 : -1;
  const level: EquityLevel = isCorrect ? "excellent" : "faux";
  const errorColor: string = isCorrect ? "var(--green)" : "var(--red)";
  const errorLabel = isCorrect
    ? `Correct (Nash : ${nashAction})`
    : userAction === "push"
    ? "Sur-push (Nash dit fold)"
    : "Sous-push (Nash dit push)";
  return { isCorrect, level, signedError, errorColor, errorLabel, nashAction };
}

// ---- M5.4 — Position defense : scoring binaire call/fold ----
function gradeM54(
  userAction: "call" | "fold",
  spot: PositionDefenseSpot
): {
  isCorrect: boolean;
  level: EquityLevel;
  signedError: number;
  errorColor: string;
  errorLabel: string;
  nashAction: "call" | "fold";
} {
  const nashAction = spot.expected.nashAction;
  const isCorrect = userAction === nashAction;
  let signedError = 0;
  if (!isCorrect) signedError = userAction === "call" ? 1 : -1;
  const level: EquityLevel = isCorrect ? "excellent" : "faux";
  const errorColor: string = isCorrect ? "var(--green)" : "var(--red)";
  const errorLabel = isCorrect
    ? `Correct (Nash : ${nashAction})`
    : userAction === "call"
    ? "Sur-call (Nash dit fold)"
    : "Sous-call (Nash dit call)";
  return { isCorrect, level, signedError, errorColor, errorLabel, nashAction };
}

interface CorrStep {
  num: string;
  label: string;
  userText?: string;
  ok?: boolean;
  body: ReactNode;
}

const SUBMODULE_TITLES: Record<string, string> = {
  "m1.1": "Pot odds · Sous-module 1",
  "m1.2": "Conversion · Sous-module 2",
  "m1.3": "Cotes implicites · Sous-module 3",
  "m1.4": "Reverse implied · Sous-module 4",
  "m2.1": "Outs & règle 4&2 · Sous-module 1",
  "m2.2": "Equity heads-up · Sous-module 2",
  "m2.3": "Equity multiway · Sous-module 3",
  "m2.4": "Equity vs range · Sous-module 4",
  "m3.1": "Push/fold sub-15bb · Sous-module 1",
  "m3.2": "Fold equity et décomposition · Sous-module 2",
  "m3.3": "EV composites multi-branches · Sous-module 3",
  "m3.4": "Check-raise et lignes complexes · Sous-module 4",
  "m4.1": "Calcul équité ICM · Sous-module 1",
  "m4.2": "Bubble factor et risk premium · Sous-module 2",
  "m4.3": "Adjustments par position · Sous-module 3",
  "m4.4": "Table finale ICM · Sous-module 4",
  "m5.1": "SB push range Nash sub-15bb · Sous-module 1",
  "m5.2": "BB call vs SB push · Sous-module 2",
  "m5.3": "BTN push range Nash · Sous-module 3",
  "m5.4": "Call ranges par position · Sous-module 4",
};

const MODULE_ROMAN: Record<string, string> = {
  m1: "I",
  m2: "II",
  m3: "III",
  m4: "IV",
  m5: "V",
};

function canValidate(spot: GenericSpot, a: UserAnswer): boolean {
  if (isBBCall(spot) || isPositionDefense(spot)) {
    return a.nashCallActionInput !== null;
  }
  if (isBTNPush(spot)) {
    return a.nashActionInput !== null;
  }
  if (isNashPush(spot)) {
    return a.nashActionInput !== null;
  }
  if (isFinalTable(spot)) {
    return parseAnswerNumber(a.equityIcmFtInput) !== null;
  }
  if (isPositionBubbleFactor(spot)) {
    return (
      parseAnswerNumber(a.bfBaseInput) !== null &&
      parseAnswerNumber(a.bfAdjustedInput) !== null
    );
  }
  if (isBubbleFactor(spot)) {
    return (
      parseAnswerNumber(a.equityChipReqInput) !== null &&
      parseAnswerNumber(a.equityIcmReqInput) !== null
    );
  }
  if (isICM(spot)) {
    return parseAnswerNumber(a.equityIcmInput) !== null;
  }
  if (isCheckRaise(spot)) {
    const pf = parseAnswerNumber(a.pFoldCRInput);
    const pc = parseAnswerNumber(a.pCallCRInput);
    const eq = parseAnswerNumber(a.equityCRInput);
    if (pf === null || pc === null || eq === null) return false;
    // p3Bet = 100 − pFold − pCall doit rester ≥ 0 (tolérance ±1).
    return pf + pc <= 101;
  }
  if (isFoldEquity(spot)) {
    return parseAnswerNumber(a.pFoldBreakevenInput) !== null;
  }
  if (isMultiBranch(spot)) {
    const pf = parseAnswerNumber(a.pFoldBranchInput);
    const pc = parseAnswerNumber(a.pCallBranchInput);
    const pr = parseAnswerNumber(a.pRaiseBranchInput);
    if (pf === null || pc === null || pr === null) return false;
    // Saisie décomposée : la somme des 3 branches doit faire 100 % (± 1).
    return Math.abs(pf + pc + pr - 100) <= 1;
  }
  if (isPushFold(spot)) {
    return (
      parseAnswerNumber(a.pFoldInput) !== null &&
      parseAnswerNumber(a.equityCallInput) !== null
    );
  }
  if (isVsRange(spot) || isMultiway(spot) || isEquity(spot)) {
    return parseAnswerNumber(a.equityHu) !== null;
  }
  if (isOuts(spot)) {
    return (
      parseAnswerNumber(a.outsInput) !== null &&
      parseAnswerNumber(a.equityInput) !== null
    );
  }
  if (isConversion(spot)) {
    return spot.ask === "ratio"
      ? parseRatio(a.ratio) !== null
      : parseAnswerNumber(a.requiredEquity) !== null;
  }
  if (isImplied(spot)) {
    return parseAnswerNumber(a.requiredEquity) !== null && parseAnswerNumber(a.neededExtra) !== null;
  }
  if (isReverse(spot)) {
    return parseAnswerNumber(a.adjustedEquity) !== null && a.decision !== null;
  }
  // m1.1
  return (
    parseAnswerNumber(a.requiredEquity) !== null &&
    parseRatio(a.ratio) !== null &&
    a.decision !== null
  );
}

function grade(spot: GenericSpot, a: UserAnswer): { isCorrect: boolean; steps: CorrStep[] } {
  if (isBBCall(spot)) {
    if (a.nashCallActionInput === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM52(a.nashCallActionInput, spot).isCorrect, steps: [] };
  }
  if (isBTNPush(spot)) {
    if (a.nashActionInput === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM53(a.nashActionInput, spot).isCorrect, steps: [] };
  }
  if (isPositionDefense(spot)) {
    if (a.nashCallActionInput === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM54(a.nashCallActionInput, spot).isCorrect, steps: [] };
  }
  if (isNashPush(spot)) {
    if (a.nashActionInput === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM51(a.nashActionInput, spot).isCorrect, steps: [] };
  }
  if (isFinalTable(spot)) {
    const eq = parseAnswerNumber(a.equityIcmFtInput);
    if (eq === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM44(eq, spot).isCorrect, steps: [] };
  }
  if (isPositionBubbleFactor(spot)) {
    const bfBase = parseAnswerNumber(a.bfBaseInput);
    const bfAdj = parseAnswerNumber(a.bfAdjustedInput);
    if (bfBase === null || bfAdj === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM43(bfBase, bfAdj, spot).isCorrect, steps: [] };
  }
  if (isBubbleFactor(spot)) {
    // Correction dédiée (BubbleFactorCorrectionPanel) ; ici seulement isCorrect.
    const eqChip = parseAnswerNumber(a.equityChipReqInput);
    const eqICM = parseAnswerNumber(a.equityIcmReqInput);
    if (eqChip === null || eqICM === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM42(eqChip, eqICM, spot).isCorrect, steps: [] };
  }
  if (isICM(spot)) {
    // Correction dédiée (ICMCorrectionPanel) ; ici seulement isCorrect.
    const eq = parseAnswerNumber(a.equityIcmInput);
    if (eq === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM41(eq, spot).isCorrect, steps: [] };
  }
  if (isCheckRaise(spot)) {
    // Correction dédiée (CheckRaiseCorrectionPanel) ; ici seulement isCorrect.
    const pf = parseAnswerNumber(a.pFoldCRInput);
    const pc = parseAnswerNumber(a.pCallCRInput);
    const eq = parseAnswerNumber(a.equityCRInput);
    if (pf === null || pc === null || eq === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM34(pf, pc, eq, spot).isCorrect, steps: [] };
  }
  if (isFoldEquity(spot)) {
    // Correction dédiée (FoldEquityCorrectionPanel) ; ici seulement isCorrect.
    const be = parseAnswerNumber(a.pFoldBreakevenInput);
    if (be === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM32(be, spot).isCorrect, steps: [] };
  }
  if (isMultiBranch(spot)) {
    // Correction dédiée (MultiBranchCorrectionPanel) ; ici seulement isCorrect.
    const pf = parseAnswerNumber(a.pFoldBranchInput);
    const pc = parseAnswerNumber(a.pCallBranchInput);
    const pr = parseAnswerNumber(a.pRaiseBranchInput);
    if (pf === null || pc === null || pr === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM33(pf, pc, pr, spot).isCorrect, steps: [] };
  }
  if (isPushFold(spot)) {
    // Correction dédiée (PushFoldCorrectionPanel) ; ici seulement isCorrect.
    const pf = parseAnswerNumber(a.pFoldInput);
    const eq = parseAnswerNumber(a.equityCallInput);
    if (pf === null || eq === null) return { isCorrect: false, steps: [] };
    return { isCorrect: gradeM31(pf, eq, spot).isCorrect, steps: [] };
  }
  if (isVsRange(spot) || isMultiway(spot) || isEquity(spot)) {
    // Rendu de correction dédié (panel M2.2/M2.3) ; ici on ne fournit que
    // isCorrect pour handleValidate. Steps vides (non rendus pour ces modes).
    const ue = parseAnswerNumber(a.equityHu);
    const g = gradeM22(ue ?? 0, spot.expected.equity);
    return { isCorrect: ue !== null && g.isCorrect, steps: [] };
  }
  if (isOuts(spot)) {
    const outsUser = parseAnswerNumber(a.outsInput);
    const eqUser = parseAnswerNumber(a.equityInput);
    // Outs : comptage exact, aucune tolérance.
    const outsOk = outsUser !== null && Math.round(outsUser) === spot.expected.outs;
    // Equity : règle 4&2 approximative → tolérance ±5 points.
    const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.equityApprox) <= 5;
    const signed =
      eqUser === null ? 0 : Math.round((eqUser - spot.expected.equityApprox) * 10) / 10;
    const signedLabel =
      eqUser === null
        ? "—"
        : signed > 0
        ? `+${signed} % (surestimé)`
        : signed < 0
        ? `${signed} % (sous-estimé)`
        : "exact";
    return {
      isCorrect: outsOk && eqOk,
      steps: [
        {
          num: "01",
          label: "Compter les outs",
          userText: a.outsInput ? `${Math.round(outsUser ?? 0)}` : "—",
          ok: outsOk,
          body: (
            <FormulaBox>
              <Lbl>Tirage</Lbl> {spot.drawDescription}
              <br />
              <Lbl>Outs corrects</Lbl>{" "}
              <Mono className="!text-purple-300">{spot.expected.outs}</Mono>
              <br />
              <span className="text-text-muted">
                Le comptage est exact : une carte est un out, ou ne l&apos;est pas.
              </span>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: `Règle des 4 et 2 (${spot.street})`,
          userText: a.equityInput ? fmtPercent(eqUser ?? 0) : "—",
          ok: eqOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> outs × {spot.expected.multiplier} ={" "}
              {spot.street === "flop" ? "equity (2 cartes à venir)" : "equity (1 carte à venir)"}
              <br />
              <Lbl>Application</Lbl> {spot.expected.outs} × {spot.expected.multiplier} ={" "}
              <Mono className="!text-purple-300">
                {fmtPercent(spot.expected.equityApprox)}
              </Mono>
              <br />
              <span className="text-text-muted">Erreur signée : {signedLabel}</span>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isConversion(spot)) {
    const askRatio = spot.ask === "ratio";
    const exp = askRatio ? spot.expected.ratio : spot.expected.requiredEquity;
    const got = askRatio ? parseRatio(a.ratio) : parseAnswerNumber(a.requiredEquity);
    const tol = askRatio ? TOL_RATIO : TOL_PCT;
    const ok = got !== null && Math.abs(got - exp) <= tol;
    return {
      isCorrect: ok,
      steps: [
        {
          num: "01",
          label: "Le format demandé",
          body: (
            <FormulaBox>
              {spot.given ? (
                <>
                  On te donne{" "}
                  <Mono>
                    {spot.given.kind === "ratio" ? fmtRatio(spot.given.value) : fmtPercent(spot.given.value)}
                  </Mono>
                  <br />
                </>
              ) : null}
              Tu dois fournir : <strong className="text-text">{askRatio ? "la cote (ratio)" : "l'equity requise (%)"}</strong>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: askRatio ? "Convertir % → ratio" : "Convertir ratio → %",
          userText: askRatio
            ? a.ratio
              ? fmtRatio(parseRatio(a.ratio) ?? 0)
              : "—"
            : a.requiredEquity
            ? fmtPercent(parseAnswerNumber(a.requiredEquity) ?? 0)
            : "—",
          ok,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> {askRatio ? "R = (100 − %) / %" : "% = 1 / (R + 1)"}
              <br />
              <Lbl>Résultat</Lbl>{" "}
              <Mono className="!text-purple-300">
                {askRatio ? fmtRatio(spot.expected.ratio) : fmtPercent(spot.expected.requiredEquity)}
              </Mono>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isImplied(spot)) {
    const eqUser = parseAnswerNumber(a.requiredEquity);
    const extraUser = parseAnswerNumber(a.neededExtra);
    const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOL_PCT;
    const extraOk = extraUser !== null && Math.abs(extraUser - spot.expected.neededExtraBb) <= TOL_BB;
    return {
      isCorrect: eqOk && extraOk,
      steps: [
        {
          num: "01",
          label: "Equity requise (cote brute)",
          userText: a.requiredEquity ? fmtPercent(eqUser ?? 0) : "—",
          ok: eqOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> bet / (pot + 2 × bet)
              <br />
              <Lbl>Application</Lbl> {fmtBb(spot.betBb)} / {fmtBb(spot.expected.finalPotBb)} ={" "}
              <Mono className="!text-purple-300">{fmtPercent(spot.expected.requiredEquity)}</Mono>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: "Gain futur moyen requis",
          userText: a.neededExtra ? `${fmtBb(extraUser ?? 0)}` : "—",
          ok: extraOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> X = (bet / equity) − pot final
              <br />
              <Lbl>Application</Lbl> ({fmtBb(spot.betBb)} / {(spot.realEquity / 100).toFixed(2)}) −{" "}
              {fmtBb(spot.expected.finalPotBb)} ={" "}
              <Mono className="!text-purple-300">{fmtBb(spot.expected.neededExtraBb)}</Mono>
              <br />
              <span className="text-text-muted">
                Tirage : {spot.drawDescription} (~{spot.realEquity} % d&apos;equity)
              </span>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  if (isReverse(spot)) {
    const adjUser = parseAnswerNumber(a.adjustedEquity);
    const adjOk = adjUser !== null && Math.abs(adjUser - spot.expected.adjustedEquity) <= TOL_PCT;
    const expectedDecision: "call" | "fold" =
      spot.expected.adjustedEquity >= spot.expected.requiredEquity ? "call" : "fold";
    const decisionOk = a.decision === expectedDecision;
    return {
      isCorrect: adjOk && decisionOk,
      steps: [
        {
          num: "01",
          label: "Equity ajustée (reverse implied)",
          userText: a.adjustedEquity ? fmtPercent(adjUser ?? 0) : "—",
          ok: adjOk,
          body: (
            <FormulaBox>
              <Lbl>Formule</Lbl> apparente − pénalité reverse
              <br />
              <Lbl>Application</Lbl> {fmtPercent(spot.apparentEquity)} (apparente) →{" "}
              <Mono className="!text-purple-300">{fmtPercent(spot.expected.adjustedEquity)}</Mono> (effective)
              <br />
              <span className="text-text-muted">Main : {spot.handDescription}</span>
            </FormulaBox>
          ),
        },
        {
          num: "02",
          label: "Décider sur l'equity réelle",
          userText: a.decision ?? "—",
          ok: decisionOk,
          body: (
            <FormulaBox>
              Equity requise = <Mono>{fmtPercent(spot.expected.requiredEquity)}</Mono>
              <br />
              Equity effective <Mono>{fmtPercent(spot.expected.adjustedEquity)}</Mono>{" "}
              {expectedDecision === "call" ? "≥" : "<"} requise → <strong className="text-text capitalize">{expectedDecision}</strong>
            </FormulaBox>
          ),
        },
      ],
    };
  }

  // m1.1 — pot odds basiques
  const eqUser = parseAnswerNumber(a.requiredEquity);
  const ratioUser = parseRatio(a.ratio);
  const eqOk = eqUser !== null && Math.abs(eqUser - spot.expected.requiredEquity) <= TOL_PCT;
  const ratioOk = ratioUser !== null && Math.abs(ratioUser - spot.expected.ratio) <= TOL_RATIO;
  const expectedDecision: "call" | "fold" = spot.expected.requiredEquity < 40 ? "call" : "fold";
  const decisionOk = a.decision === expectedDecision;
  return {
    isCorrect: eqOk && ratioOk && decisionOk,
    steps: [
      {
        num: "01",
        label: "Identifier les montants en jeu",
        body: (
          <FormulaBox>
            Pot avant ton call = <Mono>{fmtBb(spot.potBb)}</Mono>
            <br />
            Mise du vilain = <Mono>{fmtBb(spot.betBb)}</Mono>
            <br />
            <span className="text-text-muted">Pot final si tu calles =</span>{" "}
            <Mono>{fmtBb(spot.expected.finalPotBb)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "02",
        label: "Calculer la cote du pot",
        userText: a.ratio ? fmtRatio(parseRatio(a.ratio) ?? 0) : "—",
        ok: ratioOk,
        body: (
          <FormulaBox>
            <Lbl>Formule</Lbl> Ratio = (pot + bet) / bet
            <br />
            <Lbl>Application</Lbl> ({fmtBb(spot.potBb)} + {fmtBb(spot.betBb)}) / {fmtBb(spot.betBb)} ={" "}
            <Mono className="!text-purple-300">{fmtRatio(spot.expected.ratio)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "03",
        label: "En déduire l'equity requise",
        userText: a.requiredEquity ? fmtPercent(parseAnswerNumber(a.requiredEquity) ?? 0) : "—",
        ok: eqOk,
        body: (
          <FormulaBox>
            <Lbl>Formule</Lbl> Equity requise = bet / (pot + 2 × bet)
            <br />
            <Lbl>Application</Lbl> {fmtBb(spot.betBb)} / {fmtBb(spot.expected.finalPotBb)} ={" "}
            <Mono className="!text-purple-300">{fmtPercent(spot.expected.requiredEquity)}</Mono>
          </FormulaBox>
        ),
      },
      {
        num: "04",
        label: "Décider",
        userText: a.decision ?? "—",
        ok: decisionOk,
        body: (
          <FormulaBox>
            Si ton equity estimée &gt; <Mono>{fmtPercent(spot.expected.requiredEquity)}</Mono> →{" "}
            <strong className="text-text">call</strong>
            <br />
            <span className="text-text-muted">Bonne réponse :</span>{" "}
            <strong className="text-text capitalize">{expectedDecision}</strong>
          </FormulaBox>
        ),
      },
    ],
  };
}

function actionFor(spot: GenericSpot): ReactNode {
  // EquitySpot/OutsSpot ont leur énoncé rendu inline (jamais via actionFor) ;
  // ces gardes assurent la totalité de type (pas de potBb ni positions).
  if (isBBCall(spot)) return null;
  if (isBTNPush(spot)) return null;
  if (isPositionDefense(spot)) return null;
  if (isNashPush(spot)) return null;
  if (isFinalTable(spot)) return null;
  if (isPositionBubbleFactor(spot)) return null;
  if (isBubbleFactor(spot)) return null;
  if (isICM(spot)) return null;
  if (isCheckRaise(spot)) return null;
  if (isFoldEquity(spot)) return null;
  if (isMultiBranch(spot)) return null;
  if (isPushFold(spot)) return null;
  if (isVsRange(spot)) return null;
  if (isMultiway(spot)) return null;
  if (isEquity(spot)) return null;
  if (isOuts(spot)) return null;
  if (isImplied(spot)) {
    return (
      <>
        Le {spot.villainPosition} <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de{" "}
        <BetTag>{fmtBb(spot.potBb)}</BetTag>. Tu as un {spot.drawDescription} (~{spot.realEquity} % equity).
      </>
    );
  }
  if (isReverse(spot)) {
    return (
      <>
        Tu as {spot.handDescription} (apparente ~{spot.apparentEquity} %). Le {spot.villainPosition}{" "}
        <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de <BetTag>{fmtBb(spot.potBb)}</BetTag>.
      </>
    );
  }
  return (
    <>
      Le {spot.villainPosition} <BetTag>bet {fmtBb(spot.betBb)}</BetTag> dans un pot de{" "}
      <BetTag>{fmtBb(spot.potBb)}</BetTag>. Action sur toi.
    </>
  );
}

function questionFor(spot: GenericSpot): string {
  if (isConversion(spot)) {
    const base =
      spot.ask === "ratio"
        ? "Donne la cote du pot au format X:1."
        : "Donne l'equity requise en pourcentage.";
    if (spot.given) {
      const g =
        spot.given.kind === "ratio"
          ? `cote ${spot.given.value.toFixed(2)} : 1`
          : `${spot.given.value.toFixed(1)} %`;
      return `On te donne ${g}. ${base}`;
    }
    return base;
  }
  if (isImplied(spot)) {
    return "Calcule l'equity requise, puis le gain futur moyen à extraire pour rendre le call break-even.";
  }
  if (isReverse(spot)) {
    return "Estime l'equity effective (reverse implied) puis décide.";
  }
  return "Calcule la cote du pot, l'equity requise pour caller, et donne ta décision.";
}

function DrillContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const urlSubmoduleId = params.submoduleId as string;
  const dbSubmoduleSlug = urlSlugToDbSlug(urlSubmoduleId);
  const moduleSlug = moduleSlugFromSubmodule(dbSubmoduleSlug);
  const isRetryMode = searchParams.get("mode") === "retry";

  const { userId, isReady } = useCurrentUser();
  const completion = useQuery(
    api.theoryCompletions.getCompletion,
    userId ? { userId, submoduleSlug: dbSubmoduleSlug } : "skip"
  );

  const [spot, setSpot] = useState<GenericSpot | null>(null);
  const [retrySpots, setRetrySpots] = useState<GenericSpot[] | null>(null);
  const [answer, setAnswer] = useState<UserAnswer>(EMPTY_ANSWER);
  const [showCorrection, setShowCorrection] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [spotIndex, setSpotIndex] = useState(1);
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const startSession = useMutation(api.sessions.startSession);
  const recordAttempt = useMutation(api.attempts.recordAttempt);
  const addSpotToSession = useMutation(api.sessions.addSpotToSession);
  const endSession = useMutation(api.sessions.endSession);

  const generator = getGenerator(dbSubmoduleSlug);
  const isTheoryCompleted =
    completion !== undefined && completion !== null && completion.quickCheckScore >= 2;

  // Mode retry : charge les spots ratés
  useEffect(() => {
    if (isRetryMode && retrySpots === null) {
      const raw = sessionStorage.getItem("retrySpots");
      if (raw) {
        try {
          setRetrySpots(JSON.parse(raw) as GenericSpot[]);
          sessionStorage.removeItem("retrySpots");
        } catch {
          setRetrySpots([]);
        }
      } else {
        setRetrySpots([]);
      }
    }
  }, [isRetryMode, retrySpots]);

  // Start session — UNIQUEMENT si théorie validée ou mode rejeu (fix S4a : plus de session zombie)
  useEffect(() => {
    if (!isReady || !userId || sessionId) return;
    if (!isTheoryCompleted && !isRetryMode) return;
    startSession({ userId, moduleSlug, submoduleSlug: dbSubmoduleSlug }).then(setSessionId);
  }, [isReady, userId, sessionId, isTheoryCompleted, isRetryMode, moduleSlug, dbSubmoduleSlug, startSession]);

  // Génère le spot
  useEffect(() => {
    if (!sessionId || spot || !generator) return;
    if (isRetryMode) {
      if (retrySpots && retrySpots.length > 0 && spotIndex <= retrySpots.length) {
        setSpot(retrySpots[spotIndex - 1]);
        startedAtRef.current = Date.now();
      } else if (retrySpots && retrySpots.length === 0) {
        window.location.href = `/drill/${urlSubmoduleId}`;
      }
    } else {
      setSpot(generator());
      startedAtRef.current = Date.now();
    }
  }, [spot, sessionId, isRetryMode, retrySpots, spotIndex, generator, urlSubmoduleId]);

  const stats = useMemo(() => {
    const correct = attempts.filter((a) => a.isCorrect).length;
    const wrong = attempts.length - correct;
    const avgTimeMs = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length)
      : 0;
    return { correct, wrong, avgTimeMs };
  }, [attempts]);

  const totalSpots = isRetryMode ? retrySpots?.length ?? SPOTS_PER_SESSION : SPOTS_PER_SESSION;

  if (!generator) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted mb-4">Sous-module indisponible : {urlSubmoduleId}.</div>
        <Link href="/" className="text-purple-400 hover:underline">Retour à l&apos;Atelier</Link>
      </main>
    );
  }

  if (completion === undefined) {
    return (
      <main className="max-w-[720px] mx-auto px-8 py-16">
        <div className="text-text-muted">Chargement…</div>
      </main>
    );
  }

  if (!isTheoryCompleted && !isRetryMode) {
    return (
      <main className="max-w-[720px] mx-auto px-8 pt-16 pb-24">
        <div style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: "var(--purple-glow)", border: "0.5px solid rgba(167, 139, 250, 0.3)", color: "var(--purple-300)", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
            ◆ Théorie à lire
          </div>
          <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] mb-4 bg-gradient-text">
            Lis la théorie d&apos;abord.
          </h1>
          <p className="text-[15px] text-text-muted mb-8 max-w-[520px] leading-[1.65]">
            Le drill se débloque après lecture de la théorie et validation du quick check (2/3 minimum). C&apos;est la garantie que tu drilles avec les bons outils mentaux, pas dans le vide.
          </p>
          <Link
            href={`/module/${moduleSlug}/theory/${urlSubmoduleId}`}
            className="inline-block px-6 py-3.5 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 hover:-translate-y-px text-white"
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
            }}
          >
            Lire la théorie →
          </Link>
        </div>
      </main>
    );
  }

  if (!isReady || !sessionId || !spot) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="text-text-muted">Préparation de la session…</div>
      </main>
    );
  }

  const validatable = canValidate(spot, answer);

  async function handleValidate() {
    if (!spot || !userId || !sessionId) return;
    const result = grade(spot, answer);
    const timeMs = Date.now() - startedAtRef.current;
    // Erreur signée (calibration tracking) : pour M2.1, écart estimation
    // d'equity − vraie valeur. Optionnel ailleurs (juste/faux pur).
    let signedError: number | undefined;
    if (isBBCall(spot)) {
      if (answer.nashCallActionInput !== null) {
        signedError = gradeM52(answer.nashCallActionInput, spot).signedError;
      }
    } else if (isBTNPush(spot)) {
      if (answer.nashActionInput !== null) {
        signedError = gradeM53(answer.nashActionInput, spot).signedError;
      }
    } else if (isPositionDefense(spot)) {
      if (answer.nashCallActionInput !== null) {
        signedError = gradeM54(answer.nashCallActionInput, spot).signedError;
      }
    } else if (isNashPush(spot)) {
      // signedError = +1 (over-push) / -1 (under-push) / 0 (correct)
      if (answer.nashActionInput !== null) {
        signedError = gradeM51(answer.nashActionInput, spot).signedError;
      }
    } else if (isFinalTable(spot)) {
      // signedError = erreur d'équité ICM en pts %.
      const eq = parseAnswerNumber(answer.equityIcmFtInput);
      if (eq !== null) {
        signedError = gradeM44(eq, spot).signedError;
      }
    } else if (isPositionBubbleFactor(spot)) {
      // signedError = erreur sur BF ajusté (la métrique pédagogique de M4.3).
      const bfBase = parseAnswerNumber(answer.bfBaseInput);
      const bfAdj = parseAnswerNumber(answer.bfAdjustedInput);
      if (bfBase !== null && bfAdj !== null) {
        signedError = gradeM43(bfBase, bfAdj, spot).signedError;
      }
    } else if (isBubbleFactor(spot)) {
      // signedError = erreur d'équité ICM requise en pts % (la plus pédagogique).
      const eqChip = parseAnswerNumber(answer.equityChipReqInput);
      const eqICM = parseAnswerNumber(answer.equityIcmReqInput);
      if (eqChip !== null && eqICM !== null) {
        signedError = gradeM42(eqChip, eqICM, spot).signedError;
      }
    } else if (isICM(spot)) {
      // signedError = erreur d'équité ICM en pts %.
      const eq = parseAnswerNumber(answer.equityIcmInput);
      if (eq !== null) {
        signedError = gradeM41(eq, spot).signedError;
      }
    } else if (isCheckRaise(spot)) {
      const pf = parseAnswerNumber(answer.pFoldCRInput);
      const pc = parseAnswerNumber(answer.pCallCRInput);
      const eq = parseAnswerNumber(answer.equityCRInput);
      if (pf !== null && pc !== null && eq !== null) {
        signedError = gradeM34(pf, pc, eq, spot).signedError;
      }
    } else if (isFoldEquity(spot)) {
      // signedError = erreur de pFoldBreakeven en points de %.
      const be = parseAnswerNumber(answer.pFoldBreakevenInput);
      if (be !== null) {
        signedError = gradeM32(be, spot).signedError;
      }
    } else if (isMultiBranch(spot)) {
      // signedError = erreur d'EV en bb (cohérence avec M3.1).
      const pf = parseAnswerNumber(answer.pFoldBranchInput);
      const pc = parseAnswerNumber(answer.pCallBranchInput);
      const pr = parseAnswerNumber(answer.pRaiseBranchInput);
      if (pf !== null && pc !== null && pr !== null) {
        signedError = gradeM33(pf, pc, pr, spot).signedError;
      }
    } else if (isPushFold(spot)) {
      // signedError = erreur d'EV en bb (la métrique business du module).
      const pf = parseAnswerNumber(answer.pFoldInput);
      const eq = parseAnswerNumber(answer.equityCallInput);
      if (pf !== null && eq !== null) {
        signedError = gradeM31(pf, eq, spot).signedError;
      }
    } else if (isVsRange(spot) || isMultiway(spot) || isEquity(spot)) {
      const ue = parseAnswerNumber(answer.equityHu);
      if (ue !== null) {
        signedError = Math.round((ue - spot.expected.equity) * 10) / 10;
      }
    } else if (isOuts(spot)) {
      const ue = parseAnswerNumber(answer.equityInput);
      if (ue !== null) {
        signedError = Math.round((ue - spot.expected.equityApprox) * 10) / 10;
      }
    }
    const attemptId = await recordAttempt({
      userId,
      submoduleSlug: dbSubmoduleSlug,
      spotId: spot.id,
      spotSnapshot: spot,
      expected: spot.expected,
      userAnswer: answer,
      isCorrect: result.isCorrect,
      timeMs,
      hintUsed: false,
      ...(signedError !== undefined ? { signedError } : {}),
    });
    await addSpotToSession({ sessionId, attemptId, orderIndex: spotIndex - 1, isCorrect: result.isCorrect });
    setAttempts((prev) => [...prev, { spotId: spot.id, isCorrect: result.isCorrect, timeMs }]);
    setShowCorrection(true);
  }

  async function handleNext() {
    if (spotIndex >= totalSpots && sessionId) {
      await endSession({ sessionId });
      window.location.href = `/drill/${urlSubmoduleId}/review?session=${sessionId}`;
      return;
    }
    if (isRetryMode && retrySpots) {
      setSpot(retrySpots[spotIndex]);
    } else if (generator) {
      setSpot(generator());
    }
    startedAtRef.current = Date.now();
    setAnswer(EMPTY_ANSWER);
    setShowCorrection(false);
    setSpotIndex((i) => i + 1);
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-12">
      <div className="flex justify-between items-end mb-10 pb-6" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-2 flex items-center gap-2">
            Module {MODULE_ROMAN[moduleSlug] ?? moduleSlug} · {SUBMODULE_TITLES[dbSubmoduleSlug] ?? dbSubmoduleSlug}
            {isRetryMode && (
              <span
                className="px-2 py-0.5 rounded normal-case tracking-normal"
                style={{ background: "var(--amber-glow)", border: "0.5px solid rgba(251, 191, 36, 0.3)", color: "var(--amber)", fontSize: 10 }}
              >
                Mode rejeu · {totalSpots} spot{totalSpots > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="text-4xl font-semibold tracking-[-0.03em] leading-none">
            Spot {spotIndex}
            <span className="text-text-faint font-normal"> / {totalSpots}</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <ScoreStat label="Réussis" value={stats.correct} color="var(--green)" />
          <ScoreStat label="Ratés" value={stats.wrong} color="var(--red)" />
          <ScoreStat
            label="Temps moy."
            value={fmtDurationCompact(stats.avgTimeMs)}
            unit={fmtDurationCompactUnit(stats.avgTimeMs)}
            pad={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-8">
        {isBBCall(spot) ? (
          <BBCallTable spot={spot} />
        ) : isBTNPush(spot) ? (
          <BTNPushTable spot={spot} />
        ) : isPositionDefense(spot) ? (
          <PositionDefenseTable spot={spot} />
        ) : isNashPush(spot) ? (
          <NashPushTable spot={spot} />
        ) : isFinalTable(spot) ? (
          <FinalTableTable spot={spot} />
        ) : isPositionBubbleFactor(spot) ? (
          <PositionBubbleFactorTable spot={spot} />
        ) : isBubbleFactor(spot) ? (
          <BubbleFactorTable spot={spot} />
        ) : isICM(spot) ? (
          <ICMTable spot={spot} />
        ) : isCheckRaise(spot) ? (
          <CheckRaiseTable spot={spot} />
        ) : isFoldEquity(spot) ? (
          <FoldEquityTable spot={spot} />
        ) : isMultiBranch(spot) ? (
          <MultiBranchTable spot={spot} />
        ) : isPushFold(spot) ? (
          <PushFoldTable spot={spot} />
        ) : isVsRange(spot) ? (
          <VsRangeTable spot={spot} />
        ) : isMultiway(spot) ? (
          <MultiwayTable spot={spot} />
        ) : isEquity(spot) ? (
          <EquityTable spot={spot} />
        ) : isOuts(spot) ? (
          <PokerTable
            contextTag="MTT · lecture d'outs"
            contextInfo={
              spot.street === "flop"
                ? "Flop — 2 cartes à venir"
                : "Turn — 1 carte à venir"
            }
            stacks={[]}
            heroCards={spot.heroCards}
            board={spot.board}
            action={
              <>
                Tu as ta main au {spot.street}. Tirage :{" "}
                <BetTag>{spot.drawDescription}</BetTag>.
              </>
            }
            question={
              spot.street === "flop"
                ? "Compte tes outs, puis applique la règle × 4 (flop)."
                : "Compte tes outs, puis applique la règle × 2 (turn)."
            }
          />
        ) : (
          <PokerTable
            contextTag="MTT · mid-stage"
            contextInfo={`${spot.effectiveStackBb}bb effective`}
            stacks={[
              { label: "Toi", bb: spot.effectiveStackBb, position: spot.heroPosition },
              { label: "Vilain", bb: spot.effectiveStackBb - 2, position: spot.villainPosition },
              { label: "Pot", bb: spot.potBb, position: "au flop" },
            ]}
            heroCards={spot.heroCards}
            board={spot.board}
            action={actionFor(spot)}
            question={questionFor(spot)}
          />
        )}

        {!showCorrection ? (
          <AnswerPanel
            spot={spot}
            answer={answer}
            setAnswer={setAnswer}
            canSubmit={validatable}
            onValidate={handleValidate}
          />
        ) : (
          <CorrectionPanel spot={spot} answer={answer} onNext={handleNext} />
        )}
      </div>
    </main>
  );
}

export default function DrillPage() {
  return (
    <Suspense fallback={<main className="max-w-[1200px] mx-auto px-8 py-12 text-text-muted">Préparation…</main>}>
      <DrillContent />
    </Suspense>
  );
}

function ScoreStat({
  label,
  value,
  color,
  unit,
  pad = true,
}: {
  label: string;
  value: string | number;
  color?: string;
  unit?: string;
  pad?: boolean;
}) {
  const display = pad && typeof value === "number" ? String(value).padStart(2, "0") : value;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-text-faint font-medium">{label}</span>
      <span className="text-2xl font-semibold font-mono leading-none tracking-tight" style={{ color }}>
        {display}
        {unit && <span className="text-xs text-text-faint font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function BetTag({ children }: { children: ReactNode }) {
  return (
    <strong
      className="font-mono font-medium text-[13px] px-1.5 py-0.5 rounded mx-0.5"
      style={{ color: "var(--purple-300)", background: "var(--purple-glow)" }}
    >
      {children}
    </strong>
  );
}

function AnswerPanel({
  spot,
  answer,
  setAnswer,
  canSubmit,
  onValidate,
}: {
  spot: GenericSpot;
  answer: UserAnswer;
  setAnswer: (a: UserAnswer) => void;
  canSubmit: boolean;
  onValidate: () => void;
}) {
  // M5.2 — BB call vs SB push : 2 boutons CALL / FOLD.
  if (isBBCall(spot)) {
    const chosen = answer.nashCallActionInput;
    return (
      <NashBinaryAnswerPanel
        eyebrow="Décision binaire — BB call Nash"
        title="Call ou fold ?"
        prompt={
          <>
            SB push <strong className="text-text">{spot.pushAmount} bb</strong>.
            Tu es BB. Pas de saisie — décision binaire mémorisée.
          </>
        }
        leftLabel="CALL"
        leftSubLabel={`Match SB pour gagner ${(spot.potBefore + spot.pushAmount).toFixed(1)} bb`}
        rightLabel="FOLD"
        rightSubLabel="Abandonner ta blind (−1 bb)"
        chosen={chosen}
        leftValue="call"
        rightValue="fold"
        onChoose={(v) => setAnswer({ ...answer, nashCallActionInput: v as "call" | "fold" })}
        canSubmit={canSubmit}
        onValidate={onValidate}
      />
    );
  }

  // M5.3 — BTN push : 2 boutons PUSH / FOLD.
  if (isBTNPush(spot)) {
    const chosen = answer.nashActionInput;
    return (
      <NashBinaryAnswerPanel
        eyebrow="Décision binaire — BTN push Nash"
        title="Push ou fold ?"
        prompt={
          <>
            Tu es BTN avec <strong className="text-text">{spot.heroStack} bb</strong>.
            SB et BB derrière. Pas de saisie — mémorisation.
          </>
        }
        leftLabel="PUSH"
        leftSubLabel={`All-in ${spot.heroStack} bb`}
        rightLabel="FOLD"
        rightSubLabel="Abandonner (0 bb)"
        chosen={chosen}
        leftValue="push"
        rightValue="fold"
        onChoose={(v) => setAnswer({ ...answer, nashActionInput: v as "push" | "fold" })}
        canSubmit={canSubmit}
        onValidate={onValidate}
      />
    );
  }

  // M5.4 — Position defense : 2 boutons CALL / FOLD avec contexte position.
  if (isPositionDefense(spot)) {
    const chosen = answer.nashCallActionInput;
    return (
      <NashBinaryAnswerPanel
        eyebrow={`Décision binaire — ${spot.heroPosition} defense`}
        title="Call ou fold ?"
        prompt={
          <>
            <strong className="text-text">{spot.villainPosition}</strong> push{" "}
            <strong className="text-text">{spot.pushAmount} bb</strong>. Tu es{" "}
            <strong className="text-text">{spot.heroPosition}</strong>. Pas de
            saisie — décision binaire par position.
          </>
        }
        leftLabel="CALL"
        leftSubLabel={`Match ${spot.pushAmount} bb pour gagner ${(spot.potBefore + spot.pushAmount).toFixed(1)} bb`}
        rightLabel="FOLD"
        rightSubLabel="Abandonner (0 bb)"
        chosen={chosen}
        leftValue="call"
        rightValue="fold"
        onChoose={(v) => setAnswer({ ...answer, nashCallActionInput: v as "call" | "fold" })}
        canSubmit={canSubmit}
        onValidate={onValidate}
      />
    );
  }

  // M5.1 — UX binaire : 2 boutons Push / Fold (pas de saisie numérique).
  if (isNashPush(spot)) {
    const chosen = answer.nashActionInput;
    return (
      <div
        className="rounded-xl p-7 flex flex-col"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="text-[11px] font-mono uppercase tracking-wider mb-2"
          style={{ color: "var(--purple-300)" }}
        >
          ◆ Décision binaire — Nash range
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Push ou fold ?
        </h2>
        <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">
          Tu es SB avec <strong className="text-text">{spot.heroStack} bb</strong>.
          Vilain BB (Nash). Pas de saisie — juste choisir entre les deux actions
          mémorisées.
        </p>
        <div className="flex flex-col gap-3 mb-2">
          <button
            onClick={() => setAnswer({ ...answer, nashActionInput: "push" })}
            className="rounded p-5 text-left transition-all duration-200 hover:-translate-y-px"
            style={{
              background:
                chosen === "push" ? "var(--purple-glow)" : "var(--surface-strong)",
              border: `0.5px solid ${
                chosen === "push" ? "var(--purple-400)" : "var(--border)"
              }`,
              color: chosen === "push" ? "var(--text)" : "var(--text-muted)",
              boxShadow:
                chosen === "push"
                  ? "0 0 0 0.5px var(--purple-400), 0 0 16px var(--purple-glow)"
                  : "none",
            }}
          >
            <div className="text-xl font-bold tracking-[-0.02em]">PUSH</div>
            <div className="text-[11px] font-mono text-text-faint mt-1">
              All-in {spot.heroStack} bb
            </div>
          </button>
          <button
            onClick={() => setAnswer({ ...answer, nashActionInput: "fold" })}
            className="rounded p-5 text-left transition-all duration-200 hover:-translate-y-px"
            style={{
              background:
                chosen === "fold" ? "var(--purple-glow)" : "var(--surface-strong)",
              border: `0.5px solid ${
                chosen === "fold" ? "var(--purple-400)" : "var(--border)"
              }`,
              color: chosen === "fold" ? "var(--text)" : "var(--text-muted)",
              boxShadow:
                chosen === "fold"
                  ? "0 0 0 0.5px var(--purple-400), 0 0 16px var(--purple-glow)"
                  : "none",
            }}
          >
            <div className="text-xl font-bold tracking-[-0.02em]">FOLD</div>
            <div className="text-[11px] font-mono text-text-faint mt-1">
              Abandonner les blinds (−0.5 bb)
            </div>
          </button>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M4.4 — saisie 1 champ : équité ICM hero en FT.
  if (isFinalTable(spot)) {
    const eq = parseAnswerNumber(answer.equityIcmFtInput);
    const totalChips = spot.players.reduce((acc, p) => acc + p.stack, 0);
    const heroPlayer = spot.players.find((pl) => pl.id === spot.heroId);
    const chipEq = heroPlayer ? (heroPlayer.stack / totalChips) * 100 : 0;
    return (
      <div
        className="rounded-xl p-7 flex flex-col"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="text-[11px] font-mono uppercase tracking-wider mb-2"
          style={{ color: "var(--purple-300)" }}
        >
          ◆ Calcule l&apos;équité ICM en FT
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Quelle est ton équité $ ?
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          {spot.playersRemaining} joueurs restants, payouts{" "}
          <strong className="text-text">{spot.payoutLabel}</strong>. Spread top-bottom :{" "}
          {spot.payoutSpread} pts. Estime ton équité ICM en % du prizepool.
        </p>
        <Field
          label="Équité ICM hero (%)"
          hint="En % du prizepool"
          value={answer.equityIcmFtInput}
          onChange={(v) => setAnswer({ ...answer, equityIcmFtInput: v })}
          placeholder="ex. 22.5"
        />
        <div
          className="rounded p-3.5 mb-1"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Chip equity hero (référence)
          </div>
          <div className="text-2xl font-mono font-semibold leading-none">
            {chipEq.toFixed(1)} %
          </div>
          {eq !== null && (
            <div className="text-[11px] text-text-muted mt-1.5 font-mono">
              Écart annoncé : {eq - chipEq >= 0 ? "+" : ""}
              {(eq - chipEq).toFixed(1)} pts vs chip equity
            </div>
          )}
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M4.3 — saisie 2 champs : BF base + BF ajusté. Position multiplier déduit en live.
  if (isPositionBubbleFactor(spot)) {
    const bfBase = parseAnswerNumber(answer.bfBaseInput);
    const bfAdj = parseAnswerNumber(answer.bfAdjustedInput);
    const multLive =
      bfBase !== null && bfBase > 0.01 && bfAdj !== null
        ? bfAdj / bfBase
        : null;
    return (
      <div
        className="rounded-xl p-7 flex flex-col"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="text-[11px] font-mono uppercase tracking-wider mb-2"
          style={{ color: "var(--purple-300)" }}
        >
          ◆ Position factor
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          BF brut, BF ajusté.
        </h2>
        <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">
          Position <strong className="text-text">{spot.heroPosition}</strong> avec{" "}
          <strong className="text-text">{spot.playersLeftToAct}</strong> joueurs derrière.
          Estime le BF brut (face à un vilain) puis le BF ajusté (incluant position
          factor = 0.15 × {spot.playersLeftToAct} = {Math.min(0.75, 0.15 * spot.playersLeftToAct).toFixed(2)}).
        </p>
        <Field
          label="BF brut (× 1 vilain)"
          hint="Sans position factor"
          value={answer.bfBaseInput}
          onChange={(v) => setAnswer({ ...answer, bfBaseInput: v })}
          placeholder="ex. 1.50"
        />
        <Field
          label="BF ajusté (× position)"
          hint="Avec position factor"
          value={answer.bfAdjustedInput}
          onChange={(v) => setAnswer({ ...answer, bfAdjustedInput: v })}
          placeholder="ex. 2.18"
        />
        <div
          className="rounded p-3.5 mb-1 flex items-center justify-between"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              Multiplier déduit (toi)
            </div>
            <div
              className="text-lg font-mono font-semibold leading-none"
              style={{ color: multLive === null ? "var(--text-faint)" : "var(--text)" }}
            >
              {multLive === null ? "—" : `× ${multLive.toFixed(2)}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              Multiplier attendu
            </div>
            <div
              className="text-2xl font-mono font-semibold leading-none"
              style={{ color: "var(--purple-300)" }}
            >
              × {spot.expected.positionMultiplier.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M4.2 — saisie 2 champs : équité chip requise + équité ICM requise.
  // Le BF se déduit en live via la relation eq_ICM / (1 - eq_ICM).
  if (isBubbleFactor(spot)) {
    const eqChip = parseAnswerNumber(answer.equityChipReqInput);
    const eqICM = parseAnswerNumber(answer.equityIcmReqInput);
    let bfLive: number | null = null;
    if (eqICM !== null && eqICM > 0 && eqICM < 100) {
      bfLive = eqICM / (100 - eqICM);
    }
    const taxPts =
      eqChip !== null && eqICM !== null ? eqICM - eqChip : null;
    return (
      <div
        className="rounded-xl p-7 flex flex-col"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="text-[11px] font-mono uppercase tracking-wider mb-2"
          style={{ color: "var(--purple-300)" }}
        >
          ◆ Calibre la taxe ICM
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Deux équités, un bubble factor.
        </h2>
        <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">
          Estime l&apos;équité <strong className="text-text">chip</strong> requise
          (pot odds standards) et l&apos;équité <strong className="text-text">ICM</strong>{" "}
          requise. Le BF se déduit : <span className="font-mono">eq_ICM / (1 − eq_ICM)</span>.
        </p>
        <Field
          label="Équité chip requise (%)"
          hint="Cash equivalent — call / pot"
          value={answer.equityChipReqInput}
          onChange={(v) => setAnswer({ ...answer, equityChipReqInput: v })}
          placeholder="ex. 50"
        />
        <Field
          label="Équité ICM requise (%)"
          hint="Plus élevée en bulle"
          value={answer.equityIcmReqInput}
          onChange={(v) => setAnswer({ ...answer, equityIcmReqInput: v })}
          placeholder="ex. 62"
        />
        <div
          className="rounded p-3.5 mb-1 flex items-center justify-between"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              Bubble factor déduit
            </div>
            <div
              className="text-lg font-mono font-semibold leading-none"
              style={{ color: bfLive === null ? "var(--text-faint)" : "var(--text)" }}
            >
              {bfLive === null ? "—" : bfLive.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              Taxe ICM (eq_ICM − eq_chip)
            </div>
            <div
              className="text-2xl font-mono font-semibold leading-none"
              style={{
                color:
                  taxPts === null
                    ? "var(--text-faint)"
                    : taxPts > 0
                    ? "var(--amber)"
                    : "var(--text-faint)",
              }}
            >
              {taxPts === null ? "—" : `${taxPts >= 0 ? "+" : ""}${taxPts.toFixed(1)} pts`}
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M4.1 — saisie directe : équité ICM hero en % du prizepool.
  if (isICM(spot)) {
    const eq = parseAnswerNumber(answer.equityIcmInput);
    const chipEq = spot.expected.heroChipEquityPercent;
    return (
      <div
        className="rounded-xl p-7 flex flex-col"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="text-[11px] font-mono uppercase tracking-wider mb-2"
          style={{ color: "var(--purple-300)" }}
        >
          ◆ Calcule l&apos;équité ICM
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Quelle est ton équité $ ?
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          Estime ton équité <strong className="text-text">ICM</strong> (en % du
          prizepool). Rappel : ta chip equity ({chipEq.toFixed(1)} %) n&apos;est{" "}
          <em>pas</em> ton équité $.
        </p>
        <Field
          label="Équité ICM hero (%)"
          hint="En % du prizepool"
          value={answer.equityIcmInput}
          onChange={(v) => setAnswer({ ...answer, equityIcmInput: v })}
          placeholder="ex. 38.5"
        />
        <div
          className="rounded p-3.5 mb-1"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Chip equity hero (référence)
          </div>
          <div className="text-2xl font-mono font-semibold leading-none">
            {chipEq.toFixed(1)} %
          </div>
          {eq !== null && (
            <div className="text-[11px] text-text-muted mt-1.5 font-mono">
              Écart annoncé : {eq - chipEq >= 0 ? "+" : ""}
              {(eq - chipEq).toFixed(1)} pts vs chip equity
            </div>
          )}
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M3.4 — saisie décomposée : P(fold) + P(call) + equity vs call range.
  // EV recomposée en direct via le modèle check-raise (avec realizationFactor).
  if (isCheckRaise(spot)) {
    const pf = parseAnswerNumber(answer.pFoldCRInput);
    const pc = parseAnswerNumber(answer.pCallCRInput);
    const eq = parseAnswerNumber(answer.equityCRInput);
    const sumPFC = (pf ?? 0) + (pc ?? 0);
    const p3BetLive = pf !== null && pc !== null ? Math.max(0, 100 - sumPFC) : null;
    const liveEv =
      pf !== null && pc !== null && eq !== null
        ? computeUserCRev(pf, pc, eq, spot)
        : null;
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Décompose le check-raise
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Trois branches, postflop.
        </h2>
        <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">
          Estime P(fold), P(call) et ton equity vs son call range. P(3-bet) se
          déduit de 100 % − fold − call. L&apos;EV se recompose avec realization
          factor {spot.expected.realizationFactorUsed.toFixed(2)}.
        </p>
        <Field
          label="P(fold)"
          hint="En % — vilain fold sa c-bet face à ton raise"
          value={answer.pFoldCRInput}
          onChange={(v) => setAnswer({ ...answer, pFoldCRInput: v })}
          placeholder="ex. 60"
        />
        <Field
          label="P(call)"
          hint="En % — vilain call ton check-raise"
          value={answer.pCallCRInput}
          onChange={(v) => setAnswer({ ...answer, pCallCRInput: v })}
          placeholder="ex. 30"
        />
        <Field
          label="Equity vs call range"
          hint="En % — au flop, vs les mains qui call ta raise"
          value={answer.equityCRInput}
          onChange={(v) => setAnswer({ ...answer, equityCRInput: v })}
          placeholder="ex. 45"
        />
        <div
          className="rounded p-3.5 mb-1 flex items-center justify-between"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              P(3-bet) déduit
            </div>
            <div
              className="text-lg font-mono font-semibold leading-none"
              style={{
                color:
                  p3BetLive === null
                    ? "var(--text-faint)"
                    : sumPFC > 101
                    ? "var(--red)"
                    : "var(--text)",
              }}
            >
              {p3BetLive === null ? "—" : `${p3BetLive.toFixed(0)} %`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              EV recomposée
            </div>
            <div
              className="text-2xl font-mono font-semibold leading-none"
              style={{
                color:
                  liveEv === null
                    ? "var(--text-faint)"
                    : liveEv >= 0
                    ? "var(--green)"
                    : "var(--red)",
              }}
            >
              {liveEv === null ? "—" : `${liveEv >= 0 ? "+" : ""}${liveEv.toFixed(2)} bb`}
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M3.2 — un champ : P(fold) break-even. Verdict push +EV/-EV live (la FE
  // réelle est donnée par le spot, calculée depuis callRange/totalRange).
  if (isFoldEquity(spot)) {
    const be = parseAnswerNumber(answer.pFoldBreakevenInput);
    const pFoldActualPct = Math.round(spot.expected.pFoldActual * 1000) / 10;
    const verdict =
      be === null
        ? null
        : pFoldActualPct > be + 0.5
        ? "+EV"
        : pFoldActualPct < be - 0.5
        ? "-EV"
        : "break-even";
    const verdictColor =
      verdict === "+EV"
        ? "var(--green)"
        : verdict === "-EV"
        ? "var(--red)"
        : "var(--amber)";
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Isole la fold equity
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Quelle FE pour break-even ?
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          La P(fold) <strong className="text-text">minimum</strong> qui rend ce push
          break-even (EV = 0). La FE réelle est donnée — compare.
        </p>
        <Field
          label="P(fold) break-even"
          hint="En % — seuil minimum"
          value={answer.pFoldBreakevenInput}
          onChange={(v) => setAnswer({ ...answer, pFoldBreakevenInput: v })}
          placeholder="ex. 52"
        />
        <div
          className="rounded p-3.5 mb-1"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            FE réelle estimée : {fmtPercent(pFoldActualPct)}
          </div>
          <div
            className="text-2xl font-mono font-semibold leading-none"
            style={{ color: verdict === null ? "var(--text-faint)" : verdictColor }}
          >
            {verdict === null ? "—" : `Push ${verdict}`}
          </div>
          {verdict !== null && (
            <div className="text-[11px] text-text-muted mt-1.5 font-mono">
              {pFoldActualPct.toFixed(1)} % réelle{" "}
              {verdict === "+EV" ? "≥" : verdict === "-EV" ? "<" : "≈"} {be ?? 0} %
              breakeven
            </div>
          )}
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M3.3 — saisie décomposée : P(fold) + P(call) + P(raise), somme = 100 %,
  // EV recomposée en direct (Σ Pᵢ × EVᵢ avec les EV de branche du spot).
  if (isMultiBranch(spot)) {
    const [lf, lc, lr] = m33BranchLabels(spot.scenario);
    const pf = parseAnswerNumber(answer.pFoldBranchInput);
    const pc = parseAnswerNumber(answer.pCallBranchInput);
    const pr = parseAnswerNumber(answer.pRaiseBranchInput);
    const sum = (pf ?? 0) + (pc ?? 0) + (pr ?? 0);
    const sumOk =
      pf !== null && pc !== null && pr !== null && Math.abs(sum - 100) <= 1;
    const liveEv =
      pf !== null && pc !== null && pr !== null
        ? computeUserBranchEV(pf, pc, pr, spot)
        : null;
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Pondère l&apos;arbre
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Trois branches, une EV.
        </h2>
        <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">
          Estime la probabilité de chaque branche du vilain. La somme doit faire{" "}
          <strong className="text-text">100 %</strong>. L&apos;EV se recompose en direct.
        </p>
        <Field
          label={lf}
          hint="En %"
          value={answer.pFoldBranchInput}
          onChange={(v) => setAnswer({ ...answer, pFoldBranchInput: v })}
          placeholder="ex. 55"
        />
        <Field
          label={lc}
          hint="En %"
          value={answer.pCallBranchInput}
          onChange={(v) => setAnswer({ ...answer, pCallBranchInput: v })}
          placeholder="ex. 35"
        />
        <Field
          label={lr}
          hint="En %"
          value={answer.pRaiseBranchInput}
          onChange={(v) => setAnswer({ ...answer, pRaiseBranchInput: v })}
          placeholder="ex. 10"
        />
        <div
          className="rounded p-3.5 mb-1 flex items-center justify-between"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              Somme
            </div>
            <div
              className="text-lg font-mono font-semibold leading-none"
              style={{ color: sumOk ? "var(--green)" : "var(--amber)" }}
            >
              {(pf === null && pc === null && pr === null) ? "—" : `${sum.toFixed(0)} %`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
              EV recomposée
            </div>
            <div
              className="text-2xl font-mono font-semibold leading-none"
              style={{
                color:
                  liveEv === null
                    ? "var(--text-faint)"
                    : liveEv >= 0
                    ? "var(--green)"
                    : "var(--red)",
              }}
            >
              {liveEv === null ? "—" : `${liveEv >= 0 ? "+" : ""}${liveEv.toFixed(2)} bb`}
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M3.1 — saisie décomposée : P(fold) + equity vs call range, EV live.
  if (isPushFold(spot)) {
    const pf = parseAnswerNumber(answer.pFoldInput);
    const eq = parseAnswerNumber(answer.equityCallInput);
    const liveEv =
      pf !== null && eq !== null
        ? computeUserEV(pf, eq, spot.heroStack, spot.potBefore)
        : null;
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Décompose l&apos;EV
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Push ou fold ?
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          Estime les deux composants. L&apos;EV se recompose en direct.
        </p>
        <Field
          label="P(fold) du vilain"
          hint="En % — proba qu'il jette ton push"
          value={answer.pFoldInput}
          onChange={(v) => setAnswer({ ...answer, pFoldInput: v })}
          placeholder="ex. 78"
        />
        <Field
          label="Equity vs call range"
          hint="En % — ton equity s'il call"
          value={answer.equityCallInput}
          onChange={(v) => setAnswer({ ...answer, equityCallInput: v })}
          placeholder="ex. 38"
        />
        <div
          className="rounded p-3.5 mb-1"
          style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            EV calculée avec tes valeurs
          </div>
          <div
            className="text-2xl font-mono font-semibold leading-none"
            style={{
              color:
                liveEv === null
                  ? "var(--text-faint)"
                  : liveEv >= 0
                  ? "var(--green)"
                  : "var(--red)",
            }}
          >
            {liveEv === null
              ? "—"
              : `${liveEv >= 0 ? "+" : ""}${liveEv.toFixed(2)} bb`}
          </div>
        </div>
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M2.4 — un seul champ : equity moyenne de la main du héros vs le range.
  if (isVsRange(spot)) {
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Ta réponse
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Estime ton equity.
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          Le vilain a un <strong className="text-text">range défini</strong> (pas une
          main). Quelle est l&apos;equity <strong className="text-text">moyenne</strong>{" "}
          de ta main face à ce range ?
        </p>
        <Field
          label="Equity vs range"
          hint="En pourcentage (0–100)"
          value={answer.equityHu}
          onChange={(v) => setAnswer({ ...answer, equityHu: v })}
          placeholder="ex. 55"
        />
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M2.3 — un seul champ : equity de la main du héros face à DEUX adversaires.
  if (isMultiway(spot)) {
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Ta réponse
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Estime ton equity.
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          Tu es face à <strong className="text-text">deux adversaires</strong>. Quelle
          est la probabilité que <strong className="text-text">ta main</strong> gagne à
          l&apos;abattage ?
        </p>
        <Field
          label="Equity de ta main"
          hint="En pourcentage (0–100)"
          value={answer.equityHu}
          onChange={(v) => setAnswer({ ...answer, equityHu: v })}
          placeholder="ex. 38"
        />
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M2.2 — un seul champ : l'equity de la main du héros (lecture pure).
  if (isEquity(spot)) {
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Ta réponse
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
          Estime ton equity.
        </h2>
        <p className="text-[13px] text-text-muted mb-7 leading-[1.55]">
          Cartes des deux joueurs visibles. Quelle est la probabilité que{" "}
          <strong className="text-text">ta main</strong> gagne à l&apos;abattage ?
        </p>
        <Field
          label="Equity de ta main"
          hint="En pourcentage (0–100)"
          value={answer.equityHu}
          onChange={(v) => setAnswer({ ...answer, equityHu: v })}
          placeholder="ex. 47"
        />
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  // M2.1 — panneau purement calculatoire (pas de décision). Early-return pour
  // préserver le narrowing aliasé des guards m1.x ci-dessous.
  if (isOuts(spot)) {
    return (
      <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
          ◆ Ta réponse
        </div>
        <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-7">
          Compte, puis applique.
        </h2>
        <Field
          label="Outs"
          hint="Nombre entier"
          value={answer.outsInput}
          onChange={(v) => setAnswer({ ...answer, outsInput: v })}
          placeholder="ex. 9"
        />
        <Field
          label="Equity approximative"
          hint={`Règle des 4 et 2 (× ${spot.expected.multiplier})`}
          value={answer.equityInput}
          onChange={(v) => setAnswer({ ...answer, equityInput: v })}
          placeholder="ex. 36 %"
        />
        <div className="mt-auto pt-6 flex gap-2.5">
          <button
            onClick={onValidate}
            disabled={!canSubmit}
            className={cn(
              "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
              canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
            )}
            style={{
              background: "var(--purple-500)",
              border: "0.5px solid var(--purple-500)",
              boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
            }}
          >
            Valider la réponse →
          </button>
        </div>
      </div>
    );
  }

  const conversion = isConversion(spot);
  const implied = isImplied(spot);
  const reverse = isReverse(spot);
  const basic = !conversion && !implied && !reverse;
  const showDecision = basic || reverse;

  return (
    <div className="rounded-xl p-7 flex flex-col" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--purple-300)" }}>
        ◆ Ta réponse
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-7">
        Décompose avant de décider.
      </h2>

      {(basic || (conversion && spot.ask === "ratio")) && (
        <Field
          label="Cote du pot (ratio)"
          hint="Format X:1"
          value={answer.ratio}
          onChange={(v) => setAnswer({ ...answer, ratio: v })}
          placeholder="ex. 2.25"
        />
      )}
      {(basic || implied || (conversion && spot.ask === "percent")) && (
        <Field
          label="Equity requise"
          hint="En pourcentage"
          value={answer.requiredEquity}
          onChange={(v) => setAnswer({ ...answer, requiredEquity: v })}
          placeholder="ex. 30.8 %"
        />
      )}
      {implied && (
        <Field
          label="Gain futur requis"
          hint="En bb"
          value={answer.neededExtra}
          onChange={(v) => setAnswer({ ...answer, neededExtra: v })}
          placeholder="ex. 16"
        />
      )}
      {reverse && (
        <Field
          label="Equity effective (ajustée)"
          hint="En pourcentage"
          value={answer.adjustedEquity}
          onChange={(v) => setAnswer({ ...answer, adjustedEquity: v })}
          placeholder="ex. 48 %"
        />
      )}

      {showDecision && (
        <div className="mb-5">
          <div className="text-xs text-text-muted font-medium mb-2">Décision</div>
          <div className="flex gap-1.5">
            {(["fold", "call", "raise"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setAnswer({ ...answer, decision: d })}
                className={cn(
                  "flex-1 px-3 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200 capitalize",
                  answer.decision === d
                    ? "[background:var(--purple-glow)] [color:var(--purple-300)] [border-color:var(--purple-400)]"
                    : "[background:var(--surface-strong)] text-text-muted hover:text-text [border-color:var(--border)] hover:[border-color:var(--border-strong)]"
                )}
                style={{
                  border: "0.5px solid var(--border)",
                  ...(answer.decision === d && { boxShadow: "0 0 0 0.5px var(--purple-400), 0 0 12px var(--purple-glow)" }),
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onValidate}
          disabled={!canSubmit}
          className={cn(
            "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
            canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
          )}
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
          }}
        >
          Valider la réponse →
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        {hint && <span className="text-[11px] font-mono text-text-faint">{hint}</span>}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-3 rounded font-mono text-[15px] outline-none transition-all duration-200"
        style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)", color: "var(--text)" }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--purple-400)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--purple-glow)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function CorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: GenericSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  if (isBBCall(spot)) {
    return <BBCallCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isBTNPush(spot)) {
    return <BTNPushCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isPositionDefense(spot)) {
    return <PositionDefenseCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isNashPush(spot)) {
    return <NashPushCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isFinalTable(spot)) {
    return <FinalTableCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isPositionBubbleFactor(spot)) {
    return <PositionBubbleFactorCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isBubbleFactor(spot)) {
    return <BubbleFactorCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isICM(spot)) {
    return <ICMCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isCheckRaise(spot)) {
    return <CheckRaiseCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isFoldEquity(spot)) {
    return <FoldEquityCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isMultiBranch(spot)) {
    return <MultiBranchCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isPushFold(spot)) {
    return <PushFoldCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isVsRange(spot)) {
    return <VsRangeCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isMultiway(spot)) {
    return <MultiwayCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  if (isEquity(spot)) {
    return <EquityCorrectionPanel spot={spot} answer={answer} onNext={onNext} />;
  }
  const { isCorrect, steps } = grade(spot, answer);
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${isCorrect ? "rgba(74, 222, 128, 0.3)" : "rgba(248, 113, 113, 0.3)"}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: isCorrect ? "var(--green)" : "var(--red)" }}>
        ◆ {isCorrect ? "Correct" : "Correction"}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {isCorrect ? "Bien décomposé." : "Voici la décomposition."}
      </h2>

      {steps.map((step, i) => (
        <div
          key={step.num}
          className="mb-5 last:mb-0"
          style={{ animation: `fadeUp 400ms var(--ease-out) ${i * 120}ms backwards` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-faint">{step.num}</span>
              <span className="text-[13px] font-medium">{step.label}</span>
            </div>
            {step.userText !== undefined && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-text-faint">Toi:</span>
                <span className={step.ok ? "text-green" : "text-red"}>{step.userText}</span>
                <span className={cn("text-base leading-none", step.ok ? "text-green" : "text-red")}>
                  {step.ok ? "✓" : "✗"}
                </span>
              </div>
            )}
          </div>
          {step.body}
        </div>
      ))}

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

function FormulaBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("font-mono text-[13px] rounded p-3.5 leading-[1.9]", className)}
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        borderLeft: "2px solid var(--purple-400)",
        color: "var(--text)",
      }}
    >
      {children}
    </div>
  );
}

function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-text", className)}>{children}</span>;
}

function Lbl({ children }: { children: ReactNode }) {
  return <span className="text-[var(--purple-300)] font-medium">{children} —</span>;
}

// ===== M2.2 — table heads-up (cartes des DEUX joueurs visibles) =====
function CardPlaceholder() {
  return (
    <div
      className="rounded-lg shrink-0"
      style={{
        width: 56,
        height: 80,
        background: "rgba(255,255,255,0.03)",
        border: "0.5px dashed var(--border-strong)",
      }}
      aria-label="Carte à venir"
    />
  );
}

function EquityTable({ spot }: { spot: EquitySpot }) {
  const streetLabel =
    spot.street === "preflop" ? "préflop" : spot.street === "flop" ? "flop" : "turn";
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ boxShadow: "0 0 0 3px var(--green-glow)" }} />
          Heads-up · cartes ouvertes
        </div>
        <div className="text-xs font-mono text-text-faint">{streetLabel}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-7 pb-6" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Toi
          </div>
          <div className="flex gap-2">
            {spot.heroCards.map((c, i) => (
              <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Vilain
          </div>
          <div className="flex gap-2">
            {spot.villainCards.map((c, i) => (
              <PlayingCard key={`v-${c}-${i}`} card={c} dealDelayMs={160 + i * 80} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="font-mono uppercase text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Board · {streetLabel}
        </div>
        <div className="flex gap-2">
          {spot.board.map((c, i) => (
            <PlayingCard key={`b-${c}-${i}`} card={c} dealDelayMs={320 + i * 80} />
          ))}
          {Array.from({ length: 5 - spot.board.length }).map((_, i) => (
            <CardPlaceholder key={`ph-${i}`} />
          ))}
        </div>
      </div>

      <div className="rounded p-5 mt-2" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Estime l&apos;equity de TA main contre celle de l&apos;adversaire (à
          l&apos;abattage, toutes cartes restantes distribuées).
        </div>
      </div>
    </div>
  );
}

function EquityCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: EquitySpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ue = parseAnswerNumber(answer.equityHu) ?? 0;
  const g = gradeM22(ue, spot.expected.equity);
  const e = spot.expected;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div
        className="text-[11px] font-mono uppercase tracking-wider mb-2"
        style={{ color: g.errorColor }}
      >
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{fmtPercent(ue)}</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Vraie equity</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {fmtPercent(e.equity)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono>
        <br />
        <Lbl>Vilain</Lbl> <Mono>{spot.villainCards.join(" ")}</Mono>
        <br />
        <Lbl>Board</Lbl>{" "}
        <Mono>{spot.board.length ? spot.board.join(" ") : "— (préflop)"}</Mono>
        <br />
        <Lbl>Méthode</Lbl>{" "}
        <Mono>
          {e.method === "exact"
            ? `exact (${e.iterations} scénarios)`
            : `monte-carlo (${e.iterations.toLocaleString("fr-FR")} itér.)`}
        </Mono>
        <br />
        <Lbl>Wins / Ties / Losses</Lbl>{" "}
        <Mono className="!text-purple-300">
          {e.wins} / {e.ties} / {e.losses}
        </Mono>
      </FormulaBox>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M2.3 — table 3-way (hero + 2 adversaires, cartes ouvertes) =====
function MultiwayTable({ spot }: { spot: MultiwaySpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ boxShadow: "0 0 0 3px var(--green-glow)" }} />
          3-way · cartes ouvertes
        </div>
        <div className="text-xs font-mono text-text-faint">{spot.street}</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-7 pb-6" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Toi
          </div>
          <div className="flex gap-1.5">
            {spot.heroCards.map((c, i) => (
              <PlayingCard key={`h-${c}-${i}`} card={c} size="sm" dealDelayMs={i * 70} />
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Adversaire 1
          </div>
          <div className="flex gap-1.5">
            {spot.villain1Cards.map((c, i) => (
              <PlayingCard key={`v1-${c}-${i}`} card={c} size="sm" dealDelayMs={140 + i * 70} />
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Adversaire 2
          </div>
          <div className="flex gap-1.5">
            {spot.villain2Cards.map((c, i) => (
              <PlayingCard key={`v2-${c}-${i}`} card={c} size="sm" dealDelayMs={280 + i * 70} />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="font-mono uppercase text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Board · {spot.street}
        </div>
        <div className="flex gap-2">
          {spot.board.map((c, i) => (
            <PlayingCard key={`b-${c}-${i}`} card={c} dealDelayMs={420 + i * 70} />
          ))}
          {Array.from({ length: 5 - spot.board.length }).map((_, i) => (
            <CardPlaceholder key={`ph-${i}`} />
          ))}
        </div>
      </div>

      <div className="rounded p-5 mt-2" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu es contre <strong className="text-text">deux mains</strong>. Estime
          l&apos;equity de TA main à l&apos;abattage (toutes cartes restantes
          distribuées).
        </div>
      </div>
    </div>
  );
}

function MultiwayCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: MultiwaySpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ue = parseAnswerNumber(answer.equityHu) ?? 0;
  const g = gradeM22(ue, spot.expected.equity);
  const e = spot.expected;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{fmtPercent(ue)}</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Vraie equity</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {fmtPercent(e.equity)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono>
        <br />
        <Lbl>Vilain 1</Lbl> <Mono>{spot.villain1Cards.join(" ")}</Mono>
        <br />
        <Lbl>Vilain 2</Lbl> <Mono>{spot.villain2Cards.join(" ")}</Mono>
        <br />
        <Lbl>Board</Lbl> <Mono>{spot.board.join(" ")}</Mono>
        <br />
        <Lbl>Méthode</Lbl> <Mono>exact ({e.iterations} scénarios)</Mono>
        <br />
        <Lbl>Wins / Ties / Losses</Lbl>{" "}
        <Mono className="!text-purple-300">
          {e.wins} / {e.ties} / {e.losses}
        </Mono>
      </FormulaBox>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M2.4 — table equity vs range (hero + range visualisé) =====
function VsRangeTable({ spot }: { spot: VsRangeSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ boxShadow: "0 0 0 3px var(--green-glow)" }} />
          Vs range · distribution ouverte
        </div>
        <div className="text-xs font-mono text-text-faint">{spot.street}</div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-5 mb-7 pb-6" style={{ borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
            Toi
          </div>
          <div className="flex gap-2">
            {spot.heroCards.map((c, i) => (
              <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
            ))}
          </div>
        </div>
        <RangeDisplay
          notation={spot.villainRangeNotation}
          label={spot.villainRangeLabel}
          comboCount={spot.expected.comboCount}
        />
      </div>

      <div className="mb-6">
        <div className="font-mono uppercase text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Board · {spot.street}
        </div>
        <div className="flex gap-2">
          {spot.board.map((c, i) => (
            <PlayingCard key={`b-${c}-${i}`} card={c} dealDelayMs={200 + i * 80} />
          ))}
          {Array.from({ length: 5 - spot.board.length }).map((_, i) => (
            <CardPlaceholder key={`ph-${i}`} />
          ))}
        </div>
      </div>

      <div className="rounded p-5 mt-2" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Le vilain a un range défini. Estime l&apos;equity{" "}
          <strong className="text-text">moyenne</strong> de ta main vs ce range.
        </div>
      </div>
    </div>
  );
}

function VsRangeCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: VsRangeSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ue = parseAnswerNumber(answer.equityHu) ?? 0;
  const g = gradeM22(ue, spot.expected.equity);
  const e = spot.expected;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{fmtPercent(ue)}</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Equity moyenne</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {fmtPercent(e.equity)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono>
        <br />
        <Lbl>Range</Lbl> <Mono>{spot.villainRangeLabel}</Mono>{" "}
        <Mono className="!text-purple-300">({e.comboCount} combos)</Mono>
        <br />
        <Lbl>Board</Lbl>{" "}
        <Mono>{spot.board.length ? spot.board.join(" ") : "— (préflop)"}</Mono>
        <br />
        <Lbl>Méthode</Lbl> <Mono>moyenne pondérée (Monte Carlo / combo)</Mono>
      </FormulaBox>

      <div className="mt-4">
        <RangeDisplay notation={spot.villainRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M3.4 — table check-raise (hero + board flop + 3 ranges) =====
const M34_TEXTURE_LABEL: Record<CheckRaiseSpot["boardTexture"], string> = {
  dry: "Board dry",
  wet: "Board drawy / wet",
  paired: "Board paired",
  monotone: "Board monotone",
};
const M34_HAND_LABEL: Record<CheckRaiseSpot["heroHandType"], string> = {
  value: "Value",
  semibluff: "Semi-bluff",
  bluff: "Pure bluff",
};

function CheckRaiseTable({ spot }: { spot: CheckRaiseSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          Check-raise flop · OOP
        </div>
        <div className="text-xs font-mono text-text-faint">{spot.effectiveStack} bb eff.</div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Flop — {M34_TEXTURE_LABEL[spot.boardTexture]} · {M34_HAND_LABEL[spot.heroHandType]}
        </div>
        <div className="flex gap-2">
          {spot.board.map((c, i) => (
            <PlayingCard key={`b-${c}-${i}`} card={c} dealDelayMs={200 + i * 80} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <PfInfo label="Hero" value={spot.heroPosition} />
        <PfInfo label="Vilain" value={spot.villainPosition} />
        <PfInfo label="Pot pre" value={`${spot.potPreflop} bb`} />
        <PfInfo label="C-bet" value={`${spot.cbetSize} bb`} />
      </div>

      <div className="mb-3">
        <RangeDisplay
          notation={spot.villainCBetRangeNotation}
          label={`C-bet range : ${spot.villainCBetRangeLabel}`}
        />
      </div>
      <div className="mb-3">
        <RangeDisplay
          notation={spot.villainCallVsRaiseRangeNotation}
          label={`Call vs CR : ${spot.villainCallVsRaiseRangeLabel}`}
        />
      </div>
      <div className="mb-5">
        <RangeDisplay
          notation={spot.villain3BetRangeNotation}
          label={`3-bet vs CR : ${spot.villain3BetRangeLabel}`}
        />
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu check OOP, vilain c-bet {spot.cbetSize} bb, tu raise à {spot.raiseSize} bb.
          Décompose l&apos;EV : P(fold) + P(call) + ton equity vs son call range.
        </div>
      </div>
    </div>
  );
}

// ===== M3.4 — correction check-raise =====
function CheckRaiseCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: CheckRaiseSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const pf = parseAnswerNumber(answer.pFoldCRInput) ?? 0;
  const pc = parseAnswerNumber(answer.pCallCRInput) ?? 0;
  const eq = parseAnswerNumber(answer.equityCRInput) ?? 0;
  const g = gradeM34(pf, pc, eq, spot);
  const e = spot.expected;
  const tf = Math.round(e.pFold * 1000) / 10;
  const tc = Math.round(e.pCall * 1000) / 10;
  const tr = Math.round(e.pThreeBet * 1000) / 10;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV de ta saisie</div>
          <div className="text-3xl font-semibold font-mono leading-none">
            {g.userEV >= 0 ? "+" : ""}
            {g.userEV.toFixed(2)} bb
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {g.trueEV >= 0 ? "+" : ""}
            {g.trueEV.toFixed(2)} bb
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>P(fold)</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pf)} · vrai {fmtPercent(tf)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIfFold >= 0 ? "+" : ""}{e.evIfFold} bb</span>
        <br />
        <Lbl>P(call)</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pc)} · vrai {fmtPercent(tc)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIfCall >= 0 ? "+" : ""}{e.evIfCall} bb</span>
        <br />
        <Lbl>P(3-bet)</Lbl>{" "}
        <Mono>
          déduit {fmtPercent(Math.max(0, 100 - pf - pc))} · vrai {fmtPercent(tr)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIf3Bet} bb</span>
        <br />
        <Lbl>Equity vs call</Lbl>{" "}
        <Mono>
          toi {fmtPercent(eq)} · vrai {fmtPercent(e.equityVsCallRange)}
        </Mono>{" "}
        <span className="text-text-muted">
          (réalisée × {e.realizationFactorUsed.toFixed(2)} = {fmtPercent(e.equityVsCallRange * e.realizationFactorUsed)})
        </span>
        <br />
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono> sur{" "}
        <Mono>{spot.board.join(" ")}</Mono> ({M34_TEXTURE_LABEL[spot.boardTexture].toLowerCase()})
        <br />
        <Lbl>EV vraie</Lbl>{" "}
        <Mono className="!text-purple-300">
          Σ Pᵢ × EVᵢ = {e.evBb >= 0 ? "+" : ""}
          {e.evBb} bb
        </Mono>
      </FormulaBox>

      <div className="mt-3">
        <RangeDisplay notation={spot.villainCallVsRaiseRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M3.2 — table fold equity (hero + call range + total range) =====
function FoldEquityTable({ spot }: { spot: FoldEquitySpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ boxShadow: "0 0 0 3px var(--green-glow)" }} />
          Push all-in · fold equity isolée
        </div>
        <div className="text-xs font-mono text-text-faint">{spot.heroStack} bb</div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <PfInfo label="Position" value={spot.heroPosition} />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Vilain" value={spot.villainPosition} />
        <PfInfo label="Pot avant" value={`${spot.potBefore} bb`} />
      </div>

      <div className="mb-3">
        <RangeDisplay
          notation={spot.villainCallRangeNotation}
          label={`Call range : ${spot.villainCallRangeLabel}`}
          comboCount={spot.expected.combosInCallRange}
        />
      </div>
      <div className="mb-5">
        <RangeDisplay
          notation={spot.villainTotalRangeNotation}
          label={`Range total (voit le push) : ${spot.villainTotalRangeLabel}`}
          comboCount={spot.expected.combosInTotalRange}
        />
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Quelle est la P(fold) <strong className="text-text">minimum</strong> pour que ce
          push soit break-even (EV = 0) ? La P(fold) réelle se déduit du call range vs le
          range total.
        </div>
      </div>
    </div>
  );
}

// ===== M3.3 — table multi-branches (hero + scénario + call/4-bet range) =====
const M33_TAG: Record<MultiBranchSpot["scenario"], string> = {
  "3bet-vs-open": "3-bet vs open · 3 branches",
  "iso-vs-limp": "Iso-raise vs limp · 3 branches",
  "squeeze-vs-open-call": "Squeeze vs open+call · 3 branches",
  "cold-call-vs-open": "Cold-call vs open · flop",
};

function MultiBranchTable({ spot }: { spot: MultiBranchSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          {M33_TAG[spot.scenario]}
        </div>
        <div className="text-xs font-mono text-text-faint">{spot.effectiveStack} bb eff.</div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <PfInfo label="Hero" value={spot.heroPosition} />
        <PfInfo label="Vilain" value={spot.villainPosition} />
        <PfInfo label="Pot avant" value={`${spot.potBefore} bb`} />
        <PfInfo label="Ta mise" value={`${spot.heroActionSize} bb`} />
      </div>

      <div className="mb-3">
        <RangeDisplay
          notation={spot.villainCallRangeNotation}
          label={`Call range : ${spot.villainCallRangeLabel}`}
        />
      </div>
      {spot.villainFourBetRangeNotation && (
        <div className="mb-5">
          <RangeDisplay
            notation={spot.villainFourBetRangeNotation}
            label={`Relance range : ${spot.villainFourBetRangeLabel ?? ""}`}
          />
        </div>
      )}

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Estime la probabilité de chaque branche du vilain (somme = 100 %). L&apos;EV
          totale est la somme pondérée Σ P&#8202;ᵢ × EV&#8202;ᵢ.
        </div>
      </div>
    </div>
  );
}

// ===== M3.2 — correction fold equity =====
function FoldEquityCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: FoldEquitySpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const be = parseAnswerNumber(answer.pFoldBreakevenInput) ?? 0;
  const g = gradeM32(be, spot);
  const e = spot.expected;
  const profitable = g.pFoldActualPct >= g.truePct;
  const formula =
    e.evIfCall >= 0
      ? "evIfCall ≥ 0 → le push est +EV même si le vilain call 100 % → breakeven 0 %"
      : `−(${e.evIfCall}) / (${spot.potBefore} − (${e.evIfCall})) = ${(-e.evIfCall).toFixed(2)} / ${(spot.potBefore - e.evIfCall).toFixed(2)} = ${(g.truePct / 100).toFixed(3)} → ${g.truePct.toFixed(1)} %`;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{fmtPercent(be)}</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">FE break-even vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {fmtPercent(g.truePct)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono> ·{" "}
        <Mono>{spot.heroStack}bb {spot.heroPosition}</Mono>
        <br />
        <Lbl>Equity vs call range</Lbl>{" "}
        <Mono className="!text-purple-300">{fmtPercent(e.equityVsCallRange)}</Mono>{" "}
        <span className="text-text-muted">({e.combosInCallRange} combos)</span>
        <br />
        <Lbl>Pot avant</Lbl> <Mono>{spot.potBefore} bb</Mono> ·{" "}
        <Lbl>EV si call</Lbl>{" "}
        <Mono>
          {e.evIfCall >= 0 ? "+" : ""}
          {e.evIfCall} bb
        </Mono>
        <br />
        <Lbl>Formule</Lbl> <Mono className="!text-purple-300">{formula}</Mono>
        <br />
        <Lbl>P(fold) réelle</Lbl> <Mono>{fmtPercent(g.pFoldActualPct)}</Mono>{" "}
        <span className="text-text-muted">
          (1 − {e.combosInCallRange}/{e.combosInTotalRange})
        </span>
      </FormulaBox>

      <div
        className="rounded p-3.5 mt-3 text-[13px] leading-[1.55]"
        style={{
          background: profitable ? "var(--green-glow)" : "var(--red-glow)",
          border: `0.5px solid ${profitable ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
        }}
      >
        <span style={{ color: profitable ? "var(--green)" : "var(--red)" }} className="font-medium">
          {profitable ? "Push profitable" : "Push NON profitable"}
        </span>{" "}
        <span className="text-text-muted">
          : FE réelle {fmtPercent(g.pFoldActualPct)} {profitable ? "≥" : "<"} breakeven{" "}
          {fmtPercent(g.truePct)}. Ne confonds pas le seuil break-even avec la P(fold)
          réelle — la décision vit dans cet écart.
        </span>
      </div>

      <div className="mt-4">
        <RangeDisplay notation={spot.villainCallRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M3.3 — correction multi-branches =====
function MultiBranchCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: MultiBranchSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const pf = parseAnswerNumber(answer.pFoldBranchInput) ?? 0;
  const pc = parseAnswerNumber(answer.pCallBranchInput) ?? 0;
  const pr = parseAnswerNumber(answer.pRaiseBranchInput) ?? 0;
  const g = gradeM33(pf, pc, pr, spot);
  const e = spot.expected;
  const [lf, lc, lr] = m33BranchLabels(spot.scenario);
  const tf = Math.round(e.pFold * 1000) / 10;
  const tc = Math.round(e.pCall * 1000) / 10;
  const tr = Math.round(e.pFourBet * 1000) / 10;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV de ta saisie</div>
          <div className="text-3xl font-semibold font-mono leading-none">
            {g.userEV >= 0 ? "+" : ""}
            {g.userEV.toFixed(2)} bb
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {g.trueEV >= 0 ? "+" : ""}
            {g.trueEV.toFixed(2)} bb
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>{lf}</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pf)} · vrai {fmtPercent(tf)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIfFold >= 0 ? "+" : ""}{e.evIfFold} bb</span>
        <br />
        <Lbl>{lc}</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pc)} · vrai {fmtPercent(tc)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIfCall >= 0 ? "+" : ""}{e.evIfCall} bb</span>
        <br />
        <Lbl>{lr}</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pr)} · vrai {fmtPercent(tr)}
        </Mono>{" "}
        <span className="text-text-muted">→ EV branche {e.evIfFourBet >= 0 ? "+" : ""}{e.evIfFourBet} bb</span>
        <br />
        <Lbl>EV vraie</Lbl>{" "}
        <Mono className="!text-purple-300">
          Σ P&#8202;ᵢ × EV&#8202;ᵢ = {e.evBb >= 0 ? "+" : ""}
          {e.evBb} bb
        </Mono>
      </FormulaBox>

      <div className="text-[12px] text-text-muted mt-3 leading-[1.6]">{e.breakdown}</div>

      <div className="mt-3">
        <RangeDisplay notation={spot.villainCallRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M3.1 — table push/fold (hero + scénario + call range) =====
function PfInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-3" style={{ background: "rgba(0,0,0,0.2)", border: "0.5px solid var(--border)" }}>
      <div className="font-mono uppercase tracking-wider text-text-faint mb-1" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
        {label}
      </div>
      <div className="font-semibold" style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}

function PushFoldTable({ spot }: { spot: PushFoldSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green" style={{ boxShadow: "0 0 0 3px var(--green-glow)" }} />
          Push all-in · sub-15bb
        </div>
        <div className="text-xs font-mono text-text-faint">
          {spot.hasAntes ? "avec antes" : "sans antes"}
        </div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        <PfInfo label="Position" value={spot.heroPosition} />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Vilain" value={spot.villainPosition} />
        <PfInfo label="Pot avant" value={`${spot.potBefore} bb`} />
      </div>

      <div className="mb-5">
        <RangeDisplay
          notation={spot.villainCallRangeNotation}
          label={`Call range : ${spot.villainCallRangeLabel}`}
          comboCount={spot.expected.combosInCallRange}
        />
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu pushes all-in {spot.heroStack} bb depuis {spot.heroPosition}. Le vilain{" "}
          {spot.villainPosition} call avec le range ci-dessus. Décompose l&apos;EV du
          push.
        </div>
      </div>
    </div>
  );
}

function PushFoldCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: PushFoldSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const pf = parseAnswerNumber(answer.pFoldInput) ?? 0;
  const eq = parseAnswerNumber(answer.equityCallInput) ?? 0;
  const g = gradeM31(pf, eq, spot);
  const e = spot.expected;
  const truePFoldPct = Math.round(e.pFold * 1000) / 10;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV de ta saisie</div>
          <div className="text-3xl font-semibold font-mono leading-none">
            {g.userEV >= 0 ? "+" : ""}
            {g.userEV.toFixed(2)} bb
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">EV vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {g.trueEV >= 0 ? "+" : ""}
            {g.trueEV.toFixed(2)} bb
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>P(fold)</Lbl>{" "}
        <Mono>
          toi {fmtPercent(pf)} · vrai {fmtPercent(truePFoldPct)}
        </Mono>{" "}
        <span className="text-text-muted">(écart {g.pFoldError >= 0 ? "+" : ""}{g.pFoldError} pts)</span>
        <br />
        <Lbl>Equity vs call</Lbl>{" "}
        <Mono>
          toi {fmtPercent(eq)} · vrai {fmtPercent(e.equityVsCallRange)}
        </Mono>{" "}
        <span className="text-text-muted">(écart {g.equityError >= 0 ? "+" : ""}{g.equityError} pts)</span>
        <br />
        <Lbl>Hero</Lbl> <Mono>{spot.heroCards.join(" ")}</Mono> ·{" "}
        <Mono>{spot.heroStack}bb {spot.heroPosition}</Mono>
        <br />
        <Lbl>Call range</Lbl> <Mono>{spot.villainCallRangeLabel}</Mono>{" "}
        <Mono className="!text-purple-300">({e.combosInCallRange} combos)</Mono>
        <br />
        <Lbl>Pot final si call</Lbl>{" "}
        <Mono>{(spot.potBefore + 2 * spot.heroStack).toFixed(1)} bb</Mono>
        <br />
        <Lbl>EV vraie</Lbl>{" "}
        <Mono className="!text-purple-300">
          {e.evBb >= 0 ? "+" : ""}
          {e.evBb} bb
        </Mono>
      </FormulaBox>

      <div className="mt-4">
        <RangeDisplay notation={spot.villainCallRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M4.1 — table ICM (snapshot des stacks + payouts) =====
const M41_SPOT_TYPE_LABEL: Record<ICMSpot["spotType"], string> = {
  "equal-stacks": "Stacks égaux",
  "chip-leader": "Chip leader",
  "short-stack": "Short stack",
  bubble: "Bulle",
  "final-table": "Table finale",
  satellite: "Satellite",
};

function ICMTable({ spot }: { spot: ICMSpot }) {
  const totalChips = spot.players.reduce((acc, p) => acc + p.stack, 0);
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          ICM · table snapshot
        </div>
        <div className="text-xs font-mono text-text-faint">
          {M41_SPOT_TYPE_LABEL[spot.spotType]}
        </div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Joueurs en jeu ({spot.players.length})
        </div>
        <div className="flex flex-col gap-1.5">
          {spot.players.map((p) => {
            const isHero = p.id === spot.heroId;
            const chipPct = (p.stack / totalChips) * 100;
            return (
              <div
                key={p.id}
                className="grid items-center gap-3 px-3.5 py-2.5 rounded"
                style={{
                  gridTemplateColumns: "60px 1fr 90px 60px",
                  background: isHero ? "var(--purple-glow)" : "var(--surface)",
                  border: `0.5px solid ${isHero ? "var(--purple-400)" : "var(--border)"}`,
                }}
              >
                <span
                  className="text-[12px] font-mono font-medium"
                  style={{ color: isHero ? "var(--purple-300)" : "var(--text-muted)" }}
                >
                  {isHero ? "Hero" : p.id}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, chipPct * 1.4)}%`,
                      background: isHero ? "var(--purple-400)" : "var(--text-dim)",
                      opacity: isHero ? 1 : 0.5,
                    }}
                  />
                </div>
                <span
                  className="text-right text-[13px] font-mono"
                  style={{ color: isHero ? "var(--text)" : "var(--text-muted)" }}
                >
                  {p.stack.toLocaleString("fr-FR")}
                </span>
                <span
                  className="text-right text-[11px] font-mono"
                  style={{ color: "var(--text-faint)" }}
                >
                  {chipPct.toFixed(1)} %
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5"
        style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">
          Structure de payouts — {spot.payoutLabel}
        </div>
        <div className="font-mono text-[13px] text-text leading-[1.6]">
          {spot.payouts.map((p) => `${p}%`).join(" · ")}
        </div>
        <div className="text-[11px] text-text-faint font-mono mt-1.5">
          {spot.payouts.length} place{spot.payouts.length > 1 ? "s" : ""} payée
          {spot.payouts.length > 1 ? "s" : ""} sur {spot.players.length} joueur
          {spot.players.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Quelle est ton équité <strong className="text-text">ICM</strong> (en % du
          prizepool) ? Rappel : équité ICM ≠ chip equity à cause de la concavité.
        </div>
      </div>
    </div>
  );
}

// ===== M4.1 — correction ICM (décomposition chip vs ICM equity) =====
function ICMCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: ICMSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ue = parseAnswerNumber(answer.equityIcmInput) ?? 0;
  const g = gradeM41(ue, spot);
  const e = spot.expected;
  const trend = e.icmEffect >= 0 ? "gagne" : "perd";
  const trendColor = e.icmEffect >= 0 ? "var(--green)" : "var(--red)";
  const totalChipsAll = spot.players.reduce((acc, p) => acc + p.stack, 0);
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{ue.toFixed(1)} %</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Équité ICM vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {g.truePct.toFixed(1)} %
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero stack</Lbl>{" "}
        <Mono>
          {(spot.players.find((p) => p.id === spot.heroId)?.stack ?? 0).toLocaleString("fr-FR")} chips
        </Mono>{" "}
        <span className="text-text-muted">
          / {totalChipsAll.toLocaleString("fr-FR")} total
        </span>
        <br />
        <Lbl>Chip equity</Lbl>{" "}
        <Mono>{e.heroChipEquityPercent.toFixed(1)} %</Mono>{" "}
        <span className="text-text-muted">(part naïve, 1 chip = 1 unité)</span>
        <br />
        <Lbl>Effet ICM</Lbl>{" "}
        <span className="font-mono" style={{ color: trendColor }}>
          {e.icmEffect >= 0 ? "+" : ""}
          {e.icmEffect.toFixed(1)} pts
        </span>{" "}
        <span className="text-text-muted">
          (hero {trend} à l&apos;ICM par rapport à sa chip equity)
        </span>
        <br />
        <Lbl>Équité ICM vraie</Lbl>{" "}
        <Mono className="!text-purple-300">{e.heroEquityPercent.toFixed(1)} %</Mono>
        <br />
        <Lbl>Payouts</Lbl> <Mono>{spot.payouts.map((p) => `${p}%`).join(" · ")}</Mono>{" "}
        <span className="text-text-muted">({spot.payoutLabel})</span>
      </FormulaBox>

      <div className="mt-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-2">
          Équités ICM de la table
        </div>
        <div className="flex flex-col gap-1">
          {spot.players.map((p) => {
            const isHero = p.id === spot.heroId;
            const eqPct = e.allEquities[p.id] ?? 0;
            const cEq = (p.stack / totalChipsAll) * 100;
            const diff = eqPct - cEq;
            return (
              <div
                key={p.id}
                className="grid items-center gap-3 px-3 py-1.5 rounded text-[12px] font-mono"
                style={{
                  gridTemplateColumns: "60px 1fr 70px 70px",
                  background: isHero ? "var(--purple-glow)" : "transparent",
                  border: `0.5px solid ${isHero ? "var(--purple-400)" : "var(--border)"}`,
                  color: isHero ? "var(--text)" : "var(--text-muted)",
                }}
              >
                <span style={{ color: isHero ? "var(--purple-300)" : "var(--text-faint)" }}>
                  {isHero ? "Hero" : p.id}
                </span>
                <span className="text-text-faint">{p.stack.toLocaleString("fr-FR")} chips</span>
                <span className="text-right">{eqPct.toFixed(1)} %</span>
                <span
                  className="text-right text-[10px]"
                  style={{ color: diff >= 0 ? "var(--green)" : "var(--red)" }}
                >
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded p-3.5 mt-4 text-[13px] leading-[1.55]"
        style={{
          background: "var(--surface-strong)",
          border: "0.5px solid var(--border)",
        }}
      >
        <span className="text-text-muted">
          Pattern à mémoriser : un {M41_SPOT_TYPE_LABEL[spot.spotType].toLowerCase()}{" "}
          {e.icmEffect >= 0 ? "gagne" : "perd"} typiquement{" "}
          <strong className="text-text">{Math.abs(e.icmEffect).toFixed(1)} pts</strong> à
          l&apos;ICM par rapport à sa chip equity. C&apos;est la signature de la
          concavité.
        </span>
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M4.2 — table bubble factor (snapshot + push amount + hero/villain highlight) =====
const M42_SPOT_TYPE_LABEL: Record<BubbleFactorSpot["spotType"], string> = {
  "bubble-leader-vs-mid": "Bulle · leader vs mid",
  "bubble-leader-vs-short": "Bulle · leader vs short",
  "bubble-short-vs-leader": "Bulle · short vs leader",
  "bubble-mid-vs-mid": "Bulle · mid vs mid",
  "ft-leader": "Table finale · leader",
  "ft-mid": "Table finale · mid",
  "ft-short": "Table finale · short",
  satellite: "Satellite",
};

function BubbleFactorTable({ spot }: { spot: BubbleFactorSpot }) {
  const totalChips = spot.players.reduce((acc, p) => acc + p.stack, 0);
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          Bubble factor · push all-in
        </div>
        <div className="text-xs font-mono text-text-faint">
          {M42_SPOT_TYPE_LABEL[spot.spotType]}
        </div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Joueurs en jeu ({spot.players.length}) — push {spot.pushAmount.toLocaleString("fr-FR")} chips
        </div>
        <div className="flex flex-col gap-1.5">
          {spot.players.map((p) => {
            const isHero = p.id === spot.heroId;
            const isVillain = p.id === spot.villainId;
            const chipPct = (p.stack / totalChips) * 100;
            const accentColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-dim)";
            const bgColor = isHero
              ? "var(--purple-glow)"
              : isVillain
              ? "var(--amber-glow)"
              : "var(--surface)";
            const borderColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "rgba(251, 191, 36, 0.4)"
              : "var(--border)";
            const labelColor = isHero
              ? "var(--purple-300)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-muted)";
            return (
              <div
                key={p.id}
                className="grid items-center gap-3 px-3.5 py-2.5 rounded"
                style={{
                  gridTemplateColumns: "70px 1fr 90px 60px",
                  background: bgColor,
                  border: `0.5px solid ${borderColor}`,
                }}
              >
                <span
                  className="text-[12px] font-mono font-medium"
                  style={{ color: labelColor }}
                >
                  {isHero ? "Hero" : isVillain ? "Vilain" : p.id}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, chipPct * 1.4)}%`,
                      background: accentColor,
                      opacity: isHero || isVillain ? 1 : 0.5,
                    }}
                  />
                </div>
                <span
                  className="text-right text-[13px] font-mono"
                  style={{ color: isHero || isVillain ? "var(--text)" : "var(--text-muted)" }}
                >
                  {p.stack.toLocaleString("fr-FR")}
                </span>
                <span
                  className="text-right text-[11px] font-mono"
                  style={{ color: "var(--text-faint)" }}
                >
                  {chipPct.toFixed(1)} %
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5"
        style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">
          Structure de payouts — {spot.payoutLabel}
        </div>
        <div className="font-mono text-[13px] text-text leading-[1.6]">
          {spot.payouts.map((pp) => `${pp}%`).join(" · ")}
        </div>
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu peux caller le push de <strong className="text-text">Vilain</strong>{" "}
          ({spot.pushAmount.toLocaleString("fr-FR")} chips). Estime l&apos;équité requise
          en <strong className="text-text">chips</strong> (pot odds) et en{" "}
          <strong className="text-text">ICM</strong> (avec taxe bulle).
        </div>
      </div>
    </div>
  );
}

// ===== M4.2 — correction bubble factor (décomposition chip vs ICM) =====
function BubbleFactorCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: BubbleFactorSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ueChip = parseAnswerNumber(answer.equityChipReqInput) ?? 0;
  const ueICM = parseAnswerNumber(answer.equityIcmReqInput) ?? 0;
  const g = gradeM42(ueChip, ueICM, spot);
  const e = spot.expected;
  const userBF = ueICM > 0 && ueICM < 100 ? ueICM / (100 - ueICM) : 0;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Eq chip (toi)</div>
          <div className="text-2xl font-semibold font-mono leading-none">{ueChip.toFixed(1)} %</div>
          <div className="text-[11px] font-mono text-text-faint mt-1.5">
            vrai {g.trueEqChip.toFixed(1)} % ({g.errorChip >= 0 ? "+" : ""}
            {g.errorChip})
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Eq ICM (toi)</div>
          <div className="text-2xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {ueICM.toFixed(1)} %
          </div>
          <div className="text-[11px] font-mono text-text-faint mt-1.5">
            vrai {g.trueEqICM.toFixed(1)} % ({g.errorICM >= 0 ? "+" : ""}
            {g.errorICM})
          </div>
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5 flex items-center justify-between"
        style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
      >
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Bubble factor toi
          </div>
          <div className="text-lg font-mono font-semibold leading-none">
            {userBF.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Bubble factor vrai
          </div>
          <div
            className="text-2xl font-mono font-semibold leading-none"
            style={{ color: "var(--purple-300)" }}
          >
            {e.bubbleFactor.toFixed(2)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Équité hero avant</Lbl>{" "}
        <Mono>{e.heroEquityBefore.toFixed(1)} %</Mono>{" "}
        <span className="text-text-muted">du prizepool</span>
        <br />
        <Lbl>Si win</Lbl>{" "}
        <Mono className="!text-green-400">{e.heroEquityIfWin.toFixed(1)} %</Mono>{" "}
        <span className="text-text-muted">
          (gain +{(e.heroEquityIfWin - e.heroEquityBefore).toFixed(1)} pts)
        </span>
        <br />
        <Lbl>Si lose</Lbl>{" "}
        <span className="font-mono" style={{ color: "var(--red)" }}>
          {e.heroEquityIfLose.toFixed(1)} %
        </span>{" "}
        <span className="text-text-muted">
          (perte −{(e.heroEquityBefore - e.heroEquityIfLose).toFixed(1)} pts)
        </span>
        <br />
        <Lbl>BF vrai</Lbl>{" "}
        <Mono className="!text-purple-300">
          {(e.heroEquityBefore - e.heroEquityIfLose).toFixed(1)} /{" "}
          {(e.heroEquityIfWin - e.heroEquityBefore).toFixed(1)} ={" "}
          {e.bubbleFactor.toFixed(2)}
        </Mono>
        <br />
        <Lbl>Eq ICM requise</Lbl>{" "}
        <Mono>
          BF / (BF + 1) = {e.bubbleFactor.toFixed(2)} /{" "}
          {(e.bubbleFactor + 1).toFixed(2)} ={" "}
        </Mono>
        <Mono className="!text-purple-300">{e.requiredEquityICM.toFixed(1)} %</Mono>
        <br />
        <Lbl>Taxe ICM</Lbl>{" "}
        <span className="font-mono" style={{ color: "var(--amber)" }}>
          +{(e.requiredEquityICM - e.requiredEquityChip).toFixed(1)} pts
        </span>{" "}
        <span className="text-text-muted">au-dessus du seuil cash</span>
      </FormulaBox>

      <div
        className="rounded p-3.5 mt-3 text-[13px] leading-[1.55]"
        style={{
          background: "var(--surface-strong)",
          border: "0.5px solid var(--border)",
        }}
      >
        <span className="text-text-muted">
          Pattern à mémoriser : un spot{" "}
          <strong className="text-text">{M42_SPOT_TYPE_LABEL[spot.spotType].toLowerCase()}</strong>{" "}
          a typiquement un BF de{" "}
          <strong className="text-text">{e.bubbleFactor.toFixed(2)}</strong>, soit{" "}
          <strong className="text-text">{e.requiredEquityICM.toFixed(0)} %</strong>{" "}
          d&apos;équité ICM requise (vs {e.requiredEquityChip.toFixed(0)} % en chips).
        </span>
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M4.3 — table position-adjusted BF =====
const M43_POSITION_LABEL: Record<PositionBubbleFactorSpot["heroPosition"], string> = {
  UTG: "UTG (early)",
  MP: "MP (middle)",
  CO: "CO (late)",
  BTN: "BTN (button)",
  SB: "SB (small blind)",
  BB: "BB (big blind)",
};

function PositionBubbleFactorTable({ spot }: { spot: PositionBubbleFactorSpot }) {
  const totalChips = spot.players.reduce((acc, p) => acc + p.stack, 0);
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          Position factor · BF ajusté
        </div>
        <div className="text-xs font-mono text-text-faint">
          {M43_POSITION_LABEL[spot.heroPosition]} · {spot.playersLeftToAct} derrière
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <PfInfo label="Position" value={spot.heroPosition} />
        <PfInfo label="Joueurs derrière" value={String(spot.playersLeftToAct)} />
        <PfInfo label="Push" value={`${spot.pushAmount.toLocaleString("fr-FR")}`} />
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Joueurs en jeu ({spot.players.length})
        </div>
        <div className="flex flex-col gap-1.5">
          {spot.players.map((pl) => {
            const isHero = pl.id === spot.heroId;
            const isVillain = pl.id === spot.villainId;
            const chipPct = (pl.stack / totalChips) * 100;
            const accentColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-dim)";
            const bgColor = isHero
              ? "var(--purple-glow)"
              : isVillain
              ? "var(--amber-glow)"
              : "var(--surface)";
            const borderColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "rgba(251, 191, 36, 0.4)"
              : "var(--border)";
            const labelColor = isHero
              ? "var(--purple-300)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-muted)";
            return (
              <div
                key={pl.id}
                className="grid items-center gap-3 px-3.5 py-2 rounded text-[12px]"
                style={{
                  gridTemplateColumns: "70px 1fr 80px 50px",
                  background: bgColor,
                  border: `0.5px solid ${borderColor}`,
                }}
              >
                <span className="font-mono font-medium" style={{ color: labelColor }}>
                  {isHero ? "Hero" : isVillain ? "Vilain" : pl.id}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${Math.min(100, chipPct * 1.4)}%`,
                      background: accentColor,
                      opacity: isHero || isVillain ? 1 : 0.5,
                    }}
                  />
                </div>
                <span className="text-right font-mono">{pl.stack.toLocaleString("fr-FR")}</span>
                <span className="text-right text-[10px] font-mono text-text-faint">
                  {chipPct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5"
        style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">
          Structure — {spot.payoutLabel}
        </div>
        <div className="font-mono text-[12px] text-text leading-[1.6]">
          {spot.payouts.map((pp) => `${pp}%`).join(" · ")}
        </div>
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Hero {spot.heroPosition} push <strong className="text-text">
          {spot.pushAmount.toLocaleString("fr-FR")}</strong> chips. Avec{" "}
          <strong className="text-text">{spot.playersLeftToAct}</strong> joueurs derrière,
          quel est le BF brut puis le BF ajusté ?
        </div>
      </div>
    </div>
  );
}

function PositionBubbleFactorCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: PositionBubbleFactorSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ubBase = parseAnswerNumber(answer.bfBaseInput) ?? 0;
  const ubAdj = parseAnswerNumber(answer.bfAdjustedInput) ?? 0;
  const g = gradeM43(ubBase, ubAdj, spot);
  const e = spot.expected;
  const userMult = ubBase > 0.01 ? ubAdj / ubBase : 0;
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">BF brut (toi)</div>
          <div className="text-2xl font-semibold font-mono leading-none">{ubBase.toFixed(2)}</div>
          <div className="text-[11px] font-mono text-text-faint mt-1.5">
            vrai {g.trueBfBase.toFixed(2)} ({g.errorBase >= 0 ? "+" : ""}{g.errorBase})
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">BF ajusté (toi)</div>
          <div className="text-2xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {ubAdj.toFixed(2)}
          </div>
          <div className="text-[11px] font-mono text-text-faint mt-1.5">
            vrai {g.trueBfAdjusted.toFixed(2)} ({g.errorAdjusted >= 0 ? "+" : ""}{g.errorAdjusted})
          </div>
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5 flex items-center justify-between"
        style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
      >
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Multiplier toi
          </div>
          <div className="text-lg font-mono font-semibold leading-none">
            × {userMult.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Multiplier vrai
          </div>
          <div className="text-2xl font-mono font-semibold leading-none" style={{ color: "var(--purple-300)" }}>
            × {e.positionMultiplier.toFixed(2)}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Position</Lbl> <Mono>{spot.heroPosition}</Mono>{" "}
        <span className="text-text-muted">({spot.playersLeftToAct} joueurs derrière)</span>
        <br />
        <Lbl>Position factor</Lbl>{" "}
        <Mono>0.15 × {spot.playersLeftToAct} = {Math.min(0.75, 0.15 * spot.playersLeftToAct).toFixed(2)}</Mono>
        <br />
        <Lbl>BF brut</Lbl>{" "}
        <Mono className="!text-purple-300">{e.baseBubbleFactor.toFixed(2)}</Mono>{" "}
        <span className="text-text-muted">(face à 1 vilain)</span>
        <br />
        <Lbl>BF ajusté</Lbl>{" "}
        <Mono>{e.baseBubbleFactor.toFixed(2)} × {e.positionMultiplier.toFixed(2)} = </Mono>
        <Mono className="!text-purple-300">{e.adjustedBubbleFactor.toFixed(2)}</Mono>
        <br />
        <Lbl>Eq ICM requise</Lbl>{" "}
        <Mono>{e.adjustedBubbleFactor.toFixed(2)} / {(e.adjustedBubbleFactor + 1).toFixed(2)} = </Mono>
        <Mono className="!text-purple-300">{e.requiredEquityICM.toFixed(1)} %</Mono>
        <br />
        <Lbl>Équité hero avant</Lbl> <Mono>{e.heroEquityBefore.toFixed(1)} %</Mono>
      </FormulaBox>

      <div
        className="rounded p-3.5 mt-3 text-[13px] leading-[1.55]"
        style={{
          background: "var(--surface-strong)",
          border: "0.5px solid var(--border)",
        }}
      >
        <span className="text-text-muted">
          Pattern : push <strong className="text-text">{spot.heroPosition}</strong>{" "}
          avec {spot.playersLeftToAct} joueurs derrière =
          BF amplifié de <strong className="text-text">+{((e.positionMultiplier - 1) * 100).toFixed(0)} %</strong>.
          Equity ICM requise grimpe à{" "}
          <strong className="text-text">{e.requiredEquityICM.toFixed(0)} %</strong>.
        </span>
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M4.4 — table FT (vue compacte 9 joueurs + payouts) =====
const M44_SPOT_TYPE_LABEL: Record<FinalTableSpot["spotType"], string> = {
  "ft-9way-leader": "FT 9 · leader",
  "ft-9way-mid": "FT 9 · mid",
  "ft-9way-short": "FT 9 · short",
  "ft-6way": "FT 6-max",
  "ft-3way": "FT 3-handed",
  "ft-heads-up": "FT heads-up",
};

function FinalTableTable({ spot }: { spot: FinalTableSpot }) {
  const totalChips = spot.players.reduce((acc, p) => acc + p.stack, 0);
  // Pour les HU FT avec un "busted" virtuel (stack=1), on filtre l'affichage
  const visiblePlayers = spot.players.filter((p) => p.stack > 10);
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          Table finale · ICM amplifié
        </div>
        <div className="text-xs font-mono text-text-faint">
          {M44_SPOT_TYPE_LABEL[spot.spotType]}
        </div>
      </div>

      <div className="mb-5">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          {visiblePlayers.length} joueurs en jeu — push {spot.pushAmount.toLocaleString("fr-FR")}
        </div>
        <div className="flex flex-col gap-1">
          {visiblePlayers.map((pl) => {
            const isHero = pl.id === spot.heroId;
            const isVillain = pl.id === spot.villainId;
            const chipPct = (pl.stack / totalChips) * 100;
            const accentColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-dim)";
            const bgColor = isHero
              ? "var(--purple-glow)"
              : isVillain
              ? "var(--amber-glow)"
              : "var(--surface)";
            const borderColor = isHero
              ? "var(--purple-400)"
              : isVillain
              ? "rgba(251, 191, 36, 0.4)"
              : "var(--border)";
            const labelColor = isHero
              ? "var(--purple-300)"
              : isVillain
              ? "var(--amber)"
              : "var(--text-muted)";
            return (
              <div
                key={pl.id}
                className="grid items-center gap-3 px-3 py-1.5 rounded text-[11px]"
                style={{
                  gridTemplateColumns: "60px 1fr 80px 50px",
                  background: bgColor,
                  border: `0.5px solid ${borderColor}`,
                }}
              >
                <span className="font-mono font-medium" style={{ color: labelColor }}>
                  {isHero ? "Hero" : isVillain ? "Vilain" : pl.id}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${Math.min(100, chipPct * 1.5)}%`,
                      background: accentColor,
                      opacity: isHero || isVillain ? 1 : 0.5,
                    }}
                  />
                </div>
                <span className="text-right font-mono">{pl.stack.toLocaleString("fr-FR")}</span>
                <span className="text-right text-[10px] font-mono text-text-faint">
                  {chipPct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded p-3.5 mb-5"
        style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}
      >
        <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">
          {spot.payoutLabel} — spread {spot.payoutSpread} pts
        </div>
        <div className="font-mono text-[12px] text-text leading-[1.6]">
          {spot.payouts.map((pp) => `${pp}%`).join(" · ")}
        </div>
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Table finale {spot.playersRemaining} joueurs. Spread payouts{" "}
          <strong className="text-text">{spot.payoutSpread} pts</strong>. Quel est ton
          équité ICM <strong className="text-text">avant</strong> la décision ?
        </div>
      </div>
    </div>
  );
}

function FinalTableCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: FinalTableSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  const ue = parseAnswerNumber(answer.equityIcmFtInput) ?? 0;
  const g = gradeM44(ue, spot);
  const e = spot.expected;
  const totalChips = spot.players.reduce((acc, pl) => acc + pl.stack, 0);
  const heroPlayer = spot.players.find((pl) => pl.id === spot.heroId);
  const chipEq = heroPlayer ? (heroPlayer.stack / totalChips) * 100 : 0;
  const icmEffect = g.truePct - chipEq;
  const trendColor = icmEffect >= 0 ? "var(--green)" : "var(--red)";
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.level}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ta réponse</div>
          <div className="text-3xl font-semibold font-mono leading-none">{ue.toFixed(1)} %</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Équité ICM vraie</div>
          <div className="text-3xl font-semibold font-mono leading-none" style={{ color: g.errorColor }}>
            {g.truePct.toFixed(1)} %
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Chip equity hero</Lbl>{" "}
        <Mono>{chipEq.toFixed(1)} %</Mono>{" "}
        <span className="text-text-muted">(part naïve)</span>
        <br />
        <Lbl>Équité ICM avant</Lbl>{" "}
        <Mono className="!text-purple-300">{e.heroEquityBefore.toFixed(1)} %</Mono>
        <br />
        <Lbl>Effet ICM</Lbl>{" "}
        <span className="font-mono" style={{ color: trendColor }}>
          {icmEffect >= 0 ? "+" : ""}
          {icmEffect.toFixed(1)} pts
        </span>{" "}
        <span className="text-text-muted">vs chip equity</span>
        <br />
        <Lbl>Si win</Lbl>{" "}
        <Mono className="!text-green-400">{e.heroEquityIfWin.toFixed(1)} %</Mono>{" "}
        <span className="text-text-muted">
          (gain +{(e.heroEquityIfWin - e.heroEquityBefore).toFixed(1)} pts)
        </span>
        <br />
        <Lbl>Si lose</Lbl>{" "}
        <span className="font-mono" style={{ color: "var(--red)" }}>
          {e.heroEquityIfLose.toFixed(1)} %
        </span>{" "}
        <span className="text-text-muted">
          (perte −{(e.heroEquityBefore - e.heroEquityIfLose).toFixed(1)} pts)
        </span>
        <br />
        <Lbl>Range outcomes</Lbl>{" "}
        <Mono>{e.rangeOfOutcomes.toFixed(1)} pts</Mono>{" "}
        <span className="text-text-muted">d&apos;amplitude (win - lose)</span>
        <br />
        <Lbl>Bubble factor</Lbl>{" "}
        <Mono className="!text-purple-300">{e.bubbleFactor.toFixed(2)}</Mono>
        <br />
        <Lbl>Payouts</Lbl>{" "}
        <Mono>{spot.payouts.map((pp) => `${pp}%`).join(" · ")}</Mono>{" "}
        <span className="text-text-muted">(spread {spot.payoutSpread} pts)</span>
      </FormulaBox>

      <div
        className="rounded p-3.5 mt-3 text-[13px] leading-[1.55]"
        style={{
          background: "var(--surface-strong)",
          border: "0.5px solid var(--border)",
        }}
      >
        <span className="text-text-muted">
          Pattern <strong className="text-text">{M44_SPOT_TYPE_LABEL[spot.spotType]}</strong> :
          BF de <strong className="text-text">{e.bubbleFactor.toFixed(2)}</strong>,
          équité ICM <strong className="text-text">{e.heroEquityBefore.toFixed(0)} %</strong>
          {icmEffect < 0
            ? " (le chip leader perd à l'ICM)"
            : " (le short gagne à l'ICM)"}.
        </span>
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M5.1 — table Nash push (hero cards + stack + SB vs BB) =====
function NashPushTable({ spot }: { spot: NashPushSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          Nash push range · sub-15bb
        </div>
        <div className="text-xs font-mono text-text-faint">SB push first vs BB</div>
      </div>

      <div className="mb-7">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-6">
        <PfInfo label="Position" value="SB" />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Vilain" value="BB" />
        <PfInfo label="Pot avant" value={`${spot.potBefore} bb`} />
      </div>

      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu es SB avec <strong className="text-text">{spot.heroStack} bb</strong>.
          Vilain BB joue Nash. Push ou fold ? <em>Pas de saisie — c&apos;est mémorisation.</em>
        </div>
      </div>
    </div>
  );
}

// ===== M5.1 — correction Nash push (court, montre simplement le verdict + range) =====
function NashPushCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: NashPushSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  if (answer.nashActionInput === null) {
    return null;
  }
  const g = gradeM51(answer.nashActionInput, spot);
  const handStr = spot.heroCards.join(" ");
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${g.errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: g.errorColor }}>
        ◆ {g.isCorrect ? "Correct" : "Incorrect"}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {g.errorLabel}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ton choix</div>
          <div className="text-2xl font-semibold font-mono leading-none uppercase">
            {answer.nashActionInput}
          </div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${g.errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Nash</div>
          <div className="text-2xl font-semibold font-mono leading-none uppercase" style={{ color: g.errorColor }}>
            {g.nashAction}
          </div>
        </div>
      </div>

      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{handStr}</Mono> ·{" "}
        <Mono>SB {spot.heroStack}bb</Mono>
        <br />
        <Lbl>Main dans range Nash</Lbl>{" "}
        <Mono className={spot.expected.handInRange ? "!text-green-400" : "!text-red"}>
          {spot.expected.handInRange ? "OUI (push)" : "NON (fold)"}
        </Mono>
        <br />
        <Lbl>Range Nash {spot.heroStack}bb</Lbl>
        <br />
        <span className="text-[12px] text-text-muted leading-[1.7]">
          {spot.expected.nashRangeNotation}
        </span>
      </FormulaBox>

      <div className="mt-4">
        <RangeDisplay notation={spot.expected.nashRangeNotation} />
      </div>

      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

// ===== M5.x — composant binaire réutilisable (CALL/FOLD ou PUSH/FOLD) =====
function NashBinaryAnswerPanel({
  eyebrow,
  title,
  prompt,
  leftLabel,
  leftSubLabel,
  rightLabel,
  rightSubLabel,
  chosen,
  leftValue,
  rightValue,
  onChoose,
  canSubmit,
  onValidate,
}: {
  eyebrow: string;
  title: string;
  prompt: ReactNode;
  leftLabel: string;
  leftSubLabel: string;
  rightLabel: string;
  rightSubLabel: string;
  chosen: string | null;
  leftValue: string;
  rightValue: string;
  onChoose: (v: string) => void;
  canSubmit: boolean;
  onValidate: () => void;
}) {
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
    >
      <div
        className="text-[11px] font-mono uppercase tracking-wider mb-2"
        style={{ color: "var(--purple-300)" }}
      >
        ◆ {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-2">
        {title}
      </h2>
      <p className="text-[13px] text-text-muted mb-6 leading-[1.55]">{prompt}</p>
      <div className="flex flex-col gap-3 mb-2">
        <button
          onClick={() => onChoose(leftValue)}
          className="rounded p-5 text-left transition-all duration-200 hover:-translate-y-px"
          style={{
            background:
              chosen === leftValue ? "var(--purple-glow)" : "var(--surface-strong)",
            border: `0.5px solid ${
              chosen === leftValue ? "var(--purple-400)" : "var(--border)"
            }`,
            color: chosen === leftValue ? "var(--text)" : "var(--text-muted)",
            boxShadow:
              chosen === leftValue
                ? "0 0 0 0.5px var(--purple-400), 0 0 16px var(--purple-glow)"
                : "none",
          }}
        >
          <div className="text-xl font-bold tracking-[-0.02em]">{leftLabel}</div>
          <div className="text-[11px] font-mono text-text-faint mt-1">{leftSubLabel}</div>
        </button>
        <button
          onClick={() => onChoose(rightValue)}
          className="rounded p-5 text-left transition-all duration-200 hover:-translate-y-px"
          style={{
            background:
              chosen === rightValue ? "var(--purple-glow)" : "var(--surface-strong)",
            border: `0.5px solid ${
              chosen === rightValue ? "var(--purple-400)" : "var(--border)"
            }`,
            color: chosen === rightValue ? "var(--text)" : "var(--text-muted)",
            boxShadow:
              chosen === rightValue
                ? "0 0 0 0.5px var(--purple-400), 0 0 16px var(--purple-glow)"
                : "none",
          }}
        >
          <div className="text-xl font-bold tracking-[-0.02em]">{rightLabel}</div>
          <div className="text-[11px] font-mono text-text-faint mt-1">{rightSubLabel}</div>
        </button>
      </div>
      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onValidate}
          disabled={!canSubmit}
          className={cn(
            "flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200",
            canSubmit ? "hover:-translate-y-px" : "opacity-40 cursor-not-allowed"
          )}
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: canSubmit ? "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)" : "none",
          }}
        >
          Valider la réponse →
        </button>
      </div>
    </div>
  );
}

// ===== M5.2 — table BB call =====
function BBCallTable({ spot }: { spot: BBCallSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          BB call vs SB push · Nash
        </div>
        <div className="text-xs font-mono text-text-faint">BB defense (closed action)</div>
      </div>
      <div className="mb-7">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        <PfInfo label="Position" value="BB" />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Pusher" value="SB" />
        <PfInfo label="Push" value={`${spot.pushAmount} bb`} />
      </div>
      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          SB a pushé <strong className="text-text">{spot.pushAmount} bb</strong>.
          Tu es BB avec <strong className="text-text">{spot.heroStack} bb</strong>{" "}
          (déjà 1bb investi). Call ou fold ? <em>Mémorisation Nash.</em>
        </div>
      </div>
    </div>
  );
}

// ===== M5.3 — table BTN push =====
function BTNPushTable({ spot }: { spot: BTNPushSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          BTN push range · Nash
        </div>
        <div className="text-xs font-mono text-text-faint">BTN push first vs SB+BB</div>
      </div>
      <div className="mb-7">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        <PfInfo label="Position" value="BTN" />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Joueurs derrière" value="2 (SB+BB)" />
        <PfInfo label="Pot avant" value={`${spot.potBefore} bb`} />
      </div>
      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          Tu es BTN avec <strong className="text-text">{spot.heroStack} bb</strong>.
          SB et BB derrière. Range BTN push ≈ <em>70 % du range SB push</em>.
          Push ou fold ?
        </div>
      </div>
    </div>
  );
}

// ===== M5.4 — table Position defense =====
function PositionDefenseTable({ spot }: { spot: PositionDefenseSpot }) {
  return (
    <div
      className="relative rounded-xl overflow-hidden p-7"
      style={{
        background: "linear-gradient(180deg, #0F1815 0%, #0A1410 100%)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute inset-3 rounded-2xl pointer-events-none" style={{ border: "0.5px solid rgba(255,255,255,0.04)" }} />
      <div className="relative z-10 flex justify-between items-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--purple-400)", boxShadow: "0 0 0 3px var(--purple-glow)" }} />
          {spot.heroPosition} defense vs {spot.villainPosition} push
        </div>
        <div className="text-xs font-mono text-text-faint">Hiérarchie position</div>
      </div>
      <div className="mb-7">
        <div className="font-mono uppercase tracking-wider text-text-faint mb-2.5" style={{ fontSize: 10, letterSpacing: "0.08em" }}>
          Ta main
        </div>
        <div className="flex gap-2">
          {spot.heroCards.map((c, i) => (
            <PlayingCard key={`h-${c}-${i}`} card={c} dealDelayMs={i * 80} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        <PfInfo label="Hero" value={spot.heroPosition} />
        <PfInfo label="Stack" value={`${spot.heroStack} bb`} />
        <PfInfo label="Pusher" value={spot.villainPosition} />
        <PfInfo label="Push" value={`${spot.pushAmount} bb`} />
      </div>
      <div className="rounded p-5" style={{ background: "rgba(0,0,0,0.3)", border: "0.5px solid var(--border)" }}>
        <div className="text-text mb-2" style={{ fontSize: 15, lineHeight: 1.55 }}>
          <BetTag>{spot.scenarioLabel}</BetTag>
        </div>
        <div className="text-text-muted" style={{ fontSize: 13 }}>
          <strong className="text-text">{spot.villainPosition}</strong> a pushé{" "}
          <strong className="text-text">{spot.pushAmount} bb</strong>. Tu es{" "}
          <strong className="text-text">{spot.heroPosition}</strong>. Plus tu es{" "}
          <em>early</em>, plus tu call <em>tight</em>.
        </div>
      </div>
    </div>
  );
}

// ===== M5.x — correction panels (factor commun) =====
function NashBinaryCorrectionShell({
  isCorrect,
  errorColor,
  errorLabel,
  userActionLabel,
  nashActionLabel,
  handStr,
  contextLine,
  inRange,
  nashRangeNotation,
  onNext,
}: {
  isCorrect: boolean;
  errorColor: string;
  errorLabel: string;
  userActionLabel: string;
  nashActionLabel: string;
  handStr: string;
  contextLine: string;
  inRange: boolean;
  nashRangeNotation: string;
  onNext: () => void;
}) {
  return (
    <div
      className="rounded-xl p-7 flex flex-col"
      style={{ background: "var(--surface)", border: `0.5px solid ${errorColor}` }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: errorColor }}>
        ◆ {isCorrect ? "Correct" : "Incorrect"}
      </div>
      <h2 className="text-2xl font-semibold tracking-[-0.025em] leading-tight mb-6">
        {errorLabel}
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Ton choix</div>
          <div className="text-2xl font-semibold font-mono leading-none uppercase">{userActionLabel}</div>
        </div>
        <div className="rounded p-4" style={{ background: "var(--surface-strong)", border: `0.5px solid ${errorColor}` }}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">Nash</div>
          <div className="text-2xl font-semibold font-mono leading-none uppercase" style={{ color: errorColor }}>
            {nashActionLabel}
          </div>
        </div>
      </div>
      <FormulaBox>
        <Lbl>Hero</Lbl> <Mono>{handStr}</Mono> · <Mono>{contextLine}</Mono>
        <br />
        <Lbl>Main dans range Nash</Lbl>{" "}
        <Mono className={inRange ? "!text-green-400" : "!text-red"}>
          {inRange ? "OUI" : "NON"}
        </Mono>
        <br />
        <Lbl>Range Nash</Lbl>
        <br />
        <span className="text-[12px] text-text-muted leading-[1.7]">
          {nashRangeNotation}
        </span>
      </FormulaBox>
      <div className="mt-4">
        <RangeDisplay notation={nashRangeNotation} />
      </div>
      <div className="mt-auto pt-6 flex gap-2.5">
        <button
          onClick={onNext}
          className="flex-1 px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Spot suivant →
        </button>
      </div>
    </div>
  );
}

function BBCallCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: BBCallSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  if (answer.nashCallActionInput === null) return null;
  const g = gradeM52(answer.nashCallActionInput, spot);
  return (
    <NashBinaryCorrectionShell
      isCorrect={g.isCorrect}
      errorColor={g.errorColor}
      errorLabel={g.errorLabel}
      userActionLabel={answer.nashCallActionInput}
      nashActionLabel={g.nashAction}
      handStr={spot.heroCards.join(" ")}
      contextLine={`BB ${spot.heroStack}bb vs SB push ${spot.pushAmount}bb`}
      inRange={spot.expected.handInRange}
      nashRangeNotation={spot.expected.nashRangeNotation}
      onNext={onNext}
    />
  );
}

function BTNPushCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: BTNPushSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  if (answer.nashActionInput === null) return null;
  const g = gradeM53(answer.nashActionInput, spot);
  return (
    <NashBinaryCorrectionShell
      isCorrect={g.isCorrect}
      errorColor={g.errorColor}
      errorLabel={g.errorLabel}
      userActionLabel={answer.nashActionInput}
      nashActionLabel={g.nashAction}
      handStr={spot.heroCards.join(" ")}
      contextLine={`BTN ${spot.heroStack}bb (SB+BB derrière)`}
      inRange={spot.expected.handInRange}
      nashRangeNotation={spot.expected.nashRangeNotation}
      onNext={onNext}
    />
  );
}

function PositionDefenseCorrectionPanel({
  spot,
  answer,
  onNext,
}: {
  spot: PositionDefenseSpot;
  answer: UserAnswer;
  onNext: () => void;
}) {
  if (answer.nashCallActionInput === null) return null;
  const g = gradeM54(answer.nashCallActionInput, spot);
  return (
    <NashBinaryCorrectionShell
      isCorrect={g.isCorrect}
      errorColor={g.errorColor}
      errorLabel={g.errorLabel}
      userActionLabel={answer.nashCallActionInput}
      nashActionLabel={g.nashAction}
      handStr={spot.heroCards.join(" ")}
      contextLine={`${spot.heroPosition} ${spot.heroStack}bb vs ${spot.villainPosition} push`}
      inRange={spot.expected.handInRange}
      nashRangeNotation={spot.expected.nashRangeNotation}
      onNext={onNext}
    />
  );
}
