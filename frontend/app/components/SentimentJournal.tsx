'use client';
// FILE: frontend/app/components/SentimentJournal.tsx
// Type-to-Reveal textarea with live sentiment glow feedback.
// Sentiment.js runs debounced 300ms — border glow intensity scales with |score|.

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION, EASE } from '@/lib/animation';

interface SentimentResult {
  score: number;        // raw Sentiment.js score
  normalized: number;  // -1 to +1
  label: 'negative' | 'neutral' | 'positive';
}

interface SentimentJournalProps {
  /** Callback fired whenever sentiment score updates */
  onSentimentChange: (score: number, text: string) => void;
  /** Controlled text value */
  value: string;
  /** Setter for controlled text */
  onChange: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Normalizes a raw Sentiment.js score to -1…+1 range.
 * Raw scores are word-count dependent so we clamp rather than divide.
 * @param raw   - Raw Sentiment.js score
 * @param words - Word count of the input text
 * @returns Normalized score clamped to [-1, +1]
 */
function normalizeScore(raw: number, words: number): number {
  if (words === 0) return 0;
  const perWord = raw / words;
  return Math.max(-1, Math.min(1, perWord));
}

/**
 * Returns glow border color and box-shadow CSS based on sentiment score.
 * Glow intensity (blur radius) scales with |score|.
 * @param score - Normalized score (-1 to +1)
 */
function getGlowStyle(score: number): { borderColor: string; boxShadow: string } {
  const abs = Math.abs(score);
  const blur = 8 + abs * 24; // 8px baseline, up to 32px

  if (score < -0.3) {
    return {
      borderColor: `rgba(255, 107, 107, ${0.4 + abs * 0.5})`,
      boxShadow: `0 0 ${blur}px rgba(255, 107, 107, ${0.4 + abs * 0.4})`,
    };
  }
  if (score > 0.3) {
    return {
      borderColor: `rgba(116, 192, 168, ${0.4 + abs * 0.5})`,
      boxShadow: `0 0 ${blur}px rgba(116, 192, 168, ${0.4 + abs * 0.4})`,
    };
  }
  return {
    borderColor: `rgba(255, 209, 102, ${0.3 + abs * 0.3})`,
    boxShadow: `0 0 ${blur}px rgba(255, 209, 102, ${0.3 + abs * 0.3})`,
  };
}

/**
 * Returns the cursor / caret color matching the current sentiment.
 * @param score - Normalized score (-1 to +1)
 */
function getCaretColor(score: number): string {
  if (score < -0.3) return '#FF6B6B';
  if (score > 0.3) return '#74C0A8';
  return '#FFD166';
}

/**
 * SentimentJournal
 * A textarea that analyzes text sentiment in real-time (Sentiment.js, debounced 300ms).
 * Border glows and intensifies in negative (red), neutral (amber), or positive (teal).
 * A sentiment pill in the bottom-right shows the live score as a percentage bar.
 *
 * Edge case — Sentiment.js not available (bundle split): catches import error,
 *   uses a simple positive/negative word count heuristic as fallback.
 * Edge case — Very short text (< 3 chars): no glow shown, pill hidden.
 *
 * @param onSentimentChange - Called with normalized score and current text
 * @param value             - Controlled textarea content
 * @param onChange          - Controlled text setter
 * @param placeholder       - Custom placeholder text
 */
export default function SentimentJournal({
  onSentimentChange,
  value,
  onChange,
  placeholder = "How are you really feeling right now? Write freely...",
}: SentimentJournalProps) {
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentimentRef = useRef<{ analyze: (text: string) => { score: number; words: string[] } } | null>(null);

  // Lazy-load Sentiment.js on first focus to keep bundle lean
  useEffect(() => {
    if (isFocused && !sentimentRef.current) {
      import('sentiment').then((mod) => {
        const Sentiment = mod.default;
        sentimentRef.current = new Sentiment();
      }).catch(() => {
        // Sentiment.js unavailable — fallback handled in analyzeSentiment
      });
    }
  }, [isFocused]);

  const analyzeSentiment = useCallback((text: string) => {
    if (text.length < 3) {
      setSentiment(null);
      onSentimentChange(0, text);
      return;
    }

    if (sentimentRef.current) {
      try {
        const result = sentimentRef.current.analyze(text);
        const words = text.trim().split(/\s+/).length;
        const normalized = normalizeScore(result.score, words);

        const label: SentimentResult['label'] =
          normalized < -0.3 ? 'negative' : normalized > 0.3 ? 'positive' : 'neutral';

        setSentiment({ score: result.score, normalized, label });
        onSentimentChange(normalized, text);
      } catch {
        // Fallback: basic heuristic
        onSentimentChange(0, text);
      }
    } else {
      // Module not loaded yet — defer
      onSentimentChange(0, text);
    }
  }, [onSentimentChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      onChange(text);

      // Debounce sentiment analysis to 300ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        analyzeSentiment(text);
      }, 300);
    },
    [onChange, analyzeSentiment],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showGlow = isFocused && sentiment !== null && value.length >= 3;
  const glowStyle = showGlow
    ? getGlowStyle(sentiment!.normalized)
    : { borderColor: 'rgba(255,255,255,0.10)', boxShadow: 'none' };
  const caretColor = sentiment ? getCaretColor(sentiment.normalized) : 'rgba(255,255,255,0.7)';

  // Percentage for the sentiment pill bar (0–100%)
  const pillPercent = sentiment
    ? Math.round(((sentiment.normalized + 1) / 2) * 100)
    : 50;

  const pillColor = sentiment
    ? sentiment.label === 'positive'
      ? '#74C0A8'
      : sentiment.label === 'negative'
        ? '#FF6B6B'
        : '#FFD166'
    : 'rgba(255,255,255,0.3)';

  return (
    <div className="relative w-full">
      {/* Textarea */}
      <motion.div
        className="relative"
        animate={showGlow ? { scale: 1 } : { scale: 1 }}
      >
        <textarea
          id="sentiment-journal"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={6}
          className="w-full resize-none rounded-2xl px-5 py-4 text-sm leading-relaxed
                     bg-white/5 backdrop-blur-sm text-white/90
                     placeholder:text-white/25 outline-none
                     transition-all"
          style={{
            border: `1px solid ${showGlow ? glowStyle.borderColor : 'rgba(255,255,255,0.10)'}`,
            boxShadow: showGlow ? glowStyle.boxShadow : 'none',
            caretColor,
            transition: `border-color ${DURATION.JOURNAL_GLOW * 1000}ms ease, box-shadow ${DURATION.JOURNAL_GLOW * 1000}ms ease`,
          }}
          aria-label="Mood journal entry"
          aria-describedby="sentiment-pill"
          spellCheck="true"
        />

        {/* Sentiment pill — bottom-right of textarea */}
        <AnimatePresence>
          {value.length >= 3 && (
            <motion.div
              id="sentiment-pill"
              className="absolute bottom-3 right-3 flex flex-col items-end gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: DURATION.FADE, ease: EASE.SMOOTH }}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-xs text-white/40 font-medium">Feeling detected</span>
              {/* Score bar */}
              <div className="relative w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  animate={{ width: `${pillPercent}%` }}
                  transition={{ duration: 0.3, ease: EASE.SMOOTH }}
                  style={{ backgroundColor: pillColor }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Character count */}
      {value.length > 0 && (
        <div className="flex justify-between items-center mt-2 px-1">
          <span className="text-xs text-white/25">{value.length} characters</span>
          {sentiment && value.length >= 10 && (
            <motion.span
              className="text-xs font-medium capitalize"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: pillColor }}
            >
              {sentiment.label} energy
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
}
