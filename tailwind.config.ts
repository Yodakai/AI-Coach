import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        panel: "#121824",
        muted: "#94a3b8",
        accent: "#00e676",
        text: "#e6edf3",
        edge: "#22d3ee"
      },
      borderRadius: {
        xl2: "1rem"
      },
      boxShadow: {
        panel: "0 6px 16px rgba(0,0,0,.4)"
      }
    }
  },
  plugins: []
} satisfies Config;
