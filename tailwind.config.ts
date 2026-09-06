import type { Config } from "tailwindcss";

// Palette drawn from the CK Birla Hospitals | Rukmani Birla Hospital
// logo. Navy (primary) matches the "Birla Hospitals" wordmark; red
// (accent) matches the "CK" glyph.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f5f9",
          100: "#e2e8f0",
          200: "#cbd5e1",
          500: "#334155",
          600: "#1f2a44", // primary action / active nav
          700: "#131a2e", // hover
          900: "#0b1020",
        },
        accent: {
          500: "#de2843", // CK red — reserve for highlights only
          600: "#c81d38",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
