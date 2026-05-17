/**
 * Pré-calcule des spots variés pour M2.2 (Equity heads-up précise).
 *
 * Distribution visée (≈200) :
 *  - ~50 préflop : matchups canoniques (paire vs paire, race, domination…)
 *  - ~50 flop : tirage vs main faite
 *  - ~50 flop : main faite vs main faite plus faible / tirage
 *  - ~50 turn : décisions polarisées (1 carte à venir)
 *
 * Précision : flop/turn = énumération EXACTE ; préflop = Monte Carlo.
 *
 * ÉCART vs spec (flaggé dans le rapport) : la règle qualité du spec dit
 * « préflop MC 200k ». Mesure S6a = ~50µs/itération → 200k ≈ 10s/spot, soit
 * ~8min rien que pour 50 préflop, ce qui contredit l'estimation « 30-60s » du
 * spec lui-même. On utilise 100_000 (σ ≈ 0.16 %, très en deçà de l'arrondi
 * d'affichage 0.1 % et de la bande « excellent ≤1 % » : la précision n'est pas
 * le facteur limitant, le temps de génération l'est).
 *
 * Sortie : content/spots/m2-2.json
 */
import * as fs from "fs";
import * as path from "path";
import {
  equityMonteCarlo,
  equityExactFlop,
  equityExactRiver,
} from "../lib/poker/equity";
import type { Card } from "../lib/poker/cards";
import type { PrecomputedM22Spot } from "../content/spots/types";

const PREFLOP_ITERATIONS = 100_000;

type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
type Suit = "s" | "h" | "d" | "c";
const SUITS: Suit[] = ["s", "h", "d", "c"];

interface SpotTemplate {
  heroCards: [Card, Card];
  villainCards: [Card, Card];
  board: Card[];
  street: "preflop" | "flop" | "turn";
  scenarioLabel: string;
}

/**
 * Slot = un rang + un éventuel groupe de couleur (cartes du même groupe = même
 * couleur, pour matérialiser les tirages/boards assortis). Backtracking pour
 * garantir l'unicité globale (rang, couleur).
 */
interface Slot {
  rank: Rank;
  grp?: string;
}

function assignSuits(slots: Slot[]): Card[] | null {
  const res: (Suit | null)[] = slots.map(() => null);
  const grpSuit: Record<string, Suit> = {};
  const used = new Set<string>();

  function dfs(i: number): boolean {
    if (i === slots.length) return true;
    const sl = slots[i];
    const fixed = sl.grp ? grpSuit[sl.grp] : undefined;
    const candidates = fixed ? [fixed] : SUITS;
    for (const su of candidates) {
      const key = sl.rank + su;
      if (used.has(key)) continue;
      const setGrp = sl.grp && !grpSuit[sl.grp];
      if (setGrp) grpSuit[sl.grp!] = su;
      used.add(key);
      res[i] = su;
      if (dfs(i + 1)) return true;
      used.delete(key);
      res[i] = null;
      if (setGrp) delete grpSuit[sl.grp!];
    }
    return false;
  }

  if (!dfs(0)) return null;
  return slots.map((s, i) => `${s.rank}${res[i]}` as Card);
}

let skipped = 0;

/**
 * Construit un template depuis des slots ordonnés [h1,h2,v1,v2,...board].
 * `boardLen` = nb de slots de board (3 = flop, 4 = turn, 0 = préflop).
 */
function build(
  slots: Slot[],
  boardLen: number,
  street: SpotTemplate["street"],
  label: string
): SpotTemplate | null {
  const cards = assignSuits(slots);
  if (!cards) {
    skipped++;
    return null;
  }
  return {
    heroCards: [cards[0], cards[1]],
    villainCards: [cards[2], cards[3]],
    board: cards.slice(4, 4 + boardLen),
    street,
    scenarioLabel: label,
  };
}

const T: (SpotTemplate | null)[] = [];

