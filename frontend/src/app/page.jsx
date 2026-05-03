// FILE: frontend/app/page.tsx
// Root redirect — sends authenticated users to /mood, unauthenticated to /login.
// This is a server component — no 'use client' needed.

import { redirect } from "next/navigation";

/**
 * Root page — acts as a smart redirect gateway.
 * In production, middleware would check the auth cookie server-side.
 * For now, redirects to the mood entry page (auth guard handled by the API).
 */
export default function RootPage() {
  redirect("/mood");
}
