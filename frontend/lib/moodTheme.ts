// FILE: frontend/lib/moodTheme.ts
// Single source of truth for ALL mood colors, gradients, and glow strings.
// RULE: No hardcoded hex values in any component — always import from here.

/** All valid mood category identifiers */
export type MoodCategory =
  | 'happy'
  | 'energetic'
  | 'calm'
  | 'stressed'
  | 'sad'
  | 'focused';

/** Full theme token set for a single mood */
export interface MoodThemeToken {
  /** Primary hex color for this mood */
  color: string;
  /** 10% opacity variant for background bleed radial gradient inner stop */
  color10: string;
  /** 20% opacity variant for gradient fills and overlays */
  color20: string;
  /** 40% opacity variant for glassmorphism borders */
  color40: string;
  /** Complementary color for gradient mesh second orb */
  complementary: string;
  /** Full neon glow box-shadow string — use on PiP player, badges, streaks */
  glowShadow: string;
  /** Subtle glow box-shadow string — use on card borders, journal textarea */
  subtleGlow: string;
  /** Strong glow box-shadow string — use on Pomodoro ring at session start */
  strongGlow: string;
  /** Radial gradient for background bleed (FocusFade component) */
  backgroundBleed: string;
  /** Linear gradient for track fills on LiquidSlider */
  sliderGradient: string;
  /** CSS gradient string for StreakFlame SVG fill */
  flameGradient: string;
  /** Human-readable label */
  label: string;
  /** Emoji representative of this mood */
  emoji: string;
}

/** Complete mood theme map — all 6 moods */
export const MOOD_THEMES: Record<MoodCategory, MoodThemeToken> = {
  happy: {
    color: '#FFD166',
    color10: 'rgba(255, 209, 102, 0.10)',
    color20: 'rgba(255, 209, 102, 0.20)',
    color40: 'rgba(255, 209, 102, 0.40)',
    complementary: '#6690FF',
    glowShadow: '0 0 20px rgba(255, 209, 102, 0.80), 0 0 40px rgba(255, 209, 102, 0.40)',
    subtleGlow: '0 0 12px rgba(255, 209, 102, 0.50)',
    strongGlow: '0 0 32px rgba(255, 209, 102, 0.90), 0 0 60px rgba(255, 209, 102, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(255, 209, 102, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(255, 209, 102, 0.20), rgba(255, 209, 102, 1))',
    flameGradient: 'linear-gradient(180deg, #FFE566 0%, #FFD166 40%, #FF9A3C 100%)',
    label: 'Happy',
    emoji: '😄',
  },
  energetic: {
    color: '#FF9A3C',
    color10: 'rgba(255, 154, 60, 0.10)',
    color20: 'rgba(255, 154, 60, 0.20)',
    color40: 'rgba(255, 154, 60, 0.40)',
    complementary: '#3C9EFF',
    glowShadow: '0 0 20px rgba(255, 154, 60, 0.80), 0 0 40px rgba(255, 154, 60, 0.40)',
    subtleGlow: '0 0 12px rgba(255, 154, 60, 0.50)',
    strongGlow: '0 0 32px rgba(255, 154, 60, 0.90), 0 0 60px rgba(255, 154, 60, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(255, 154, 60, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(255, 154, 60, 0.20), rgba(255, 154, 60, 1))',
    flameGradient: 'linear-gradient(180deg, #FFCF6B 0%, #FF9A3C 40%, #FF5E3A 100%)',
    label: 'Energetic',
    emoji: '⚡',
  },
  calm: {
    color: '#74C0A8',
    color10: 'rgba(116, 192, 168, 0.10)',
    color20: 'rgba(116, 192, 168, 0.20)',
    color40: 'rgba(116, 192, 168, 0.40)',
    complementary: '#C07474',
    glowShadow: '0 0 20px rgba(116, 192, 168, 0.80), 0 0 40px rgba(116, 192, 168, 0.40)',
    subtleGlow: '0 0 12px rgba(116, 192, 168, 0.50)',
    strongGlow: '0 0 32px rgba(116, 192, 168, 0.90), 0 0 60px rgba(116, 192, 168, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(116, 192, 168, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(116, 192, 168, 0.20), rgba(116, 192, 168, 1))',
    flameGradient: 'linear-gradient(180deg, #A8E6D9 0%, #74C0A8 40%, #3A8C75 100%)',
    label: 'Calm',
    emoji: '😌',
  },
  stressed: {
    color: '#FF6B6B',
    color10: 'rgba(255, 107, 107, 0.10)',
    color20: 'rgba(255, 107, 107, 0.20)',
    color40: 'rgba(255, 107, 107, 0.40)',
    complementary: '#6BFFD3',
    glowShadow: '0 0 20px rgba(255, 107, 107, 0.80), 0 0 40px rgba(255, 107, 107, 0.40)',
    subtleGlow: '0 0 12px rgba(255, 107, 107, 0.50)',
    strongGlow: '0 0 32px rgba(255, 107, 107, 0.90), 0 0 60px rgba(255, 107, 107, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(255, 107, 107, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(255, 107, 107, 0.20), rgba(255, 107, 107, 1))',
    flameGradient: 'linear-gradient(180deg, #FF9E9E 0%, #FF6B6B 40%, #CC2929 100%)',
    label: 'Stressed',
    emoji: '😰',
  },
  sad: {
    color: '#4A5899',
    color10: 'rgba(74, 88, 153, 0.10)',
    color20: 'rgba(74, 88, 153, 0.20)',
    color40: 'rgba(74, 88, 153, 0.40)',
    complementary: '#99884A',
    glowShadow: '0 0 20px rgba(74, 88, 153, 0.80), 0 0 40px rgba(74, 88, 153, 0.40)',
    subtleGlow: '0 0 12px rgba(74, 88, 153, 0.50)',
    strongGlow: '0 0 32px rgba(74, 88, 153, 0.90), 0 0 60px rgba(74, 88, 153, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(74, 88, 153, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(74, 88, 153, 0.20), rgba(74, 88, 153, 1))',
    flameGradient: 'linear-gradient(180deg, #8A9ADF 0%, #4A5899 40%, #1E2A66 100%)',
    label: 'Sad',
    emoji: '😢',
  },
  focused: {
    color: '#9B72CF',
    color10: 'rgba(155, 114, 207, 0.10)',
    color20: 'rgba(155, 114, 207, 0.20)',
    color40: 'rgba(155, 114, 207, 0.40)',
    complementary: '#A8CF72',
    glowShadow: '0 0 20px rgba(155, 114, 207, 0.80), 0 0 40px rgba(155, 114, 207, 0.40)',
    subtleGlow: '0 0 12px rgba(155, 114, 207, 0.50)',
    strongGlow: '0 0 32px rgba(155, 114, 207, 0.90), 0 0 60px rgba(155, 114, 207, 0.50)',
    backgroundBleed: 'radial-gradient(ellipse at center, rgba(155, 114, 207, 0.10) 0%, #1A1A2E 70%)',
    sliderGradient: 'linear-gradient(90deg, rgba(155, 114, 207, 0.20), rgba(155, 114, 207, 1))',
    flameGradient: 'linear-gradient(180deg, #C8A8EF 0%, #9B72CF 40%, #5A2E9C 100%)',
    label: 'Focused',
    emoji: '🎯',
  },
};

