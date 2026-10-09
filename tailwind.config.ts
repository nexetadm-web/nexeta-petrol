import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nexeta: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        petrol: {
          dark: "#0b0f19",
          card: "#121826",
          cardBorder: "#1e293b",
          accent: "#6366f1",
          petrol: "#10b981", // Emerald for Petrol
          diesel: "#f59e0b", // Amber for Diesel
          hioctane: "#ec4899", // Pink/Rose for Hi-Octane
        }
      },
      backgroundImage: {
        "nexeta-gradient": "linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #06b6d4 100%)",
        "nexeta-radial": "radial-gradient(circle at top right, rgba(124, 58, 237, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.15), transparent 40%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glow-purple": "0 0 25px -5px rgba(124, 58, 237, 0.4)",
        "glow-blue": "0 0 25px -5px rgba(59, 130, 246, 0.4)",
      }
    },
  },
  plugins: [],
};

export default config;
