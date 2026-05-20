"use client";

import type { Card } from "@/lib/poker/cards";
import {
  rangeToGrid,
  compareToNash,
  type NashComparison,
} from "@/lib/poker/range-parser";

const RANKS_DISPLAY = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

export interface SpotResult {
  hand: [Card, Card];
  userAction: "push" | "fold";
}

interface Props {
  /** Résultats de la session (filtrés au range donné). */
  results: SpotResult[];
  /** Notation du range Nash de référence. */
  nashRangeNotation: string;
  /** Profondeur de stack pour le titre par défaut. */
  stackDepth: number;
  /** Label personnalisé (ex. "BB defense · 10 bb"). Optionnel, par défaut `${stackDepth} bb`. */
  label?: string;
}

/**
 * Mappe une cellule (i, j) à son statut visuel pour le range review.
 *
 * - `correct-push` (vert) : in Nash range, user a push
 * - `correct-fold` (vert clair) : pas in Nash range, user a fold
 * - `over-push` (rouge) : pas in Nash range, user a push
 * - `under-push` (amber) : in Nash range, user a fold
 * - `nash-not-tested` (purple foncé) : in Nash range, pas testé
 * - `out-not-tested` (vide) : pas in Nash range, pas testé
 */
type CellStatus =
  | "correct-push"
  | "correct-fold"
  | "over-push"
  | "under-push"
  | "nash-not-tested"
  | "out-not-tested";

function cellToHandKey(i: number, j: number): { hand: string; type: "pair" | "suited" | "offsuit" } {
  if (i === j) return { hand: `${RANKS_DISPLAY[i]}${RANKS_DISPLAY[i]}`, type: "pair" };
  if (i < j) return { hand: `${RANKS_DISPLAY[i]}${RANKS_DISPLAY[j]}s`, type: "suited" };
  return { hand: `${RANKS_DISPLAY[j]}${RANKS_DISPLAY[i]}o`, type: "offsuit" };
}

function handToCellKey(hand: [Card, Card]): string {
  const r1 = hand[0][0];
  const r2 = hand[1][0];
  const s1 = hand[0][1];
  const s2 = hand[1][1];
  if (r1 === r2) return `${r1}${r2}`;
  const i1 = RANKS_DISPLAY.indexOf(r1);
  const i2 = RANKS_DISPLAY.indexOf(r2);
  const [hi, lo] = i1 < i2 ? [r1, r2] : [r2, r1];
  const isSuited = s1 === s2;
  return `${hi}${lo}${isSuited ? "s" : "o"}`;
}

const STATUS_COLORS: Record<CellStatus, { bg: string; border?: string }> = {
  "correct-push": { bg: "var(--green)", border: "rgba(74, 222, 128, 0.5)" },
  "correct-fold": { bg: "rgba(74, 222, 128, 0.18)", border: "rgba(74, 222, 128, 0.25)" },
  "over-push": { bg: "var(--red)", border: "rgba(248, 113, 113, 0.5)" },
  "under-push": { bg: "var(--amber)", border: "rgba(251, 191, 36, 0.5)" },
  "nash-not-tested": { bg: "var(--purple-400)", border: "var(--purple-300)" },
  "out-not-tested": { bg: "rgba(255, 255, 255, 0.04)", border: "rgba(255, 255, 255, 0.08)" },
};

