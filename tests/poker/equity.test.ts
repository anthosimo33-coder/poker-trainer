import { describe, it, expect } from "vitest";
import {
  equity,
  equityMonteCarlo,
  equityExactFlop,
  equityExactRiver,
  countOuts,
} from "@/lib/poker/equity";

describe("equityMonteCarlo — matchups préflop connus", () => {
  it("AA vs KK : ~81/19", () => {
    const result = equityMonteCarlo(["As", "Ah"], ["Ks", "Kh"], [], 30_000);
    expect(result.equity).toBeGreaterThan(78);
    expect(result.equity).toBeLessThan(84);
    expect(result.method).toBe("monte-carlo");
  });

  it("AKo vs 22 : quasi coin flip (paire légèrement favorite)", () => {
    const result = equityMonteCarlo(["As", "Kh"], ["2c", "2d"], [], 30_000);
    // Valeur réelle ≈ 46.9 % (vérifiée à 200k). Le spec supposait ~50/50 et
    // bornait >47, mais AK *offsuit* vs 22 favorise légèrement la paire
    // (~47/53). Bornes recentrées sur la vraie valeur + marge Monte Carlo.
    expect(result.equity).toBeGreaterThan(43);
    expect(result.equity).toBeLessThan(52);
  });

  it("AKs vs 72o : ~67/33", () => {
    const result = equityMonteCarlo(["As", "Ks"], ["7h", "2c"], [], 30_000);
    // Valeur réelle ≈ 69.3 % (vérifiée à 200k). Borne haute du spec (<70) trop
    // serrée : 3σ à 30k ≈ ±0.8 → flaky. Élargie à <73 (cf. note spec 8.2).
    expect(result.equity).toBeGreaterThan(64);
    expect(result.equity).toBeLessThan(73);
  });
});

describe("equityExactRiver — calcul déterministe", () => {
  it("Tirage couleur au turn vs paire faite", () => {
    // Hero : As Ks (tirage couleur nuts). Villain : 7d 7h (paire de 7s).
    // Board : Ts 4s Qd 2h (cartes spades possibles pour hero)
    const result = equityExactRiver(
      ["As", "Ks"],
      ["7d", "7h"],
      ["Ts", "4s", "Qd", "2h"]
    );
    expect(result.method).toBe("exact");
    expect(result.equity).toBeGreaterThan(28);
    // Valeur exacte déterministe ≈ 40.9 % (9 spades + overcards + paires Q).
    // La borne <40 du spec était trop serrée pour un calcul exact ; le spec
    // autorise explicitement l'élargissement des bornes (cf. note 8.2).
    expect(result.equity).toBeLessThan(45);
    expect(result.total).toBe(44);
  });
});

describe("equityExactFlop — calcul déterministe", () => {
  it("Tirage couleur au flop vs over-pair", () => {
    // Hero : 9s 8s (tirage couleur). Villain : Kh Kd (over-pair).
    // Board : Ts 5s 2d (9 outs spades + outs quinte mineurs)
    const result = equityExactFlop(
      ["9s", "8s"],
      ["Kh", "Kd"],
      ["Ts", "5s", "2d"]
    );
    expect(result.method).toBe("exact");
    expect(result.equity).toBeGreaterThan(30);
    expect(result.equity).toBeLessThan(45);
    // 45×44/2 = 990 scénarios. Le spec disait 1081 (= C(47,2)) mais ignorait
    // que les 2 cartes du villain sont AUSSI retirées du deck : 52 − 2 − 2 − 3
    // = 45 cartes restantes, donc C(45,2) = 990.
    expect(result.total).toBe(990);
  });
});

describe("equity — dispatch automatique", () => {
  it("board vide → monte-carlo", () => {
    const r = equity(["As", "Ah"], ["Ks", "Kd"], [], 5_000);
    expect(r.method).toBe("monte-carlo");
  });

  it("board 3 cartes → exact flop", () => {
    const r = equity(["As", "Ah"], ["Ks", "Kd"], ["2c", "7d", "8h"]);
    expect(r.method).toBe("exact");
  });

  it("board 4 cartes → exact river", () => {
    const r = equity(["As", "Ah"], ["Ks", "Kd"], ["2c", "7d", "8h", "9s"]);
    expect(r.method).toBe("exact");
    expect(r.total).toBe(44);
  });
});

describe("countOuts — règle des outs", () => {
  it("Tirage couleur au flop (hero derrière) compte ses outs", () => {
    const outs = countOuts(["As", "Ks"], ["7d", "7h"], ["Ts", "4s", "2d"]);
    // 9 spades + 3 As + 3 Ks (overcards) ≈ 15 outs : on est derrière (paire de 7s),
    // on passe devant en touchant couleur ou top paire.
    expect(outs).toBeGreaterThan(8);
    expect(outs).toBeLessThan(20);
  });
});
