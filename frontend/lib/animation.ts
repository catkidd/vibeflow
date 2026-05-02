// FILE: frontend/lib/animation.ts
// Single source of truth for ALL Framer Motion variants and animation constants.
// RULE: No magic animation numbers inline in components — always import from here.
// RULE: Variants defined at module level to prevent re-creation on every render.

import type { Variants, Transition } from 'framer-motion';

// ─── Duration Constants (in seconds) ─────────────────────────────────────────
export const DURATION = {
  /** Background mood bleed transition */
  MOOD_BLEED: 1.2,
  /** Page-level state switch (mood entry → dashboard) */
  STATE_SWITCH: 0.6,
  /** Stagger delay between sibling items */
  STAGGER_ITEM: 0.08,
  /** Stagger delay between questionnaire cards */
  STAGGER_CARD: 0.12,
  /** Standard card entrance */
  CARD_ENTER: 0.45,
  /** Standard fade */
  FADE: 0.3,
  /** Sentiment journal glow change */
  JOURNAL_GLOW: 0.6,
  /** Toast slide-in */
  TOAST_SLIDE: 0.4,
  /** Task bubble-pop effect */
  BUBBLE_POP: 0.4,
  /** Badge crack-open animation */
  BADGE_UNLOCK: 0.6,
  /** Pomodoro ring pulse on completion */
  POMODORO_PULSE: 0.8,
  /** Playlist card hover expand */
  CARD_HOVER: 0.25,
  /** Mini player collapse to circle */
  PLAYER_COLLAPSE: 0.35,
  /** Error shake */
  ERROR_SHAKE: 0.4,
  /** Circle wipe during state switch */
  CIRCLE_WIPE: 0.6,
} as const;

// ─── Easing Presets ───────────────────────────────────────────────────────────
export const EASE = {
  /** Smooth entrance with slight overshoot feel */
  SMOOTH: [0.25, 0.46, 0.45, 0.94] as const,
  /** Spring-like elastic ease out */
  SPRING_OUT: [0.34, 1.56, 0.64, 1] as const,
  /** Standard ease in-out */
  IN_OUT: [0.4, 0, 0.2, 1] as const,
  /** Ease out for exits */
  OUT: [0.0, 0.0, 0.2, 1] as const,
  /** Ease in for entrances from rest */
  IN: [0.4, 0.0, 1, 1] as const,
} as const;

// ─── Spring Configs ───────────────────────────────────────────────────────────
export const SPRING = {
  /** Snappy spring for orb drag snap */
  SNAPPY: { type: 'spring', stiffness: 400, damping: 30 } as const,
  /** Gentle spring for layout animations */
  GENTLE: { type: 'spring', stiffness: 120, damping: 20 } as const,
  /** Bouncy spring for badge unlock */
  BOUNCY: { type: 'spring', stiffness: 300, damping: 15 } as const,
  /** Slow spring for mood bleed background */
  SLOW: { type: 'spring', stiffness: 60, damping: 20 } as const,
} as const;

// ─── Shared Transitions ───────────────────────────────────────────────────────
export const TRANSITIONS: Record<string, Transition> = {
  moodBleed: {
    duration: DURATION.MOOD_BLEED,
    ease: EASE.IN_OUT,
  },
  cardEnter: {
    duration: DURATION.CARD_ENTER,
    ease: EASE.SMOOTH,
  },
  toast: {
    duration: DURATION.TOAST_SLIDE,
    ease: EASE.SPRING_OUT,
  },
  staggerContainer: {
    staggerChildren: DURATION.STAGGER_ITEM,
    delayChildren: 0.1,
  },
  questionnaireStagger: {
    staggerChildren: DURATION.STAGGER_CARD,
    delayChildren: 0.2,
  },
};

// ─── Page & Layout Variants ───────────────────────────────────────────────────

/**
 * Stagger container — wraps lists of staggered children.
 * User feels items cascade in with organic timing.
 */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: DURATION.STAGGER_ITEM,
      delayChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: DURATION.STAGGER_ITEM / 2,
      staggerDirection: -1,
    },
  },
};

/**
 * Questionnaire card container — slower stagger for dramatic reveal.
 */
export const questionnaireContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: DURATION.STAGGER_CARD,
      delayChildren: 0.2,
    },
  },
};

/**
 * Individual stagger child item — fades up from below.
 */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.CARD_ENTER, ease: EASE.SMOOTH },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: DURATION.FADE, ease: EASE.IN },
  },
};

/**
 * Mood entry page collapse — elements scale down to center before state switch.
 * User feels the app "swallowing" the input and transforming.
 */
export const moodEntryCollapseVariants: Variants = {
  visible: { scale: 1, opacity: 1 },
  collapsed: {
    scale: 0.1,
    opacity: 0,
    transition: { duration: DURATION.STATE_SWITCH, ease: EASE.IN_OUT },
  },
};

/**
 * Circle wipe overlay — expands from center in mood color.
 * Creates the "the app is transforming" sensation.
 */
