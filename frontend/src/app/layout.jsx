// FILE: frontend/app/layout.tsx
// Root layout — fonts, SEO meta, and global ToastProvider

import { Inter, Space_Grotesk } from "next/font/google";
import { ToastProvider } from "@/components/ToastContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata = {
  title: "VibeFlow — Emotionally Intelligent Productivity",
  description:
    "VibeFlow detects your emotional state and curates music, focus sessions, and productivity tools to match your inner world.",
  keywords: [
    "mood tracking",
    "productivity",
    "Pomodoro",
    "music curation",
    "wellbeing",
  ],
  openGraph: {
    title: "VibeFlow",
    description: "The app that feels you.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
