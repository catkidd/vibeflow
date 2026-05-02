'use client';
// FILE: frontend/app/analytics/page.tsx — stub (full implementation: Phase 5)
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import GradientMesh from '../components/GradientMesh';
import HapticToast from '../components/HapticToast';
import { MOOD_THEMES } from '@/lib/moodTheme';
import { dashboardContainerVariants, dashboardExpandVariants } from '@/lib/animation';

export default function AnalyticsPage() {
  const router = useRouter();
  const theme = MOOD_THEMES.focused;
  return (
    <>
      <GradientMesh theme={theme} />
      <HapticToast />
      <div className="min-h-screen p-6 flex items-center justify-center">
        <motion.div className="max-w-2xl w-full" variants={dashboardContainerVariants} initial="hidden" animate="visible">
          <motion.div variants={dashboardExpandVariants} className="glass p-10 text-center">
            <div className="text-5xl mb-4" role="img" aria-label="constellation">🌌</div>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Flow Analytics
            </h1>
            <p className="text-white/50 mb-6">Constellation chart + Energy Wave coming in Phase 5.</p>
            <motion.button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-2xl text-sm font-medium"
              style={{ background: theme.color20, color: theme.color, border: `1px solid ${theme.color40}` }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              ← Back to Dashboard
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
