import Link from "next/link";

const METRICS = [
  { label: "Accuracy globale", value: "71", unit: "%", trend: "+3 pts · 30j", trendKind: "up" as const },
  { label: "Spots drillés", value: "847", unit: "", trend: "~16 par session", trendKind: "neutral" as const },
  { label: "Calibration · MAE", value: "6.4", unit: "pts", trend: "-1.2 · 30j", trendKind: "up" as const },
  { label: "Fuites actives", value: "3", unit: "", trend: "À traiter", trendKind: "warn" as const },
];

const MODULES = [
  {
    slug: "m1",
    badge: "M·I",
    title: "Pot odds & cotes implicites",
    desc: "Calcul mental de l'equity requise face à toute mise",
    progress: 89,
    status: "done" as const,
    statusLabel: "Maîtrisé",
    href: "/drill/m1-1",
  },
  {
    slug: "m2",
    badge: "M·II",
    title: "Equity & outs",
    desc: "Évaluer la force de ta main face à un range, heads-up et multiway",
    progress: 72,
    status: "active" as const,
    statusLabel: "En cours",
    href: "/drill/m1-1",
  },
  {
    slug: "m3",
    badge: "M·III",
    title: "EV de décisions composites",
    desc: "Push/fold, 3bet, check-raise — pondération multi-branches",
    progress: 54,
    status: "leak" as const,
    statusLabel: "Fuite active",
    href: "/drill/m1-1",
  },
  {
    slug: "m4",
    badge: "M·IV",
    title: "ICM — bulle & table finale",
    desc: "Pondération Malmuth-Harville, bubble factor, payouts MTT",
    progress: 0,
    status: "locked" as const,
    statusLabel: "Verrouillé",
    href: "#",
  },
  {
    slug: "m5",
    badge: "M·V",
    title: "Ranges Nash push/fold",
    desc: "L'arsenal sub-15bb : mémorisation des ranges optimales",
    progress: 0,
    status: "locked" as const,
    statusLabel: "Verrouillé",
    href: "#",
  },
];

const STATUS_STYLES = {
  done: { dot: "var(--green)", glow: "var(--green-glow)", color: "var(--green)" },
  active: { dot: "var(--purple-400)", glow: "var(--purple-glow)", color: "var(--purple-300)" },
  leak: { dot: "var(--amber)", glow: "var(--amber-glow)", color: "var(--amber)" },
  locked: { dot: "var(--text-dim)", glow: "transparent", color: "var(--text-faint)" },
};

export default function AtelierPage() {
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
          Session 014 · Streak 12 jours
        </div>
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          Bonsoir Serge.
          <br />
          {"Trois fuites t'attendent."}
        </h1>
        <p className="text-base text-text-muted max-w-[540px] tracking-[-0.01em]">
          {"Tu es à 71 % d'accuracy globale. Le module III est en fuite active depuis 4 jours. Re-drillet maintenant pour stopper le saignement."}
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3 mb-14">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded p-5 transition-all duration-200"
            style={{
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
            }}
          >
            <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint mb-3">
              {m.label}
            </div>
            <div className="text-3xl font-semibold leading-none mb-2 tracking-[-0.03em]">
              {m.value}
              {m.unit && <span className="text-lg text-text-faint font-medium">{m.unit}</span>}
            </div>
            <div
              className="text-xs font-mono"
              style={{
                color:
                  m.trendKind === "up"
                    ? "var(--green)"
                    : m.trendKind === "warn"
                    ? "var(--amber)"
                    : "var(--text-muted)",
              }}
            >
              {m.trend}
            </div>
          </div>
        ))}
      </section>

      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-mono uppercase tracking-wider text-text-muted">
          Modules de la formation
        </span>
      </div>

      <section className="flex flex-col gap-2 mb-16">
        {MODULES.map((mod) => {
          const styles = STATUS_STYLES[mod.status];
          const locked = mod.status === "locked";
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
                  background:
                    mod.status === "done"
                      ? "var(--green-glow)"
                      : mod.status === "active"
                      ? "var(--purple-glow)"
                      : mod.status === "leak"
                      ? "var(--amber-glow)"
                      : "var(--surface-strong)",
                  border: `0.5px solid ${
                    mod.status === "done"
                      ? "rgba(74, 222, 128, 0.3)"
                      : mod.status === "active"
                      ? "rgba(167, 139, 250, 0.3)"
                      : mod.status === "leak"
                      ? "rgba(251, 191, 36, 0.3)"
                      : "var(--border-strong)"
                  }`,
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
                      width: `${mod.progress}%`,
                      background:
                        mod.status === "done"
                          ? "linear-gradient(90deg, var(--green), #86EFAC)"
                          : mod.status === "leak"
                          ? "linear-gradient(90deg, var(--amber), #FCD34D)"
                          : "linear-gradient(90deg, var(--purple-500), var(--purple-400))",
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono text-text-faint">
                  {mod.progress > 0 ? `${mod.progress} / 100 sur 30 jours` : "Verrouillé"}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: styles.color }}>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: styles.dot, boxShadow: `0 0 0 3px ${styles.glow}` }}
                />
                {mod.statusLabel}
              </div>
              <div className="text-text-faint text-base">→</div>
            </div>
          );
          return locked ? (
            <div key={mod.slug}>{content}</div>
          ) : (
            <Link key={mod.slug} href={mod.href}>
              {content}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
