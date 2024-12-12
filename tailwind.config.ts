import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C21A1A'
        }
      },
      boxShadow: {
        brand: '0px 0px 10px rgba(137, 142, 150, 0.50);'
      }
    },
  },
  plugins: [],
} satisfies Config;