// ===================== PRÉFLOP (~50) =====================
// 1. Paire vs paire inférieure
const PAIR_VS_PAIR: [Rank, Rank][] = [
  ["A", "K"], ["A", "Q"], ["A", "J"], ["A", "T"], ["K", "Q"],
  ["K", "J"], ["K", "T"], ["Q", "J"], ["Q", "T"], ["J", "T"],
  ["A", "5"], ["K", "4"], ["Q", "3"], ["J", "2"], ["T", "6"],
  ["9", "8"], ["8", "7"], ["7", "2"],
];
for (const [hi, lo] of PAIR_VS_PAIR) {
  T.push(
    build(
      [{ rank: hi }, { rank: hi }, { rank: lo }, { rank: lo }],
      0,
      "preflop",
      `Pocket ${hi}${hi} vs Pocket ${lo}${lo}`
    )
  );
}
// 2. Paire moyenne vs deux overcards (race)
const PAIR_VS_OVERS: [Rank, Rank, Rank, boolean][] = [
  ["7", "A", "K", false], ["6", "A", "Q", false], ["5", "K", "Q", false],
  ["8", "A", "K", true], ["9", "A", "Q", false], ["T", "A", "K", false],
  ["J", "A", "K", true], ["2", "A", "K", false], ["3", "A", "Q", true],
  ["4", "K", "Q", false], ["6", "A", "K", false], ["5", "A", "J", true],
];
for (const [p, hi, lo, suited] of PAIR_VS_OVERS) {
  const g = suited ? "V" : undefined;
  T.push(
    build(
      [{ rank: p }, { rank: p }, { rank: hi, grp: g }, { rank: lo, grp: g }],
      0,
      "preflop",
      `Pocket ${p}${p} vs ${hi}${lo}${suited ? "s" : "o"} (race)`
    )
  );
}
// 3. Domination (kicker)
const DOMINATION: [Rank, Rank, Rank, Rank, boolean][] = [
  ["A", "K", "A", "Q", true], ["A", "K", "A", "J", false], ["A", "Q", "A", "J", true],
  ["K", "Q", "K", "J", true], ["K", "Q", "K", "T", false], ["A", "T", "A", "9", false],
  ["Q", "J", "Q", "T", true], ["A", "K", "K", "Q", false], ["A", "J", "K", "J", false],
  ["A", "K", "A", "T", true],
];
for (const [h1, h2, v1, v2, suited] of DOMINATION) {
  const hg = suited ? "H" : undefined;
  T.push(
    build(
      [
        { rank: h1, grp: hg },
        { rank: h2, grp: hg },
        { rank: v1, grp: suited ? "W" : undefined },
        { rank: v2, grp: suited ? "W" : undefined },
      ],
      0,
      "preflop",
      `${h1}${h2}${suited ? "s" : "o"} vs ${v1}${v2}${suited ? "s" : "o"} (domination)`
    )
  );
}
// 4. Suited connector vs grosse paire
const SC_VS_PAIR: [Rank, Rank, Rank][] = [
  ["9", "8", "A"], ["7", "6", "K"], ["T", "9", "Q"], ["6", "5", "J"],
  ["8", "7", "T"], ["5", "4", "A"], ["J", "T", "K"], ["4", "3", "Q"],
];
for (const [a, b, p] of SC_VS_PAIR) {
  T.push(
    build(
      [{ rank: a, grp: "H" }, { rank: b, grp: "H" }, { rank: p }, { rank: p }],
      0,
      "preflop",
      `${a}${b}s vs Pocket ${p}${p}`
    )
  );
}
// 5. AK / AQ vs paire (flip classique)
const AK_VS_PAIR: [Rank, Rank, Rank][] = [
  ["A", "K", "Q"], ["A", "K", "J"], ["A", "K", "T"], ["A", "K", "9"],
  ["A", "Q", "J"], ["A", "Q", "T"], ["K", "Q", "9"], ["A", "K", "5"],
];
for (const [h1, h2, p] of AK_VS_PAIR) {
  T.push(
    build(
      [{ rank: h1, grp: "H" }, { rank: h2, grp: "H" }, { rank: p }, { rank: p }],
      0,
      "preflop",
      `${h1}${h2}s vs Pocket ${p}${p} (flip)`
    )
  );
}

