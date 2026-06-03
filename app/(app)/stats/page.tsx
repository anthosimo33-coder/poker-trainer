"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { StatSection } from "@/components/stats/shared";
import { CalibrationChart } from "@/components/stats/CalibrationChart";
import { BiasHistogram } from "@/components/stats/BiasHistogram";
import { NashTendencyBars } from "@/components/stats/NashTendencyBars";
import { SubmoduleAccuracyBars } from "@/components/stats/SubmoduleAccuracyBars";
import { AccuracyOverTime } from "@/components/stats/AccuracyOverTime";
import { Sm2ForecastCard } from "@/components/stats/Sm2ForecastCard";

function MetricCard({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded p-5"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
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

export default function StatsPage() {
  const { userId } = useCurrentUser();
  // `now` figé au montage : une query Convex ne peut pas Date.now() ; un arg
  // stable évite les refetch en boucle (cf. listDuePatterns côté drill).
  const [now] = useState(() => Date.now());
  const kpis = useQuery(api.stats.globalKpis, userId ? { userId, now } : "skip");

  return (
    <main className="max-w-[1000px] mx-auto px-8 pt-12 pb-24">
      <header className="mb-9" style={{ animation: "fadeUp 400ms var(--ease-out)" }}>
        <div className="flex items-center gap-2.5 text-[13px] font-mono text-text-muted mb-3.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "var(--purple-400)",
              boxShadow: "0 0 0 3px var(--purple-glow)",
            }}
          />
          Tableau de bord
        </div>
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] mb-3 bg-gradient-text">
          Stats &amp; calibration.
        </h1>
        <p className="text-[15px] text-text-muted max-w-[560px] leading-[1.65]">
          Où ton estimation dérive du réel, et où corriger. Les graphes parlent —
          la diagonale et le zéro sont tes repères.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-3 mb-12">
        <MetricCard
          label="Accuracy globale"
          value={kpis ? Math.round(kpis.accuracy).toString() : "—"}
          unit="%"
        />
        <MetricCard label="Spots drillés" value={kpis?.totalAttempts?.toString() ?? "0"} />
        <MetricCard
          label="Streak"
          value={kpis?.currentStreakDays?.toString() ?? "0"}
          unit="j"
        />
        <MetricCard
          label="Fuites actives"
          value={kpis ? kpis.activeLeaks.toString() : "—"}
          hint={kpis && kpis.activeLeaks > 0 ? "Voir Mes leaks →" : undefined}
        />
      </section>

      <StatSection
        eyebrow="Calibration"
        title="Équité — estimé vs réel"
        subtitle="Chaque bulle = un décile d'estimation (M2.1–M2.4). Plus c'est proche de la diagonale, mieux tu es calibré."
      >
        <CalibrationChart userId={userId} kind="equity_winrate" />
      </StatSection>

      <StatSection
        eyebrow="Calibration"
        title="Équité ICM — estimé vs réel"
        subtitle="Ton équité ICM annoncée (M4.1 calcul ICM + M4.4 table finale) face à la vraie valeur Malmuth-Harville."
      >
        <CalibrationChart userId={userId} kind="icm_equity" />
      </StatSection>

      <StatSection
        eyebrow="Biais d'estimation"
        title="EV en bb (M·III)"
        subtitle="Distribution de ton erreur signée d'EV (push/fold, multi-branches, check-raise). Centré sur 0 = pas de biais."
      >
        <BiasHistogram userId={userId} kind="ev_bb" />
      </StatSection>

      <StatSection
        eyebrow="Biais d'estimation"
        title="Bubble factor (M·IV)"
        subtitle="Erreur signée sur le bubble factor (M4.2 déduit de ton eq_ICM, M4.3 saisi directement). Échelle ratio, pas %."
      >
        <BiasHistogram userId={userId} kind="bubble_factor" />
      </StatSection>

      <StatSection
        eyebrow="Tendance"
        title="Push / fold par stack (M·V)"
        subtitle="Pour chaque profondeur de stack : joues-tu trop large, correct, ou trop serré vs Nash ?"
      >
        <NashTendencyBars userId={userId} />
      </StatSection>

      <StatSection
        eyebrow="Précision"
        title="Accuracy par sous-module"
        subtitle="Les 20 sous-modules. Vert ≥ 85 % · ambre 70–85 % · rouge < 70 %. Cible tes rouges."
      >
        <SubmoduleAccuracyBars userId={userId} />
      </StatSection>

      <StatSection
        eyebrow="Progression"
        title="Accuracy dans le temps"
        subtitle="Ton accuracy agrégée par jour. La tendance compte plus qu'un point isolé."
      >
        <AccuracyOverTime userId={userId} />
      </StatSection>

      <StatSection
        eyebrow="Révisions"
        title="À venir (SM-2)"
        subtitle="Le moteur de répétition espacée planifie tes révisions. EF élevé = pattern maîtrisé, espacement long."
      >
        <Sm2ForecastCard userId={userId} now={now} />
      </StatSection>
    </main>
  );
}
