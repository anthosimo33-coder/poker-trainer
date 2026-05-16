import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        "surface-active": "var(--surface-active)",
        "surface-strong": "var(--surface-strong)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        "border-bright": "var(--border-bright)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-faint": "var(--text-faint)",
        "text-dim": "var(--text-dim)",
        purple: {
          300: "var(--purple-300)",
          400: "var(--purple-400)",
          500: "var(--purple-500)",
          600: "var(--purple-600)",
          700: "var(--purple-700)",
          glow: "var(--purple-glow)",
          "glow-strong": "var(--purple-glow-strong)",
        },
        green: {
          DEFAULT: "var(--green)",
          glow: "var(--green-glow)",
        },
        red: {
          DEFAULT: "var(--red)",
          glow: "var(--red-glow)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          glow: "var(--amber-glow)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "14px",
        xl: "20px",
      },
      transitionTimingFunction: {
        "ease-linear-style": "cubic-bezier(0.32, 0.72, 0, 1)",
        "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
