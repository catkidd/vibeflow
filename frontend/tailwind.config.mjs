const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--neutral-dark)",
        foreground: "rgba(255, 255, 255, 0.92)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
export default config;