export const circleWipeVariants: Variants = {
  hidden: { clipPath: 'circle(0% at 50% 50%)', opacity: 1 },
  expanded: {
    clipPath: 'circle(150% at 50% 50%)',
    opacity: 1,
    transition: { duration: DURATION.CIRCLE_WIPE, ease: EASE.IN_OUT },
  },
};

/**
 * Dashboard panel expansion from center.
 * Panels bloom outward after the circle wipe completes.
 */
export const dashboardExpandVariants: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: DURATION.CARD_ENTER, ease: EASE.SPRING_OUT },
  },
};

/**
 * Dashboard stagger container — 80ms between panels.
 */
export const dashboardContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: DURATION.STAGGER_ITEM,
      delayChildren: 0.1,
    },
  },
};

// ─── Component-Level Variants ─────────────────────────────────────────────────

/**
 * Toast notification — slides up from bottom, swipe-dismissible.
 * User sees a frosted glass card float up from the bottom edge.
 */
export const toastVariants: Variants = {
  hidden: { y: 80, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.TOAST_SLIDE,
      ease: EASE.SPRING_OUT,
    },
  },
  exit: {
    y: 80,
    opacity: 0,
    scale: 0.9,
    transition: { duration: DURATION.FADE, ease: EASE.IN },
  },
};

/**
 * Task card completion — scales down and fades while bubble pops.
 * User gets a satisfying "pop" of completion feedback.
 */
export const taskCompletionVariants: Variants = {
  active: { scale: 1, opacity: 1 },
  completing: {
    scale: 0.85,
    opacity: 0,
    transition: { duration: DURATION.BUBBLE_POP, ease: EASE.IN_OUT },
  },
};

/**
 * Bubble pop circle — expands from checkbox position in mood color.
 */
export const bubblePopVariants: Variants = {
  hidden: { scale: 0, opacity: 1 },
  popped: {
    scale: 2,
    opacity: 0,
    transition: { duration: DURATION.BUBBLE_POP, ease: EASE.OUT },
  },
};

/**
 * Badge unlock animation — cracks open with scale pulse + rotation.
 * User sees the badge come alive when unlocked.
 */
export const badgeUnlockVariants: Variants = {
  locked: { scale: 1, rotate: 0, filter: 'grayscale(1) opacity(0.3)' },
  unlocking: {
    scale: [1, 1.25, 0.95, 1.1, 1],
    rotate: [0, -3, 3, -2, 0],
    filter: 'grayscale(0) opacity(1)',
    transition: {
      duration: DURATION.BADGE_UNLOCK,
      ease: EASE.SPRING_OUT,
    },
  },
  unlocked: {
    scale: 1,
    rotate: 0,
    filter: 'grayscale(0) opacity(1)',
  },
};

/**
 * Pomodoro ring pulse on session complete — 3 gentle pulses.
 * Calm celebration instead of an alarm — matches zen workspace philosophy.
 */
export const pomodoroCompleteVariants: Variants = {
  idle: { scale: 1 },
  pulsing: {
    scale: [1, 1.08, 1.0, 1.08, 1.0, 1.08, 1],
    transition: {
      duration: DURATION.POMODORO_PULSE * 3,
      ease: EASE.IN_OUT,
      times: [0, 0.17, 0.33, 0.5, 0.67, 0.83, 1],
    },
  },
};

/**
 * Playlist card hover expand — reveals mood_fit_reason tooltip.
 */
export const playlistCardVariants: Variants = {
  idle: { height: 'auto' },
  hovered: {
    height: 'auto',
    transition: { duration: DURATION.CARD_HOVER, ease: EASE.SMOOTH },
  },
};

/**
 * Tooltip fade-in inside expanded playlist card — 150ms delay as spec requires.
 */
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.FADE, ease: EASE.SMOOTH, delay: 0.15 },
  },
};

/**
 * Error shake — applied to invalid input fields.
 * User gets immediate tactile-feeling feedback on bad input.
 */
export const errorShakeVariants: Variants = {
  idle: { x: 0 },
  error: {
    x: [0, -8, 8, -8, 8, -4, 4, 0],
    transition: {
      duration: DURATION.ERROR_SHAKE,
      ease: EASE.IN_OUT,
    },
  },
};

/**
 * Mini player collapse to circle.
 */
export const miniPlayerVariants: Variants = {
  expanded: { width: 280, height: 160, borderRadius: 16 },
  collapsed: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    transition: { duration: DURATION.PLAYER_COLLAPSE, ease: EASE.IN_OUT },
  },
  fullscreen: {
    width: 560,
    height: 315,
    borderRadius: 16,
    transition: { duration: DURATION.PLAYER_COLLAPSE, ease: EASE.IN_OUT },
  },
};

/**
 * Fade variant — simple opacity fade, used for reduced-motion fallback.
 */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.FADE, ease: EASE.SMOOTH },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.FADE, ease: EASE.IN },
  },
};

/**
 * Shimmer animation values for album art loading skeleton.
 * Applied as CSS keyframe via Framer Motion animate prop.
 */
export const shimmerAnimateProps = {
  background: [
    'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.03) 100%)',
    'linear-gradient(90deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.10) 100%)',
    'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.03) 100%)',
  ],
  transition: {
    duration: 1.8,
    repeat: Infinity,
    ease: 'linear',
  },
};
