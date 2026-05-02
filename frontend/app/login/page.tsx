'use client';
// FILE: frontend/app/login/page.tsx
// Login page — Google OAuth entry point with animated VibeFlow branding.

import { motion } from 'framer-motion';
import FocusFade from '../components/FocusFade';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animation';
import { MOOD_THEMES } from '@/lib/moodTheme';

/**
 * LoginPage
 * Shown when user is unauthenticated.
 * Single "Continue with Google" button that redirects to the backend OAuth flow.
 * Background uses a focused purple FocusFade as the default welcome state.
 */
export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/login`;
  };

  return (
    <FocusFade moodColor={MOOD_THEMES.focused.color} className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        className="w-full max-w-md text-center"
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Brand */}
        <motion.div variants={staggerItemVariants} className="mb-10">
          <motion.div
            className="text-6xl mb-4 inline-block"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            role="img"
            aria-label="VibeFlow logo"
          >
            🌊
          </motion.div>
          <h1
            className="text-4xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            VibeFlow
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-xs mx-auto">
            The app that feels you — mood-aware music, focus, and flow.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          variants={staggerItemVariants}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {[
            { icon: '🎵', label: 'Mood Music' },
            { icon: '⏱️', label: 'Focus Timer' },
            { icon: '✅', label: 'Task Flow' },
            { icon: '📊', label: 'Energy Waves' },
            { icon: '🔥', label: 'Streaks' },
          ].map((f) => (
            <span
              key={f.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass-subtle text-white/60"
            >
              <span role="img" aria-hidden="true">{f.icon}</span>
              {f.label}
            </span>
          ))}
        </motion.div>

        {/* Google login button */}
        <motion.div variants={staggerItemVariants}>
          <motion.button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6
                       rounded-2xl font-semibold text-sm bg-white text-gray-800
                       hover:bg-gray-50 transition-colors"
            style={{ boxShadow: MOOD_THEMES.focused.subtleGlow }}
            whileHover={{ scale: 1.02, boxShadow: MOOD_THEMES.focused.glowShadow }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Google logo SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>

        <motion.p
          variants={staggerItemVariants}
          className="mt-6 text-xs text-white/25 leading-relaxed"
        >
          Your data stays private. We only use your mood to personalize your experience.
        </motion.p>
      </motion.div>
    </FocusFade>
  );
}