/** Neutral dark used as default background before mood is detected */
export const NEUTRAL_DARK = '#1A1A2E';

/** Near-black used for chart backgrounds */
export const CHART_DARK = '#0D0D1A';

/**
 * Retrieves the theme token for a given mood category.
 * Falls back to 'focused' if an unknown category is supplied.
 * @param category - The mood category key
 * @returns The corresponding MoodThemeToken
 */
export function getMoodTheme(category: MoodCategory | string): MoodThemeToken {
  return MOOD_THEMES[category as MoodCategory] ?? MOOD_THEMES.focused;
}

/**
 * Interpolates between two mood colors for boundary mood state.
 * Returns a CSS linear-gradient string usable as a background.
 * @param moodA - First mood category
 * @param moodB - Second mood category
 * @returns CSS linear-gradient string blending both mood colors
 */
export function interpolateMoodGradient(moodA: MoodCategory, moodB: MoodCategory): string {
  const a = MOOD_THEMES[moodA].color;
  const b = MOOD_THEMES[moodB].color;
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

/**
 * Maps a composite mood score to a MoodCategory using the scoring algorithm.
 * @param composite - Composite score (0–5)
 * @param productivity - Raw Q4 score (1–5)
 * @param q3Raw - Raw Q3 stress score (1–5, UNINVERTED)
 * @returns The resolved MoodCategory
 */
export function scoreToMoodCategory(
  composite: number,
  productivity: number,
  q3Raw: number,
): MoodCategory {
  if (composite >= 4.0 && productivity >= 4) return 'happy';
  if (composite >= 4.0 && productivity < 4) return 'energetic';
  if (composite >= 3.5 && productivity < 3) return 'calm';
  if (composite < 2.5 && q3Raw < 3) return 'stressed';
  if (composite < 2.0) return 'sad';
  return 'focused';
}
