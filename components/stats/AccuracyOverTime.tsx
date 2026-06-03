"use client";

import { useQuery } from "convex/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { C, ChartTooltip, EmptyState, FONT_MONO, LoadingState } from "./shared";

function shortDate(iso: string): string {
  // "2026-06-03" → "03/06"
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function AccuracyOverTime({ userId }: { userId: Id<"users"> | null }) {
  const data = useQuery(api.stats.accuracyOverTime, userId ? { userId } : "skip");

  if (data === undefined) return <LoadingState />;
  if (data.length === 0) {
    return <EmptyState message="Drille sur plusieurs jours pour voir ta progression dans le temps." />;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
            stroke={C.borderStrong}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: C.textFaint, fontSize: 11, fontFamily: FONT_MONO }}
            stroke={C.borderStrong}
          />
          <Tooltip
            cursor={{ stroke: C.borderStrong, strokeDasharray: "3 3" }}
            content={
              <ChartTooltip
                rows={(d) => [
                  { label: "Jour", value: String(d.date) },
                  { label: "Accuracy", value: `${d.accuracy}%` },
                  { label: "Spots", value: `${d.correct}/${d.total}` },
                ]}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke={C.purple}
            strokeWidth={2}
            dot={{ fill: C.purple, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: C.purple300 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
