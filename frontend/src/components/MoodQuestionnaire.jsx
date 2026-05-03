"use client";
// FILE: frontend/app/components/MoodQuestionnaire.tsx
// 5 LiquidSlider questions with staggered card reveal.
// Calculates composite mood score live and updates background bleed.

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import LiquidSlider from "./LiquidSlider";
import { scoreToMoodCategory, getMoodTheme } from "@/lib/moodTheme";
import {
  questionnaireContainerVariants,
  staggerItemVariants,
  DURATION,
  EASE,
} from "@/lib/animation";

const QUESTIONS = [
  { id: "q1", label: "How is your energy level right now?", inverted: false },
  { id: "q2", label: "What is your overall outlook today?", inverted: false },
  { id: "q3", label: "How stressed do you feel?", inverted: true },
  {
    id: "q4",
    label: "How motivated are you to get work done?",
    inverted: false,
  },
  {
    id: "q5",
    label: "What type of music appeals to you right now?",
    inverted: false,
  },
];

/**
 * Calculates composite score from 5 answers using the spec's weighted formula.
 * @param a - All 5 slider answers
 * @returns { composite, productivity, q3Raw }
 */
function calculateScore(a) {
  const energyScore = a.q1 * 0.3 + a.q5 * 0.2;
  const moodScore = a.q2 * 0.3 + a.q3 * 0.2;
  const composite = (energyScore + moodScore) / 2;
  return { composite, productivity: a.q4, q3Raw: a.q3 };
}

/**
 * MoodQuestionnaire
 * Renders 5 LiquidSliders with staggered entrance (120ms delay each).
 * As sliders move, partial score drives background color update.
 * On submit, sends answers + resolved mood to parent for API call.
 *
 * Edge case — User submits without changing defaults (all = 3):
 *   Score resolves to 'focused' — valid state, submitted normally.
 * Edge case — Rapid slider changes: React batches re-renders, color updates
 *   are smooth since FocusFade uses Framer Motion interpolation.
 *
 * @param onMoodColorChange - Called with hex color as score updates live
 * @param onSubmit          - Called with final answers + resolved mood
 * @param isSubmitting      - Disables form during API call
 */
export default function MoodQuestionnaire({
  onMoodColorChange,
  onSubmit,
  isSubmitting = false,
}) {
  const [answers, setAnswers] = useState({
    q1: 3,
    q2: 3,
    q3: 3,
    q4: 3,
    q5: 3,
  });

  // Compute current mood from partial answers — updates live as sliders change
  const { currentMood, currentColor } = useMemo(() => {
    const { composite, productivity, q3Raw } = calculateScore(answers);
    const mood = scoreToMoodCategory(composite, productivity, q3Raw);
    const theme = getMoodTheme(mood);
    return { currentMood: mood, currentColor: theme.color };
  }, [answers]);

  const handleSliderChange = useCallback(
    (question, value) => {
      setAnswers((prev) => {
        const next = { ...prev, [question]: value };
        const { composite, productivity, q3Raw } = calculateScore(next);
        const mood = scoreToMoodCategory(composite, productivity, q3Raw);
        const theme = getMoodTheme(mood);
        onMoodColorChange(theme.color);
        return next;
      });
    },
    [onMoodColorChange],
  );

  const handleSubmit = useCallback(() => {
    onSubmit(answers, currentMood, currentColor);
  }, [answers, currentMood, currentColor, onSubmit]);

  const theme = getMoodTheme(currentMood);

  return (
    <div
      className="vf-card-stack"
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <motion.div
        className="vf-card-stack"
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
        variants={questionnaireContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {QUESTIONS.map((q, i) => (
          <motion.div
            key={q.id}
            variants={staggerItemVariants}
            className="vf-question-card"
          >
            <LiquidSlider
              id={`slider-${q.id}`}
              label={`${i + 1}. ${q.label}`}
              value={answers[q.id]}
              onChange={(val) => handleSliderChange(q.id, val)}
              moodColor={currentColor}
              inverted={q.inverted}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Live mood preview */}
      <motion.div
        className="flex items-center justify-center gap-3 py-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: DURATION.FADE, ease: EASE.SMOOTH }}
      >
        <span className="text-lg" role="img" aria-label={theme.label}>
          {theme.emoji}
        </span>
        <span className="text-sm text-white/60">
          Current vibe:{" "}
          <span className="font-semibold" style={{ color: currentColor }}>
            {theme.label}
          </span>
        </span>
      </motion.div>

      {/* Submit button */}
      <motion.button
        id="questionnaire-submit"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="vf-btn-primary"
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "16px",
          border: "none",
          cursor: "pointer",
          background: `linear-gradient(135deg, ${currentColor}CC 0%, ${currentColor} 100%)`,
          boxShadow: theme.subtleGlow,
          color: "#1A1A2E",
        }}
        whileHover={
          !isSubmitting ? { scale: 1.02, boxShadow: theme.glowShadow } : {}
        }
        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        transition={{ duration: 0.18 }}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <motion.span
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            Detecting your vibe…
          </span>
        ) : (
          `Set My Vibe — ${theme.label} ${theme.emoji}`
        )}
      </motion.button>
    </div>
  );
}
