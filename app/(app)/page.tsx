"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import type { Id } from "@/convex/_generated/dataModel";
import { MODULES, type ModuleDef, type SubmoduleDef } from "@/lib/modules";

function statusFor(accuracy: number, available: boolean, attempts: number, isTheoryDone: boolean) {
  if (!available) return { kind: "locked" as const, label: "Verrouillé" };
  if (!isTheoryDone) return { kind: "theory" as const, label: "Théorie à lire" };
  if (attempts === 0) return { kind: "active" as const, label: "Prêt à drillet" };
  if (accuracy >= 80) return { kind: "done" as const, label: "Maîtrisé" };
  if (accuracy < 60 && attempts >= 10) return { kind: "leak" as const, label: "Fuite active" };
  return { kind: "active" as const, label: "En cours" };
}

const STATUS_STYLES = {
  done: { dot: "var(--green)", glow: "var(--green-glow)", color: "var(--green)", badgeBg: "var(--green-glow)", badgeBorder: "rgba(74, 222, 128, 0.3)" },
  active: { dot: "var(--purple-400)", glow: "var(--purple-glow)", color: "var(--purple-300)", badgeBg: "var(--purple-glow)", badgeBorder: "rgba(167, 139, 250, 0.3)" },
  leak: { dot: "var(--amber)", glow: "var(--amber-glow)", color: "var(--amber)", badgeBg: "var(--amber-glow)", badgeBorder: "rgba(251, 191, 36, 0.3)" },
  locked: { dot: "var(--text-dim)", glow: "transparent", color: "var(--text-faint)", badgeBg: "var(--surface-strong)", badgeBorder: "var(--border-strong)" },
  theory: { dot: "var(--purple-400)", glow: "var(--purple-glow)", color: "var(--purple-300)", badgeBg: "var(--purple-glow)", badgeBorder: "rgba(167, 139, 250, 0.3)" },
};

export default function AtelierPage() {
  const { userId } = useCurrentUser();
  const globalStats = useQuery(api.attempts.getGlobalStats, userId ? { userId } : "skip");
  const activeLeaks = useQuery(api.patterns.listActiveLeaks, userId ? { userId } : "skip");

  return (
    <main className="max-w-[1200px] mx-auto px-8 pt-12 pb-24">
      <header className="mb-10" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="flex items-center gap-2.5 text-[13px] font-mono text-text-muted mb-3.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--green)",
              boxShadow: "0 0 0 3px var(--green-glow)",
              animation: "livePulse 2s var(--ease) infinite",
            }}
          />
          {globalStats?.currentStreakDays
            ? `Streak ${globalStats.currentStreakDays} jour${globalStats.currentStreakDays > 1 ? "s" : ""}`
            : "Première session"}
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          {globalStats?.totalAttempts ? "Re-bonjour Serge." : "Bienvenue Serge."}
          <br />
          {globalStats?.totalAttempts
            ? `${Math.round(globalStats.accuracy)} % d'accuracy globale.`
            : "Première session à drillet."}
        </h1>
      </header>

      <section className="grid grid-cols-4 gap-3 mb-14">
        <MetricCard
          label="Accuracy globale"
          value={globalStats ? Math.round(globalStats.accuracy).toString() : "—"}
          unit="%"
        />
        <MetricCard label="Spots drillés" value={globalStats?.totalAttempts?.toString() ?? "0"} />
        <MetricCard label="Streak" value={globalStats?.currentStreakDays?.toString() ?? "0"} unit="j" />
        <MetricCard
          label="Fuites actives"
          value={activeLeaks ? activeLeaks.length.toString() : "—"}
          hint={activeLeaks && activeLeaks.length > 0 ? "Voir Mes leaks →" : undefined}
        />
      </section>

      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
          Modules de la formation
        </span>
      </div>

      <section className="flex flex-col gap-2 mb-16">
        {MODULES.map((mod) => (
          <ModuleBlock key={mod.slug} mod={mod} userId={userId} />
        ))}
      </section>
    </main>
  );
}

function MetricCard({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div className="rounded p-5 transition-all duration-200" style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">{label}</div>
      <div className="text-3xl font-semibold leading-none mb-2 tracking-[-0.03em]">
        {value}
        {unit && <span className="text-lg text-text-faint font-medium">{unit}</span>}
      </div>
      {hint && <div className="text-xs font-mono text-text-faint">{hint}</div>}
    </div>
  );
}

function ModuleBlock({ mod, userId }: { mod: ModuleDef; userId: Id<"users"> | null }) {
  const locked = !mod.available;
  const styles = locked ? STATUS_STYLES.locked : STATUS_STYLES.active;
  const moduleLabel = locked
    ? "Verrouillé"
    : `${mod.submodules.length} sous-module${mod.submodules.length > 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`grid items-center gap-5 px-6 py-5 rounded-lg transition-all duration-200 ${locked ? "opacity-40" : ""}`}
        style={{
          gridTemplateColumns: "48px 1fr 160px",
          background: "var(--surface)",
          border: "0.5px solid var(--border)",
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold font-mono tracking-tight"
          style={{ background: styles.badgeBg, border: `0.5px solid ${styles.badgeBorder}`, color: styles.color }}
        >
          {mod.badge}
        </div>
        <div>
          <div className="text-[15px] font-medium tracking-[-0.015em] mb-0.5">{mod.title}</div>
          <div className="text-[13px] text-text-muted">{mod.desc}</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium justify-end" style={{ color: styles.color }}>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: styles.dot, boxShadow: `0 0 0 3px ${styles.glow}` }}
          />
          {moduleLabel}
        </div>
      </div>

      {mod.available &&
        mod.submodules.map((sub) => (
          <SubmoduleRow key={sub.slug} sub={sub} userId={userId} parentSlug={mod.slug} />
        ))}
    </div>
  );
}

function SubmoduleRow({ sub, userId, parentSlug }: { sub: SubmoduleDef; userId: Id<"users"> | null; parentSlug: string }) {
  const completion = useQuery(
    api.theoryCompletions.getCompletion,
    userId && sub.available ? { userId, submoduleSlug: sub.slug } : "skip"
  );
  const stats = useQuery(
    api.attempts.getSubmoduleStats,
    userId && sub.available ? { userId, submoduleSlug: sub.slug, lastN: 30 } : "skip"
  );

  const isTheoryDone = completion != null && completion.quickCheckScore >= 2;
  const accuracy = stats?.accuracy ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;
  const status = statusFor(accuracy, sub.available, totalAttempts, isTheoryDone);
  const styles = STATUS_STYLES[status.kind];

  const href = !sub.available
    ? "#"
    : !isTheoryDone
    ? `/module/${parentSlug}/theory/${sub.urlSlug}`
    : `/drill/${sub.urlSlug}`;

  return (
    <Link
      href={href}
      className="grid items-center gap-4 px-5 py-3.5 ml-8 rounded transition-all duration-200 hover:[background:var(--surface-hover)]"
      style={{
        gridTemplateColumns: "20px 1fr 70px 130px 16px",
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <span className="text-text-faint font-mono text-[11px]">
        {sub.slug.replace(`${parentSlug}.`, "")}
      </span>
      <span className="text-[13px] font-medium">{sub.title}</span>
      <span className="text-[11px] font-mono text-text-faint">
        {totalAttempts > 0 ? `${Math.round(accuracy)} %` : "—"}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: styles.color }}>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: styles.dot, boxShadow: `0 0 0 2px ${styles.glow}` }}
        />
        {status.label}
      </span>
      <span className="text-text-faint text-base">→</span>
    </Link>
  );
}
