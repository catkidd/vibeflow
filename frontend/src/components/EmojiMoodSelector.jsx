"use client";
// FILE: frontend/app/components/EmojiMoodSelector.tsx
// Emoji grid for direct mood selection — immediate background bleed on tap.
// Color-reactive: each emoji animates in the mood's color on selection.

import { motion } from "framer-motion";
import { MOOD_THEMES } from "@/lib/moodTheme";
import {
  staggerContainerVariants,
  staggerItemVariants,
  DURATION,
  EASE,
} from "@/lib/animation";

/** Ordered list of moods to display in the grid */
const MOOD_OPTIONS = [
  "happy",
  "energetic",
  "calm",
  "focused",
  "stressed",
  "sad",
];

/**
 * EmojiMoodSelector
 * A 3×2 grid of emoji buttons. On tap/click, immediately triggers the mood
 * background bleed and calls onSelect. Selected state is highlighted with a
 * glowing border in the mood's color and a scale-up animation.
 *
 * Edge case — rapid tapping: state updates debounce naturally via React re-render.
 * Edge case — no mood selected: all cards render in neutral glass state.
 *
 * @param selectedMood - Currently active mood or null
 * @param onSelect     - Callback with chosen MoodCategory
 */
export default function EmojiMoodSelector({ selectedMood, onSelect }) {
  return (
    <div role="group" aria-label="Select your current mood">
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {MOOD_OPTIONS.map((mood) => {
          const theme = MOOD_THEMES[mood];
          const isSelected = selectedMood === mood;

          return (
            <motion.button
              key={mood}
              id={`emoji-mood-${mood}`}
              variants={staggerItemVariants}
              whileHover={{ scale: 1.06, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect(mood)}
              className="relative flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer transition-all"
              style={{
                background: isSelected
                  ? `${theme.color20}`
                  : "rgba(255, 255, 255, 0.05)",
                border: `1px solid ${isSelected ? theme.color40 : "rgba(255,255,255,0.10)"}`,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: isSelected ? theme.subtleGlow : "none",
              }}
              aria-pressed={isSelected}
              aria-label={`${theme.label} mood`}
            >
              {/* Emoji */}
              <motion.span
                className="text-3xl select-none"
                animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={
                  isSelected
                    ? { duration: 0.4, ease: EASE.SPRING_OUT }
                    : { duration: DURATION.FADE }
                }
                role="img"
                aria-hidden="true"
              >
                {theme.emoji}
              </motion.span>

              {/* Label */}
              <span
                className="text-xs font-medium tracking-wide"
                style={{
                  color: isSelected ? theme.color : "rgba(255,255,255,0.55)",
                }}
              >
                {theme.label}
              </span>

              {/* Selected indicator dot */}
              {isSelected && (
                <motion.div
                  layoutId="selected-dot"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: theme.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={DURATION.FADE}
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
