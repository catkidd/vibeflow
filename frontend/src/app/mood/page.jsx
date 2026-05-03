"use client";
// FILE: frontend/app/mood/page.tsx
// Mood Entry — "The Onboarding Pulse"
// Three entry methods: questionnaire, emoji selection, free-text journal.
// Tab-switched UI with shared FocusFade background bleed.

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import FocusFade from "@/components/FocusFade";
import MoodQuestionnaire from "@/components/MoodQuestionnaire";
import EmojiMoodSelector from "@/components/EmojiMoodSelector";
import SentimentJournal from "@/components/SentimentJournal";
import StateSwitch from "@/components/StateSwitch";
import {
  getMoodTheme,
  MOOD_THEMES,
  scoreToMoodCategory,
} from "@/lib/moodTheme";
import {
  staggerItemVariants,
  staggerContainerVariants,
  DURATION,
  EASE,
} from "@/lib/animation";

const METHOD_TABS = [
  { id: "questionnaire", label: "Guide Me", icon: "🎯" },
  { id: "emoji", label: "Quick Pick", icon: "⚡" },
  { id: "journal", label: "Journal", icon: "✍️" },
];

/**
 * MoodEntryPage
 * The first screen a user sees after login.
 * All three mood input methods share the same FocusFade background.
 * On submission, triggers StateSwitch transition then routes to /dashboard.
 *
 * Edge case — API failure on submit: shows inline error, does not transition.
 * Edge case — User not logged in: middleware redirects to /login before this page loads.
 */
