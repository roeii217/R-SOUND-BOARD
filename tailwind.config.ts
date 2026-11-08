import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090a0f",
        surface: "#11141e",
        "surface-light": "#191e2e",
        "surface-border": "#222a42",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          glow: "rgba(99, 102, 241, 0.4)",
        },
        neon: {
          green: "#10b981",
          cyan: "#06b6d4",
          purple: "#a855f7",
          pink: "#ec4899",
          orange: "#f97316",
        }
      },
      animation: {
        pulse_fast: "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ripple: "ripple 0.6s linear",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(99,102,241,0.3)" },
          "100%": { boxShadow: "0 0 35px rgba(99,102,241,0.8)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
