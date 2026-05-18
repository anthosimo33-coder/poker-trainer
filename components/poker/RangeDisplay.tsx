"use client";

import { rangeToGrid } from "@/lib/poker/range-parser";

const RANKS_DISPLAY = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

interface Props {
  notation: string;
  label?: string;
  comboCount?: number;
}

export function RangeDisplay({ notation, label, comboCount }: Props) {
  const grid = rangeToGrid(notation);

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13px] font-medium">{label}</div>
          {comboCount !== undefined && (
            <div className="text-[11px] font-mono text-text-faint shrink-0">
              {comboCount} combos
            </div>
          )}
        </div>
      )}

      {/* Notation textuelle */}
      <div
        className="font-mono text-[11px] leading-[1.5] rounded p-2.5 break-words"
        style={{
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        {notation}
      </div>

      {/* Mini-grille 13×13 (Tailwind n'a pas grid-cols-13 → grille inline) */}
      <div
        className="inline-block rounded p-2"
        style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
      >
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: "repeat(13, 16px)" }}
        >
          {grid.map((row, i) =>
            row.map((isInRange, j) => {
              const isPair = i === j;
              const isSuited = i < j;
              const cellLabel = isPair
                ? `${RANKS_DISPLAY[i]}${RANKS_DISPLAY[i]}`
                : isSuited
                ? `${RANKS_DISPLAY[i]}${RANKS_DISPLAY[j]}s`
                : `${RANKS_DISPLAY[j]}${RANKS_DISPLAY[i]}o`;

              return (
                <div
                  key={`${i}-${j}`}
                  title={cellLabel}
                  className="w-4 h-4 rounded-[2px] transition-all duration-100"
                  style={{
                    background: isInRange
                      ? "var(--purple-400)"
                      : "rgba(255, 255, 255, 0.04)",
                    border:
                      isPair && isInRange
                        ? "0.5px solid var(--purple-300)"
                        : isPair
                        ? "0.5px solid rgba(255, 255, 255, 0.08)"
                        : "none",
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
