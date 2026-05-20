"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { fmtPercent } from "@/lib/utils";
import { fmtDuration } from "@/lib/format";
import { urlSlugToDbSlug } from "@/lib/slug";
import {
  NashRangeReview,
  type SpotResult,
} from "@/components/poker/NashRangeReview";
import type { Card } from "@/lib/poker/cards";

const SUBMODULE_TITLES: Record<string, string> = {
  "m1.1": "Pot odds · Sous-module 1",
  "m1.2": "Conversion ratio ↔ % · Sous-module 2",
  "m1.3": "Cotes implicites · Sous-module 3",
  "m1.4": "Reverse implied odds · Sous-module 4",
  "m5.1": "SB push range Nash · Sous-module 1",
};

function ReviewContent() {
  const params = useParams();
  const urlSubmoduleId = params.submoduleId as string;
  const dbSubmoduleSlug = urlSlugToDbSlug(urlSubmoduleId);
  const search = useSearchParams();
  const sessionId = search.get("session") as Id<"sessions"> | null;
  const data = useQuery(api.sessions.getSessionWithSpots, sessionId ? { sessionId } : "skip");

  // M5.x — grouper les attempts par stack depth (M5.1/5.2/5.3) ou par position
  // (M5.4) pour rendre une NashRangeReview par groupe. Doit être appelé AVANT
  // tout early return (règle des hooks). La clé de groupement varie selon le
  // submodule mais on retourne un format uniforme {label, notation, results}.
  type GroupKey = string;
  const nashGroups = useMemo(() => {
    if (!data) return null;
    if (!["m5.1", "m5.2", "m5.3", "m5.4"].includes(dbSubmoduleSlug)) return null;

    const groups: Record<
      GroupKey,
      { label: string; stackDepth: number; notation: string; results: SpotResult[] }
    > = {};

    for (const a of data.attempts) {
      const snap = a.spotSnapshot as unknown as
        | {
            heroCards?: [Card, Card];
            heroStack?: number;
            heroPosition?: string;
            expected?: { nashRangeNotation?: string };
          }
        | undefined;
      const userAns = a.userAnswer as unknown as
        | {
            nashActionInput?: "push" | "fold";
            nashCallActionInput?: "call" | "fold";
          }
        | undefined;
      if (
        !snap?.heroCards ||
        !snap?.heroStack ||
        !snap?.expected?.nashRangeNotation
      ) {
        continue;
      }
      // Action user : push pour M5.1/M5.3, call pour M5.2/M5.4.
      // On normalise vers "push"/"fold" pour NashRangeReview (qui ne distingue pas).
      const rawAction =
        dbSubmoduleSlug === "m5.2" || dbSubmoduleSlug === "m5.4"
          ? userAns?.nashCallActionInput
          : userAns?.nashActionInput;
      if (!rawAction) continue;
      const normalizedAction: "push" | "fold" =
        rawAction === "fold" ? "fold" : "push";

      // Clé de groupement : position pour M5.4, stack sinon
      let key: GroupKey;
      let label: string;
      if (dbSubmoduleSlug === "m5.4") {
        key = `${snap.heroPosition ?? "?"}-${snap.heroStack}`;
        label = `${snap.heroPosition ?? "?"} defense · ${snap.heroStack} bb`;
      } else {
        key = `${snap.heroStack}bb`;
        label = `${snap.heroStack} bb`;
      }
      if (!groups[key]) {
        groups[key] = {
          label,
          stackDepth: snap.heroStack,
          notation: snap.expected.nashRangeNotation,
          results: [],
        };
      }
      groups[key].results.push({
        hand: snap.heroCards,
        userAction: normalizedAction,
      });
    }
    return groups;
  }, [data, dbSubmoduleSlug]);

  if (!sessionId) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="text-text-muted">Aucune session spécifiée.</div>
        <Link href="/drill" className="text-purple-400 hover:underline">Retour</Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="text-text-muted">Chargement de la session…</div>
      </main>
    );
  }

  const { session, attempts } = data;
  const accuracy = session.totalSpots > 0 ? (session.correctSpots / session.totalSpots) * 100 : 0;
  const avgTimeMs = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + a.timeMs, 0) / attempts.length)
    : 0;
  const ratedAttempts = attempts.filter((a) => !a.isCorrect);
  const failedSpots = attempts.filter((a) => !a.isCorrect).map((a) => a.spotSnapshot);

  function handleRetryFailed() {
    if (failedSpots.length === 0) return;
    sessionStorage.setItem("retrySpots", JSON.stringify(failedSpots));
    window.location.href = `/drill/${urlSubmoduleId}?mode=retry`;
  }

  return (
    <main className="max-w-[1200px] mx-auto px-8 py-12">
      <header className="mb-10" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="text-[13px] font-mono text-text-muted mb-3.5">
          Session terminée · {new Date(session.startedAt).toLocaleString("fr-FR")}
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          {session.correctSpots} sur {session.totalSpots} réussis.
        </h1>
        <p className="text-base text-text-muted max-w-[540px]">
          {SUBMODULE_TITLES[dbSubmoduleSlug] ?? dbSubmoduleSlug}
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-12">
        <ReviewMetric label="Accuracy" value={fmtPercent(accuracy, 0)} color={accuracy >= 80 ? "var(--green)" : accuracy >= 60 ? "var(--amber)" : "var(--red)"} />
        <ReviewMetric label="Temps moyen" value={fmtDuration(avgTimeMs)} />
        <ReviewMetric label="Ratés à re-drill" value={String(ratedAttempts.length)} color={ratedAttempts.length > 0 ? "var(--amber)" : "var(--green)"} />
      </section>

      {nashGroups && Object.keys(nashGroups).length > 0 && (
        <section className="mb-12">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
              Calibration Nash {dbSubmoduleSlug === "m5.4" ? "par position" : "par stack depth"}
            </span>
          </div>
          <div className="flex flex-col gap-6">
            {Object.entries(nashGroups)
              .sort(([, a], [, b]) => a.label.localeCompare(b.label))
              .map(([key, group]) => (
                <NashRangeReview
                  key={key}
                  results={group.results}
                  nashRangeNotation={group.notation}
                  stackDepth={group.stackDepth}
                  label={group.label}
                />
              ))}
          </div>
        </section>
      )}

      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
          Détail des spots
        </span>
      </div>

      <section className="flex flex-col gap-2 mb-12">
        {attempts.map((att, i) => {
          const snap = att.spotSnapshot as unknown as
            | {
                potBb?: number;
                betBb?: number;
                heroStack?: number;
                heroCards?: [Card, Card];
                heroPosition?: string;
              }
            | undefined;
          const exp = att.expected as unknown as
            | { requiredEquity?: number; nashAction?: "push" | "fold" | "call" }
            | undefined;
          const userAns = att.userAnswer as unknown as
            | {
                nashActionInput?: "push" | "fold";
                nashCallActionInput?: "call" | "fold";
              }
            | undefined;
          // M5.x : affichage spécifique (main + position + stack + action)
          const isNashSpot = exp?.nashAction !== undefined;
          const userActionM5 =
            userAns?.nashCallActionInput ?? userAns?.nashActionInput;
          return (
            <div
              key={att._id}
              className="grid items-center gap-4 px-5 py-4 rounded-lg"
              style={{ gridTemplateColumns: "32px 60px 1fr auto", background: "var(--surface)", border: "0.5px solid var(--border)" }}
            >
              <span className="font-mono text-xs text-text-faint">{String(i + 1).padStart(2, "0")}</span>
              <span
                className="text-xs font-medium px-2 py-1 rounded text-center"
                style={{
                  background: att.isCorrect ? "var(--green-glow)" : "var(--red-glow)",
                  color: att.isCorrect ? "var(--green)" : "var(--red)",
                }}
              >
                {att.isCorrect ? "✓ OK" : "✗ KO"}
              </span>
              <span className="text-sm text-text-muted">
                {isNashSpot && snap?.heroCards
                  ? `${snap.heroCards.join(" ")} · ${snap.heroPosition ?? "?"} ${snap.heroStack}bb · toi : ${userActionM5?.toUpperCase() ?? "—"} · Nash : ${exp?.nashAction?.toUpperCase()}`
                  : `Pot ${snap?.potBb}bb · bet ${snap?.betBb}bb · attendu ${fmtPercent(exp?.requiredEquity ?? 0)}`}
              </span>
              <span className="text-xs font-mono text-text-faint">{fmtDuration(att.timeMs)}</span>
            </div>
          );
        })}
      </section>

      <div className="flex gap-3">
        <Link
          href={`/drill/${urlSubmoduleId}`}
          className="px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200"
          style={{ background: "var(--surface)", border: "0.5px solid var(--border)", color: "var(--text)" }}
        >
          Nouvelle session
        </Link>
        {failedSpots.length > 0 && (
          <button
            onClick={handleRetryFailed}
            className="px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200"
            style={{ background: "var(--amber-glow)", border: "0.5px solid rgba(251, 191, 36, 0.3)", color: "var(--amber)" }}
          >
            Re-drillet les {failedSpots.length} ratés →
          </button>
        )}
        <Link
          href="/"
          className="ml-auto px-5 py-3 rounded text-[13px] font-medium tracking-[-0.01em] transition-all duration-200"
          style={{
            background: "var(--purple-500)",
            border: "0.5px solid var(--purple-500)",
            color: "white",
            boxShadow: "0 0 0 0.5px rgba(255,255,255,0.1), 0 4px 16px var(--purple-glow-strong)",
          }}
        >
          Retour à l&apos;Atelier →
        </Link>
      </div>
    </main>
  );
}

function ReviewMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded p-5" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">{label}</div>
      <div className="text-3xl font-semibold leading-none tracking-[-0.03em]" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<main className="max-w-[1200px] mx-auto px-8 py-12 text-text-muted">Chargement…</main>}>
      <ReviewContent />
    </Suspense>
  );
}
