"use client";
// FILE: frontend/app/components/LiquidSlider.tsx
// Custom drag-based slider with glowing orb, frosted glass track, and mood color fill.
// NEVER use a standard <input type="range"> — this is a bespoke Framer Motion component.

import { useRef, useCallback, useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { SPRING, DURATION } from "@/lib/animation";

/** Maps drag X position to integer 1–5, clamped to track bounds */
function xToValue(x, trackWidth) {
  const pct = Math.max(0, Math.min(1, x / trackWidth));
  return Math.round(pct * 4) + 1; // 0–1 → 1–5
}

/** Maps integer value 1–5 to X position on track */
function valueToX(value, trackWidth) {
  return ((value - 1) / 4) * trackWidth;
}

/**
 * LiquidSlider
 * A frosted glass track with a glowing orb draggable from 1 to 5.
 * The orb visually evolves: dim at 1, brightens and grows toward 5.
 * Track fills with a mood color gradient behind the orb.
 *
 * Edge case — zero-width track on mount: valueToX returns 0 safely.
 * Edge case — touch drag on mobile: Framer Motion onPan handles both pointer types.
 *
 * @param value     - Current integer value (1–5)
 * @param onChange  - Called with new value during drag
 * @param moodColor - Hex color for glow and fill gradient
 * @param label     - Accessible question text
 * @param id        - Unique element ID
 * @param inverted  - Whether high value means less (e.g. stress question)
 */
export default function LiquidSlider({
  value,
  onChange,
  moodColor,
  label,
  id,
  inverted = false,
}) {
  const trackRef = useRef(null);
  const orbX = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  // Measure track width on mount and resize
  useEffect(() => {
    function measure() {
      if (trackRef.current) {
        const w = trackRef.current.getBoundingClientRect().width;
        setTrackWidth(w);
        // Snap orb to current value position without animation on init
        orbX.set(valueToX(value, w));
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When value prop changes externally, snap orb position
  useEffect(() => {
    if (!isDragging && trackWidth > 0) {
      animate(orbX, valueToX(value, trackWidth), {
        ...SPRING.SNAPPY,
      });
    }
  }, [value, trackWidth, isDragging, orbX]);

  // Orb visual scale and glow by value (1=small dim, 5=large glowing)
  const orbDiameter = 24 + (value - 1) * 2; // 24px–32px
  const orbOpacity = 0.4 + (value - 1) * 0.15; // 0.4–1.0
  const glowIntensity =
    value === 5 ? `0 0 16px ${moodColor}, 0 0 32px ${moodColor}80` : "none";
  const fillPercent = ((value - 1) / 4) * 100;

  // Pulse only at value 5
  const pulseAnimation = value === 5 ? { scale: [1, 1.12, 1] } : { scale: 1 };
  const pulseTransition =
    value === 5
      ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
      : { duration: 0.2 };

  const handlePanStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handlePan = useCallback(
    (_e, info) => {
      if (!trackRef.current || trackWidth === 0) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const relativeX = info.point.x - trackRect.left;
      const clampedX = Math.max(0, Math.min(trackWidth, relativeX));

      orbX.set(clampedX);
      const newValue = xToValue(clampedX, trackWidth);
      onChange(newValue);
    },
    [trackWidth, orbX, onChange],
  );

  const handlePanEnd = useCallback(
    (_e, info) => {
      setIsDragging(false);
      if (!trackRef.current || trackWidth === 0) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const relativeX = info.point.x - trackRect.left;
      const snappedValue = xToValue(
        Math.max(0, Math.min(trackWidth, relativeX)),
        trackWidth,
      );

      // Snap orb to nearest integer position
      animate(orbX, valueToX(snappedValue, trackWidth), SPRING.SNAPPY);
      onChange(snappedValue);
    },
    [trackWidth, orbX, onChange],
  );

  // Click on track to jump to position
  const handleTrackClick = useCallback(
    (e) => {
      if (!trackRef.current || trackWidth === 0) return;
      const trackRect = trackRef.current.getBoundingClientRect();
      const relativeX = e.clientX - trackRect.left;
      const newValue = xToValue(
        Math.max(0, Math.min(trackWidth, relativeX)),
        trackWidth,
      );
      animate(orbX, valueToX(newValue, trackWidth), SPRING.SNAPPY);
      onChange(newValue);
    },
    [trackWidth, orbX, onChange],
  );

  // Value label display (inverted: 5 = no stress shown as positive)
  const displayLabels = inverted
    ? ["Very stressed", "", "Moderate", "", "No stress"]
    : ["Low", "", "Moderate", "", "High"];

  return (
    <div
      className="vf-slider-container"
      style={{ width: "100%", display: "flex", flexDirection: "column" }}
      role="group"
      aria-labelledby={`${id}-label`}
    >
      {/* Question label */}
      <div
        className="vf-slider-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          width: "100%",
        }}
      >
        <label
          id={`${id}-label`}
          className="vf-slider-label"
          style={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          {label}
        </label>
        <span
          className="vf-slider-value"
          style={{ color: moodColor, fontSize: "1.125rem", fontWeight: 700 }}
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="vf-slider-track-wrapper"
        onClick={handleTrackClick}
        aria-hidden="true"
      >
        {/* Gradient fill behind orb */}
        <div
          className="vf-slider-fill"
          style={{
            width: `${fillPercent}%`,
            background: `linear-gradient(90deg, ${moodColor}33 0%, ${moodColor} 100%)`,
            transition: `width ${DURATION.FADE * 1000}ms ease-out`,
          }}
        />

        {/* Draggable orb */}
        <motion.div
          id={id}
          className="vf-slider-orb"
          style={{
            x: orbX,
            width: orbDiameter,
            height: orbDiameter,
            marginLeft: -(orbDiameter / 2),
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), ${moodColor})`,
            opacity: orbOpacity,
            boxShadow: glowIntensity,
          }}
          animate={pulseAnimation}
          transition={pulseTransition}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          role="slider"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={value}
          aria-label={label}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              const next = Math.min(5, value + 1);
              animate(orbX, valueToX(next, trackWidth), SPRING.SNAPPY);
              onChange(next);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              const prev = Math.max(1, value - 1);
              animate(orbX, valueToX(prev, trackWidth), SPRING.SNAPPY);
              onChange(prev);
            }
          }}
        />
      </div>

      {/* Scale labels */}
      <div
        className="vf-slider-scale"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "0.75rem",
          width: "100%",
        }}
        aria-hidden="true"
      >
        {displayLabels.map((label, i) => (
          <span
            key={i}
            className="vf-slider-scale-item"
            style={{
              fontSize: "0.7rem",
              color: "rgba(255, 255, 255, 0.3)",
              ...(i === 2 ? { opacity: 0.5 } : {}),
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
