// FILE: frontend/lib/affirmations.ts
// 50+ affirmation strings and micro-meditation tips, organized by trigger type.
// Used by the HapticToast system — randomly rotated per trigger category.

export type AffirmationType =
  | 'pomodoro_complete'
  | 'positive_journal'
  | 'badge_unlocked'
  | 'streak_milestone'
  | 'general';

export interface AffirmationEntry {
  message: string;
  /** Optional icon name (maps to a Lucide/custom icon in the toast) */
  icon: 'flame' | 'star' | 'heart' | 'sun' | 'zap' | 'moon' | 'leaf' | 'music';
  /** Optional micro-meditation tip shown beneath the message */
  tip?: string;
}

export const AFFIRMATIONS: Record<AffirmationType, AffirmationEntry[]> = {
  pomodoro_complete: [
    {
      message: 'Focus session complete. You showed up.',
      icon: 'sun',
      tip: 'Take 3 slow deep breaths before your next session.',
    },
    {
      message: 'Another 25 minutes, another step forward.',
      icon: 'zap',
      tip: 'Stand up and stretch for 60 seconds — your body will thank you.',
    },
    {
      message: 'Consistency is the quiet superpower.',
      icon: 'flame',
      tip: 'Drink a glass of water before jumping back in.',
    },
    {
      message: 'That session was yours and yours alone.',
      icon: 'star',
    },
    {
      message: 'Flow state achieved. Rest, then return.',
      icon: 'leaf',
      tip: 'Close your eyes for 30 seconds. Let your mind breathe.',
    },
    {
      message: 'Deep work compounds. Keep going.',
      icon: 'zap',
    },
    {
      message: "You protected your time. That's a skill.",
      icon: 'sun',
      tip: 'Look away from the screen and focus on something 20 feet away.',
    },
    {
      message: 'Every focused session is a vote for who you\'re becoming.',
      icon: 'star',
    },
    {
      message: 'Session done. Now recharge intentionally.',
      icon: 'moon',
      tip: 'Step outside or look out a window for a moment.',
    },
    {
      message: 'Presence over perfection. You were here.',
      icon: 'leaf',
    },
    {
      message: 'That\'s one more block in your foundation.',
      icon: 'flame',
      tip: 'Jot one thing you accomplished in the last 25 minutes.',
    },
    {
      message: 'Progress doesn\'t always feel big. But it always matters.',
      icon: 'heart',
    },
  ],

  positive_journal: [
    {
      message: 'Your words have warmth in them today.',
      icon: 'heart',
      tip: 'Sit with this feeling for a moment — name it, own it.',
    },
    {
      message: 'Positive energy detected. Ride it.',
      icon: 'zap',
    },
    {
      message: 'Something good is alive in you right now.',
      icon: 'sun',
      tip: 'Who can you share this energy with today?',
    },
    {
      message: 'Your journal sees the good in you. So do we.',
      icon: 'star',
    },
    {
      message: 'Gratitude lives in your words. That\'s powerful.',
      icon: 'leaf',
      tip: 'Take one more moment to notice what\'s going well.',
    },
    {
      message: 'The way you described that — beautiful.',
      icon: 'heart',
    },
    {
      message: 'High vibes detected. Let\'s match the music.',
      icon: 'music',
    },
    {
      message: 'You\'re in a good space. Protect it.',
      icon: 'sun',
      tip: 'Set one small intention for the next hour.',
    },
    {
      message: 'Today\'s entry is a good one.',
      icon: 'star',
    },
    {
      message: 'Optimism is a practice. You\'re practicing it.',
      icon: 'leaf',
    },
  ],

  badge_unlocked: [
    {
      message: 'New badge unlocked! You earned this.',
      icon: 'star',
    },
    {
      message: 'Achievement unlocked — your streak of effort is showing.',
      icon: 'flame',
    },
    {
      message: 'Another milestone. Another layer of you.',
      icon: 'zap',
    },
    {
      message: 'Badge earned. The data doesn\'t lie — you\'re consistent.',
      icon: 'star',
      tip: 'Celebrate small wins. They compound into big ones.',
    },
    {
      message: 'You unlocked something. It reflects who you are.',
      icon: 'heart',
    },
    {
      message: 'Achievement unlocked. Keep this energy going.',
      icon: 'flame',
    },
    {
      message: 'New badge in your collection. Quietly impressive.',
      icon: 'star',
    },
    {
      message: 'You\'re building something real, one badge at a time.',
      icon: 'leaf',
    },
  ],

  streak_milestone: [
    {
      message: '7 days straight. Your future self is grateful.',
      icon: 'flame',
      tip: 'Consistency for 7 days creates a habit loop. You\'re locked in.',
    },
    {
      message: 'A week of showing up. That\'s not nothing — that\'s everything.',
      icon: 'flame',
    },
    {
      message: 'Seven-day streak. The numbers confirm what you already know.',
      icon: 'star',
      tip: 'Take a moment to acknowledge this. You did the work.',
    },
    {
      message: 'Week one complete. The streak burns bright.',
      icon: 'flame',
    },
    {
      message: 'One full week. You turned intention into identity.',
      icon: 'zap',
      tip: 'Now make it 14. The next 7 will feel easier.',
    },
    {
      message: 'Your streak is a signal — you can be counted on.',
      icon: 'flame',
    },
    {
      message: 'Seven days means you showed up even when you didn\'t want to.',
      icon: 'heart',
      tip: 'The days you almost skipped matter most.',
    },
  ],

  general: [
    {
      message: 'You\'re doing better than you think.',
      icon: 'heart',
    },
    {
      message: 'VibeFlow is glad you\'re here today.',
      icon: 'sun',
    },
    {
      message: 'Every session you start is a win — even before it ends.',
      icon: 'leaf',
      tip: 'Starting is the hardest part. You already did it.',
    },
    {
      message: 'Your mood, your pace, your flow.',
      icon: 'music',
    },
    {
      message: 'Not all progress is visible. Trust the process.',
      icon: 'moon',
      tip: 'What\'s one thing you\'d tell your past self right now?',
    },
    {
      message: 'This moment, right now, is yours.',
      icon: 'leaf',
    },
    {
      message: 'The music is playing. Let it move you.',
      icon: 'music',
    },
    {
      message: 'Productivity isn\'t about hustle. It\'s about alignment.',
      icon: 'sun',
      tip: 'Check in: are your tasks aligned with what actually matters?',
    },
    {
      message: 'You set the pace. VibeFlow adapts.',
      icon: 'zap',
    },
    {
      message: 'Rest is not the opposite of progress. It\'s part of it.',
      icon: 'moon',
      tip: 'Schedule your next break intentionally.',
    },
    {
      message: 'Some days you sprint. Some days you walk. Both count.',
      icon: 'leaf',
    },
    {
      message: 'Good vibes are contagious. You\'re spreading them.',
      icon: 'heart',
    },
    {
      message: 'Your wellbeing is the foundation everything else stands on.',
      icon: 'heart',
      tip: '60 second check-in: body, mind, and breath.',
    },
    {
      message: 'The right playlist is loading. The right focus is building.',
      icon: 'music',
    },
    {
      message: 'VibeFlow sees your rhythm. Keep moving.',
      icon: 'sun',
    },
  ],
};

/**
 * Returns a random affirmation entry for the given trigger type.
 * Falls back to 'general' if the type has no entries.
 * @param type - The affirmation trigger type
 * @returns A random AffirmationEntry
 */
export function getRandomAffirmation(type: AffirmationType): AffirmationEntry {
  const pool = AFFIRMATIONS[type]?.length
    ? AFFIRMATIONS[type]
    : AFFIRMATIONS.general;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Returns a random affirmation from the entire pool, regardless of type.
 * Used for onboarding moments without a specific trigger.
 * @returns A random AffirmationEntry
 */
export function getAnyAffirmation(): AffirmationEntry {
  const all = Object.values(AFFIRMATIONS).flat();
  return all[Math.floor(Math.random() * all.length)];
}