export default function MoodEntryPage() {
  const router = useRouter();
  const [method, setMethod] = useState("questionnaire");
  const [moodColor, setMoodColor] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [journalText, setJournalText] = useState("");
  const [journalScore, setJournalScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState(null);
  const [resolvedMood, setResolvedMood] = useState("focused");

  // ─── Questionnaire handlers ────────────────────────────────────────────────
  const handleQuestionnaireMoodColor = useCallback((color) => {
    setMoodColor(color);
  }, []);

  const handleQuestionnaireSubmit = useCallback(
    async (answers, mood, color) => {
      setIsSubmitting(true);
      setError(null);
      setResolvedMood(mood);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/mood`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              source: "questionnaire",
              answers,
              category: mood,
              mood_color: color,
            }),
          },
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to save mood");
        }

        setMoodColor(color);
        localStorage.setItem("vf_active_mood", mood);
        setIsTransitioning(true);
        setTimeout(
          () => router.push("/dashboard"),
          (DURATION.CIRCLE_WIPE + 0.1) * 1000,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
        setIsSubmitting(false);
      }
    },
    [router],
  );

  // ─── Emoji handlers ────────────────────────────────────────────────────────
  const handleEmojiSelect = useCallback((mood) => {
    setSelectedEmoji(mood);
    setMoodColor(MOOD_THEMES[mood].color);
  }, []);

  const handleEmojiSubmit = useCallback(async () => {
    if (!selectedEmoji) return;
    setIsSubmitting(true);
    setError(null);
    setResolvedMood(selectedEmoji);
    const color = MOOD_THEMES[selectedEmoji].color;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/mood`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            source: "selection",
            category: selectedEmoji,
            mood_color: color,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save mood");
      }

      setIsTransitioning(true);
      setTimeout(
        () => router.push("/dashboard"),
        (DURATION.CIRCLE_WIPE + 0.1) * 1000,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }, [selectedEmoji, router]);

  // ─── Journal handlers ──────────────────────────────────────────────────────
  const handleSentimentChange = useCallback((score, _text) => {
    setJournalScore(score);
    // Resolve a mood category from sentiment score for background bleed
    const composite = ((score + 1) / 2) * 5; // map -1..1 → 0..5
    const productivity = 3; // neutral productivity when using journal
    const q3Raw = 3; // neutral stress
    const mood = scoreToMoodCategory(composite, productivity, q3Raw);
    setMoodColor(getMoodTheme(mood).color);
  }, []);

  const handleJournalSubmit = useCallback(async () => {
    if (journalText.trim().length < 10) {
      setError("Please write at least a sentence so we can read your vibe.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const composite = ((journalScore + 1) / 2) * 5;
    const mood = scoreToMoodCategory(composite, 3, 3);
    const color = getMoodTheme(mood).color;
    setResolvedMood(mood);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/mood`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            source: "text",
            text: journalText,
            sentiment_score: journalScore,
            category: mood,
            mood_color: color,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save mood");
      }

      setMoodColor(color);
      setIsTransitioning(true);
      setTimeout(
        () => router.push("/dashboard"),
        (DURATION.CIRCLE_WIPE + 0.1) * 1000,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }, [journalText, journalScore, router]);

  const resolvedTheme = getMoodTheme(resolvedMood);

  return (
    <FocusFade
      moodColor={moodColor}
      className="vf-page-center"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <StateSwitch
        isTransitioning={isTransitioning}
        moodColor={moodColor ?? resolvedTheme.color}
      >
        <motion.div
          className="vf-card-stack"
          style={{
            width: "100%",
            maxWidth: "32rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div
            variants={staggerItemVariants}
            className="text-center mb-8"
            style={{ textAlign: "center", marginBottom: "2rem" }}
          >
            <h1
              className="text-3xl font-bold text-white mb-2 text-display"
              style={{
                fontSize: "1.875rem",
                lineHeight: "2.25rem",
                marginBottom: "0.5rem",
              }}
            >
              How are you feeling?
            </h1>
            <p
              className="text-white-50 text-sm"
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "0.875rem",
              }}
            >
              VibeFlow will shape itself around your current state.
            </p>
          </motion.div>

          {/* Method tabs */}
          <motion.div
            variants={staggerItemVariants}
            className="vf-tab-container"
            style={{ display: "flex", width: "100%", gap: "4px" }}
          >
            {METHOD_TABS.map((tab) => (
              <button
                key={tab.id}
                id={`mood-tab-${tab.id}`}
                onClick={() => {
                  setMethod(tab.id);
                  setError(null);
                }}
                className={`vf-tab ${method === tab.id ? "active" : ""}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  background:
                    method === tab.id
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                  color: method === tab.id ? "white" : "rgba(255,255,255,0.45)",
                }}
                aria-selected={method === tab.id}
                role="tab"
              >
                <span role="img" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={method}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DURATION.FADE, ease: EASE.SMOOTH }}
              style={{ width: "100%" }}
            >
              {method === "questionnaire" && (
                <MoodQuestionnaire
                  onMoodColorChange={handleQuestionnaireMoodColor}
                  onSubmit={handleQuestionnaireSubmit}
                  isSubmitting={isSubmitting}
                />
              )}

              {method === "emoji" && (
                <div
                  className="space-y-5"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <EmojiMoodSelector
                    selectedMood={selectedEmoji}
                    onSelect={handleEmojiSelect}
                  />

                  <motion.button
                    id="emoji-submit"
                    onClick={handleEmojiSubmit}
                    disabled={!selectedEmoji || isSubmitting}
                    className="vf-btn-primary"
                    style={{
                      width: "100%",
                      padding: "1rem",
                      borderRadius: "16px",
                      border: "none",
                      cursor: "pointer",
                      background: selectedEmoji
                        ? `linear-gradient(135deg, ${MOOD_THEMES[selectedEmoji].color}CC, ${MOOD_THEMES[selectedEmoji].color})`
                        : "rgba(255,255,255,0.10)",
                      color: selectedEmoji
                        ? "#1A1A2E"
                        : "rgba(255,255,255,0.4)",
                      boxShadow: selectedEmoji
                        ? MOOD_THEMES[selectedEmoji].subtleGlow
                        : "none",
                    }}
                    whileHover={
                      selectedEmoji && !isSubmitting ? { scale: 1.02 } : {}
                    }
                    whileTap={
                      selectedEmoji && !isSubmitting ? { scale: 0.98 } : {}
                    }
                  >
                    {isSubmitting
                      ? "Setting your vibe…"
                      : selectedEmoji
                        ? `Go ${MOOD_THEMES[selectedEmoji].label} ${MOOD_THEMES[selectedEmoji].emoji}`
                        : "Select a mood above"}
                  </motion.button>
                </div>
              )}

              {method === "journal" && (
                <div
                  className="space-y-5"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  <SentimentJournal
                    value={journalText}
                    onChange={setJournalText}
                    onSentimentChange={handleSentimentChange}
                    placeholder="How are you really feeling right now? Write freely — no filter needed."
                  />

                  <motion.button
                    id="journal-submit"
                    onClick={handleJournalSubmit}
                    disabled={journalText.trim().length < 10 || isSubmitting}
                    className="vf-btn-primary"
                    style={{
                      width: "100%",
                      padding: "1rem",
                      borderRadius: "16px",
                      border: "none",
                      cursor: "pointer",
                      background: moodColor
                        ? `linear-gradient(135deg, ${moodColor}CC, ${moodColor})`
                        : "rgba(255,255,255,0.10)",
                      color: moodColor ? "#1A1A2E" : "rgba(255,255,255,0.4)",
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting ? "Reading your energy…" : "Read My Vibe ✍️"}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.FADE }}
                className="mt-4 p-3 rounded-xl text-sm text-center"
                style={{
                  background: "rgba(255, 107, 107, 0.15)",
                  border: "1px solid rgba(255, 107, 107, 0.30)",
                  color: "#FF9E9E",
                }}
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </StateSwitch>
    </FocusFade>
  );
}
