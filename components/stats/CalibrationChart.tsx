"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  C,
  ChartTooltip,
  EmptyState,
  FONT_MONO,
  LoadingState,
  SERIES_COLORS,
  submoduleLabel,
} from "./shared";

type Kind = "equity_winrate" | "icm_equity";

const KIND_LABEL: Record<Kind, string> = {
  equity_winrate: "Équité (M·II)",
  icm_equity: "Équité ICM (M·IV)",
};

export function CalibrationChart({
  userId,
  kind,
}: {
  userId: Id<"users"> | null;
  kind: Kind;
}) {
  const series = useQuery(
    api.stats.calibrationPoints,
    userId ? { userId, kind } : "skip"
  );

  const interpretation = useMemo(() => {
    if (!series) return null;
    let weight = 0;
    let weightedDiff = 0;
    for (const s of series) {
      for (const b of s.bins) {
        weight += b.count;
        weightedDiff += (b.meanActual - b.meanPredicted) * b.count;
      }
    }
    if (weight === 0) return null;
    return weightedDiff / weight; // >0 = réel > estimé = sous-estimation
  }, [series]);

  if (series === undefined) return <LoadingState />;

  const totalPoints = series.reduce((s, x) => s + x.bins.length, 0);
  if (totalPoints === 0) {
    return (
      <EmptyState
        message={`Pas encore d'attempts ${KIND_LABEL[kind]}. Drille ces sous-modules pour peupler la calibration.`}
      />
    );
  }

  return (
    <div>
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 4 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
              label={{
                value: "Ton estimé (%)",
                position: "insideBottom",
                offset: -16,
                fill: C.textMuted,
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
              label={{
                value: "Réel (%)",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                fill: C.textMuted,
                fontSize: 12,
              }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 420]} name="Volume" />
            {/* Diagonale y=x : calibration parfaite. */}
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 100, y: 100 },
              ]}
              stroke={C.textFaint}
              strokeDasharray="6 5"
              ifOverflow="hidden"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: C.borderStrong }}
              content={
                <ChartTooltip
                  rows={(d) => [
                    { label: "Sous-module", value: String(d.slug).toUpperCase() },
                    { label: "Décile", value: `${d.binLabel} %` },
                    { label: "Estimé moy.", value: `${d.x} %` },
                    { label: "Réel moy.", value: `${d.y} %` },
                    { label: "Volume", value: String(d.z) },
                  ]}
                />
              }
            />
            {series.map((s, i) => (
              <Scatter
                key={s.submoduleSlug}
                name={submoduleLabel(s.submoduleSlug)}
                data={s.bins.map((b) => ({
                  x: b.meanPredicted,
                  y: b.meanActual,
                  z: b.count,
                  slug: s.submoduleSlug,
                  binLabel: b.binLabel,
                }))}
                fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                fillOpacity={0.78}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Légende custom (design system). */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 mb-3">
        {series.map((s, i) => (
          <div key={s.submoduleSlug} className="flex items-center gap-1.5 text-[12px] font-mono text-text-muted">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {submoduleLabel(s.submoduleSlug)} · {s.count}
          </div>
        ))}
      </div>

      <p className="text-[12.5px] leading-[1.6] text-text-faint">
        Au-dessus de la diagonale = tu <span className="text-green">sous-estimes</span> ; en-dessous ={" "}
        tu <span className="text-amber">surestimes</span>. Taille de bulle ∝ volume.
        {interpretation !== null && Math.abs(interpretation) >= 2 && (
          <>
            {" "}
            <span style={{ color: interpretation > 0 ? C.green : C.amber }}>
              En moyenne tu {interpretation > 0 ? "sous-estimes" : "surestimes"} de{" "}
              {Math.abs(Math.round(interpretation * 10) / 10)} pts.
            </span>
          </>
        )}
        {interpretation !== null && Math.abs(interpretation) < 2 && (
          <span className="text-green"> Bien calibré globalement (écart &lt; 2 pts).</span>
        )}
      </p>
    </div>
  );
}
