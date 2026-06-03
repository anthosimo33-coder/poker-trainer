"use client";

import type { ReactNode } from "react";

/**
 * Palette en valeurs littérales (les SVG recharts résolvent mal les CSS vars) —
 * reprend exactement le design system du trainer (cf. globals.css).
 */
export const C = {
  bg: "#0A0D0C",
  bgElevated: "#0E1310",
  surface: "rgba(255,255,255,0.025)",
  border: "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.12)",
  text: "#F4F4F5",
  textMuted: "rgba(244,244,245,0.6)",
  textFaint: "rgba(244,244,245,0.4)",
  purple: "#A78BFA",
  purple300: "#C4B5FD",
  purple500: "#8B5CF6",
  green: "#4ADE80",
  amber: "#FBBF24",
  red: "#F87171",
  cyan: "#22D3EE",
  pink: "#F472B6",
  blue: "#60A5FA",
} as const;

/** Couleurs de séries (par sous-module) — distinctes, cohérentes avec le thème. */
export const SERIES_COLORS = [C.purple, C.cyan, C.pink, C.amber, C.green, C.blue];

export const FONT_MONO =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace";

/** Conteneur de section : eyebrow mono + titre + sous-titre + contenu. */
export function StatSection({
  eyebrow,
  title,
  subtitle,
  children,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section
      className="rounded-xl p-6 mb-5"
      style={{ background: "var(--surface)", border: "0.5px solid var(--border)" }}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          {eyebrow && (
            <div
              className="text-[11px] font-mono uppercase tracking-[0.08em] mb-1.5"
              style={{ color: "var(--purple-300)" }}
            >
              {eyebrow}
            </div>
          )}
          <h2 className="text-[18px] font-semibold tracking-[-0.02em]">{title}</h2>
        </div>
        {right}
      </div>
      {subtitle && (
        <div className="text-[13px] text-text-muted leading-[1.6] mb-5 max-w-[640px]">
          {subtitle}
        </div>
      )}
      {children}
    </section>
  );
}

/** État vide standard d'une section graphe. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center text-center rounded-lg px-6 py-12 text-[13px] text-text-faint"
      style={{ background: "rgba(255,255,255,0.015)", border: "0.5px dashed var(--border-strong)" }}
    >
      {message}
    </div>
  );
}

/** État de chargement standard. */
export function LoadingState() {
  return (
    <div className="flex items-center justify-center px-6 py-12 text-[13px] text-text-faint">
      Chargement…
    </div>
  );
}

/** Tooltip recharts personnalisé (fond élevé, bordure, mono). */
export function ChartTooltip({
  active,
  payload,
  rows,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  rows: (data: Record<string, unknown>) => { label: string; value: string }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-[12px]"
      style={{
        background: "var(--bg-elevated)",
        border: "0.5px solid var(--border-strong)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        fontFamily: FONT_MONO,
      }}
    >
      {rows(data).map((r, i) => (
        <div key={i} className="flex gap-3 justify-between">
          <span style={{ color: "var(--text-faint)" }}>{r.label}</span>
          <span style={{ color: "var(--text)" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Couleur d'accuracy : ≥85 vert · 70-85 amber · <70 rouge. */
export function accuracyColor(accuracy: number): string {
  if (accuracy >= 85) return C.green;
  if (accuracy >= 70) return C.amber;
  return C.red;
}

/** Libellé court d'un sous-module (ex. m2.1 → « M2.1 »). */
export function submoduleLabel(slug: string): string {
  return slug.toUpperCase();
}
