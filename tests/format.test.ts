import { describe, it, expect } from "vitest";
import { fmtDuration, fmtDurationCompact, fmtDurationCompactUnit } from "@/lib/format";

describe("fmtDuration", () => {
  it("formate les ms sous 1s", () => {
    expect(fmtDuration(0)).toBe("0 ms");
    expect(fmtDuration(456)).toBe("456 ms");
    expect(fmtDuration(999)).toBe("999 ms");
  });
  it("formate les secondes 1-9.95 avec 1 décimale", () => {
    expect(fmtDuration(1000)).toBe("1.0 s");
    expect(fmtDuration(2456)).toBe("2.5 s");
    expect(fmtDuration(9000)).toBe("9.0 s");
  });
  it("formate les secondes ≥ 10 en entier", () => {
    expect(fmtDuration(9950)).toBe("10 s");
    expect(fmtDuration(15234)).toBe("15 s");
    expect(fmtDuration(60000)).toBe("60 s");
  });
});

describe("fmtDurationCompact / fmtDurationCompactUnit", () => {
  it("retourne la valeur et l'unité séparées", () => {
    expect(fmtDurationCompact(456)).toBe("456");
    expect(fmtDurationCompactUnit(456)).toBe("ms");
    expect(fmtDurationCompact(2400)).toBe("2.4");
    expect(fmtDurationCompactUnit(2400)).toBe("s");
  });
});
