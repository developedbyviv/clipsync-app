import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Olive (primary brand) ──────────────────────────────────────────
        olive: {
          50:  "#F7F6ED",
          100: "#ECEACC",
          200: "#D6D49A",
          300: "#BEBB6A",
          400: "#A3A047",
          500: "#85823A",
          600: "#6B6930",
          700: "#524F24",
          800: "#38361A",
          900: "#1E1D0D",
        },
        // ── Stone (warm neutral — not cold gray) ───────────────────────────
        stone: {
          50:  "#FAFAF9",
          100: "#F5F5F0",
          200: "#E8E8E0",
          300: "#D4D4C8",
          400: "#A8A89A",
          500: "#78786C",
          600: "#5C5C52",
          700: "#404038",
          800: "#282820",
          900: "#141410",
        },
        // ── Semantic colors ────────────────────────────────────────────────
        "amber-warm": "#C4862A",
        success: "#5A7A3A",
        error:   "#A63228",
        warning: "#B07820",
        info:    "#3A6B7A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xs:   ["12px", { lineHeight: "1.5" }],
        sm:   ["14px", { lineHeight: "1.5" }],
        base: ["16px", { lineHeight: "1.6" }],
        lg:   ["18px", { lineHeight: "1.5" }],
        xl:   ["20px", { lineHeight: "1.4" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["30px", { lineHeight: "1.2" }],
        "4xl": ["36px", { lineHeight: "1.1" }],
      },
      borderRadius: {
        lg:   "8px",
        xl:   "12px",
        "2xl": "16px",
      },
      maxWidth: {
        content: "42rem",   // ~672px — single column pages
        dashboard: "64rem", // ~1024px — dashboard
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
