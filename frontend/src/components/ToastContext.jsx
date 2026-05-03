"use client";
// FILE: frontend/app/components/ToastContext.tsx
// Global toast context — any component can call useToast() to fire a HapticAffirmation.
// Uses React context + event-driven queue to decouple trigger from display.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { getRandomAffirmation } from "@/lib/affirmations";

const ToastContext = createContext(null);

/**
 * ToastProvider
 * Wrap the app root to enable global toast triggering from any component.
 * Queues toasts — if one is showing, the next waits 4.2 seconds.
 */
export function ToastProvider({ children }) {
  const [activeToast, setActiveToast] = useState(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      setActiveToast(null);
      return;
    }
    setActiveToast(next);
    // Auto-dismiss after 4 seconds + animation
    timerRef.current = setTimeout(() => {
      setActiveToast(null);
      setTimeout(showNext, 300); // brief gap between toasts
    }, 4200);
  }, []);

  const fireToast = useCallback(
    (type) => {
      const entry = getRandomAffirmation(type);
      const payload = {
        id: `toast-${Date.now()}-${Math.random()}`,
        entry,
        type,
      };

      if (!activeToast && queueRef.current.length === 0) {
        setActiveToast(payload);
        timerRef.current = setTimeout(() => {
          setActiveToast(null);
          setTimeout(showNext, 300);
        }, 4200);
      } else {
        // Queue for later — max 3 in queue
        if (queueRef.current.length < 3) {
          queueRef.current.push(payload);
        }
      }
    },
    [activeToast, showNext],
  );

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveToast(null);
    setTimeout(showNext, 300);
  }, [showNext]);

  return (
    <ToastContext.Provider value={{ fireToast, activeToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * useToast
 * Hook to access the toast system from any component.
 * @throws Error if used outside of ToastProvider
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