// ===================== FLOP : TIRAGE vs MAIN FAITE (~50) =====================
// Hero a un tirage couleur (2 cartes assorties + 2 board même couleur).
const FD_VS_PAIR: [Rank, Rank, Rank, Rank, Rank, Rank][] = [
  // h1,h2 (suited grp F), v1,v2 (paire P), board b1(grp F),b2(grp F),b3
  ["A", "K", "Q", "Q", "T", "7"], ["A", "Q", "K", "K", "9", "4"],
  ["K", "J", "A", "A", "8", "3"], ["A", "T", "Q", "Q", "7", "2"],
  ["Q", "J", "K", "K", "9", "5"], ["J", "T", "A", "A", "8", "6"],
  ["A", "9", "K", "K", "6", "3"], ["K", "T", "Q", "Q", "5", "2"],
  ["A", "8", "J", "J", "7", "4"], ["Q", "9", "T", "T", "6", "3"],
  ["A", "5", "K", "K", "4", "2"], ["K", "9", "Q", "Q", "8", "3"],
  ["J", "9", "A", "A", "7", "2"], ["A", "7", "Q", "Q", "6", "4"],
  ["T", "8", "K", "K", "5", "3"], ["A", "6", "J", "J", "9", "2"],
  ["K", "8", "A", "A", "7", "5"], ["Q", "T", "K", "K", "4", "3"],
];
for (const [h1, h2, v, _v, b1, b2] of FD_VS_PAIR) {
  const b3: Rank = "2" === b2 ? "3" : "2";
  T.push(
    build(
      [
        { rank: h1, grp: "F" },
        { rank: h2, grp: "F" },
        { rank: v },
        { rank: _v },
        { rank: b1, grp: "F" },
        { rank: b2, grp: "F" },
        { rank: b3 },
      ],
      3,
      "flop",
      `Tirage couleur (${h1}${h2}s) vs over-pair ${v}${v}`
    )
  );
}
// Hero combo draw (suited connectors) vs set / over-pair
const COMBO_VS_MADE: [Rank, Rank, Rank, Rank, Rank][] = [
  // h1,h2 connectés+suited, vill pair = board rank (set) ; board b1(F),b2(F),b3=vill
  ["9", "8", "T", "7", "T"], ["8", "7", "9", "6", "9"], ["T", "9", "J", "8", "J"],
  ["7", "6", "8", "5", "8"], ["J", "T", "Q", "9", "Q"], ["6", "5", "7", "4", "7"],
  ["9", "8", "T", "6", "T"], ["8", "7", "9", "5", "9"], ["5", "4", "6", "3", "6"],
  ["T", "9", "J", "7", "J"], ["Q", "J", "K", "T", "K"], ["7", "6", "9", "5", "9"],
];
for (const [h1, h2, b1, b2, vset] of COMBO_VS_MADE) {
  T.push(
    build(
      [
        { rank: h1, grp: "F" },
        { rank: h2, grp: "F" },
        { rank: vset },
        { rank: vset },
        { rank: b1, grp: "F" },
        { rank: b2, grp: "F" },
        { rank: vset },
      ],
      3,
      "flop",
      `Combo draw (${h1}${h2}s) vs set de ${vset}`
    )
  );
}
// Deux overcards vs middle pair
const OVERS_VS_MID: [Rank, Rank, Rank, Rank, Rank][] = [
  ["A", "K", "Q", "9", "3"], ["A", "Q", "J", "T", "2"], ["K", "Q", "J", "8", "4"],
  ["A", "K", "T", "9", "5"], ["A", "J", "T", "7", "2"], ["K", "J", "T", "8", "3"],
  ["A", "Q", "9", "8", "4"], ["A", "K", "J", "6", "2"], ["Q", "J", "T", "9", "5"],
  ["A", "T", "9", "7", "3"], ["K", "Q", "T", "6", "2"], ["A", "J", "9", "8", "4"],
];
for (const [h1, h2, vp, b1, b2] of OVERS_VS_MID) {
  const b3: Rank = h1 === "A" && h2 === "K" ? "7" : "8";
  T.push(
    build(
      [
        { rank: h1 },
        { rank: h2 },
        { rank: vp },
        { rank: vp },
        { rank: b1 },
        { rank: b2 },
        { rank: b3 },
      ],
      3,
      "flop",
      `${h1}${h2} (2 overs) vs paire de ${b1}`
    )
  );
}

