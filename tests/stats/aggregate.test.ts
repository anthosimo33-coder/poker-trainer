import { describe, it, expect } from "vitest";
import {
  accuracyBySubmodule,
  accuracyOverTime,
  biasHistogram,
  biasStats,
  calibrationSeries,
  computeStreakDays,
  globalKpis,
  nashTendency,
  sm2Forecast,
  type AttemptLite,
} from "@/lib/stats/aggregate";

function eq(slug: string, predicted: string, actual: number): AttemptLite {
  const field = slug === "m2.1" ? "equityInput" : "equityHu";
  const exp = slug === "m2.1" ? { equityApprox: actual } : { equity: actual };
  return {
    submoduleSlug: slug,
    userAnswer: { [field]: predicted },
    expected: exp,
    isCorrect: true,
    attemptedAt: 0,
  };
}

describe("calibrationSeries — binning par décile et par sous-module", () => {
  it("bin les estimés en déciles et calcule meanPredicted/meanActual", () => {
    const attempts: AttemptLite[] = [
      eq("m2.2", "30", 33), // bin 3
      eq("m2.2", "38", 35), // bin 3
      eq("m2.2", "50", 48), // bin 5
    ];
    const series = calibrationSeries(attempts, "equity_winrate");
    expect(series).toHaveLength(1);
    expect(series[0].submoduleSlug).toBe("m2.2");
    expect(series[0].count).toBe(3);

    const bin3 = series[0].bins.find((b) => b.bin === 3)!;
    expect(bin3.count).toBe(2);
    expect(bin3.meanPredicted).toBe(34); // (30+38)/2
    expect(bin3.meanActual).toBe(34); // (33+35)/2

    const bin5 = series[0].bins.find((b) => b.bin === 5)!;
    expect(bin5.count).toBe(1);
    expect(bin5.meanPredicted).toBe(50);
    expect(bin5.meanActual).toBe(48);
  });

  it("sépare les séries par sous-module", () => {
    const series = calibrationSeries(
      [eq("m2.2", "40", 40), eq("m2.1", "20", 22)],
      "equity_winrate"
    );
    expect(series.map((s) => s.submoduleSlug).sort()).toEqual(["m2.1", "m2.2"]);
  });

  it("clamp un estimé de 100 % dans le dernier décile (bin 9)", () => {
    const series = calibrationSeries([eq("m2.2", "100", 95)], "equity_winrate");
    expect(series[0].bins[0].bin).toBe(9);
  });

  it("ignore les attempts d'un autre kind", () => {
    const series = calibrationSeries(
      [{ submoduleSlug: "m3.1", isCorrect: true, attemptedAt: 0, signedError: 1 }],
      "equity_winrate"
    );
    expect(series).toEqual([]);
  });
});

describe("biasHistogram", () => {
  it("set vide → mean/median/count à 0", () => {
    const h = biasHistogram([]);
    expect(h).toEqual({ bins: [], mean: 0, median: 0, count: 0, min: 0, max: 0 });
  });

  it("mean/median/min/max corrects ; somme des bins = count", () => {
    const h = biasHistogram([1, 2, 3, 4]);
    expect(h.mean).toBe(2.5);
    expect(h.median).toBe(2.5);
    expect(h.min).toBe(1);
    expect(h.max).toBe(4);
    expect(h.count).toBe(4);
    expect(h.bins.reduce((s, b) => s + b.count, 0)).toBe(4);
  });

  it("histogramme symétrique centré sur 0", () => {
    const h = biasHistogram([-3, -1, 0, 1, 3], 5);
    expect(h.mean).toBe(0);
    expect(h.median).toBe(0);
    expect(h.count).toBe(5);
    // bin central (index 2) contient le 0
    expect(h.bins[2].count).toBe(1);
    expect(h.bins.reduce((s, b) => s + b.count, 0)).toBe(5);
  });

  it("médiane d'un set impair", () => {
    expect(biasHistogram([1, 5, 2]).median).toBe(2);
  });
});

describe("biasStats — extraction + histogramme par kind", () => {
  it("ev_bb : agrège les signedError, ignore les autres kinds", () => {
    const attempts: AttemptLite[] = [
      { submoduleSlug: "m3.1", isCorrect: false, attemptedAt: 0, signedError: 1 },
      { submoduleSlug: "m3.3", isCorrect: false, attemptedAt: 0, signedError: -1 },
      { submoduleSlug: "m3.3", isCorrect: true, attemptedAt: 0, signedError: 0.5 },
      // exclus : kind différent
      { submoduleSlug: "m2.2", isCorrect: true, attemptedAt: 0, signedError: 9 },
    ];
    const h = biasStats(attempts, "ev_bb");
    expect(h.count).toBe(3);
    expect(h.median).toBe(0.5); // sorted [-1, 0.5, 1]
    expect(h.mean).toBe(0.167); // (1 - 1 + 0.5)/3
  });
});

