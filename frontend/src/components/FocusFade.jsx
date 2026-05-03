"use client";
// FILE: frontend/app/components/FocusFade.tsx
// Radial gradient background bleed that responds to mood color changes.
// User feels the app "inhale" the mood — color expands outward from center.

import { useEffect, useRef } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { NEUTRAL_DARK, getMoodTheme } from "@/lib/moodTheme";
import { DURATION, EASE } from "@/lib/animation";

/**
 * FocusFade
 * Full-screen fixed background layer.
 * Animates a radial gradient from the center outward whenever moodColor changes.
 * Uses Framer Motion's animate() for smooth 1200ms color interpolation.
 *
 * @param moodColor - Hex color for the current mood (e.g. '#FFD166')
 * @param className - Optional extra classes
 * @param children  - Page content rendered above the gradient layer
 */
export default function FocusFade({ moodColor, className = "", children }) {
  // We use CSS custom property approach — Framer Motion animates opacity of the color layer
  // while the color itself updates (CSS can't interpolate radial-gradient stops natively)
  const opacityValue = useMotionValue(0);
  const prevColorRef = useRef(NEUTRAL_DARK);
  const currentColorRef = useRef(moodColor);

  useEffect(() => {
    if (!moodColor) {
      animate(opacityValue, 0, {
        duration: DURATION.MOOD_BLEED,
        ease: EASE.IN_OUT,
      });
      return;
    }

    // When color changes: cross-fade by briefly dipping opacity then rising
    currentColorRef.current = moodColor;

    animate(opacityValue, 1, {
      duration: DURATION.MOOD_BLEED,
      ease: EASE.IN_OUT,
      onComplete: () => {
        prevColorRef.current = moodColor;
      },
    });
  }, [moodColor, opacityValue]);

  const theme = moodColor ? getMoodTheme(moodColor) : null;

  return (
    <div
      className={`relative min-h-screen ${className}`}
      style={{ position: "relative", minHeight: "100vh" }}
    >
      {/* Base neutral dark layer — always present */}
      <div
        className="fixed inset-0 -z-20"
        style={{
          backgroundColor: NEUTRAL_DARK,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -20,
        }}
        aria-hidden="true"
      />

      {/* Mood color bleed layer — animates in/out */}
      {/* User sees color "breathe" outward from the screen center */}
      <motion.div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -10,
          pointerEvents: "none",
          opacity: opacityValue,
          background: theme
            ? `radial-gradient(ellipse at center, ${theme.color10} 0%, transparent 70%)`
            : "none",
        }}
        aria-hidden="true"
      />

      {/* Secondary ambient glow — gives depth */}
      {theme && (
        <motion.div
          className="fixed inset-0 -z-10 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: moodColor ? 0.4 : 0 }}
          transition={{ duration: DURATION.MOOD_BLEED, ease: EASE.IN_OUT }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -10,
            pointerEvents: "none",
            background: `radial-gradient(ellipse 60% 40% at 50% 80%, ${theme.color10} 0%, transparent 100%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Page content */}
      {children}
    </div>
  );
}