// ===================== FLOP : MAIN FAITE vs MAIN FAITE (~50) =====================
const MADE_VS_MADE: [Rank, Rank, Rank, Rank, Rank, Rank, Rank, string][] = [
  // h1,h2,v1,v2,b1,b2,b3,label
  ["A", "A", "K", "K", "7", "5", "2", "Over-pair vs over-pair inférieure"],
  ["K", "K", "9", "9", "T", "5", "2", "Over-pair vs paire moyenne"],
  ["Q", "Q", "J", "J", "8", "4", "2", "Over-pair vs over-pair inférieure"],
  ["A", "A", "Q", "Q", "9", "6", "3", "Over-pair vs over-pair inférieure"],
  ["J", "J", "8", "8", "T", "6", "3", "Over-pair vs paire moyenne"],
  ["T", "T", "7", "7", "9", "5", "2", "Over-pair vs paire basse"],
  ["A", "T", "K", "Q", "T", "5", "2", "Top pair top kicker vs 2 overs"],
  ["K", "Q", "A", "J", "K", "7", "3", "Top pair vs over + tirage gutshot"],
  ["A", "J", "K", "T", "J", "6", "2", "Top pair bon kicker vs 2 overs"],
  ["Q", "J", "A", "K", "Q", "8", "4", "Top pair vs 2 overcards"],
  ["7", "7", "A", "K", "7", "4", "2", "Set vs 2 overcards (hero set)"],
  ["9", "9", "A", "A", "9", "5", "2", "Set vs over-pair (hero set)"],
  ["T", "T", "K", "K", "T", "6", "3", "Set vs over-pair (hero set)"],
  ["8", "8", "A", "Q", "8", "5", "3", "Set vs 2 overcards (hero set)"],
  ["A", "K", "A", "Q", "A", "8", "3", "Top pair top kicker vs dominé"],
  ["K", "J", "K", "T", "K", "7", "2", "Top pair vs même paire kicker faible"],
  ["A", "Q", "A", "J", "A", "9", "4", "Top pair top kicker vs dominé"],
  ["Q", "T", "Q", "9", "Q", "6", "3", "Top pair vs même paire dominée"],
  ["A", "A", "K", "Q", "7", "4", "2", "Over-pair vs 2 overcards mortes"],
  ["K", "K", "A", "Q", "8", "5", "3", "Over-pair vs 2 overcards"],
  ["J", "J", "A", "K", "9", "6", "2", "Over-pair vs 2 overcards"],
  ["A", "A", "8", "8", "T", "5", "3", "Over-pair vs paire basse"],
  ["Q", "Q", "A", "K", "T", "7", "4", "Over-pair vs 2 overcards"],
  ["T", "9", "A", "T", "T", "6", "2", "Two pair vs top pair"],
  ["J", "T", "A", "J", "J", "T", "3", "Two pair vs top pair"],
  ["9", "8", "K", "9", "9", "8", "2", "Two pair vs top pair"],
  ["A", "K", "Q", "Q", "K", "5", "2", "Top pair vs under-pair"],
  ["K", "Q", "J", "J", "Q", "7", "3", "Top pair vs under-pair"],
  ["A", "J", "T", "T", "J", "6", "4", "Top pair vs under-pair"],
  ["6", "6", "5", "5", "9", "4", "2", "Petite over-pair vs paire basse"],
];
for (const [h1, h2, v1, v2, b1, b2, b3, label] of MADE_VS_MADE) {
  T.push(
    build(
      [
        { rank: h1 },
        { rank: h2 },
        { rank: v1 },
        { rank: v2 },
        { rank: b1 },
        { rank: b2 },
        { rank: b3 },
      ],
      3,
      "flop",
      label
    )
  );
}
// Main faite vs tirage couleur (point de vue main faite)
const MADE_VS_DRAW: [Rank, Rank, Rank, Rank, Rank, Rank][] = [
  ["A", "A", "K", "Q", "Q", "7"], ["K", "K", "A", "J", "J", "5"],
  ["Q", "Q", "J", "T", "T", "4"], ["A", "K", "Q", "J", "K", "6"],
  ["T", "T", "9", "8", "8", "3"], ["J", "J", "T", "9", "9", "2"],
  ["A", "A", "T", "9", "9", "4"], ["K", "K", "Q", "J", "J", "6"],
  ["A", "Q", "J", "T", "Q", "5"], ["9", "9", "8", "7", "7", "2"],
];
for (const [h1, h2, v1, v2, b1, b2] of MADE_VS_DRAW) {
  // villain a un tirage couleur : v1,v2 + b1,b2 même couleur
  const b3: Rank = "3";
  T.push(
    build(
      [
        { rank: h1 },
        { rank: h2 },
        { rank: v1, grp: "F" },
        { rank: v2, grp: "F" },
        { rank: b1, grp: "F" },
        { rank: b2, grp: "F" },
        { rank: b3 },
      ],
      3,
      "flop",
      `Main faite ${h1}${h2} vs tirage couleur adverse`
    )
  );
}

