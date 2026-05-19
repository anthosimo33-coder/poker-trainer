/**
 * Pré-calcule les spots M3.4 (check-raise flop OOP).
 *
 * Pour chaque spot : hero OOP a check, vilain a c-bet, hero raise → 3 branches
 * (fold/call/3-bet) via `evCheckRaise`. Equity calculée vs le call range vilain
 * sur le board flop donné. Probabilités dérivées par taille de range.
 *
 * Distribution cible (4 archétypes × ~30 spots) :
 *   value : main forte (set, two pair, TPTK, overpair) → EV +3 à +8 bb
 *   semibluff : FD/OE/combo → EV +0.5 à +3 bb (FE + equity vs call)
 *   bluff pur : air sur board favorable → EV dépend FE
 *   marginal : TPWK, second pair, weak draw → décisions borderline
 *
 * Perf : equityVsRange MC ; iterations=600 (cohérence avec m3-1/2/3). Avec
 * call ranges 44-56 combos × 600 iters × 120 spots ≈ 3-5 min attendu.
 */
import * as fs from "fs";
import * as path from "path";
import { evCheckRaise } from "../lib/poker/ev";
import { parseRange } from "../lib/poker/range-parser";
import { getRange } from "../content/ranges/canonical";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM34Spot } from "../content/spots/types";

const ITER = 600;
const REAL_FACTOR = 0.8;
const POT_PRE = 6;
const CBET = 3;
const RAISE = 9;
const EFF_STACK = 30;

type Texture = PrecomputedM34Spot["boardTexture"];
type HandType = PrecomputedM34Spot["heroHandType"];

interface Tpl {
  hero: [Card, Card];
  heroLabel: string;
  board: [Card, Card, Card];
  texture: Texture;
  handType: HandType;
  cbetSlug: string;
  callSlug: string;
  threeBetSlug: string;
}

const T: Tpl[] = [];
const add = (
  hero: [Card, Card],
  heroLabel: string,
  board: [Card, Card, Card],
  texture: Texture,
  handType: HandType,
  cbetSlug: string,
  callSlug: string,
  threeBetSlug: string
) => T.push({ hero, heroLabel, board, texture, handType, cbetSlug, callSlug, threeBetSlug });

// Slugs raccourcis
const CBET_WET = "cbet-btn-vs-bb-wet-board";
const CBET_DRY = "cbet-btn-vs-bb-dry-board";
const CBET_K = "cbet-utg-vs-bb-Khigh";
const CALL_T = "call-vs-cr-Khigh-tight";
const CALL_S = "call-vs-cr-Khigh-standard";
const TB = "3bet-vs-cr-nuts-only";

