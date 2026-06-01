import { describe, it, expect } from "vitest";
import { classifyHand, type HandClass } from "@/lib/poker/hand-classifier";
import type { Card } from "@/lib/poker/cards";

function expectClass(a: Card, b: Card, cls: HandClass) {
  expect(classifyHand([a, b])).toBe(cls);
}

describe("classifyHand", () => {
  it("paires premium (QQ+)", () => {
    expectClass("As", "Ah", "premium-pair");
    expectClass("Qs", "Qd", "premium-pair");
    expectClass("Ks", "Kc", "premium-pair");
  });

  it("paires moyennes (88-JJ)", () => {
    expectClass("8s", "8h", "mid-pair");
    expectClass("Js", "Jd", "mid-pair");
  });

  it("petites paires (22-77)", () => {
    expectClass("2s", "2h", "small-pair");
    expectClass("7s", "7d", "small-pair");
  });

  it("premium broadway (AK, AQ) — suited et offsuit", () => {
    expectClass("As", "Kh", "premium-broadway");
    expectClass("As", "Ks", "premium-broadway");
    expectClass("As", "Qs", "premium-broadway");
    expectClass("Ad", "Qh", "premium-broadway");
  });

  it("Ax suités (A2s-AJs)", () => {
    expectClass("As", "5s", "ax-suited");
    expectClass("As", "Ts", "ax-suited");
    expectClass("As", "Js", "ax-suited");
  });

  it("Ax offsuit petit (A2o-A8o)", () => {
    expectClass("Ah", "5d", "ax-offsuit-small");
    expectClass("As", "8h", "ax-offsuit-small");
    expectClass("As", "2h", "ax-offsuit-small");
  });

  it("Ax offsuit moyen (A9o-AJo)", () => {
    expectClass("As", "9h", "ax-offsuit-mid");
    expectClass("As", "Th", "ax-offsuit-mid");
    expectClass("As", "Jh", "ax-offsuit-mid");
  });

  it("Kx suités (K2s-KQs)", () => {
    expectClass("Ks", "2s", "kx-suited");
    expectClass("Ks", "Qs", "kx-suited");
  });

  it("Kx offsuit (K2o-KQo)", () => {
    expectClass("Ks", "2h", "kx-offsuit");
    expectClass("Ks", "Qh", "kx-offsuit");
  });

  it("broadway suités (QJs, QTs, JTs)", () => {
    expectClass("Qs", "Js", "broadway-suited");
    expectClass("Js", "Ts", "broadway-suited");
    expectClass("Qs", "Ts", "broadway-suited");
  });

  it("broadway offsuit (QJo, JTo)", () => {
    expectClass("Qs", "Jh", "broadway-offsuit");
    expectClass("Js", "Th", "broadway-offsuit");
  });

  it("connecteurs suités (T9s, 98s)", () => {
    expectClass("Ts", "9s", "suited-connector");
    expectClass("9s", "8s", "suited-connector");
  });

  it("gappers suités (J9s, 97s)", () => {
    expectClass("Js", "9s", "suited-gapper");
    expectClass("9s", "7s", "suited-gapper");
  });

  it("trash (offsuit déconnecté, suited grand gap)", () => {
    expectClass("7s", "2h", "trash");
    expectClass("Ts", "5h", "trash");
    expectClass("9s", "2s", "trash"); // suited mais gap 7
    expectClass("Js", "8h", "trash"); // J8o
  });
});
