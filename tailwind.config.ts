import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./_app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      colors: {
        bgBase: 'rgb(var(--background-rgb) / <alpha-value>)',
        fgBase: 'rgb(var(--foreground-rgb) / <alpha-value>)',
        bgFormula: 'rgb(var(--background-formula-rgb) / <alpha-value>)',
      }
    },
  },
  plugins: [],
};
export default config;