// ===== A. VALUE check-raise (~30) =====
// Set sur board K-high dry
add(["7c", "7h"], "77 (set)", ["7s", "Ks", "2d"], "dry", "value", CBET_DRY, CALL_T, TB);
add(["7c", "7h"], "77 (set)", ["7d", "Kh", "3c"], "dry", "value", CBET_DRY, CALL_T, TB);
add(["2s", "2c"], "22 (set)", ["2h", "Kc", "8d"], "dry", "value", CBET_DRY, CALL_T, TB);
add(["8s", "8c"], "88 (set)", ["8h", "Kd", "3s"], "dry", "value", CBET_DRY, CALL_T, TB);
add(["5s", "5c"], "55 (set)", ["5h", "Kc", "2d"], "dry", "value", CBET_DRY, CALL_T, TB);
// TPTK Kxx
// Pairing CBET_K (70 combos) avec CALL_T (44) + TB (22) : 66 < 70 ✓
// (CBET_K + CALL_S = 78 > 70 → erreur range — corrigé en CALL_T).
add(["Ah", "Kh"], "AK (TPTK)", ["Ks", "9d", "2c"], "dry", "value", CBET_K, CALL_T, TB);
add(["Ad", "Kd"], "AK (TPTK)", ["Kh", "7s", "4c"], "dry", "value", CBET_K, CALL_T, TB);
add(["Ah", "Kc"], "AK (TPTK)", ["Kd", "6h", "3s"], "dry", "value", CBET_K, CALL_T, TB);
// Overpair
add(["As", "Ah"], "AA (overpair)", ["Kh", "7d", "2c"], "dry", "value", CBET_K, CALL_T, TB);
add(["Qs", "Qh"], "QQ (overpair)", ["Jh", "8d", "2c"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Jc", "Jh"], "JJ (overpair)", ["9s", "7d", "3c"], "dry", "value", CBET_DRY, CALL_S, TB);
// Two pair
add(["Kh", "7d"], "K7 (two pair)", ["Ks", "7c", "2h"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Kd", "8s"], "K8 (two pair)", ["Kc", "8h", "3d"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Qh", "8c"], "Q8 (two pair)", ["Qs", "8d", "4c"], "dry", "value", CBET_DRY, CALL_S, TB);
// Set sur wet
add(["Tc", "Th"], "TT (set)", ["Td", "9s", "8h"], "wet", "value", CBET_WET, CALL_S, TB);
add(["9c", "9h"], "99 (set)", ["9d", "8s", "7c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["8c", "8h"], "88 (set)", ["8d", "7s", "5c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["Jc", "Jh"], "JJ (set)", ["Js", "9d", "6h"], "wet", "value", CBET_WET, CALL_S, TB);
// Top pair top kicker sur wet
add(["Ah", "Th"], "AT (TPTK)", ["Tc", "7s", "5d"], "wet", "value", CBET_WET, CALL_S, TB);
add(["As", "Js"], "AJ (TPTK)", ["Jd", "8h", "6c"], "wet", "value", CBET_WET, CALL_S, TB);
// Overpair sur wet (vulnerable)
add(["As", "Ah"], "AA (overpair)", ["Th", "8s", "7d"], "wet", "value", CBET_WET, CALL_S, TB);
add(["Ks", "Kc"], "KK (overpair)", ["Qh", "9d", "8c"], "wet", "value", CBET_WET, CALL_S, TB);
// Set sur paired
add(["Ts", "Tc"], "TT (overpair)", ["6h", "6c", "5d"], "paired", "value", CBET_DRY, CALL_T, TB);
add(["9h", "9s"], "99 (overpair)", ["8c", "8h", "3d"], "paired", "value", CBET_DRY, CALL_T, TB);
add(["Ks", "9h"], "K9 (over+pair)", ["7d", "7c", "2h"], "paired", "value", CBET_DRY, CALL_T, TB);
// Slowplay sets
add(["7d", "7s"], "77 (set)", ["7c", "Kh", "Kd"], "paired", "value", CBET_DRY, CALL_T, TB);
// Top pair monotone (suites de hero choisies pour éviter collision avec board)
add(["Ah", "Kd"], "AK (TPTK monotone)", ["Ks", "8s", "2s"], "monotone", "value", CBET_WET, CALL_S, TB);
add(["Qh", "Qs"], "QQ (overpair)", ["Jh", "9h", "5h"], "monotone", "value", CBET_WET, CALL_S, TB);
add(["Ad", "Kd"], "AK + NFD", ["Kc", "8c", "3c"], "monotone", "value", CBET_WET, CALL_S, TB);
add(["Ac", "8d"], "A8 (TP monotone)", ["Ks", "8s", "2s"], "monotone", "value", CBET_WET, CALL_S, TB);

// ===== B. SEMI-BLUFF check-raise (~30) =====
// Flush draw + overs
add(["Ad", "Kd"], "AK + NFD", ["Td", "5d", "2c"], "wet", "semibluff", CBET_DRY, CALL_S, TB);
add(["Ah", "Qh"], "AQ + NFD", ["Jh", "8h", "3c"], "wet", "semibluff", CBET_DRY, CALL_S, TB);
add(["As", "Js"], "AJ + NFD", ["Ts", "7s", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Kc", "Qc"], "KQ + FD", ["9c", "8c", "3d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// OE + 2 overs
add(["Qh", "Jh"], "QJ (OE+overs)", ["Th", "9c", "2d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Ks", "Qd"], "KQ (gutshot+overs)", ["Js", "Tc", "3h"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Ah", "Qd"], "AQ (gutshot+over)", ["Jh", "Ts", "3c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Jc", "Th"], "JT (OE)", ["9s", "8d", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// FD pure
add(["Qd", "Td"], "QT (FD)", ["8d", "5d", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["8s", "7s"], "87s (FD+OE)", ["6s", "5h", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["9s", "8s"], "98s (FD+OE)", ["7s", "5d", "2h"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Jh", "Th"], "JT (FD+gutshot)", ["8h", "5h", "2d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// Combo draws
add(["9s", "8s"], "98s (FD+OE)", ["Ts", "7s", "2d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["7d", "6d"], "76s (FD+OE)", ["5d", "4c", "2d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Td", "9d"], "T9s (FD+OE)", ["8d", "7c", "2d"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["6c", "5c"], "65s (FD+OE)", ["7c", "4d", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// Gutshot + overs
add(["Ah", "Kh"], "AK gutshot", ["Th", "9d", "2c"], "wet", "semibluff", CBET_DRY, CALL_S, TB);
add(["Ks", "Jc"], "KJ gutshot", ["Th", "9d", "3c"], "wet", "semibluff", CBET_DRY, CALL_S, TB);
add(["Qc", "Jd"], "QJ gutshot", ["9s", "8c", "3d"], "wet", "semibluff", CBET_DRY, CALL_S, TB);
// Backdoor + FD
add(["Ad", "Td"], "AT BDFD+OC", ["8d", "5s", "2c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// Pair + draw
add(["9h", "8h"], "98s (pair+draw)", ["8d", "7s", "5h"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Ts", "9s"], "T9s (pair+draw)", ["9d", "8c", "5s"], "wet", "semibluff", CBET_WET, CALL_S, TB);
add(["Jc", "Tc"], "JT (pair+draw)", ["Td", "9s", "5c"], "wet", "semibluff", CBET_WET, CALL_S, TB);
// FD sur K board
add(["Ad", "5d"], "A5d (NFD+wheel)", ["Kd", "8d", "3c"], "wet", "semibluff", CBET_K, CALL_T, TB);
add(["Qd", "Jd"], "QJ + FD", ["Kd", "8d", "3c"], "wet", "semibluff", CBET_K, CALL_T, TB);
// Pair + FD
add(["Ts", "9s"], "T9s + FD", ["Ks", "9c", "3s"], "wet", "semibluff", CBET_K, CALL_T, TB);
// Naked overs + BDFD
add(["Qs", "Js"], "QJ (overs+BDFD)", ["7s", "5d", "2c"], "dry", "semibluff", CBET_DRY, CALL_S, TB);
add(["Ah", "Qh"], "AQ (overs+BDFD)", ["7h", "5c", "2d"], "dry", "semibluff", CBET_DRY, CALL_S, TB);
// Pair + BDFD
add(["8s", "7s"], "87s (pair+BDFD)", ["7h", "5c", "2s"], "dry", "semibluff", CBET_DRY, CALL_S, TB);
// Combo wet pair board
add(["Th", "8h"], "T8 (FD+gut)", ["6h", "5h", "5d"], "paired", "semibluff", CBET_DRY, CALL_T, TB);

// ===== C. PURE BLUFF check-raise (~30) =====
// Air sur K-high dry
add(["9d", "8c"], "98o (air)", ["Kh", "7c", "2d"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["Qd", "Jc"], "QJo (air)", ["Ah", "8s", "3d"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["7h", "6c"], "76o (air)", ["Kc", "Qd", "5h"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["5h", "4d"], "54o (air)", ["Ah", "Js", "8c"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["6c", "5d"], "65o (air)", ["Kh", "Qc", "8s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["8h", "7d"], "87o (air)", ["Ah", "Jd", "3s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["9c", "7s"], "97o (air)", ["Ad", "Kc", "5h"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["6h", "5c"], "65o (air)", ["Ks", "Qd", "Jh"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["4d", "3c"], "43o (air)", ["Kh", "Qc", "9d"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["Jh", "5d"], "J5o (air)", ["Ah", "Kd", "7c"], "dry", "bluff", CBET_DRY, CALL_T, TB);
// Bluff sur paired
add(["9d", "8c"], "98o (air paired)", ["Kh", "7c", "7d"], "paired", "bluff", CBET_DRY, CALL_T, TB);
add(["Qc", "Jd"], "QJo (air paired)", ["Th", "6c", "6d"], "paired", "bluff", CBET_DRY, CALL_T, TB);
add(["7d", "5c"], "75o (air paired)", ["Ah", "8s", "8h"], "paired", "bluff", CBET_DRY, CALL_T, TB);
add(["6h", "4d"], "64o (air paired)", ["Kh", "Kd", "5c"], "paired", "bluff", CBET_DRY, CALL_T, TB);
add(["8c", "5d"], "85o (air paired)", ["Qh", "Qc", "3d"], "paired", "bluff", CBET_DRY, CALL_T, TB);
// Bluff K-high with light backdoor
add(["7c", "6c"], "76s BDFD bluff", ["Kh", "9d", "3s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["8d", "7d"], "87s BDFD bluff", ["Kc", "9h", "4s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["9c", "8c"], "98s BDFD bluff", ["Ah", "Kd", "5s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["6s", "5s"], "65s BDFD bluff", ["Kd", "Td", "3h"], "dry", "bluff", CBET_DRY, CALL_T, TB);
// Bluff on A-high
add(["7d", "5c"], "75o (air Axx)", ["Ah", "8s", "2d"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["9h", "6d"], "96o (air Axx)", ["Ad", "7c", "3s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["Tc", "5d"], "T5o (air Axx)", ["Ah", "8d", "4c"], "dry", "bluff", CBET_DRY, CALL_T, TB);
// Bluff sur wet (range advantage moins clair)
add(["Ad", "5d"], "A5 (BDFD bluff wet)", ["Tc", "8s", "7h"], "wet", "bluff", CBET_WET, CALL_S, TB);
add(["Kd", "5d"], "K5 (BDFD bluff)", ["Th", "8c", "6s"], "wet", "bluff", CBET_WET, CALL_S, TB);
// Bluff on Q-high dry
add(["7s", "6c"], "76o (Qxx air)", ["Qh", "8d", "3s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["9d", "4c"], "94o (Qxx air)", ["Qc", "7h", "2s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
// Bluff J/T high dry
add(["8h", "5c"], "85o (Jxx air)", ["Jc", "7s", "2d"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["6d", "4s"], "64o (Txx air)", ["Tc", "8h", "3s"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["7c", "3d"], "73o (air Axx)", ["Ah", "9s", "4c"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["5h", "3c"], "53o (air Kxx)", ["Ks", "Td", "2h"], "dry", "bluff", CBET_DRY, CALL_T, TB);
add(["Qc", "9h"], "Q9 (air paired)", ["Js", "Jd", "4c"], "paired", "bluff", CBET_DRY, CALL_T, TB);

// ===== D. MARGINAL check-raise (~30) =====
// TPWK
add(["Ks", "9c"], "K9 (TPWK)", ["Kh", "8d", "5c"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Kd", "8h"], "K8 (TPWK)", ["Kc", "7s", "3d"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Kh", "7d"], "K7 (TP medium kicker)", ["Ks", "4d", "2h"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Qc", "8h"], "Q8 (TPWK)", ["Qh", "6s", "3d"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Jd", "8c"], "J8 (TPWK)", ["Jh", "5s", "3d"], "dry", "value", CBET_DRY, CALL_S, TB);
// Second pair
add(["8s", "8c"], "88 (second pair)", ["Kh", "8d", "3c"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["9d", "9c"], "99 (second pair)", ["Kh", "9s", "4d"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["7h", "7c"], "77 (second pair)", ["Qd", "7s", "4c"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["6d", "6c"], "66 (second pair)", ["Jh", "6s", "2c"], "dry", "value", CBET_DRY, CALL_S, TB);
// Top pair on wet (medium kicker)
add(["Td", "Jh"], "JT (TPMK wet)", ["Th", "9d", "2c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["9s", "Tc"], "T9 (TP medium)", ["Th", "7c", "5d"], "wet", "value", CBET_WET, CALL_S, TB);
add(["8c", "9d"], "98 (top pair)", ["9h", "7s", "5c"], "wet", "value", CBET_WET, CALL_S, TB);
// Weak draw + pair
add(["Jc", "9d"], "J9 (gutshot+top)", ["9h", "8d", "2c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["Td", "8c"], "T8 (pair+OE blocked)", ["Th", "5d", "2c"], "wet", "value", CBET_WET, CALL_S, TB);
// Underpair to top card
add(["9s", "9c"], "99 (underpair)", ["Kh", "8s", "3d"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["Ts", "Tc"], "TT (underpair)", ["Kd", "9h", "2c"], "dry", "value", CBET_DRY, CALL_S, TB);
add(["8s", "8c"], "88 (underpair)", ["Qd", "Tc", "3h"], "dry", "value", CBET_DRY, CALL_S, TB);
// Weak top pair + gutshot
add(["Ks", "Tc"], "KT (TP+gut)", ["Kd", "9h", "8c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["Qd", "Jc"], "QJ (TP+gut)", ["Qs", "Tc", "8h"], "wet", "value", CBET_WET, CALL_S, TB);
// Overpair on wet board (vulnerable)
add(["Js", "Jc"], "JJ (overpair wet)", ["Th", "9s", "7c"], "wet", "value", CBET_WET, CALL_S, TB);
add(["Tc", "Th"], "TT (vulnerable)", ["9d", "8h", "6c"], "wet", "value", CBET_WET, CALL_S, TB);
// Air with weak gutshot
add(["Jc", "9d"], "J9 (gutshot only)", ["7h", "5c", "2d"], "wet", "semibluff", CBET_DRY, CALL_T, TB);
add(["Qd", "Tc"], "QT (gutshot only)", ["8h", "5c", "2d"], "wet", "semibluff", CBET_DRY, CALL_T, TB);
// BDFD + overcard
add(["Ac", "Th"], "AT (over+BDFD)", ["8c", "5s", "2c"], "dry", "semibluff", CBET_DRY, CALL_S, TB);
add(["Kc", "Jh"], "KJ (over+BDFD)", ["8c", "5h", "2c"], "dry", "semibluff", CBET_DRY, CALL_S, TB);
// Top pair on monotone (vulnerable to flush)
add(["Ks", "9c"], "K9 (TP monotone)", ["Kh", "8h", "3h"], "monotone", "value", CBET_DRY, CALL_S, TB);
add(["Ah", "Tc"], "AT (TP monotone)", ["Th", "7h", "2h"], "monotone", "value", CBET_DRY, CALL_S, TB);
// Marginal on paired
add(["As", "Jc"], "AJ (overs paired)", ["8d", "8h", "2c"], "paired", "semibluff", CBET_DRY, CALL_T, TB);
add(["Kc", "Qd"], "KQ (overs paired)", ["7h", "7s", "3d"], "paired", "semibluff", CBET_DRY, CALL_T, TB);
add(["Qh", "Jd"], "QJ (overs paired)", ["6c", "6d", "4s"], "paired", "semibluff", CBET_DRY, CALL_T, TB);

function computeSpot(tpl: Tpl, id: string): PrecomputedM34Spot | null {
  const cbet = getRange(tpl.cbetSlug);
  const call = getRange(tpl.callSlug);
  const tb = getRange(tpl.threeBetSlug);
  if (!cbet || !call || !tb) {
    console.error(`Range slug introuvable : ${tpl.cbetSlug}/${tpl.callSlug}/${tpl.threeBetSlug}`);
    return null;
  }
  const cbetCombos = parseRange(cbet.notation);
  const callCombos = parseRange(call.notation);
  const tbCombos = parseRange(tb.notation);
  try {
    const r = evCheckRaise({
      heroCards: tpl.hero,
      potPreflop: POT_PRE,
      cbetSize: CBET,
      raiseSize: RAISE,
      effectiveStack: EFF_STACK,
      villainCBetRange: cbetCombos,
      villainCallVsRaiseRange: callCombos,
      villain3BetRange: tbCombos,
      board: tpl.board,
      realizationFactor: REAL_FACTOR,
      iterations: ITER,
    });
    return {
      id,
      heroCards: tpl.hero,
      board: tpl.board,
      heroPosition: "BB",
      villainPosition: "BTN",
      potPreflop: POT_PRE,
      cbetSize: CBET,
      raiseSize: RAISE,
      effectiveStack: EFF_STACK,
      villainCBetRangeSlug: cbet.slug,
      villainCBetRangeLabel: cbet.label,
      villainCBetRangeNotation: cbet.notation,
      villainCallVsRaiseRangeSlug: call.slug,
      villainCallVsRaiseRangeLabel: call.label,
      villainCallVsRaiseRangeNotation: call.notation,
      villain3BetRangeSlug: tb.slug,
      villain3BetRangeLabel: tb.label,
      villain3BetRangeNotation: tb.notation,
      boardTexture: tpl.texture,
      heroHandType: tpl.handType,
      scenarioLabel: `${tpl.heroLabel} check-raise sur ${tpl.board.join(" ")}`,
      expected: {
        pFold: Math.round(r.pFold * 1000) / 1000,
        pCall: Math.round(r.pCall * 1000) / 1000,
        pThreeBet: Math.round(r.pThreeBet * 1000) / 1000,
        equityVsCallRange: Math.round(r.equityVsCallRange * 10) / 10,
        evIfFold: Math.round(r.evIfFold * 100) / 100,
        evIfCall: Math.round(r.evIfCall * 100) / 100,
        evIf3Bet: Math.round(r.evIf3Bet * 100) / 100,
        evBb: Math.round(r.evBb * 100) / 100,
        realizationFactorUsed: REAL_FACTOR,
      },
    };
  } catch (e) {
    console.error(`Skipped ${tpl.heroLabel} ${tpl.board.join("")} : ${(e as Error).message}`);
    return null;
  }
}

function main() {
  console.log(`Pré-calcul de ${T.length} spots M3.4...`);
  const t0 = Date.now();
  const spots: PrecomputedM34Spot[] = [];
  const buckets = { "<-3": 0, "-3..0": 0, "0..3": 0, "3..6": 0, ">6": 0 };
  for (let i = 0; i < T.length; i++) {
    const spot = computeSpot(T[i], `m3-4-spot-${String(i + 1).padStart(3, "0")}`);
    if (!spot) continue;
    spots.push(spot);
    const ev = spot.expected.evBb;
    const k =
      ev < -3 ? "<-3" : ev < 0 ? "-3..0" : ev < 3 ? "0..3" : ev < 6 ? "3..6" : ">6";
    buckets[k as keyof typeof buckets]++;
    if ((i + 1) % 20 === 0) {
      console.log(`  [${i + 1}/${T.length}] ${spot.scenarioLabel} → EV ${spot.expected.evBb} bb`);
    }
  }
  const archBuckets = {
    value: spots.filter((s) => s.heroHandType === "value").length,
    semibluff: spots.filter((s) => s.heroHandType === "semibluff").length,
    bluff: spots.filter((s) => s.heroHandType === "bluff").length,
  };
  const textureBuckets = {
    dry: spots.filter((s) => s.boardTexture === "dry").length,
    wet: spots.filter((s) => s.boardTexture === "wet").length,
    paired: spots.filter((s) => s.boardTexture === "paired").length,
    monotone: spots.filter((s) => s.boardTexture === "monotone").length,
  };
  console.log(`\n✓ ${spots.length} spots en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  Distribution EV : ${JSON.stringify(buckets)}`);
  console.log(`  Archétypes : ${JSON.stringify(archBuckets)}`);
  console.log(`  Textures : ${JSON.stringify(textureBuckets)}`);
  const outPath = path.join(process.cwd(), "content", "spots", "m3-4.json");
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
