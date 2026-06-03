"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState, LoadingState } from "./shared";

export function Sm2ForecastCard({
  userId,
  now,
}: {
  userId: Id<"users"> | null;
  now: number;
}) {
  const f = useQuery(api.stats.sm2Forecast, userId ? { userId, now } : "skip");

  if (f === undefined) return <LoadingState />;
  if (f.total === 0) {
    return (
      <EmptyState message="Aucun pattern suivi pour l'instant. Le moteur SM-2 démarre dès tes premiers drills." />
    );
  }

  const cells = [
    { label: "À réviser aujourd'hui", value: f.dueToday, accent: f.dueToday > 0 },
    { label: "Cette semaine", value: f.dueThisWeek, accent: false },
    { label: "Patterns suivis", value: f.total, accent: false },
    { label: "EF moyen", value: f.avgEaseFactor.toFixed(2), accent: false },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-lg p-4"
            style={{
              background: c.accent ? "var(--purple-glow)" : "var(--surface)",
              border: `0.5px solid ${c.accent ? "rgba(167,139,250,0.3)" : "var(--border)"}`,
            }}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-2">
              {c.label}
            </div>
            <div
              className="text-2xl font-semibold tracking-[-0.02em]"
              style={{ color: c.accent ? "var(--purple-300)" : "var(--text)" }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/leaks"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors"
        style={{ color: "var(--purple-300)" }}
      >
        Voir mes leaks & réviser →
      </Link>
    </div>
  );
}
