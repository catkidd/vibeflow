// FILE: backend/__tests__/mood.test.ts
// Jest unit tests — mood scoring algorithm (from backend/src/routes/mood.ts logic).
// Tests the composite scoring formula: (composite >= 4.0 AND productivity >= 4) → happy/energetic.

import { computeMoodCategory } from '../src/lib/moodScoring';

describe('computeMoodCategory', () => {
  it('returns "happy" for high composite and high productivity', () => {
    const result = computeMoodCategory({ composite: 4.5, productivity: 4 });
    expect(result).toBe('happy');
  });

  it('returns "energetic" for very high composite and max productivity', () => {
    const result = computeMoodCategory({ composite: 5.0, productivity: 5 });
    expect(result).toBe('energetic');
  });

  it('returns "focused" for high composite but moderate productivity', () => {
    const result = computeMoodCategory({ composite: 4.2, productivity: 3 });
    expect(result).toBe('focused');
  });

  it('returns "calm" for moderate composite and low energy', () => {
    const result = computeMoodCategory({ composite: 3.0, productivity: 2, energy: 'low' });
    expect(result).toBe('calm');
  });

  it('returns "sad" for low composite score', () => {
    const result = computeMoodCategory({ composite: 1.5, productivity: 1 });
    expect(result).toBe('sad');
  });

  it('returns "stressed" for low composite with high productivity attempt', () => {
    const result = computeMoodCategory({ composite: 2.0, productivity: 4, energy: 'high' });
    expect(result).toBe('stressed');
  });

  it('defaults to "focused" for borderline mid-range scores', () => {
    const result = computeMoodCategory({ composite: 3.5, productivity: 3 });
    expect(result).toBe('focused');
  });

  it('clamps extreme inputs without throwing', () => {
    expect(() => computeMoodCategory({ composite: 10, productivity: 10 })).not.toThrow();
    expect(() => computeMoodCategory({ composite: -5, productivity: -1 })).not.toThrow();
  });
});
