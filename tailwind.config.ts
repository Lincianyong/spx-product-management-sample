import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["72px", { lineHeight: "1.02", letterSpacing: "-0.02em" }],
        "display-l": ["44px", { lineHeight: "1.05", letterSpacing: "-0.01em" }],
        "display-m": ["26px", { lineHeight: "1.15" }],
        "display-s": ["22px", { lineHeight: "1.2" }],
        "body-l": ["16px", { lineHeight: "1.65" }],
        "body-m": ["15px", { lineHeight: "1.55" }],
        "body-s": ["13px", { lineHeight: "1.55" }],
        "mono-caption": ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
        "mono-pill": ["10px", { lineHeight: "1.2", letterSpacing: "0.06em" }],
        "mono-code": ["13px", { lineHeight: "1.5" }],
        "mono-id": ["12px", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
      },
      boxShadow: {
        sm: "0 1px 0 rgba(20,17,15,.04), 0 1px 2px rgba(20,17,15,.04)",
        DEFAULT: "0 1px 2px rgba(20,17,15,.05), 0 8px 24px rgba(20,17,15,.06)",
        lg: "0 4px 16px rgba(20,17,15,.08), 0 24px 48px rgba(20,17,15,.10)",
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
