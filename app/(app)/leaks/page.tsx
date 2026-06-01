"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { dbSlugToUrlSlug } from "@/lib/slug";

type Leak = Doc<"leaks">;
type LeakReason = Leak["reasons"][number];

const SEVERITY: Record<string, { label: string; color: string; glow: string; border: string }> = {
  severe: { label: "Sévère", color: "var(--red)", glow: "var(--red-glow)", border: "rgba(248, 113, 113, 0.3)" },
  moderate: { label: "Modéré", color: "var(--amber)", glow: "var(--amber-glow)", border: "rgba(251, 191, 36, 0.3)" },
  minor: { label: "Mineur", color: "var(--purple-300)", glow: "var(--purple-glow)", border: "rgba(167, 139, 250, 0.3)" },
};

const SUBMODULE_LABELS: Record<string, string> = {
  "m1.1": "Pot odds basiques",
  "m1.2": "Conversion ratio ↔ %",
  "m1.3": "Cotes implicites",
  "m1.4": "Reverse implied",
  "m2.1": "Outs & règle 4&2",
  "m2.2": "Equity heads-up",
  "m2.3": "Equity multiway",
  "m2.4": "Equity vs range",
  "m3.1": "Push/fold sub-15bb",
  "m3.2": "Fold equity",
  "m3.3": "EV composites",
  "m3.4": "Check-raise",
  "m4.1": "Équité ICM",
  "m4.2": "Bubble factor",
  "m4.3": "BF par position",
  "m4.4": "Table finale ICM",
  "m5.1": "SB push Nash",
  "m5.2": "BB call vs push",
  "m5.3": "BTN push Nash",
  "m5.4": "Call par position",
};

export default function LeaksPage() {
  const { userId } = useCurrentUser();
  const leaksRaw = useQuery(api.patterns.listActiveLeaks, userId ? { userId } : "skip");
  const leaks = leaksRaw ?? [];
  const loading = leaksRaw === undefined;

  // Tri par sévérité décroissante (severe → moderate → minor), puis par accuracy.
  const order: Record<string, number> = { severe: 0, moderate: 1, minor: 2 };
  const sorted = [...leaks].sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3) || a.accuracy - b.accuracy
  );

  return (
    <main className="max-w-[1000px] mx-auto px-8 pt-12 pb-24">
      <header className="mb-10" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">
          Diagnostic
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          Mes leaks actifs
        </h1>
        <p className="text-[15px] text-text-muted max-w-[560px] leading-[1.65]">
          {loading
            ? "Analyse de tes patterns…"
            : leaks.length === 0
            ? "Aucun leak détecté pour l'instant."
            : `${leaks.length} pattern${leaks.length > 1 ? "s" : ""} à corriger, détecté${
                leaks.length > 1 ? "s" : ""
              } à partir de ta précision et de ton biais d'estimation.`}
        </p>
      </header>

      {loading ? (
        <div className="text-text-muted text-sm">Chargement…</div>
      ) : leaks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4">
          {sorted.map((leak) => (
            <LeakCard key={leak._id} leak={leak} userId={userId} />
          ))}
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-lg px-8 py-12 text-center"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
    >
      <div className="text-3xl mb-4">🎯</div>
      <div className="text-[17px] font-medium mb-2">Aucun leak détecté</div>
      <p className="text-[14px] text-text-muted max-w-[420px] mx-auto leading-[1.6] mb-6">
        Continue à drillet : un leak apparaît dès qu&apos;un pattern accumule au moins 5 attempts
        avec une précision sous 70 % ou un biais d&apos;estimation systématique.
      </p>
      <Link
        href="/drill"
        className="inline-block px-5 py-2.5 rounded text-[13px] font-medium text-white transition-all duration-200 hover:-translate-y-px"
        style={{
          background: "var(--purple-500)",
          border: "0.5px solid var(--purple-500)",
          boxShadow: "0 4px 16px var(--purple-glow-strong)",
        }}
      >
        Aller drillet →
      </Link>
    </div>
  );
}

function LeakCard({ leak, userId }: { leak: Leak; userId: Id<"users"> | null }) {
  const sev = SEVERITY[leak.severity] ?? SEVERITY.minor;
  const progress = useQuery(
    api.patterns.getPatternProgress,
    userId ? { userId, patternId: leak.patternId } : "skip"
  );
  const drillHref = `/drill/${dbSlugToUrlSlug(leak.submoduleSlug)}?focusPattern=${leak.patternId}`;
  const biasSign = leak.signedErrorMedian > 0 ? "+" : "";

  return (
    <div
      data-testid="leak-card"
      className="rounded-lg p-5"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider"
            style={{ background: sev.glow, border: `0.5px solid ${sev.border}`, color: sev.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sev.color }} />
            {sev.label}
          </span>
          <h3 className="mt-3 text-[17px] font-medium tracking-[-0.015em]">{leak.patternLabel}</h3>
          <p className="text-[12px] font-mono text-text-faint mt-0.5">
            {leak.submoduleSlug.toUpperCase()} · {SUBMODULE_LABELS[leak.submoduleSlug] ?? ""}
          </p>
        </div>
        <Link
          href={drillHref}
          className="flex-shrink-0 px-3.5 py-2 rounded text-[12px] font-medium text-white transition-all duration-200 hover:-translate-y-px"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            boxShadow: "0 2px 10px var(--purple-glow)",
          }}
        >
          Drill ce pattern →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Précision" value={`${Math.round(leak.accuracy * 100)} %`} />
        <Stat
          label="Biais signé"
          value={`${biasSign}${leak.signedErrorMedian.toFixed(1)}`}
        />
        <Stat label="Attempts" value={`${leak.attemptsAnalyzed}`} />
      </div>

      <div className="mt-4 space-y-1.5">
        {leak.reasons.map((r, i) => (
          <ReasonLine key={i} reason={r} />
        ))}
      </div>

      {progress && (
        <div
          data-testid="sm2-debug"
          className="mt-4 pt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-mono text-text-faint"
          style={{ borderTop: "0.5px solid var(--border)" }}
        >
          <span>Révision SM-2 :</span>
          <span>EF {progress.easinessFactor.toFixed(2)}</span>
          <span>intervalle {progress.interval} j</span>
          <span>répétition {progress.repetition}</span>
          <span>{progress.attemptsCount} attempts</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded px-3 py-2.5"
      style={{ background: "var(--surface-strong)", border: "0.5px solid var(--border)" }}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint mb-1">{label}</div>
      <div className="text-[18px] font-semibold tracking-[-0.02em]">{value}</div>
    </div>
  );
}

function ReasonLine({ reason }: { reason: LeakReason }) {
  if (reason.type === "low-accuracy") {
    return (
      <div className="flex items-center gap-2 text-[13px] text-text-muted">
        <span style={{ color: "var(--red)" }}>●</span>
        Précision {Math.round(reason.accuracy * 100)} % — sous le seuil de{" "}
        {Math.round(reason.threshold * 100)} %.
      </div>
    );
  }
  const dir = reason.direction === "over" ? "sur-estimation" : "sous-estimation";
  const sign = reason.median > 0 ? "+" : "";
  return (
    <div className="flex items-center gap-2 text-[13px] text-text-muted">
      <span style={{ color: "var(--amber)" }}>●</span>
      Biais systématique de {dir} (médiane {sign}
      {reason.median.toFixed(1)}, seuil {reason.threshold}).
    </div>
  );
}
