import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          50: "#fbfbfb",
          100: "#f5f5f7",
          200: "#ebebed",
          300: "#dcdce0",
          800: "#1e1e20",
          900: "#161618",
          950: "#0c0c0d",
        },
        card: {
          DEFAULT: "var(--card-bg)",
          border: "var(--card-border)",
        },
        type: {
          todo: "#3b82f6",     // Blue
          link: "#059669",     // Emerald
          file: "#d97706",     // Amber
          text: "#6b7280",     // Neutral
        }
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.02)",
        floating: "0 8px 30px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      }
    },
  },
  plugins: [],
};
export default config;