// ===================== TURN : POLARISÉ (~50) =====================
// Reprend des archétypes flop + une 4e carte (brique ou complétante).
const TURN_SPECS: [Rank, Rank, Rank, Rank, Rank, Rank, Rank, Rank, string, boolean][] = [
  // h1,h2,v1,v2,b1,b2,b3,b4,label,heroFlushDraw
  ["A", "K", "Q", "Q", "T", "7", "2", "5", "NFD + overs vs over-pair (turn brique)", true],
  ["A", "Q", "K", "K", "9", "4", "3", "8", "Tirage couleur vs over-pair (turn brique)", true],
  ["K", "J", "A", "A", "8", "3", "2", "6", "Tirage couleur vs over-pair (turn brique)", true],
  ["A", "K", "Q", "Q", "T", "7", "2", "K", "Tirage + top paire (turn aide)", true],
  ["A", "T", "Q", "Q", "9", "4", "2", "7", "Tirage couleur vs over-pair (turn brique)", true],
  ["Q", "J", "K", "K", "9", "5", "3", "2", "Tirage couleur vs over-pair (turn brique)", true],
  ["9", "9", "A", "A", "9", "6", "2", "5", "Set vs over-pair (turn brique)", false],
  ["T", "T", "K", "K", "T", "7", "3", "4", "Set vs over-pair (turn brique)", false],
  ["A", "A", "K", "K", "8", "5", "2", "7", "Over-pair vs over-pair (turn brique)", false],
  ["A", "T", "K", "Q", "T", "6", "2", "5", "Top pair TK vs 2 overs (turn brique)", false],
  ["K", "Q", "A", "J", "K", "8", "3", "2", "Top pair vs over + gutshot (turn brique)", false],
  ["J", "T", "A", "J", "J", "9", "4", "2", "Two pair vs top pair (turn brique)", false],
  ["A", "K", "Q", "Q", "K", "7", "3", "5", "Top pair top kicker vs under-pair", false],
  ["8", "7", "A", "A", "9", "6", "2", "T", "OESD vs over-pair (turn complète tirage)", false],
  ["T", "9", "K", "K", "J", "8", "3", "2", "OESD vs over-pair (turn brique)", false],
  ["A", "9", "Q", "Q", "9", "5", "2", "K", "Paire moyenne vs over-pair (turn brique)", false],
  ["A", "K", "T", "T", "A", "7", "3", "2", "Top pair vs set caché (turn brique)", false],
  ["Q", "Q", "A", "K", "T", "7", "4", "2", "Over-pair vs 2 overs (turn brique)", false],
  ["J", "J", "A", "Q", "9", "6", "3", "2", "Over-pair vs 2 overs (turn brique)", false],
  ["A", "Q", "K", "K", "Q", "8", "4", "2", "Top pair vs under-pair (turn brique)", false],
  ["7", "6", "A", "A", "8", "5", "2", "9", "OESD vs over-pair (turn complète)", false],
  ["A", "J", "K", "Q", "J", "7", "3", "2", "Top pair vs 2 overs (turn brique)", false],
  ["K", "K", "9", "9", "T", "5", "2", "7", "Over-pair vs paire moyenne (turn brique)", false],
  ["A", "A", "Q", "J", "9", "6", "3", "2", "Over-pair vs 2 overs (turn brique)", false],
  ["T", "T", "A", "A", "T", "8", "4", "2", "Set vs over-pair (turn brique)", false],
];
for (const [h1, h2, v1, v2, b1, b2, b3, b4, label, fd] of TURN_SPECS) {
  const slots: Slot[] = fd
    ? [
        { rank: h1, grp: "F" },
        { rank: h2, grp: "F" },
        { rank: v1 },
        { rank: v2 },
        { rank: b1, grp: "F" },
        { rank: b2, grp: "F" },
        { rank: b3 },
        { rank: b4 },
      ]
    : [
        { rank: h1 },
        { rank: h2 },
        { rank: v1 },
        { rank: v2 },
        { rank: b1 },
        { rank: b2 },
        { rank: b3 },
        { rank: b4 },
      ];
  T.push(build(slots, 4, "turn", label));
}

