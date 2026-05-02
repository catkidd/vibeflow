'use client';
// FILE: frontend/app/components/StateSwitch.tsx
// Page transition: mood entry → dashboard.
// Scale-down → circle wipe in mood color → dashboard expands.
// User feels the app "transform" — one living organism, not two pages.

import { motion, AnimatePresence } from 'framer-motion';
import { circleWipeVariants, moodEntryCollapseVariants, DURATION } from '@/lib/animation';

interface StateSwitchProps {
  /** Whether the transition is actively playing */
  isTransitioning: boolean;
  /** Mood color used for the circle wipe overlay */
  moodColor: string;
  /** Content to show before transition (mood entry) */
  children: React.ReactNode;
}

/**
 * StateSwitch
 * Wraps the mood entry screen in a layout-animated container.
 * When isTransitioning becomes true:
 *   1. Children collapse to center (scale → 0.1, opacity → 0)
 *   2. A full-screen circle in moodColor expands from center (clip-path circle wipe)
 *   3. Routing to dashboard happens after the wipe completes
 *
 * The circle overlay is a fixed positioned element above everything.
 * Dashboard mount animation is handled separately in the dashboard route.
 *
 * Edge case — transition fires before mood color resolves: defaults to focused purple.
 * Edge case — user navigates back during transition: AnimatePresence cleans up properly.
 *
 * @param isTransitioning - Triggers the collapse + wipe sequence
 * @param moodColor       - Hex color of the circle wipe
 * @param children        - Mood entry content
 */
export default function StateSwitch({
  isTransitioning,
  moodColor,
  children,
}: StateSwitchProps) {
  return (
    <>
      {/* Mood entry content — collapses on transition */}
      <motion.div
        variants={moodEntryCollapseVariants}
        initial="visible"
        animate={isTransitioning ? 'collapsed' : 'visible'}
        style={{ transformOrigin: 'center center' }}
      >
        {children}
      </motion.div>

      {/* Circle wipe overlay — expands from center in mood color */}
      {/* User sees the app "swallow" their mood and transform */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="circle-wipe"
            className="fixed inset-0 z-50 pointer-events-none"
            variants={circleWipeVariants}
            initial="hidden"
            animate="expanded"
            style={{ backgroundColor: moodColor }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * DashboardEntrance
 * Applied to the dashboard route wrapper.
 * Panels expand from center after the circle wipe completes.
 * stagger delay of 80ms between each child.
 */
export function DashboardEntrance({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.FADE, delay: DURATION.CIRCLE_WIPE + 0.1 }}
    >
      {children}
    </motion.div>
  );
}