describe("nashTendency — over/correct/under par stack", () => {
  const m5 = (stack: number, se: number): AttemptLite => ({
    submoduleSlug: "m5.1",
    spotSnapshot: { heroStack: stack },
    isCorrect: se === 0,
    attemptedAt: 0,
    signedError: se,
  });

  it("compte over/correct/under et calcule les %", () => {
    const t = nashTendency([
      m5(10, 1),
      m5(10, 1),
      m5(10, 0),
      m5(10, -1),
      m5(15, 1),
    ]);
    expect(t).toHaveLength(2);
    const s10 = t.find((x) => x.stack === 10)!;
    expect(s10).toMatchObject({ over: 2, correct: 1, under: 1, total: 4 });
    expect(s10.overPct).toBe(50);
    expect(s10.correctPct).toBe(25);
    expect(s10.underPct).toBe(25);
    const s15 = t.find((x) => x.stack === 15)!;
    expect(s15.overPct).toBe(100);
  });

  it("trie par stack croissant", () => {
    const t = nashTendency([m5(15, 0), m5(5, 0), m5(10, 0)]);
    expect(t.map((x) => x.stack)).toEqual([5, 10, 15]);
  });

  it("ignore non-M5, signedError absent ou heroStack absent", () => {
    const t = nashTendency([
      { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: 0 },
      { submoduleSlug: "m5.1", isCorrect: true, attemptedAt: 0 }, // pas de signedError
      { submoduleSlug: "m5.1", isCorrect: true, attemptedAt: 0, signedError: 0 }, // pas de heroStack
    ]);
    expect(t).toEqual([]);
  });
});

describe("accuracyBySubmodule", () => {
  it("calcule l'accuracy par sous-module et inclut les vides à 0", () => {
    const attempts: AttemptLite[] = [
      { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: 0 },
      { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: 0 },
      { submoduleSlug: "m1.1", isCorrect: false, attemptedAt: 0 },
      { submoduleSlug: "m2.2", isCorrect: true, attemptedAt: 0 },
      { submoduleSlug: "m2.2", isCorrect: false, attemptedAt: 0 },
    ];
    const res = accuracyBySubmodule(attempts, ["m1.1", "m2.2", "m3.1"]);
    expect(res).toEqual([
      { submoduleSlug: "m1.1", total: 3, correct: 2, accuracy: 66.7 },
      { submoduleSlug: "m2.2", total: 2, correct: 1, accuracy: 50 },
      { submoduleSlug: "m3.1", total: 0, correct: 0, accuracy: 0 },
    ]);
  });
});

describe("accuracyOverTime", () => {
  it("agrège par jour UTC, trié chronologiquement", () => {
    const d1 = Date.UTC(2026, 5, 1, 12);
    const d2 = Date.UTC(2026, 5, 2, 9);
    const res = accuracyOverTime([
      { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: d1 },
      { submoduleSlug: "m1.1", isCorrect: false, attemptedAt: d1 },
      { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: d2 },
    ]);
    expect(res).toEqual([
      { date: "2026-06-01", total: 2, correct: 1, accuracy: 50 },
      { date: "2026-06-02", total: 1, correct: 1, accuracy: 100 },
    ]);
  });
});

describe("computeStreakDays", () => {
  const now = Date.UTC(2026, 5, 3, 12); // 2026-06-03

  it("jours consécutifs depuis aujourd'hui", () => {
    expect(
      computeStreakDays(["2026-06-03", "2026-06-02", "2026-06-01"], now)
    ).toBe(3);
  });
  it("streak depuis hier (tolérance)", () => {
    expect(computeStreakDays(["2026-06-02"], now)).toBe(1);
  });
  it("0 si le dernier jour est trop ancien", () => {
    expect(computeStreakDays(["2026-06-01"], now)).toBe(0);
  });
  it("0 si aucune date", () => {
    expect(computeStreakDays([], now)).toBe(0);
  });
  it("ignore les doublons de jour", () => {
    expect(
      computeStreakDays(["2026-06-03", "2026-06-03", "2026-06-02"], now)
    ).toBe(2);
  });
});

describe("globalKpis", () => {
  it("accuracy, volume, leaks ; 0 si aucun attempt", () => {
    expect(globalKpis([], 0, Date.UTC(2026, 5, 3))).toEqual({
      totalAttempts: 0,
      accuracy: 0,
      currentStreakDays: 0,
      activeLeaks: 0,
    });
  });
  it("calcule accuracy et reprend le nombre de leaks", () => {
    const now = Date.UTC(2026, 5, 3, 12);
    const day = Date.UTC(2026, 5, 3, 10);
    const k = globalKpis(
      [
        { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: day },
        { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: day },
        { submoduleSlug: "m1.1", isCorrect: true, attemptedAt: day },
        { submoduleSlug: "m1.1", isCorrect: false, attemptedAt: day },
      ],
      2,
      now
    );
    expect(k.totalAttempts).toBe(4);
    expect(k.accuracy).toBe(75);
    expect(k.activeLeaks).toBe(2);
    expect(k.currentStreakDays).toBe(1);
  });
});

describe("sm2Forecast", () => {
  const now = Date.UTC(2026, 5, 3, 12);
  const DAY = 86_400_000;

  it("compte due aujourd'hui / cette semaine / total + EF moyen", () => {
    const f = sm2Forecast(
      [
        { nextReviewAt: now - DAY, easinessFactor: 2.5 }, // overdue → today + week
        { nextReviewAt: now + 2 * DAY, easinessFactor: 2.0 }, // cette semaine
        { nextReviewAt: now + 10 * DAY, easinessFactor: 1.8 }, // ni l'un ni l'autre
      ],
      now
    );
    expect(f.dueToday).toBe(1);
    expect(f.dueThisWeek).toBe(2);
    expect(f.total).toBe(3);
    expect(f.avgEaseFactor).toBe(2.1); // (2.5+2.0+1.8)/3
  });

  it("set vide → tout à 0", () => {
    expect(sm2Forecast([], now)).toEqual({
      dueToday: 0,
      dueThisWeek: 0,
      total: 0,
      avgEaseFactor: 0,
    });
  });
});
