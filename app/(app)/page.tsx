"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

const MODULES = [
  {
    slug: "m1",
    submoduleSlug: "m1.1",
    badge: "M·I",
    title: "Pot odds & cotes implicites",
    desc: "Calcul mental de l'equity requise face à toute mise",
    href: "/drill/m1-1",
    available: true,
  },
  {
    slug: "m2",
    submoduleSlug: "m2.1",
    badge: "M·II",
    title: "Equity & outs",
    desc: "Évaluer la force de ta main face à un range, heads-up et multiway",
    href: "#",
    available: false,
  },
  {
    slug: "m3",
    submoduleSlug: "m3.1",
    badge: "M·III",
    title: "EV de décisions composites",
    desc: "Push/fold, 3bet, check-raise — pondération multi-branches",
    href: "#",
    available: false,
  },
  {
    slug: "m4",
    submoduleSlug: "m4.1",
    badge: "M·IV",
    title: "ICM — bulle & table finale",
    desc: "Pondération Malmuth-Harville, bubble factor, payouts MTT",
    href: "#",
    available: false,
  },
  {
    slug: "m5",
    submoduleSlug: "m5.1",
    badge: "M·V",
    title: "Ranges Nash push/fold",
    desc: "L'arsenal sub-15bb : mémorisation des ranges optimales",
    href: "#",
    available: false,
  },
];

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
        <MetricCard
          label="Spots drillés"
          value={globalStats?.totalAttempts?.toString() ?? "0"}
        />
        <MetricCard
          label="Streak"
          value={globalStats?.currentStreakDays?.toString() ?? "0"}
          unit="j"
        />
        <MetricCard
          label="Fuites actives"
          value="—"
          hint="Détection en S+"
        />
      </section>

      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
          Modules de la formation
        </span>
      </div>

      <section className="flex flex-col gap-2 mb-16">
        {MODULES.map((mod) => (
          <ModuleRow key={mod.slug} mod={mod} userId={userId} />
        ))}
      </section>
    </main>
  );
}

function MetricCard({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) {
  return (
    <div
      className="rounded p-5 transition-all duration-200"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">
        {label}
      </div>
      <div className="text-3xl font-semibold leading-none mb-2 tracking-[-0.03em]">
        {value}
        {unit && <span className="text-lg text-text-faint font-medium">{unit}</span>}
      </div>
      {hint && <div className="text-xs font-mono text-text-faint">{hint}</div>}
    </div>
  );
}

function ModuleRow({ mod, userId }: {
  mod: typeof MODULES[number];
  userId: ReturnType<typeof useCurrentUser>["userId"];
}) {
  const stats = useQuery(
    api.attempts.getSubmoduleStats,
    mod.available && userId ? { userId, submoduleSlug: mod.submoduleSlug, lastN: 30 } : "skip"
  );
  const completion = useQuery(
    api.theoryCompletions.getCompletion,
    mod.available && userId ? { userId, submoduleSlug: mod.submoduleSlug } : "skip"
  );

  const isTheoryDone =
    completion !== undefined && completion !== null && completion.quickCheckScore >= 2;
  const accuracy = stats?.accuracy ?? 0;
  const totalAttempts = stats?.totalAttempts ?? 0;
  const status = statusFor(accuracy, mod.available, totalAttempts, isTheoryDone);
  const styles = STATUS_STYLES[status.kind];
  const locked = status.kind === "locked";
  const href = !mod.available
    ? "#"
    : !isTheoryDone
    ? `/module/${mod.slug}/theory/${mod.submoduleSlug.replace(".", "-")}`
    : mod.href;

  const progressLabel = !mod.available
    ? "Verrouillé"
    : totalAttempts === 0
    ? "À démarrer"
    : `${Math.round(accuracy)} / 100 sur ${totalAttempts} spot${totalAttempts > 1 ? "s" : ""}`;

  const content = (
    <div
      className={`grid items-center gap-5 px-6 py-5 rounded-lg transition-all duration-200 ${locked ? "opacity-40 cursor-not-allowed" : "hover:-translate-y-px hover:[background:var(--surface-hover)] cursor-pointer"}`}
      style={{
        gridTemplateColumns: "48px 1fr 240px 120px 16px",
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-semibold font-mono tracking-tight"
        style={{
          background: styles.badgeBg,
          border: `0.5px solid ${styles.badgeBorder}`,
          color: styles.color,
        }}
      >
        {mod.badge}
      </div>
      <div>
        <div className="text-[15px] font-medium tracking-[-0.015em] mb-0.5">{mod.title}</div>
        <div className="text-[13px] text-text-muted">{mod.desc}</div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-strong)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, accuracy)}%`,
              background:
                status.kind === "done"
                  ? "linear-gradient(90deg, var(--green), #86EFAC)"
                  : status.kind === "leak"
                  ? "linear-gradient(90deg, var(--amber), #FCD34D)"
                  : "linear-gradient(90deg, var(--purple-500), var(--purple-400))",
            }}
          />
        </div>
        <div className="text-[11px] font-mono text-text-faint">{progressLabel}</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: styles.color }}>
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: styles.dot, boxShadow: `0 0 0 3px ${styles.glow}` }}
        />
        {status.label}
      </div>
      <div className="text-text-faint text-base">→</div>
    </div>
  );

  if (locked) return <div>{content}</div>;
  return <Link href={href}>{content}</Link>;
}
