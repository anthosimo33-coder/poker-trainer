/**
 * Catalogue des ranges canoniques utilisés par M2.4.
 * Chaque range : slug unique, label lisible, notation textuelle, catégorie.
 */

export interface CanonicalRange {
  slug: string;
  label: string;
  notation: string;
  category:
    | "open"
    | "3bet"
    | "defense"
    | "4bet"
    | "squeeze"
    | "push"
    | "limp"
    | "fish";
}

export const CANONICAL_RANGES: CanonicalRange[] = [
  // ===== OPEN RANGES (5) =====
  {
    slug: "open-utg-15",
    label: "UTG Open ~15%",
    notation: "77+, ATs+, KTs+, QTs+, JTs, T9s, 98s, AJo+, KQo",
    category: "open",
  },
  {
    slug: "open-mp-20",
    label: "MP Open ~20%",
    notation: "55+, A9s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, ATo+, KTo+, QTo+, JTo",
    category: "open",
  },
  {
    slug: "open-co-30",
    label: "CO Open ~30%",
    notation:
      "22+, A2s+, K8s+, Q8s+, J8s+, T8s, 97s+, 87s, 76s, 65s, 54s, A9o+, K9o+, Q9o+, J9o+, T9o",
    category: "open",
  },
  {
    slug: "open-btn-45",
    label: "BTN Open ~45%",
    notation:
      "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 53s+, 43s, A2o+, K8o+, Q9o+, J9o+, T9o",
    category: "open",
  },
  {
    slug: "open-sb-35",
    label: "SB Open ~35%",
    notation:
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A5o+, K9o+, Q9o+, J9o+, T9o",
    category: "open",
  },

  // ===== 3-BET RANGES (5) =====
  {
    slug: "3bet-value-tight",
    label: "3-bet value tight",
    notation: "QQ+, AKs, AKo",
    category: "3bet",
  },
  {
    slug: "3bet-linear-medium",
    label: "3-bet linéaire moyen",
    notation: "TT+, AQs+, AKo",
    category: "3bet",
  },
  {
    slug: "3bet-polarized-btn",
    label: "3-bet BTN vs CO polarized",
    notation: "QQ+, AKs, AKo, A5s, A4s, K9s, 76s, 65s",
    category: "3bet",
  },
  {
    slug: "3bet-bb-vs-btn",
    label: "3-bet BB vs BTN polarized",
    notation: "JJ+, AQs+, AKo, A5s-A2s, K6s-K8s, 76s, 65s, 54s",
    category: "3bet",
  },
  {
    slug: "3bet-sb-vs-btn",
    label: "3-bet SB vs BTN merged",
    notation: "TT+, AJs+, AQo+, KQs",
    category: "3bet",
  },

  // ===== DEFENSE RANGES (4) =====
  {
    slug: "defense-bb-vs-btn",
    label: "BB defense vs BTN open",
    notation:
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s, A2o+, K9o+, Q9o+, J9o+, T9o, 98o",
    category: "defense",
  },
  {
    slug: "defense-bb-vs-co",
    label: "BB defense vs CO open",
    notation:
      "22+, A2s+, K7s+, Q8s+, J8s+, T8s, 97s+, 87s, 76s, 65s, A5o+, K9o+, Q9o+, JTo, T9o",
    category: "defense",
  },
  {
    slug: "defense-bb-vs-utg",
    label: "BB defense vs UTG open",
    notation: "44+, A8s+, KTs+, QTs+, JTs, T9s, 98s, AJo+, KQo",
    category: "defense",
  },
  {
    slug: "defense-co-vs-mp",
    label: "CO defense vs MP open (cold-call)",
    notation: "TT-22, ATs-A8s, KTs+, QTs+, JTs, T9s, 98s, AQo",
    category: "defense",
  },

  // ===== 4-BET RANGES (3) =====
  {
    slug: "4bet-value-tight",
    label: "4-bet value tight",
    notation: "QQ+, AKs",
    category: "4bet",
  },
  {
    slug: "4bet-polarized",
    label: "4-bet polarized",
    notation: "KK+, AKs, A5s, A4s, K7s",
    category: "4bet",
  },
  {
    slug: "4bet-ip-merge",
    label: "4-bet IP merged",
    notation: "JJ+, AQs+, AKo",
    category: "4bet",
  },

  // ===== SQUEEZE RANGES (3) =====
  {
    slug: "squeeze-tight",
    label: "Squeeze tight",
    notation: "QQ+, AKs, AKo",
    category: "squeeze",
  },
  {
    slug: "squeeze-medium",
    label: "Squeeze médium",
    notation: "TT+, AJs+, AQo+, KQs, A5s",
    category: "squeeze",
  },
  {
    slug: "squeeze-wide-bb",
    label: "Squeeze BB wide",
    notation: "99+, AJs+, AQo+, KJs+, QJs, JTs, T9s, 98s, A5s-A2s",
    category: "squeeze",
  },

  // ===== PUSH RANGES SUB-15BB (5) =====
  {
    slug: "push-btn-12bb",
    label: "Push BTN 12bb",
    notation: "22+, A2s+, K5s+, Q9s+, J9s+, T9s, 98s, A5o+, K9o+, QTo+, JTo",
    category: "push",
  },
  {
    slug: "push-sb-10bb",
    label: "Push SB 10bb",
    notation:
      "22+, A2s+, K3s+, Q8s+, J8s+, T8s+, 98s, A2o+, K8o+, Q9o+, J9o+, T9o",
    category: "push",
  },
  {
    slug: "push-bb-defense-vs-sb-push-10bb",
    label: "BB call vs SB push 10bb",
    notation: "44+, A2s+, K8s+, QTs+, JTs, AJo+, KQo",
    category: "push",
  },
  {
    slug: "push-co-15bb",
    label: "Push CO 15bb",
    notation: "33+, A2s+, K8s+, Q9s+, J9s+, T9s, A8o+, KTo+, QTo+",
    category: "push",
  },
  {
    slug: "push-mp-10bb",
    label: "Push MP 10bb",
    notation: "55+, A8s+, KTs+, QTs+, JTs, AJo+, KQo",
    category: "push",
  },

  // ===== LIMP / ISO (3) =====
  {
    slug: "limp-fish",
    label: "Limp fish (range très large)",
    notation:
      "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J5o+, T7o+, 97o+, 87o, 76o",
    category: "limp",
  },
  {
    slug: "iso-vs-limp",
    label: "Iso-raise vs limp",
    notation: "22+, A2s+, K9s+, Q9s+, JTs, T9s, A9o+, KTo+, QTo+, JTo",
    category: "limp",
  },
  {
    slug: "limp-sb-vs-bb-only",
    label: "SB limp/complete vs BB",
    notation:
      "22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 96s+, 85s+, 75s+, 64s+, 53s+, 43s, A2o+, K7o+, Q9o+, J9o+, T8o+, 98o",
    category: "limp",
  },

  // ===== FISH RANGES (2) =====
  {
    slug: "fish-call-anything",
    label: "Fish call any 2 cards",
    notation:
      "22+, A2s+, K2s+, Q2s+, J2s+, T5s+, 95s+, 85s+, 75s+, 64s+, 53s+, A2o+, K6o+, Q8o+, J9o+, T9o",
    category: "fish",
  },
  {
    slug: "fish-3bet-light",
    label: "Fish 3-bet light",
    notation: "22+, AJs+, A5s, KJs+, QJs, JTs, T9s, AQo+",
    category: "fish",
  },

  // ===== DEFENSE VS PUSH (10) — ce avec quoi un vilain CALL un push all-in =====
  {
    slug: "call-vs-push-bb-tight",
    label: "BB call vs SB push (tight)",
    notation: "88+, AJs+, AQo+, KQs",
    category: "defense",
  },
  {
    slug: "call-vs-push-bb-standard",
    label: "BB call vs SB push (standard 10bb)",
    notation: "55+, A8s+, KTs+, QTs+, JTs, ATo+, KJo+",
    category: "defense",
  },
  {
    slug: "call-vs-push-bb-loose",
    label: "BB call vs SB push (loose, fish)",
    notation: "22+, A2s+, K7s+, Q9s+, J9s+, T9s, A8o+, KTo+, QTo+",
    category: "defense",
  },
  {
    slug: "call-vs-push-btn-tight",
    label: "BTN call vs UTG push 12bb",
    notation: "TT+, AKs, AKo",
    category: "defense",
  },
  {
    slug: "call-vs-push-btn-standard",
    label: "BTN call vs SB push 10bb",
    notation: "66+, ATs+, KJs+, AJo+, KQo",
    category: "defense",
  },
  {
    slug: "call-vs-push-co-vs-btn",
    label: "CO call vs BTN push 8bb",
    notation: "55+, A8s+, KTs+, QJs, AJo+",
    category: "defense",
  },
  {
    slug: "call-vs-push-mp-short",
    label: "MP call vs short stack push",
    notation: "77+, AJs+, AQo+, KQs",
    category: "defense",
  },
  {
    slug: "call-vs-push-sb-tight",
    label: "SB call vs BTN push (closed action)",
    notation: "44+, A7s+, KTs+, QJs, ATo+, KJo+",
    category: "defense",
  },
  {
    slug: "call-vs-push-bb-vs-btn-15bb",
    label: "BB call vs BTN push 15bb",
    notation: "33+, A5s+, K9s+, Q9s+, JTs, T9s, A9o+, KJo+, QJo",
    category: "defense",
  },
  {
    slug: "call-vs-push-utg-short",
    label: "UTG call vs short push (rare)",
    notation: "TT+, AQs+, AKo",
    category: "defense",
  },

  // ===== RANGES TOTAUX VS PUSH (10) — ce avec quoi un vilain « voit » un push
  // (open / defense complet). La paire totalRange ↔ callRange donne P(fold)
  // précis : pFold = 1 − call_combos / total_combos. Utilisés par M3.2/M3.3. =====
  {
    slug: "total-bb-defense-vs-sb-push-10bb",
    label: "BB total defense vs SB push 10bb",
    notation:
      "22+, A2s+, K7s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A2o+, K9o+, Q9o+, J9o+, T9o, 98o",
    category: "defense",
  },
  {
    slug: "total-bb-defense-vs-sb-push-5bb",
    label: "BB total defense vs SB push 5bb (très large)",
    notation:
      "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s, 32s, A2o+, K2o+, Q3o+, J5o+, T6o+, 95o+, 84o+, 74o+, 63o+, 54o",
    category: "defense",
  },
  {
    slug: "total-bb-defense-vs-btn-push-12bb",
    label: "BB total defense vs BTN push 12bb",
    notation:
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, A2o+, K9o+, Q9o+, J9o+, T9o",
    category: "defense",
  },
  {
    slug: "total-btn-call-3bet",
    label: "BTN total range face 3-bet (call ou 4-bet)",
    notation: "55+, A9s+, KTs+, QTs+, JTs, T9s, 98s, ATo+, KJo+, QJo",
    category: "defense",
  },
  {
    slug: "total-co-vs-utg-3bet",
    label: "CO total range face UTG 3-bet",
    notation: "TT+, AQs+, AKo, KQs",
    category: "defense",
  },
  {
    slug: "total-bb-vs-btn-open",
    label: "BB total continue vs BTN open (call + 3-bet)",
    notation:
      "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 75s+, 65s, 54s, A2o+, K9o+, Q9o+, J9o+, T9o, 98o",
    category: "defense",
  },
  {
    slug: "total-utg-vs-3bet",
    label: "UTG total continue vs 3-bet (call ou 4-bet)",
    notation: "99+, AJs+, AQo+, KQs",
    category: "defense",
  },
  {
    slug: "total-btn-open-vs-cold4bet",
    label: "BTN total range vs cold 4-bet",
    notation: "TT+, AJs+, AQo+, KQs",
    category: "defense",
  },
  {
    slug: "total-bb-vs-co-push",
    label: "BB total defense vs CO push 12bb",
    notation:
      "22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A4o+, K8o+, Q9o+, J9o+, T9o",
    category: "defense",
  },
  {
    slug: "total-bb-vs-mp-push",
    label: "BB total defense vs MP push 10bb",
    notation: "22+, A2s+, K7s+, Q9s+, J9s+, T9s, 98s, A8o+, KTo+, QTo+, JTo",
    category: "defense",
  },

  // ===== POSTFLOP (M3.4) — c-bet ranges et réactions au check-raise (6). On
  // garde les catégories existantes (open/defense/3bet) plutôt que d'ajouter
  // une cat « postflop » : le type union ne change pas, et la fonction de
  // c-bet/CR colle pédagogiquement aux mêmes axes value/defense/relance. =====
  {
    slug: "cbet-btn-vs-bb-wet-board",
    label: "BTN c-bet sur board drawy",
    notation:
      "AA-22, AKs-A2s, KQs-K9s, QJs-Q9s, JTs, T9s, 98s, AKo, AQo, AJo, KQo",
    category: "open",
  },
  {
    slug: "cbet-btn-vs-bb-dry-board",
    label: "BTN c-bet sur board dry (small sizing, wider)",
    notation:
      "AA-22, AKs-A2s, K2s+, Q5s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, A2o+, K7o+, Q9o+, J9o+, T9o",
    category: "open",
  },
  {
    slug: "cbet-utg-vs-bb-Khigh",
    label: "UTG c-bet board K-high",
    notation: "TT+, AKs, AQs, KQs, KJs, AKo, AQo",
    category: "open",
  },
  {
    slug: "call-vs-cr-Khigh-tight",
    label: "Vilain call vs CR sur K-high (tight)",
    notation: "KK+, AKs, K9s+, AKo",
    category: "defense",
  },
  {
    slug: "call-vs-cr-Khigh-standard",
    label: "Vilain call vs CR sur K-high (standard)",
    notation: "KK+, AKs, K9s+, KQo, AKo",
    category: "defense",
  },
  {
    slug: "3bet-vs-cr-nuts-only",
    label: "Vilain 3-bet vs CR (nuts + occasional bluff)",
    notation: "AA, KK, 22, AKs",
    category: "3bet",
  },
];

export function getRange(slug: string): CanonicalRange | undefined {
  return CANONICAL_RANGES.find((r) => r.slug === slug);
}
