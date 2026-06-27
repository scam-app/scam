import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F1A",
        panel: "#121A2C",
        panel2: "#0E1524",
        edge: "#233047",
        ink: "#E6EDF7",
        muted: "#8595AD",
        accent: "#38BDF8",
        good: "#34D399",
        warn: "#FBBF24",
        bad: "#F87171",
        cond: "#2DD4BF",
        brand: "#8B7DF6",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
