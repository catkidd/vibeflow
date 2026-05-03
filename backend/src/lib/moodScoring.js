// FILE: backend/src/lib/moodScoring.ts
// Mood scoring algorithm — single source of truth for all mood category decisions.
// Called by POST /api/mood and unit-tested directly in __tests__/mood.test.ts.
//
// Formula (from vibeflow_master_prompt_v2.md §4):
//   composite ≥ 4.0 AND productivity ≥ 4  → happy (default) or energetic (composite ≥ 4.8)
//   composite ≥ 4.0 AND productivity < 4  → focused
//   composite 2.5–3.9                      → calm (low energy) | focused (otherwise)
//   composite < 2.5 AND productivity ≥ 4  → stressed
//   composite < 2.5 AND productivity < 4  → sad
//   energy: 'high' shifts borderline calm → stressed

/**
 * computeMoodCategory
 * Deterministically maps a composite + productivity score to a MoodCategory.
 *
 * @param input - MoodInput containing composite, productivity, and optional energy
 * @returns MoodCategory string
 */
export function computeMoodCategory(input) {
  const c = Math.min(5, Math.max(1, input.composite));
  const p = Math.min(5, Math.max(1, input.productivity));
  const energy = input.energy ?? "mid";

  if (c >= 4.0 && p >= 4) {
    return c >= 4.8 ? "energetic" : "happy";
  }

  if (c >= 4.0 && p < 4) {
    return "focused";
  }

  if (c >= 2.5 && c < 4.0) {
    if (energy === "low") return "calm";
    return "focused";
  }

  // c < 2.5
  if (p >= 4 || energy === "high") return "stressed";
  return "sad";
}
