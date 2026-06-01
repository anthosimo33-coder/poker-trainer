import { describe, it, expect } from "vitest";
import {
  newState,
  nextState,
  DEFAULT_EASINESS_FACTOR,
  MIN_EASINESS_FACTOR,
  type SM2State,
} from "@/lib/sm2/algorithm";

const NOW = 1_700_000_000_000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;

describe("SM-2 newState", () => {
  it("crée un état due immédiatement avec EF 2.5", () => {
    const s = newState("p1");
    expect(s.patternId).toBe("p1");
    expect(s.easinessFactor).toBe(DEFAULT_EASINESS_FACTOR);
    expect(s.interval).toBe(0);
    expect(s.repetition).toBe(0);
    expect(s.nextReviewAt).toBe(0);
  });
});

describe("SM-2 nextState — progression", () => {
  it("Premier succès (quality 5) → interval 1 jour, repetition 1, EF augmente", () => {
    const next = nextState(newState("p1"), 5, NOW);
    expect(next.repetition).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.easinessFactor).toBeGreaterThan(DEFAULT_EASINESS_FACTOR);
    expect(next.nextReviewAt).toBe(NOW + ONE_DAY);
    expect(next.lastReviewedAt).toBe(NOW);
  });

  it("Deuxième succès → interval 6 jours, repetition 2", () => {
    const s1 = nextState(newState("p1"), 5, NOW);
    const s2 = nextState(s1, 5, NOW + ONE_DAY);
    expect(s2.repetition).toBe(2);
    expect(s2.interval).toBe(6);
    expect(s2.nextReviewAt).toBe(NOW + ONE_DAY + 6 * ONE_DAY);
  });

  it("Troisième succès → interval = round(6 × EF) ≈ 15-16 jours", () => {
    const s1 = nextState(newState("p1"), 5, NOW);
    const s2 = nextState(s1, 5, NOW + ONE_DAY);
    const s3 = nextState(s2, 5, NOW + ONE_WEEK);
    expect(s3.repetition).toBe(3);
    expect(s3.interval).toBeGreaterThanOrEqual(14);
    expect(s3.interval).toBeLessThanOrEqual(18);
  });

  it("Quality 3 (correct avec effort) progresse aussi la séquence", () => {
    const s1 = nextState(newState("p1"), 3, NOW);
    expect(s1.repetition).toBe(1);
    expect(s1.interval).toBe(1);
    // EF baisse légèrement à quality 3 (pénalité douce) mais reste > plancher.
    expect(s1.easinessFactor).toBeLessThan(DEFAULT_EASINESS_FACTOR);
    expect(s1.easinessFactor).toBeGreaterThan(MIN_EASINESS_FACTOR);
  });
});

describe("SM-2 nextState — échec & plancher", () => {
  function threeSuccesses(): SM2State {
    let s = nextState(newState("p1"), 5, NOW);
    s = nextState(s, 5, NOW + ONE_DAY);
    s = nextState(s, 5, NOW + ONE_WEEK);
    return s;
  }

  it("Échec (quality < 3) → reset repetition 0, interval 1, EF diminue", () => {
    const s3 = threeSuccesses();
    const failed = nextState(s3, 1, NOW + ONE_MONTH);
    expect(failed.repetition).toBe(0);
    expect(failed.interval).toBe(1);
    expect(failed.easinessFactor).toBeLessThan(s3.easinessFactor);
    expect(failed.nextReviewAt).toBe(NOW + ONE_MONTH + ONE_DAY);
  });

  it("EF ne descend jamais sous 1.3 même après 10 blackouts", () => {
    let state = newState("p1");
    for (let i = 0; i < 10; i++) {
      state = nextState(state, 0, NOW + i * ONE_DAY);
    }
    expect(state.easinessFactor).toBe(MIN_EASINESS_FACTOR);
  });

  it("Une réussite après un échec recommence à interval 1", () => {
    const s3 = threeSuccesses();
    const failed = nextState(s3, 0, NOW + ONE_MONTH);
    const recovered = nextState(failed, 5, NOW + ONE_MONTH + ONE_DAY);
    expect(recovered.repetition).toBe(1);
    expect(recovered.interval).toBe(1);
  });
});
