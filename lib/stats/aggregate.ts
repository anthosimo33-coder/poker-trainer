/**
 * S11 — Agrégation stats : fonctions PURES (binning calibration, histogramme de
 * biais, tendance Nash, accuracy, prévision SM-2). Testées unitairement et
 * appelées par les queries Convex (`convex/stats.ts`).
 */
import {
  biasValue,
  calibrationPair,
  estimationKind,
  SUBMODULES_BY_KIND,
  type EstimationKind,
} from "./estimation";

/** Vue minimale d'un attempt pour l'agrégation (sous-ensemble de spotAttempts). */
export interface AttemptLite {
  submoduleSlug: string;
  userAnswer?: unknown;
  expected?: unknown;
  spotSnapshot?: unknown;
  signedError?: number;
  isCorrect: boolean;
  attemptedAt: number;
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ============================ Calibration ============================

export interface CalibrationBin {
  /** Index de décile 0..9. */
  bin: number;
  binLabel: string;
  meanPredicted: number;
  meanActual: number;
  count: number;
}

export interface CalibrationSeries {
  submoduleSlug: string;
  bins: CalibrationBin[];
  count: number;
}

const DECILE_LABELS = [
  "0–10",
  "10–20",
  "20–30",
  "30–40",
  "40–50",
  "50–60",
  "60–70",
  "70–80",
  "80–90",
  "90–100",
];

function decileIndex(predicted: number): number {
  const i = Math.floor(predicted / 10);
  if (i < 0) return 0;
  if (i > 9) return 9;
  return i;
}

/**
 * Une série de points de calibration par sous-module du `kind`. Pour chaque
 * sous-module, l'estimé est binné en déciles ; chaque bin non vide donne un point
 * (meanPredicted, meanActual). Interprétation : point au-dessus de la diagonale
 * y=x = sous-estimation ; en-dessous = surestimation.
 */
export function calibrationSeries(
  attempts: AttemptLite[],
  kind: Extract<EstimationKind, "equity_winrate" | "icm_equity">
): CalibrationSeries[] {
  const bySubmodule = new Map<string, { predicted: number[]; actual: number[] }[]>();
  // init buckets par sous-module (10 déciles)
  const ensure = (slug: string) => {
    let b = bySubmodule.get(slug);
    if (!b) {
      b = Array.from({ length: 10 }, () => ({ predicted: [], actual: [] }));
      bySubmodule.set(slug, b);
    }
    return b;
  };

  for (const a of attempts) {
    if (estimationKind(a.submoduleSlug) !== kind) continue;
    const pair = calibrationPair(
      a.submoduleSlug,
      a.userAnswer as Record<string, unknown> | undefined,
      a.expected as Record<string, unknown> | undefined
    );
    if (!pair) continue;
    const buckets = ensure(a.submoduleSlug);
    const idx = decileIndex(pair.predicted);
    buckets[idx].predicted.push(pair.predicted);
    buckets[idx].actual.push(pair.actual);
  }

  const result: CalibrationSeries[] = [];
  for (const slug of SUBMODULES_BY_KIND[kind]) {
    const buckets = bySubmodule.get(slug);
    if (!buckets) continue;
    const bins: CalibrationBin[] = [];
    let count = 0;
    buckets.forEach((bucket, bin) => {
      if (bucket.predicted.length === 0) return;
      count += bucket.predicted.length;
      bins.push({
        bin,
        binLabel: DECILE_LABELS[bin],
        meanPredicted: round(mean(bucket.predicted), 1),
        meanActual: round(mean(bucket.actual), 1),
        count: bucket.predicted.length,
      });
    });
    if (bins.length > 0) result.push({ submoduleSlug: slug, bins, count });
  }
  return result;
}

// ============================ Biais (histogramme) ============================

export interface HistogramBin {
  binStart: number;
  binEnd: number;
  center: number;
  count: number;
}

export interface BiasDistribution {
  bins: HistogramBin[];
  mean: number;
  median: number;
  count: number;
  min: number;
  max: number;
}

/**
 * Histogramme symétrique autour de 0 (nBins impair → un bin centré sur 0) + mean
 * + median. `min`/`max` bornent la plage observée.
 */
export function biasHistogram(values: number[], nBins = 13): BiasDistribution {
  const count = values.length;
  if (count === 0) {
    return { bins: [], mean: 0, median: 0, count: 0, min: 0, max: 0 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Rayon symétrique : la plus grande amplitude observée (plancher pour éviter /0).
  const R = Math.max(Math.abs(min), Math.abs(max), 1e-6);
  const width = (2 * R) / nBins;
  const bins: HistogramBin[] = Array.from({ length: nBins }, (_, i) => {
    const binStart = round(-R + i * width, 3);
    const binEnd = round(-R + (i + 1) * width, 3);
    return { binStart, binEnd, center: round((binStart + binEnd) / 2, 3), count: 0 };
  });
  for (const v of values) {
    let idx = Math.floor((v + R) / width);
    if (idx < 0) idx = 0;
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].count++;
  }
  return {
    bins,
    mean: round(mean(values), 3),
    median: round(median(values), 3),
    count,
    min: round(min, 3),
    max: round(max, 3),
  };
}

/** Extrait les biais signés du `kind` puis renvoie l'histogramme. */
export function biasStats(
  attempts: AttemptLite[],
  kind: Extract<EstimationKind, "ev_bb" | "bubble_factor">,
  nBins = 13
): BiasDistribution {
  const values: number[] = [];
  for (const a of attempts) {
    if (estimationKind(a.submoduleSlug) !== kind) continue;
    const v = biasValue(
      a.submoduleSlug,
      a.userAnswer as Record<string, unknown> | undefined,
      a.expected as Record<string, unknown> | undefined,
      a.signedError
    );
    if (v !== null) values.push(v);
  }
  return biasHistogram(values, nBins);
}

// ============================ Tendance Nash ============================

export interface NashStackTendency {
  stack: number;
  over: number; // signedError > 0 : trop large (joue quand Nash dit fold)
  correct: number;
  under: number; // signedError < 0 : trop serré (fold quand Nash dit jouer)
  total: number;
  overPct: number;
  correctPct: number;
  underPct: number;
}

function heroStackOf(spotSnapshot: unknown): number | null {
  if (spotSnapshot && typeof spotSnapshot === "object" && "heroStack" in spotSnapshot) {
    const s = (spotSnapshot as { heroStack: unknown }).heroStack;
    if (typeof s === "number" && Number.isFinite(s)) return s;
  }
  return null;
}

/**
 * Tendance push/fold par stack depth sur les sous-modules M5.x (binaires). Axe
 * unifié : `over` = trop large (sur-push / sur-call), `under` = trop serré.
 * N'utilise que les attempts avec `signedError` (∈ {+1, 0, −1}) et un heroStack.
 */
export function nashTendency(attempts: AttemptLite[]): NashStackTendency[] {
  const byStack = new Map<number, { over: number; correct: number; under: number }>();
  for (const a of attempts) {
    if (!a.submoduleSlug.startsWith("m5")) continue;
    if (typeof a.signedError !== "number") continue;
    const stack = heroStackOf(a.spotSnapshot);
    if (stack === null) continue;
    let cell = byStack.get(stack);
    if (!cell) {
      cell = { over: 0, correct: 0, under: 0 };
      byStack.set(stack, cell);
    }
    if (a.signedError > 0) cell.over++;
    else if (a.signedError < 0) cell.under++;
    else cell.correct++;
  }
  return Array.from(byStack.entries())
    .sort((x, y) => x[0] - y[0])
    .map(([stack, c]) => {
      const total = c.over + c.correct + c.under;
      return {
        stack,
        over: c.over,
        correct: c.correct,
        under: c.under,
        total,
        overPct: total ? round((c.over / total) * 100, 1) : 0,
        correctPct: total ? round((c.correct / total) * 100, 1) : 0,
        underPct: total ? round((c.under / total) * 100, 1) : 0,
      };
    });
}

// ============================ Accuracy par sous-module ============================

export interface SubmoduleAccuracy {
  submoduleSlug: string;
  total: number;
  correct: number;
  accuracy: number; // 0-100 ; 0 si aucun attempt
}

export function accuracyBySubmodule(
  attempts: AttemptLite[],
  allSlugs: string[]
): SubmoduleAccuracy[] {
  const tally = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    let cell = tally.get(a.submoduleSlug);
    if (!cell) {
      cell = { total: 0, correct: 0 };
      tally.set(a.submoduleSlug, cell);
    }
    cell.total++;
    if (a.isCorrect) cell.correct++;
  }
  return allSlugs.map((slug) => {
    const cell = tally.get(slug) ?? { total: 0, correct: 0 };
    return {
      submoduleSlug: slug,
      total: cell.total,
      correct: cell.correct,
      accuracy: cell.total ? round((cell.correct / cell.total) * 100, 1) : 0,
    };
  });
}

// ============================ Accuracy dans le temps ============================

export interface DailyAccuracy {
  date: string; // YYYY-MM-DD (UTC)
  total: number;
  correct: number;
  accuracy: number;
}

function utcDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function accuracyOverTime(attempts: AttemptLite[]): DailyAccuracy[] {
  const byDay = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const day = utcDate(a.attemptedAt);
    let cell = byDay.get(day);
    if (!cell) {
      cell = { total: 0, correct: 0 };
      byDay.set(day, cell);
    }
    cell.total++;
    if (a.isCorrect) cell.correct++;
  }
  return Array.from(byDay.entries())
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([date, c]) => ({
      date,
      total: c.total,
      correct: c.correct,
      accuracy: round((c.correct / c.total) * 100, 1),
    }));
}

