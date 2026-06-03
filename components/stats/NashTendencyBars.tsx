"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { C, ChartTooltip, EmptyState, FONT_MONO, LoadingState } from "./shared";

export function NashTendencyBars({ userId }: { userId: Id<"users"> | null }) {
  const data = useQuery(api.stats.nashTendency, userId ? { userId } : "skip");

  const worst = useMemo(() => {
    if (!data || data.length === 0) return null;
    // Déséquilibre = part d'erreurs (over + under). On retient le stack le plus erroné.
    return data.reduce((acc, d) =>
      d.overPct + d.underPct > acc.overPct + acc.underPct ? d : acc
    );
  }, [data]);

  if (data === undefined) return <LoadingState />;
  if (data.length === 0) {
    return <EmptyState message="Drille les sous-modules push/fold M·V pour visualiser ta tendance par stack." />;
  }

  return (
    <div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="stack"
              tickFormatter={(v: number) => `${v}bb`}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
              label={{
                value: "Stack effectif",
                position: "insideBottom",
                offset: -14,
                fill: C.textMuted,
                fontSize: 12,
              }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: "Stack", value: `${d.stack}bb` },
                    { label: "Trop large", value: `${d.overPct}% (${d.over})` },
                    { label: "Correct", value: `${d.correctPct}% (${d.correct})` },
                    { label: "Trop serré", value: `${d.underPct}% (${d.under})` },
                  ]}
                />
              }
            />
            <Bar dataKey="underPct" stackId="a" fill={C.blue} fillOpacity={0.85} radius={[0, 0, 2, 2]} />
            <Bar dataKey="correctPct" stackId="a" fill={C.green} fillOpacity={0.85} />
            <Bar dataKey="overPct" stackId="a" fill={C.amber} fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 mb-2">
        {[
          { c: C.amber, label: "Trop large (joue quand Nash fold)" },
          { c: C.green, label: "Correct" },
          { c: C.blue, label: "Trop serré (fold quand Nash joue)" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5 text-[12px] font-mono text-text-muted">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.c }} />
            {l.label}
          </div>
        ))}
      </div>

      {worst && worst.overPct + worst.underPct >= 20 && (
        <p className="text-[12.5px] leading-[1.6] text-text-faint">
          Déséquilibre max à <span className="text-text">{worst.stack}bb</span> :{" "}
          {worst.overPct >= worst.underPct ? (
            <span style={{ color: C.amber }}>tu joues trop large ({worst.overPct}%)</span>
          ) : (
            <span style={{ color: C.blue }}>tu te couches trop ({worst.underPct}%)</span>
          )}
          .
        </p>
      )}
    </div>
  );
}
