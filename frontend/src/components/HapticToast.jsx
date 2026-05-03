"use client";
// FILE: frontend/app/components/HapticToast.tsx
// Bottom-center frosted glass toast with slide-in, progress bar, swipe-to-dismiss.
// User feels tactile feedback — the app "responding" to their achievement.

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useToast } from "./ToastContext";
import { toastVariants } from "@/lib/animation";

/** Icon map for toast types */
const ICON_MAP = {
  flame: "🔥",
  star: "⭐",
  heart: "💙",
  sun: "☀️",
  zap: "⚡",
  moon: "🌙",
  leaf: "🌿",
  music: "🎵",
};

/**
 * HapticToast
 * Renders the currently active toast from ToastContext.
 * Fixed to bottom-center. Slides in from y:80, has a 4s progress bar,
 * and can be dismissed via upward swipe (Framer Motion drag).
 *
 * Edge case — swipe threshold: user must drag >60px upward to dismiss.
 * Edge case — no active toast: AnimatePresence cleanly removes the element.
 */
export default function HapticToast() {
  const { activeToast, dismissToast } = useToast();
  const progressRef = useRef(null);
  const dragY = useMotionValue(0);

  // Animate progress bar from 100% → 0% over 4s
  useEffect(() => {
    if (!activeToast || !progressRef.current) return;
    const el = progressRef.current;
    el.style.transition = "none";
    el.style.width = "100%";
    // Force reflow
    void el.offsetWidth;
    el.style.transition = `width ${4000}ms linear`;
    el.style.width = "0%";
  }, [activeToast?.id]);

  return (
    <AnimatePresence mode="wait">
      {activeToast && (
        <motion.div
          key={activeToast.id}
          id={`haptic-toast-${activeToast.id}`}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{ y: dragY }}
          drag="y"
          dragConstraints={{ top: -200, bottom: 20 }}
          dragElastic={0.3}
          onDragEnd={(_e, info) => {
            // Dismiss on upward swipe > 60px
            if (info.offset.y < -60) {
              dismissToast();
            } else {
              // Spring back to resting position
              dragY.set(0);
            }
          }}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "rgba(20, 20, 40, 0.85)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Drag handle hint */}
            <div className="flex justify-center pt-2 pb-0">
              <div className="w-8 h-1 rounded-full bg-white/20" />
            </div>

            {/* Toast content */}
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Icon */}
              <span
                className="text-2xl flex-shrink-0 mt-0.5"
                role="img"
                aria-hidden="true"
              >
                {ICON_MAP[activeToast.entry.icon] ?? "✨"}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white leading-snug">
                  {activeToast.entry.message}
                </p>
                {activeToast.entry.tip && (
                  <p className="text-xs text-white/50 mt-1 leading-snug">
                    {activeToast.entry.tip}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={dismissToast}
                className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors text-lg leading-none mt-0.5"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>

            {/* Progress bar — drains over 4 seconds */}
            <div className="h-0.5 bg-white/10 mx-4 mb-3 rounded-full overflow-hidden">
              <div
                ref={progressRef}
                className="h-full rounded-full"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.35)",
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Swipe hint text */}
          <p className="text-center text-xs text-white/20 mt-1.5">
            swipe up to dismiss
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
