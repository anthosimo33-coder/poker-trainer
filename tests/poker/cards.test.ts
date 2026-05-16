import { describe, it, expect } from 'vitest';
import {
  parseCard, parseCards, rankOf, suitOf, valueOf, formatCard,
  fullDeck, shuffledDeck, hasDuplicates
} from '@/lib/poker/cards';

describe('parseCard', () => {
  it('parse correctement des cartes valides', () => {
    expect(parseCard('As')).toBe('As');
    expect(parseCard('Th')).toBe('Th');
    expect(parseCard('2c')).toBe('2c');
  });

  it('normalise la casse', () => {
    expect(parseCard('aS')).toBe('As');
    expect(parseCard('tH')).toBe('Th');
  });

  it('throw sur format invalide', () => {
    expect(() => parseCard('A')).toThrow();
    expect(() => parseCard('Asss')).toThrow();
    expect(() => parseCard('Xs')).toThrow();
    expect(() => parseCard('Az')).toThrow();
    expect(() => parseCard('1s')).toThrow();
  });
});

describe('parseCards', () => {
  it('parse un tableau de chaînes', () => {
    expect(parseCards(['As', 'Kh', '2c'])).toEqual(['As', 'Kh', '2c']);
  });
});

describe('rankOf / suitOf / valueOf', () => {
  it('extrait correctement rank et suit', () => {
    expect(rankOf('As')).toBe('A');
    expect(suitOf('As')).toBe('s');
    expect(rankOf('Th')).toBe('T');
    expect(suitOf('Th')).toBe('h');
  });

  it('retourne les valeurs numériques correctes', () => {
    expect(valueOf('2s')).toBe(2);
    expect(valueOf('Ts')).toBe(10);
    expect(valueOf('Js')).toBe(11);
    expect(valueOf('Qs')).toBe(12);
    expect(valueOf('Ks')).toBe(13);
    expect(valueOf('As')).toBe(14);
  });
});

describe('formatCard', () => {
  it('formate avec symboles unicode', () => {
    expect(formatCard('As')).toBe('A♠');
    expect(formatCard('Th')).toBe('T♥');
    expect(formatCard('Kd')).toBe('K♦');
    expect(formatCard('2c')).toBe('2♣');
  });
});

describe('fullDeck', () => {
  it('génère 52 cartes uniques', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(52);
    expect(hasDuplicates(deck)).toBe(false);
  });

  it('contient toutes les combinaisons rank x suit', () => {
    const deck = fullDeck();
    expect(deck).toContain('As');
    expect(deck).toContain('2c');
    expect(deck).toContain('Th');
    expect(deck).toContain('Kd');
  });
});

describe('shuffledDeck', () => {
  it('retourne 52 cartes uniques sans dead', () => {
    const deck = shuffledDeck();
    expect(deck).toHaveLength(52);
    expect(hasDuplicates(deck)).toBe(false);
  });

  it('exclut les dead cards', () => {
    const dead = ['As', 'Kh', '2c'] as const;
    const deck = shuffledDeck([...dead]);
    expect(deck).toHaveLength(52 - dead.length);
    for (const d of dead) {
      expect(deck).not.toContain(d);
    }
  });

  it('produit des ordres différents (probabilistique)', () => {
    const a = shuffledDeck();
    const b = shuffledDeck();
    // Probabilité de collision = 1/52! ≈ 0
    expect(a).not.toEqual(b);
  });

  it('utilise un RNG déterministe quand fourni', () => {
    const rng = () => 0.5;
    const a = shuffledDeck([], rng);
    const b = shuffledDeck([], rng);
    expect(a).toEqual(b);
  });
});

describe('hasDuplicates', () => {
  it('détecte les doublons', () => {
    expect(hasDuplicates(['As', 'Kh'])).toBe(false);
    expect(hasDuplicates(['As', 'As'])).toBe(true);
  });
});
