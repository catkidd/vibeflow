"use client";
// FILE: frontend/app/components/GradientMesh.tsx
// Animated gradient mesh background for the dashboard.
// 3 colored orbs float slowly on CSS keyframe animations.
// All panels render above this as frosted glass.

import { useMemo } from "react";
import { NEUTRAL_DARK } from "@/lib/moodTheme";

/**
 * GradientMesh
 * Fixed full-screen background with 3 blurred, floating color orbs.
 * Orb 1: current mood color (top-left, floats with orbFloat1)
 * Orb 2: complementary color (bottom-right, floats with orbFloat2)
 * Orb 3: neutral deep tone (center, floats with orbFloat3)
 * The orb layer is blurred (filter: blur(80px)) to create a soft ambient glow.
 *
 * Edge case — theme changes: orb colors update immediately, CSS transitions handle smoothly.
 * Edge case — reduced motion: CSS animations are disabled via @media in globals.css.
 */
export default function GradientMesh({ theme }) {
  const orbs = useMemo(
    () => [
      {
        color: theme.color,
        style: {
          width: "55vw",
          height: "55vw",
          top: "-10vw",
          left: "-10vw",
          animationName: "orbFloat1",
          animationDuration: "28s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        },
      },
      {
        color: theme.complementary,
        style: {
          width: "45vw",
          height: "45vw",
          bottom: "-10vw",
          right: "-8vw",
          animationName: "orbFloat2",
          animationDuration: "22s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate-reverse",
        },
      },
      {
        color: "rgba(40, 30, 70, 0.9)",
        style: {
          width: "40vw",
          height: "40vw",
          top: "30%",
          left: "35%",
          animationName: "orbFloat3",
          animationDuration: "35s",
          animationTimingFunction: "ease-in-out",
          animationIterationCount: "infinite",
          animationDirection: "alternate",
        },
      },
    ],
    [theme.color, theme.complementary],
  );

  return (
    <>
      {/* Base background */}
      <div
        className="fixed inset-0 -z-30"
        style={{ backgroundColor: NEUTRAL_DARK }}
        aria-hidden="true"
      />

      {/* Orb canvas — blurred to create soft ambient mesh */}
      <div
        className="fixed inset-0 -z-20 overflow-hidden"
        style={{ filter: "blur(80px)", opacity: 0.7 }}
        aria-hidden="true"
      >
        {orbs.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              backgroundColor: orb.color,
              opacity: 0.6,
              ...orb.style,
            }}
          />
        ))}
      </div>

      {/* Subtle dark vignette to keep panels readable */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(10, 8, 20, 0.5) 100%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
