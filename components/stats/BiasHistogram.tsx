"use client";

import { useQuery } from "convex/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { C, ChartTooltip, EmptyState, FONT_MONO, LoadingState } from "./shared";

type Kind = "ev_bb" | "bubble_factor";

const KIND_META: Record<Kind, { unit: string; noun: string; min: number }> = {
  ev_bb: { unit: " bb", noun: "l'EV", min: 5 },
  bubble_factor: { unit: "", noun: "le bubble factor", min: 5 },
};

function fmtSigned(n: number, unit: string): string {
  const r = Math.round(n * 100) / 100;
  return `${r > 0 ? "+" : ""}${r}${unit}`;
}

export function BiasHistogram({
  userId,
  kind,
}: {
  userId: Id<"users"> | null;
  kind: Kind;
}) {
  const dist = useQuery(
    api.stats.biasDistribution,
    userId ? { userId, kind } : "skip"
  );
  const meta = KIND_META[kind];

  if (dist === undefined) return <LoadingState />;
  if (dist.count < meta.min) {
    return (
      <EmptyState
        message={`Encore ${meta.min - dist.count} attempt(s) à driller pour afficher la distribution de biais.`}
      />
    );
  }

  const domainMin = dist.bins[0]?.binStart ?? -1;
  const domainMax = dist.bins[dist.bins.length - 1]?.binEnd ?? 1;

  // Couleur : à droite de 0 = optimiste (surestime), à gauche = pessimiste.
  const colorFor = (center: number) => {
    if (center > 0.0001) return C.amber;
    if (center < -0.0001) return C.blue;
    return C.purple;
  };

  const direction =
    Math.abs(dist.median) < (kind === "ev_bb" ? 0.2 : 0.1)
      ? "neutral"
      : dist.median > 0
      ? "over"
      : "under";

  return (
    <div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={dist.bins} margin={{ top: 8, right: 16, bottom: 24, left: 4 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis
              type="number"
              dataKey="center"
              domain={[domainMin, domainMax]}
              tickFormatter={(v: number) => `${Math.round(v * 10) / 10}`}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
              label={{
                value: `Erreur signée (estimé − réel)${meta.unit}`,
                position: "insideBottom",
                offset: -14,
                fill: C.textMuted,
                fontSize: 12,
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
              stroke={C.borderStrong}
            />
            <ReferenceLine x={0} stroke={C.borderStrong} />
            <ReferenceLine
              x={dist.mean}
              stroke={C.purple300}
              strokeDasharray="5 4"
              label={{ value: "moy.", position: "top", fill: C.purple300, fontSize: 10 }}
            />
            <ReferenceLine
              x={dist.median}
              stroke={C.green}
              strokeDasharray="2 3"
              label={{ value: "méd.", position: "top", fill: C.green, fontSize: 10 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={
                <ChartTooltip
                  rows={(d) => [
                    {
                      label: "Plage",
                      value: `${Math.round(Number(d.binStart) * 10) / 10} → ${
                        Math.round(Number(d.binEnd) * 10) / 10
                      }${meta.unit}`,
                    },
                    { label: "Attempts", value: String(d.count) },
                  ]}
                />
              }
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {dist.bins.map((b, i) => (
                <Cell key={i} fill={colorFor(b.center)} fillOpacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[12.5px] leading-[1.6] text-text-faint mt-2">
        {direction === "neutral" ? (
          <span className="text-green">
            Biais médian {fmtSigned(dist.median, meta.unit)} : pas de biais systématique notable.
          </span>
        ) : (
          <span style={{ color: direction === "over" ? C.amber : C.blue }}>
            Biais médian {fmtSigned(dist.median, meta.unit)} : tu{" "}
            {direction === "over" ? "surestimes" : "sous-estimes"} systématiquement {meta.noun}.
          </span>
        )}{" "}
        <span className="text-text-dim">
          (moy. {fmtSigned(dist.mean, meta.unit)} · {dist.count} attempts)
        </span>
      </p>
    </div>
  );
}
