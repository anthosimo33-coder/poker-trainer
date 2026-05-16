/**
 * Formate une durée en millisecondes en chaîne lisible.
 * - < 1000ms → "780 ms"
 * - 1-9.95s → "2.4 s" (1 décimale)
 * - ≥ 10s   → "15 s" (entier)
 */
export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 9950) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 1000)} s`;
}

/**
 * Format court pour les statistiques compactes (ScoreStat dans le drill).
 */
export function fmtDurationCompact(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}`;
  if (ms < 9950) return `${(ms / 1000).toFixed(1)}`;
  return `${Math.round(ms / 1000)}`;
}

export function fmtDurationCompactUnit(ms: number): string {
  return ms < 1000 ? "ms" : "s";
}
