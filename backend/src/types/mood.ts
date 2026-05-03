// FILE: backend/src/types/mood.ts
// Shared TypeScript types used across backend routes.
// RULE: All mood category strings must reference this union type.

export type MoodCategory =
  | 'happy'
  | 'energetic'
  | 'calm'
  | 'stressed'
  | 'sad'
  | 'focused';