// ============================ Streak + KPIs globaux ============================

/** Jours consécutifs (UTC) avec ≥ 1 attempt, en partant d'aujourd'hui/hier. */
export function computeStreakDays(attemptDates: string[], now: number): number {
  if (attemptDates.length === 0) return 0;
  const days = Array.from(new Set(attemptDates)).sort().reverse();
  const today = utcDate(now);
  const yesterday = utcDate(now - 86_400_000);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 0;
  let cursor = new Date(days[0] + "T00:00:00.000Z").getTime();
  for (const d of days) {
    if (d === utcDate(cursor)) {
      streak++;
      cursor -= 86_400_000;
    } else {
      break;
    }
  }
  return streak;
}

export interface GlobalKpis {
  totalAttempts: number;
  accuracy: number;
  currentStreakDays: number;
  activeLeaks: number;
}

export function globalKpis(
  attempts: AttemptLite[],
  activeLeaks: number,
  now: number
): GlobalKpis {
  if (attempts.length === 0) {
    return { totalAttempts: 0, accuracy: 0, currentStreakDays: 0, activeLeaks };
  }
  const correct = attempts.filter((a) => a.isCorrect).length;
  return {
    totalAttempts: attempts.length,
    accuracy: round((correct / attempts.length) * 100, 1),
    currentStreakDays: computeStreakDays(
      attempts.map((a) => utcDate(a.attemptedAt)),
      now
    ),
    activeLeaks,
  };
}

// ============================ Prévision SM-2 ============================

export interface Sm2ForecastResult {
  dueToday: number;
  dueThisWeek: number;
  total: number;
  avgEaseFactor: number;
}

function endOfUtcDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23,
    59,
    59,
    999
  );
}

export function sm2Forecast(
  progress: { nextReviewAt: number; easinessFactor: number }[],
  now: number
): Sm2ForecastResult {
  const endToday = endOfUtcDay(now);
  const endWeek = now + 7 * 86_400_000;
  let dueToday = 0;
  let dueThisWeek = 0;
  for (const p of progress) {
    if (p.nextReviewAt <= endToday) dueToday++;
    if (p.nextReviewAt <= endWeek) dueThisWeek++;
  }
  return {
    dueToday,
    dueThisWeek,
    total: progress.length,
    avgEaseFactor: progress.length
      ? round(mean(progress.map((p) => p.easinessFactor)), 2)
      : 0,
  };
}
