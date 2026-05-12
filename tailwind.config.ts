import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cadence semantic aliases (kept for back-compat across all components)
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-card": "var(--bg-card)",
        rule: "var(--rule)",
        "rule-soft": "var(--rule-soft)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-deep": "var(--accent-deep)",
        ai: "var(--ai)",
        "ai-soft": "var(--ai-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
        ok: "var(--ok)",
        "ok-soft": "var(--ok-soft)",
        neutral: "var(--neutral)",
        "neutral-soft": "var(--neutral-soft)",

        // SPX DS - Brand orange scale
        brand: {
          50: "var(--brand-50)",
          100: "var(--brand-100)",
          200: "var(--brand-200)",
          300: "var(--brand-300)",
          400: "var(--brand-400)",
          500: "var(--brand-500)",
          600: "var(--brand-600)",
          700: "var(--brand-700)",
          800: "var(--brand-800)",
          900: "var(--brand-900)",
        },
        // SPX DS - Cool gray neutrals
        gray: {
          0: "var(--neutral-0)",
          25: "var(--neutral-25)",
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
          1000: "var(--neutral-1000)",
        },
        // SPX DS - Data viz
        dv: {
          1: "var(--dv-1)",
          2: "var(--dv-2)",
          3: "var(--dv-3)",
          4: "var(--dv-4)",
          5: "var(--dv-5)",
          6: "var(--dv-6)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Geist", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      // SPX DS type scale tokens
      fontSize: {
        // SPX DS canonical
        "spx-display": ["48px", { lineHeight: "53px", letterSpacing: "-0.025em", fontWeight: "700" }],
        "spx-h1": ["32px", { lineHeight: "38px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "spx-h2": ["24px", { lineHeight: "31px", letterSpacing: "-0.015em", fontWeight: "600" }],
        "spx-h3": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "spx-h4": ["16px", { lineHeight: "23px", fontWeight: "600" }],
        "spx-body-lg": ["16px", { lineHeight: "25px" }],
        "spx-body": ["14px", { lineHeight: "22px" }],
        "spx-body-sm": ["13px", { lineHeight: "20px" }],
        "spx-caption": ["12px", { lineHeight: "17px" }],
        "spx-mono": ["13px", { lineHeight: "20px" }],
        "spx-numeric": ["28px", { lineHeight: "33px", fontWeight: "600" }],

        // Legacy aliases used across components - keep working
        "display-xl": ["48px", { lineHeight: "53px", letterSpacing: "-0.025em" }],
        "display-l": ["32px", { lineHeight: "38px", letterSpacing: "-0.02em" }],
        "display-m": ["24px", { lineHeight: "31px", letterSpacing: "-0.015em" }],
        "display-s": ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        "body-l": ["16px", { lineHeight: "25px" }],
        "body-m": ["14px", { lineHeight: "22px" }],
        "body-s": ["13px", { lineHeight: "20px" }],
        "mono-caption": ["12px", { lineHeight: "17px", letterSpacing: "0.06em" }],
        "mono-pill": ["10px", { lineHeight: "12px", letterSpacing: "0.06em" }],
        "mono-code": ["13px", { lineHeight: "20px" }],
        "mono-id": ["13px", { lineHeight: "20px", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        // SPX DS scale
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",       // 4px
        DEFAULT: "var(--radius-md)",   // 6px
        md: "var(--radius-md)",        // 6px
        lg: "var(--radius-lg)",        // 8px
        xl: "var(--radius-xl)",        // 12px
        "2xl": "var(--radius-2xl)",    // 16px
        full: "var(--radius-full)",
      },
      boxShadow: {
        // SPX DS five-tier elevation
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
        4: "var(--shadow-4)",
        5: "var(--shadow-5)",
        // Legacy aliases
        sm: "var(--shadow-1)",
        DEFAULT: "var(--shadow-2)",
        lg: "var(--shadow-4)",
      },
      transitionDuration: {
        80: "80ms",
        100: "100ms",
        150: "150ms",
        200: "200ms",
      },
    },
  },
  plugins: [],
};

export default config;
