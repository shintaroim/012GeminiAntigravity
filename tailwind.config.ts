import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fbf8f5",
          100: "#f4ece5",
          200: "#e9d7cb",
          300: "#dbbeac",
          400: "#ca9f87",
          500: "#bb8368",
          600: "#ad7057",
          700: "#905b46",
          800: "#744b3c",
          900: "#5e3e33",
          950: "#321e18",
        },
      },
    },
  },
  plugins: [],
};

export default config;