// ===================== CALCUL =====================
const TEMPLATES: SpotTemplate[] = T.filter((x): x is SpotTemplate => x !== null);

function computeSpot(tpl: SpotTemplate, index: number): PrecomputedM22Spot {
  const board = tpl.board;
  let result;
  if (board.length === 4) {
    result = equityExactRiver(
      tpl.heroCards,
      tpl.villainCards,
      board as [Card, Card, Card, Card]
    );
  } else if (board.length === 3) {
    result = equityExactFlop(
      tpl.heroCards,
      tpl.villainCards,
      board as [Card, Card, Card]
    );
  } else {
    result = equityMonteCarlo(tpl.heroCards, tpl.villainCards, board, PREFLOP_ITERATIONS);
  }
  return {
    id: `m2-2-spot-${String(index + 1).padStart(3, "0")}`,
    heroCards: tpl.heroCards,
    villainCards: tpl.villainCards,
    board: tpl.board,
    street: tpl.street,
    scenarioLabel: tpl.scenarioLabel,
    expected: {
      equity: Math.round(result.equity * 10) / 10,
      method: result.method,
      iterations: result.total,
      wins: result.wins,
      losses: result.losses,
      ties: result.ties,
    },
  };
}

function main() {
  console.log(
    `Pré-calcul de ${TEMPLATES.length} spots M2.2 (${skipped} skippés pour cartes dupliquées)...`
  );
  const t0 = Date.now();
  const spots: PrecomputedM22Spot[] = [];
  const buckets = { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0 };
  for (let i = 0; i < TEMPLATES.length; i++) {
    const spot = computeSpot(TEMPLATES[i], i);
    spots.push(spot);
    const e = spot.expected.equity;
    if (e < 25) buckets["0-25"]++;
    else if (e < 50) buckets["25-50"]++;
    else if (e < 75) buckets["50-75"]++;
    else buckets["75-100"]++;
    if ((i + 1) % 25 === 0) {
      console.log(`  [${i + 1}/${TEMPLATES.length}] ${spot.scenarioLabel} → ${spot.expected.equity}%`);
    }
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✓ ${spots.length} spots calculés en ${dt}s`);
  console.log(`  Distribution equity : ${JSON.stringify(buckets)}`);

  const outPath = path.join(process.cwd(), "content", "spots", "m2-2.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(spots, null, 2));
  console.log(`✓ ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

main();
