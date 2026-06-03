"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { accuracyColor, EmptyState, LoadingState, submoduleLabel } from "./shared";

const MODULE_LABELS: Record<string, string> = {
  m1: "M·I — Cotes & pot odds",
  m2: "M·II — Equity & outs",
  m3: "M·III — EV & fold equity",
  m4: "M·IV — ICM",
  m5: "M·V — Push/fold Nash",
};

interface Row {
  submoduleSlug: string;
  total: number;
  correct: number;
  accuracy: number;
}

export function SubmoduleAccuracyBars({ userId }: { userId: Id<"users"> | null }) {
  const data = useQuery(api.stats.accuracyBySubmodule, userId ? { userId } : "skip");

  const groups = useMemo(() => {
    if (!data) return [];
    const byModule = new Map<string, Row[]>();
    for (const row of data) {
      const mod = row.submoduleSlug.split(".")[0];
      const arr = byModule.get(mod) ?? [];
      arr.push(row);
      byModule.set(mod, arr);
    }
    return Array.from(byModule.entries());
  }, [data]);

  if (data === undefined) return <LoadingState />;
  const anyData = data.some((r) => r.total > 0);
  if (!anyData) {
    return <EmptyState message="Aucun spot drillé pour l'instant. Lance un drill pour voir ta précision par sous-module." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([mod, rows]) => (
        <div key={mod}>
          <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-faint mb-2.5">
            {MODULE_LABELS[mod] ?? mod}
          </div>
          <div className="flex flex-col gap-1.5">
            {rows.map((row) => {
              const empty = row.total === 0;
              const color = accuracyColor(row.accuracy);
              return (
                <div key={row.submoduleSlug} className="grid items-center gap-3" style={{ gridTemplateColumns: "52px 1fr 96px" }}>
                  <span className="text-[12px] font-mono text-text-muted">
                    {submoduleLabel(row.submoduleSlug)}
                  </span>
                  <div
                    className="h-5 rounded-sm overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {!empty && (
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{
                          width: `${Math.max(row.accuracy, 2)}%`,
                          background: color,
                          opacity: 0.85,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[12px] font-mono text-right">
                    {empty ? (
                      <span className="text-text-dim">— (0)</span>
                    ) : (
                      <>
                        <span style={{ color }}>{Math.round(row.accuracy)}%</span>{" "}
                        <span className="text-text-dim">({row.total})</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
