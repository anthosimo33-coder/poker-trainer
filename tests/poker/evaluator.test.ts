import { describe, it, expect } from 'vitest';
import { evaluateHand, determineWinners } from '@/lib/poker/evaluator';
import type { Card } from '@/lib/poker/cards';

describe('evaluateHand', () => {
  it('détecte une royal flush', () => {
    const hand = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts'] as Card[]);
    expect(hand.category).toBe('Royal Flush');
  });

  it('détecte une straight flush', () => {
    const hand = evaluateHand(['9s', '8s', '7s', '6s', '5s'] as Card[]);
    expect(hand.category).toBe('Straight Flush');
  });

  it('détecte un four of a kind', () => {
    const hand = evaluateHand(['As', 'Ah', 'Ad', 'Ac', 'Ks'] as Card[]);
    expect(hand.category).toBe('Four of a Kind');
  });

  it('détecte un full house', () => {
    const hand = evaluateHand(['As', 'Ah', 'Ad', 'Ks', 'Kh'] as Card[]);
    expect(hand.category).toBe('Full House');
  });

  it('détecte un flush', () => {
    const hand = evaluateHand(['As', 'Ks', '7s', '4s', '2s'] as Card[]);
    expect(hand.category).toBe('Flush');
  });

  it('détecte une straight', () => {
    const hand = evaluateHand(['9s', '8h', '7d', '6c', '5s'] as Card[]);
    expect(hand.category).toBe('Straight');
  });

  it('détecte une straight avec As bas (wheel)', () => {
    const hand = evaluateHand(['As', '2h', '3d', '4c', '5s'] as Card[]);
    expect(hand.category).toBe('Straight');
  });

  it('détecte un trois of a kind', () => {
    const hand = evaluateHand(['As', 'Ah', 'Ad', 'Ks', '2h'] as Card[]);
    expect(hand.category).toBe('Three of a Kind');
  });

  it('détecte une two pair', () => {
    const hand = evaluateHand(['As', 'Ah', 'Ks', 'Kh', '2c'] as Card[]);
    expect(hand.category).toBe('Two Pair');
  });

  it('détecte une pair', () => {
    const hand = evaluateHand(['As', 'Ah', 'Ks', '7h', '2c'] as Card[]);
    expect(hand.category).toBe('Pair');
  });

  it('détecte high card', () => {
    const hand = evaluateHand(['As', 'Kh', '7d', '4c', '2s'] as Card[]);
    expect(hand.category).toBe('High Card');
  });

  it('trouve la meilleure main parmi 7 cartes', () => {
    // 2 hole + 5 board
    const hand = evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '2c', '3d'] as Card[]);
    expect(hand.category).toBe('Royal Flush');
    expect(hand.bestFive).toHaveLength(5);
  });

  it('throw si moins de 5 cartes', () => {
    expect(() => evaluateHand(['As', 'Kh'] as Card[])).toThrow();
  });

  it('throw si plus de 7 cartes', () => {
    expect(() => evaluateHand(['As', 'Ks', 'Qs', 'Js', 'Ts', '2c', '3d', '4d'] as Card[])).toThrow();
  });
});

describe('determineWinners', () => {
  it('identifie le gagnant entre deux mains', () => {
    const aa = evaluateHand(['As', 'Ah', '7d', '4c', '2s'] as Card[]); // paire d'As
    const kk = evaluateHand(['Ks', 'Kh', '7d', '4c', '2s'] as Card[]); // paire de Ks
    const winners = determineWinners([aa, kk]);
    expect(winners).toEqual([0]);
  });

  it('détecte un split pot', () => {
    const a = evaluateHand(['As', 'Kh', 'Qd', 'Jc', 'Ts'] as Card[]); // straight broadway
    const b = evaluateHand(['Ah', 'Kd', 'Qc', 'Js', 'Th'] as Card[]); // même straight broadway
    const winners = determineWinners([a, b]);
    expect(winners).toHaveLength(2);
    expect(winners).toContain(0);
    expect(winners).toContain(1);
  });

  it('flush bat straight', () => {
    const flush = evaluateHand(['As', 'Ks', '7s', '4s', '2s'] as Card[]);
    const straight = evaluateHand(['9s', '8h', '7d', '6c', '5s'] as Card[]);
    const winners = determineWinners([flush, straight]);
    expect(winners).toEqual([0]);
  });
});