export function NashRangeReview({ results, nashRangeNotation, stackDepth, label }: Props) {
  const nashGrid = rangeToGrid(nashRangeNotation);

  // Indexer les results par hand cell key
  const userActionsByCell: Map<string, "push" | "fold"> = new Map();
  for (const r of results) {
    userActionsByCell.set(handToCellKey(r.hand), r.userAction);
  }

  const comparison: NashComparison = compareToNash(
    results.map((r) => ({ hand: r.hand, userAction: r.userAction })),
    nashRangeNotation
  );

  function getCellStatus(i: number, j: number): CellStatus {
    const { hand } = cellToHandKey(i, j);
    const inNashRange = nashGrid[i][j];
    const userAction = userActionsByCell.get(hand);

    if (userAction === undefined) {
      return inNashRange ? "nash-not-tested" : "out-not-tested";
    }
    if (inNashRange && userAction === "push") return "correct-push";
    if (!inNashRange && userAction === "fold") return "correct-fold";
    if (!inNashRange && userAction === "push") return "over-push";
    return "under-push"; // inNashRange && userAction === "fold"
  }

  return (
    <div
      className="rounded-xl p-7"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <div
            className="text-[11px] font-mono uppercase tracking-wider mb-1.5"
            style={{ color: "var(--purple-300)" }}
          >
            Review · range Nash
          </div>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em] leading-tight">
            {label ?? `Calibration ${stackDepth} bb`}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">
            Accuracy
          </div>
          <div
            className="text-3xl font-mono font-semibold leading-none"
            style={{
              color:
                comparison.accuracy >= 80
                  ? "var(--green)"
                  : comparison.accuracy >= 60
                  ? "var(--amber)"
                  : "var(--red)",
            }}
          >
            {comparison.accuracy.toFixed(0)} %
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <ReviewStat
          label="Ton push %"
          value={`${comparison.userPushPercentage.toFixed(0)} %`}
        />
        <ReviewStat
          label="Nash push %"
          value={`${comparison.nashPushPercentage.toFixed(0)} %`}
        />
        <ReviewStat
          label="Écart signé"
          value={`${comparison.signedRangeDelta >= 0 ? "+" : ""}${comparison.signedRangeDelta.toFixed(0)} %`}
          color={
            Math.abs(comparison.signedRangeDelta) <= 5
              ? "var(--green)"
              : comparison.signedRangeDelta > 0
              ? "var(--red)"
              : "var(--amber)"
          }
        />
      </div>

      <div className="mb-4">
        <div
          className="font-mono uppercase tracking-wider text-text-faint mb-2"
          style={{ fontSize: 10, letterSpacing: "0.08em" }}
        >
          Grille push range — {results.length} mains testées
        </div>
        <div
          className="inline-block rounded p-2.5"
          style={{
            background: "var(--surface-strong)",
            border: "0.5px solid var(--border)",
          }}
        >
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: "repeat(13, 24px)" }}
          >
            {Array.from({ length: 13 }).map((_, i) =>
              Array.from({ length: 13 }).map((_, j) => {
                const status = getCellStatus(i, j);
                const { hand } = cellToHandKey(i, j);
                const colors = STATUS_COLORS[status];
                return (
                  <div
                    key={`${i}-${j}`}
                    title={`${hand} — ${status.replace("-", " ")}`}
                    className="w-6 h-6 rounded-[2px] flex items-center justify-center transition-all duration-100"
                    style={{
                      background: colors.bg,
                      border: colors.border ? `0.5px solid ${colors.border}` : "none",
                    }}
                  >
                    <span
                      className="font-mono text-[8px] font-medium"
                      style={{
                        color:
                          status === "correct-push" ||
                          status === "over-push" ||
                          status === "under-push" ||
                          status === "nash-not-tested"
                            ? "white"
                            : "var(--text-faint)",
                      }}
                    >
                      {hand.length <= 3 ? hand.replace(/[so]/g, "") : ""}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div
          className="font-mono uppercase tracking-wider text-text-faint mb-2"
          style={{ fontSize: 10, letterSpacing: "0.08em" }}
        >
          Légende
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-mono">
          <LegendItem color="var(--green)" label="Correct push" />
          <LegendItem color="rgba(74, 222, 128, 0.18)" label="Correct fold" />
          <LegendItem color="var(--red)" label="Sur-push" />
          <LegendItem color="var(--amber)" label="Sous-push" />
          <LegendItem color="var(--purple-400)" label="Nash, non testé" />
          <LegendItem color="rgba(255, 255, 255, 0.06)" label="Pas dans Nash" />
        </div>
      </div>

      {(comparison.pushedButShouldFold.length > 0 ||
        comparison.foldedButShouldPush.length > 0) && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {comparison.pushedButShouldFold.length > 0 && (
            <div
              className="rounded p-3.5"
              style={{
                background: "var(--red-glow)",
                border: "0.5px solid rgba(248, 113, 113, 0.3)",
              }}
            >
              <div
                className="text-[10px] font-mono uppercase tracking-wider mb-2"
                style={{ color: "var(--red)" }}
              >
                Sur-pushes ({comparison.pushedButShouldFold.length})
              </div>
              <div className="text-[12px] font-mono text-text-muted leading-[1.6]">
                {comparison.pushedButShouldFold
                  .map((h) => handToCellKey(h))
                  .join(", ")}
              </div>
            </div>
          )}
          {comparison.foldedButShouldPush.length > 0 && (
            <div
              className="rounded p-3.5"
              style={{
                background: "var(--amber-glow)",
                border: "0.5px solid rgba(251, 191, 36, 0.3)",
              }}
            >
              <div
                className="text-[10px] font-mono uppercase tracking-wider mb-2"
                style={{ color: "var(--amber)" }}
              >
                Sous-pushes ({comparison.foldedButShouldPush.length})
              </div>
              <div className="text-[12px] font-mono text-text-muted leading-[1.6]">
                {comparison.foldedButShouldPush
                  .map((h) => handToCellKey(h))
                  .join(", ")}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded p-3"
      style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1.5">
        {label}
      </div>
      <div
        className="text-xl font-mono font-semibold leading-none"
        style={{ color: color ?? "var(--text)" }}
      >
        {value}
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-text-muted">
      <span
        className="w-3 h-3 rounded-[2px]"
        style={{ background: color, border: "0.5px solid rgba(255, 255, 255, 0.1)" }}
      />
      {label}
    </span>
  );
}
